// Issue #137: the ADR-0001 No Restriction Found rule-5 measurement. Runbook:
// docs/NO_RESTRICTION_MEASUREMENT.md.
//
//   node scripts/nrf-measure.ts <preregistration.json> <inputs.json> [results.json]
//
// Pure and deterministic over the saved files: no network, no database. It draws
// the seeded sample of labelled (place, time) pairs with the signal source held
// out, grades each label against that source, and reports the miss count, the
// exact one-sided 95% Clopper-Pearson upper bound, the hard block and the
// publication sentence.
import { readFileSync, writeFileSync } from 'node:fs';
import {
  checkNoRestrictionFound, RESTRICTION_CATEGORIES,
  type NrfInput, type NrfPlaceType, type NrfResult, type NrfSource, type ParkingLayerRecord,
  type RestrictionCategory, type RestrictionRecord, type RestrictionRegister,
} from '../lib/no-restriction-found.ts';

export const MIN_SAMPLE = 30;
export const CONFIDENCE = 0.95;
const WEEK_MINUTES = 7 * 1440;
const MAX_DRAWS_PER_PAIR = 1000;

export interface Preregistration {
  id: string;
  city: string;
  seed: number;
  sampleSize: number;
  // Start of the sampled week, as an absolute instant. Times are drawn uniformly
  // by minute across the 7 days that follow it.
  weekStart: string;
  stayMinutes?: number | null;
  signal: {
    // held_out: a register source left out of the measured labels.
    // independent: an official source that is not a label input at all.
    kind: 'held_out' | 'independent';
    sourceId: string;
    // How the sentence names it, e.g. "Seattle's sign inventory".
    label: string;
    reason: string;
    separatelyMaintained: boolean;
    detects: RestrictionCategory[];
  };
  // Set by the owner before the first city is enabled. Null means no verdict can pass.
  maxUpperBound: number | null;
}
export interface FramePlace { place: NrfInput['place']; parkingLayer: ParkingLayerRecord | null; restrictions: RestrictionRecord[] }
export interface MeasurementInputs {
  now: string;
  timeZone: string;
  register: RestrictionRegister;
  sources: NrfSource[];
  vehicleType?: string;
  generalLimitMinutes?: number | null;
  places: FramePlace[];
}
export interface SamplePair { placeId: string; minute: number; instant: string }
export interface Miss { placeId: string; instant: string; reasons: string[]; recordIds: string[]; categories: (RestrictionCategory | null)[]; hardBlock: boolean }
export type Verdict = 'pass' | 'fail' | 'no_threshold' | 'insufficient_sample';
export interface MeasurementResult {
  preregistrationId: string;
  city: string;
  signal: { kind: string; sourceId: string; label: string };
  sampleSize: number;
  draws: number;
  sample: SamplePair[];
  misses: number;
  missDetails: Miss[];
  upperBound95: number;
  hardBlock: boolean;
  notCheckedNoSource: RestrictionCategory[];
  notCheckedBySignal: RestrictionCategory[];
  sentence: string;
  maxUpperBound: number | null;
  verdict: Verdict;
}

// Misses the signal can grade. Freshness and register reasons are not restrictions.
const MISS_REASONS = new Set(['restriction_applies', 'restriction_recorded', 'limit_exceeded', 'incomplete_schedule', 'empty_band',
  'unclassifiable_record', 'uncertain_location', 'operator_conflict']);
// Restrictions that do not by themselves stop an ordinary public vehicle from parking.
const NON_PROHIBITING = new Set<RestrictionCategory>(['payment', 'time_limit']);

export const CATEGORY_LABELS: Record<RestrictionCategory, string> = {
  no_stopping: 'no-stopping zones', tow_away: 'tow-away zones', no_parking: 'no-parking zones', peak_hour: 'peak-hour restrictions',
  loading: 'loading zones', bus_transit: 'bus stops and transit layovers', disabled_only: 'disabled-only spaces', permit: 'permit zones',
  eligibility: 'eligibility rules', vehicle_class: 'vehicle-class restrictions', school_zone: 'school zones', street_cleaning: 'street cleaning',
  events_closures: 'events and closures', temporary: 'temporary restrictions', payment: 'payment', time_limit: 'time limits',
};

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function lnChoose(n: number, k: number) {
  let total = 0;
  for (let i = 1; i <= k; i++) total += Math.log(n - k + i) - Math.log(i);
  return total;
}
export function binomialCdf(x: number, n: number, p: number) {
  if (p <= 0) return 1;
  if (p >= 1) return x >= n ? 1 : 0;
  let total = 0;
  for (let i = 0; i <= x; i++) total += Math.exp(lnChoose(n, i) + i * Math.log(p) + (n - i) * Math.log(1 - p));
  return Math.min(1, total);
}
// Exact one-sided upper bound: the p at which seeing x or fewer misses has probability 1 - confidence.
export function clopperPearsonUpper(x: number, n: number, confidence = CONFIDENCE) {
  if (!Number.isInteger(n) || n < 1 || !Number.isInteger(x) || x < 0 || x > n) throw new Error(`invalid count ${x}/${n}`);
  if (x === n) return 1;
  const alpha = 1 - confidence;
  let low = x / n, high = 1;
  for (let i = 0; i < 200; i++) {
    const mid = (low + high) / 2;
    if (binomialCdf(x, n, mid) > alpha) low = mid; else high = mid;
  }
  return high;
}

// Inputs with the signal left out: its register entries and records are removed.
// The register's measurement gate is satisfied only inside this computation.
export function heldOutInput(inputs: MeasurementInputs, pre: Preregistration, frame: FramePlace, instant: Date): NrfInput {
  const id = pre.signal.sourceId;
  return {
    register: { ...inputs.register, measurementRef: `pre-registration:${pre.id}`, entries: inputs.register.entries.filter(entry => entry.sourceId !== id) },
    sources: inputs.sources, place: frame.place, parkingLayer: frame.parkingLayer,
    restrictions: frame.restrictions.filter(record => record.sourceId !== id),
    instant, now: new Date(inputs.now), timeZone: inputs.timeZone,
    stayMinutes: pre.stayMinutes ?? undefined, vehicleType: inputs.vehicleType, generalLimitMinutes: inputs.generalLimitMinutes,
  };
}

export function validate(pre: Preregistration, inputs: MeasurementInputs) {
  const errors: string[] = [];
  const { signal } = pre;
  if (!pre.id?.trim() || !pre.city?.trim()) errors.push('pre-registration needs id and city');
  if (!Number.isInteger(pre.seed)) errors.push('seed must be an integer');
  if (!Number.isInteger(pre.sampleSize) || pre.sampleSize < MIN_SAMPLE) errors.push(`sampleSize must be an integer of at least ${MIN_SAMPLE}`);
  if (!Number.isFinite(Date.parse(pre.weekStart))) errors.push('weekStart must be an instant');
  if (pre.maxUpperBound != null && !(pre.maxUpperBound > 0 && pre.maxUpperBound < 1)) errors.push('maxUpperBound must be in (0, 1) or null');
  if (!signal?.label?.trim() || !signal.reason?.trim()) errors.push('signal needs a label and a reason');
  if (signal?.separatelyMaintained !== true) errors.push('signal must be separately maintained, not a view or export of an input');
  if (!signal?.detects?.length || !signal.detects.every(category => RESTRICTION_CATEGORIES.includes(category))) errors.push('signal.detects must list known categories');
  const source = inputs.sources.find(item => item.id === signal?.sourceId);
  if (!source) errors.push(`signal source ${signal?.sourceId} is not in the inputs`);
  else if (source.approvalState !== 'approved') errors.push('signal source must be approved');
  const registered = inputs.register.entries.filter(entry => entry.sourceId === signal?.sourceId);
  if (signal?.kind === 'held_out') {
    if (!registered.length) errors.push('a held-out source must be in the approved register');
    // The temporary-restrictions source is a precondition for showing the label at
    // all, so leaving it out would not give labels the served answer contains.
    if (source?.evidenceType === 'E5' && registered.some(entry => entry.category === 'temporary')) errors.push('the temporary-restrictions (E5) source cannot be held out');
    const recorded = new Set(registered.map(entry => entry.category));
    for (const category of signal.detects ?? []) if (!recorded.has(category)) errors.push(`held-out source does not record ${category} in the register`);
  } else if (signal?.kind === 'independent') {
    if (registered.length) errors.push('an independent signal must not be a label input; use kind held_out');
  } else errors.push('signal.kind must be held_out or independent');
  if (inputs.places.some(frame => frame.parkingLayer?.sourceId === signal?.sourceId)) errors.push('the signal cannot be a parking layer');
  if (!inputs.places.some(frame => frame.restrictions.some(record => record.sourceId === signal?.sourceId))) errors.push('the signal has no records across the frame');
  const ids = inputs.places.map(frame => frame.place.id);
  if (new Set(ids).size !== ids.length) errors.push('place ids must be unique');
  return errors;
}

// Uniform over labelled (place, minute) pairs: draw uniformly over the whole
// frame and keep the pairs the held-out checker labels, without repeats.
export function drawSample(pre: Preregistration, inputs: MeasurementInputs) {
  const frame = [...inputs.places].sort((a, b) => (a.place.id < b.place.id ? -1 : a.place.id > b.place.id ? 1 : 0));
  const random = mulberry32(pre.seed);
  const weekStart = Date.parse(pre.weekStart);
  const seen = new Set<string>();
  const sample: { pair: SamplePair; frame: FramePlace; label: NrfResult }[] = [];
  const maxDraws = pre.sampleSize * MAX_DRAWS_PER_PAIR;
  let draws = 0;
  while (sample.length < pre.sampleSize && draws < maxDraws && frame.length) {
    draws++;
    const item = frame[Math.floor(random() * frame.length)];
    const minute = Math.floor(random() * WEEK_MINUTES);
    const key = `${item.place.id}\u0000${minute}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const instant = new Date(weekStart + minute * 60000);
    const label = checkNoRestrictionFound(heldOutInput(inputs, pre, item, instant));
    if (label.classification !== 'NO_RESTRICTION_FOUND') continue;
    sample.push({ pair: { placeId: item.place.id, minute, instant: instant.toISOString() }, frame: item, label });
  }
  return { sample, draws };
}

// A miss: adding the signal's records for the place would withhold the label
// for a restriction reason. A missed record is a hard block when it applies
// during the sampled stay and prohibits ordinary public parking or may tow, or
// when the grader cannot tell (unclassifiable, empty or incomplete schedule).
export function grade(pre: Preregistration, inputs: MeasurementInputs, frame: FramePlace, instant: Date): Miss | null {
  const base = heldOutInput(inputs, pre, frame, instant);
  const signalRecords = frame.restrictions.filter(record => record.sourceId === pre.signal.sourceId);
  const check = (restrictions: RestrictionRecord[]) => {
    const result = checkNoRestrictionFound({ ...base, restrictions: [...base.restrictions, ...restrictions] });
    return result.classification === 'WITHHELD' ? result.reasons.filter(reason => MISS_REASONS.has(reason)) : [];
  };
  const reasons = check(signalRecords);
  if (!reasons.length) return null;
  const offending = signalRecords.map(record => ({ record, reasons: check([record]) })).filter(item => item.reasons.length);
  const unresolved = new Set(['unclassifiable_record', 'empty_band', 'incomplete_schedule', 'uncertain_location', 'operator_conflict']);
  const hardBlock = reasons.some(reason => unresolved.has(reason)) || !offending.length || offending.some(({ record, reasons: own }) =>
    own.some(reason => unresolved.has(reason)) ||
    (own.includes('restriction_applies') && record.category != null && !NON_PROHIBITING.has(record.category)));
  return {
    placeId: frame.place.id, instant: instant.toISOString(), reasons,
    recordIds: offending.map(item => item.record.id), categories: offending.map(item => item.record.category), hardBlock,
  };
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
export function joinList(items: string[]) {
  if (items.length <= 2) return items.join(' and ');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}
// "up to about 1 in N" must never understate the bound, so N rounds down
// (14.9% -> 1 in 6). The ADR's "1 in 7" example is illustrative.
export function oneIn(bound: number) {
  return Math.max(1, Math.floor(1 / bound));
}
export function publicationSentence(args: { n: number; misses: number; upperBound: number; signalLabel: string; noSource: RestrictionCategory[]; notBySignal: RestrictionCategory[] }) {
  const count = args.misses === 0 ? 'none' : String(args.misses);
  const parts = [`Checked ${args.n} places against ${args.signalLabel}: ${count} had a restriction the other data missed (up to about 1 in ${oneIn(args.upperBound)}).`];
  if (args.noSource.length) parts.push(`${capitalize(joinList(args.noSource.map(category => CATEGORY_LABELS[category])))} are not in any official dataset here and were not checked.`);
  if (args.notBySignal.length) parts.push(`${capitalize(args.signalLabel)} does not record ${joinList(args.notBySignal.map(category => CATEGORY_LABELS[category]))}, so they were not checked.`);
  parts.push(`The check cannot catch restrictions that no official source records, that ${args.signalLabel} also misses, or that all sources record wrongly.`);
  return parts.join(' ');
}

// Categories that neither a non-citation register source (for a sampled place
// type) nor the signal records, and the remaining ones the signal does not detect.
export function uncheckedCategories(pre: Preregistration, inputs: MeasurementInputs, placeTypes: NrfPlaceType[]) {
  const evidence = new Map(inputs.sources.map(source => [source.id, source.evidenceType]));
  const recorded = (category: RestrictionCategory, placeType: NrfPlaceType) => inputs.register.entries.some(entry =>
    entry.category === category && entry.placeType === placeType && evidence.has(entry.sourceId) && evidence.get(entry.sourceId) !== 'signal');
  const noSource = RESTRICTION_CATEGORIES.filter(category => !pre.signal.detects.includes(category) &&
    placeTypes.some(placeType => !recorded(category, placeType)));
  const notBySignal = RESTRICTION_CATEGORIES.filter(category => !noSource.includes(category) && !pre.signal.detects.includes(category));
  return { noSource, notBySignal };
}

export function measure(pre: Preregistration, inputs: MeasurementInputs): MeasurementResult {
  const errors = validate(pre, inputs);
  if (errors.length) throw new Error(`invalid measurement:\n- ${errors.join('\n- ')}`);
  const { sample, draws } = drawSample(pre, inputs);
  const missDetails = sample.flatMap(item => {
    const miss = grade(pre, inputs, item.frame, new Date(item.pair.instant));
    return miss ? [miss] : [];
  });
  const n = sample.length;
  const upperBound95 = n ? clopperPearsonUpper(missDetails.length, n) : 1;
  const hardBlock = missDetails.some(miss => miss.hardBlock);
  const placeTypes = [...new Set(sample.map(item => item.frame.place.placeType))].sort();
  const { noSource, notBySignal } = uncheckedCategories(pre, inputs, placeTypes);
  const verdict: Verdict = n < pre.sampleSize ? 'insufficient_sample' : hardBlock ? 'fail'
    : pre.maxUpperBound == null ? 'no_threshold' : upperBound95 <= pre.maxUpperBound ? 'pass' : 'fail';
  return {
    preregistrationId: pre.id, city: pre.city,
    signal: { kind: pre.signal.kind, sourceId: pre.signal.sourceId, label: pre.signal.label },
    sampleSize: n, draws, sample: sample.map(item => item.pair),
    misses: missDetails.length, missDetails, upperBound95, hardBlock,
    notCheckedNoSource: noSource, notCheckedBySignal: notBySignal,
    sentence: publicationSentence({ n, misses: missDetails.length, upperBound: upperBound95, signalLabel: pre.signal.label, noSource, notBySignal }),
    maxUpperBound: pre.maxUpperBound, verdict,
  };
}

if (import.meta.main) {
  const [prePath, inputsPath, outPath] = process.argv.slice(2);
  if (!prePath || !inputsPath) {
    console.error('Usage: node scripts/nrf-measure.ts <preregistration.json> <inputs.json> [results.json]');
    process.exit(2);
  }
  const result = measure(JSON.parse(readFileSync(prePath, 'utf8')), JSON.parse(readFileSync(inputsPath, 'utf8')));
  const text = `${JSON.stringify(result, null, 2)}\n`;
  if (outPath) writeFileSync(outPath, text);
  console.log(JSON.stringify({ sampleSize: result.sampleSize, misses: result.misses, upperBound95: result.upperBound95,
    hardBlock: result.hardBlock, verdict: result.verdict, sentence: result.sentence }, null, 2));
}
