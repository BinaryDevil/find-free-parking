import { ruleClock } from './rule-clock.ts';
import type { RuleEvaluation } from './parking-rules.ts';

// ADR-0001 No Restriction Found amendment, rules 2–5. Pure: callers load rows
// and resolve geometry. The result is never free parking and never Coverage.

export const RESTRICTION_CATEGORIES = [
  'no_stopping', 'tow_away', 'no_parking', 'peak_hour', 'loading', 'bus_transit', 'disabled_only', 'permit',
  'eligibility', 'vehicle_class', 'school_zone', 'street_cleaning', 'events_closures', 'temporary', 'payment', 'time_limit',
] as const;
export type RestrictionCategory = typeof RESTRICTION_CATEGORIES[number];
export type NrfPlaceType = 'street' | 'lot';
export type NrfVariant = 'no_limit' | 'limit_fits' | 'no_payment_source' | 'limit_no_payment_source';
export type WithholdReason =
  | 'invalid_input' | 'register_not_approved' | 'register_not_measured' | 'register_source_unapproved'
  | 'no_parking_layer' | 'parking_layer_ineligible' | 'parking_layer_unparsed'
  | 'restriction_applies' | 'restriction_recorded' | 'limit_exceeded' | 'incomplete_schedule' | 'empty_band' | 'unclassifiable_record'
  | 'uncertain_location' | 'operator_conflict' | 'stale_source' | 'stale_citations' | 'no_temporary_source' | 'stay_too_long';

export interface Approval { state: string; approvedBy: string[]; approvalRefs: string[] }
export interface NrfSource {
  id: string;
  name: string;
  evidenceType: string;
  approvalState: string;
  lastSyncAt: string | null;
  formatValid: boolean;
  freshnessMinutes: number;
  dataAsOf?: string | null;
  roles?: { role: 'parking_layer' | 'temporary_restrictions'; placeType: NrfPlaceType; approval: Approval }[];
}
export interface RestrictionRegister {
  id: string;
  approval: Approval;
  measurementRef: string | null;
  entries: { category: RestrictionCategory; placeType: NrfPlaceType; sourceId: string }[];
}
export interface Band { days: number[]; startMinute: number; endMinute: number }
export type RecordLocation =
  | { kind: 'exact'; placeId: string }
  | { kind: 'point'; distanceMeters: number }
  | { kind: 'block'; blockId: string }
  | { kind: 'area'; distanceMeters: number }
  | { kind: 'unknown' };
export interface RestrictionRecord {
  id: string;
  sourceId: string;
  category: RestrictionCategory | null;
  bands: Band[] | null;
  scheduleComplete: boolean;
  limitMinutes?: number | null;
  exemptVehicles?: string[];
  operator?: string | null;
  validFrom?: string | null;
  validUntil?: string | null;
  location: RecordLocation;
}
export interface ParkingLayerRecord {
  sourceId: string;
  recordId: string;
  fetchedAt: string | null;
  allSignsParsed?: boolean;
  // A limit the layer itself records for this place (rule 1 limit variants).
  limit?: { minutes: number | null; bands: Band[] | null; scheduleComplete: boolean } | null;
}
export interface NrfInput {
  register: RestrictionRegister | null;
  sources: NrfSource[];
  place: { id: string; placeType: NrfPlaceType; blockId?: string | null };
  parkingLayer: ParkingLayerRecord | null;
  restrictions: RestrictionRecord[];
  instant: Date;
  now: Date;
  timeZone: string;
  stayMinutes?: number;
  vehicleType?: string;
  generalLimitMinutes?: number | null;
}
interface NrfCommon { sourcesChecked: { id: string; name: string; asOf: string | null }[]; missingCategories: RestrictionCategory[]; stayMinutes: number; stayAssumed: boolean }
export type NrfResult =
  | NrfCommon & { classification: 'NO_RESTRICTION_FOUND'; notVerified: true; variant: NrfVariant; textKey: string; limits: { minutes: number; bands: Band[] }[] }
  | NrfCommon & { classification: 'WITHHELD'; reasons: WithholdReason[] };

// Rule 5: the passed measurement shown with every label. Recorded by the
// measurement procedure (#137); the checker never computes it.
export interface NrfMeasurement { sampled: number; misses: number; checkedAgainst: string; measuredAt: string | null }

export const DEFAULT_STAY_MINUTES = 120;
export const MAX_STAY_MINUTES = 72 * 60;
export const LOCATION_BUFFER_METERS = 15;
const DAY = 86400000;
const textKeys: Record<NrfVariant, string> = {
  no_limit: 'noRestrictionFound.noLimit', limit_fits: 'noRestrictionFound.limitFits',
  no_payment_source: 'noRestrictionFound.noPaymentSource', limit_no_payment_source: 'noRestrictionFound.limitNoPaymentSource',
};

const twoAgents = (approval: Approval | undefined) => approval?.state === 'approved' &&
  new Set(approval.approvedBy.map(value => value.trim()).filter(Boolean)).size >= 2 &&
  new Set(approval.approvalRefs.map(value => value.trim()).filter(Boolean)).size >= 2;
const hasRole = (source: NrfSource, role: 'parking_layer' | 'temporary_restrictions', placeType: NrfPlaceType) =>
  source.approvalState === 'approved' && (source.roles ?? []).some(entry => entry.role === role && entry.placeType === placeType && twoAgents(entry.approval));
const validBand = (band: Band) => band.days.length > 0 && band.days.every(day => Number.isInteger(day) && day >= 0 && day <= 6) &&
  Number.isInteger(band.startMinute) && band.startMinute >= 0 && band.startMinute < 1440 &&
  Number.isInteger(band.endMinute) && band.endMinute >= 0 && band.endMinute <= 1440 && band.startMinute !== band.endMinute;

function synced(source: NrfSource, now: number) {
  const age = now - Date.parse(source.lastSyncAt ?? '');
  const policyMinutes = source.evidenceType === 'E5' ? 1440 : 10080;
  return source.formatValid && source.freshnessMinutes > 0 && Number.isFinite(age) && age >= 0 &&
    age <= Math.min(policyMinutes, source.freshnessMinutes) * 60000;
}

// Rule 4: 15 m around point records, both sides for block-located records,
// and the whole lot for anything inside or within 15 m of its footprint.
function reaches(location: RecordLocation, place: NrfInput['place']) {
  switch (location.kind) {
    case 'exact': return location.placeId === place.id;
    case 'point': case 'area': return !(location.distanceMeters > LOCATION_BUFFER_METERS);
    case 'block': return place.blockId == null || location.blockId === place.blockId;
    default: return true;
  }
}

export function checkNoRestrictionFound(input: NrfInput): NrfResult {
  const reasons = new Set<WithholdReason>();
  const { place } = input;
  const start = input.instant.getTime();
  const now = input.now.getTime();
  const stayAssumed = input.stayMinutes == null;
  const stay = input.stayMinutes ?? DEFAULT_STAY_MINUTES;
  const sourceById = new Map(input.sources.map(source => [source.id, source]));
  const entries = (input.register?.entries ?? []).filter(entry => entry.placeType === place.placeType);
  const granting = (category: RestrictionCategory) => entries.some(entry => entry.category === category &&
    sourceById.get(entry.sourceId) && sourceById.get(entry.sourceId)?.evidenceType !== 'signal');
  // Citation-only categories are still named: citations withhold, never grant.
  const missingCategories = RESTRICTION_CATEGORIES.filter(category => !granting(category));
  const checkedIds = [...new Set([input.parkingLayer?.sourceId, ...entries.map(entry => entry.sourceId)].filter((id): id is string => !!id))];
  const sourcesChecked = checkedIds.flatMap(id => {
    const source = sourceById.get(id);
    return source ? [{ id, name: source.name, asOf: source.lastSyncAt }] : [];
  });
  const common = { sourcesChecked, missingCategories, stayMinutes: stay, stayAssumed };
  const withheld = (): NrfResult => ({ ...common, classification: 'WITHHELD', reasons: [...reasons] });

  const clock = (() => { try { return ruleClock(input.timeZone); } catch { return null; } })();
  if (!clock || !Number.isFinite(start) || !Number.isFinite(now) || !Number.isInteger(stay) || stay < 0 || stay > 10080 ||
    (input.generalLimitMinutes != null && !(Number.isInteger(input.generalLimitMinutes) && input.generalLimitMinutes > 0))) {
    reasons.add('invalid_input');
    return withheld();
  }

  // Rules 3 and 5: dark until a two-agent-approved register has a passed measurement.
  if (!input.register || !twoAgents(input.register.approval)) reasons.add('register_not_approved');
  if (!input.register?.measurementRef?.trim()) reasons.add('register_not_measured');
  for (const entry of entries) {
    const source = sourceById.get(entry.sourceId);
    if (!source || source.approvalState !== 'approved') reasons.add('register_source_unapproved');
    else if (!synced(source, now)) reasons.add('stale_source');
    else if (source.evidenceType === 'signal' && !(now - Date.parse(source.dataAsOf ?? '') <= 60 * DAY)) reasons.add('stale_citations');
  }
  if (!entries.some(entry => {
    const source = sourceById.get(entry.sourceId);
    return entry.category === 'temporary' && source?.evidenceType === 'E5' && hasRole(source, 'temporary_restrictions', place.placeType) && synced(source, now);
  })) reasons.add('no_temporary_source');

  // Rule 2: an approved official parking layer positively records this place.
  const layer = input.parkingLayer;
  const layerSource = layer ? sourceById.get(layer.sourceId) : undefined;
  if (!layer) reasons.add('no_parking_layer');
  else if (!layerSource || !['E1', 'E3', 'E6'].includes(layerSource.evidenceType) ||
    (layerSource.evidenceType === 'E6' && place.placeType !== 'lot') || !hasRole(layerSource, 'parking_layer', place.placeType)) {
    reasons.add('parking_layer_ineligible');
  } else {
    if (layerSource.evidenceType === 'E3' && layer.allSignsParsed !== true) reasons.add('parking_layer_unparsed');
    const fetched = now - Date.parse(layer.fetchedAt ?? '');
    if (!synced(layerSource, now) || !(fetched >= 0 && fetched <= Math.min(10080, layerSource.freshnessMinutes) * 60000)) reasons.add('stale_source');
  }

  const end = start + stay * 60000;
  if (stay > Math.min(MAX_STAY_MINUTES, input.generalLimitMinutes ?? MAX_STAY_MINUTES)) reasons.add('stay_too_long');
  const vehicle = input.vehicleType ?? 'car';
  const activeAt = (record: RestrictionRecord, ms: number) => {
    if (record.validFrom && ms < Date.parse(record.validFrom)) return false;
    if (record.validUntil && ms >= Date.parse(record.validUntil)) return false;
    const { day, minute } = clock.read(ms);
    return (record.bands ?? []).some(band => band.endMinute > band.startMinute
      ? band.days.includes(day) && minute >= band.startMinute && minute < band.endMinute
      : (band.days.includes(day) && minute >= band.startMinute) || (band.days.includes((day + 6) % 7) && minute < band.endMinute));
  };
  // Activity is constant between band and validity boundaries, so checking
  // the start and every boundary inside the stay covers the whole stay.
  const activeDuringStay = (record: RestrictionRecord) => {
    const extra = [record.validFrom, record.validUntil].map(value => value ? Date.parse(value) : NaN).filter(ms => ms > start && ms < end);
    const points = [start, ...clock.boundaries(start, end, [0, ...(record.bands ?? []).flatMap(band => [band.startMinute, band.endMinute])]).filter(ms => ms < end), ...extra];
    return points.some(ms => activeAt(record, ms));
  };

  const limits: { minutes: number; bands: Band[] }[] = [];
  const operatorRules = new Map<string, string[]>();
  const layerLimit: RestrictionRecord[] = layer?.limit ? [{ id: layer.recordId, sourceId: layer.sourceId, category: 'time_limit',
    limitMinutes: layer.limit.minutes, bands: layer.limit.bands, scheduleComplete: layer.limit.scheduleComplete,
    location: { kind: 'exact', placeId: place.id } }] : [];
  for (const record of [...layerLimit, ...input.restrictions]) {
    if (!reaches(record.location, place)) continue;
    if (record.location.kind === 'unknown') reasons.add('uncertain_location');
    if (place.placeType === 'lot' && record.operator) {
      const rules = operatorRules.get(record.operator) ?? [];
      rules.push(JSON.stringify([record.category, record.limitMinutes ?? null, record.bands, record.validFrom ?? null, record.validUntil ?? null]));
      operatorRules.set(record.operator, rules);
    }
    if (record.category == null || !RESTRICTION_CATEGORIES.includes(record.category) ||
      (record.validFrom && !Number.isFinite(Date.parse(record.validFrom))) || (record.validUntil && !Number.isFinite(Date.parse(record.validUntil))) ||
      (record.category === 'time_limit' && !(Number.isInteger(record.limitMinutes) && (record.limitMinutes ?? 0) > 0))) {
      reasons.add('unclassifiable_record');
      continue;
    }
    if (!record.bands?.length) { reasons.add('empty_band'); continue; }
    if (!record.bands.every(validBand)) { reasons.add('unclassifiable_record'); continue; }
    if (record.exemptVehicles?.includes(vehicle)) continue;
    if (!record.scheduleComplete) reasons.add('incomplete_schedule');
    const active = activeDuringStay(record);
    if (record.category === 'time_limit') {
      if (active && stay > (record.limitMinutes as number)) reasons.add('limit_exceeded');
      else limits.push({ minutes: record.limitMinutes as number, bands: record.bands });
    } else {
      // Rule 1's texts claim no payment or restriction at the place, so any
      // recorded one withholds even outside its hours. Expired records do not.
      if (!(record.validUntil && Date.parse(record.validUntil) <= start)) reasons.add('restriction_recorded');
      if (active) reasons.add('restriction_applies');
    }
  }
  // Rule 4, lots: different published rules from different operators mean Unknown.
  if (new Set([...operatorRules.values()].map(rules => JSON.stringify(rules.sort()))).size > 1) reasons.add('operator_conflict');

  if (reasons.size) return withheld();
  const payment = granting('payment');
  const variant: NrfVariant = limits.length ? (payment ? 'limit_fits' : 'limit_no_payment_source') : (payment ? 'no_limit' : 'no_payment_source');
  limits.sort((a, b) => a.minutes - b.minutes);
  return { ...common, classification: 'NO_RESTRICTION_FOUND', notVerified: true, variant, textKey: textKeys[variant], limits };
}

// A stricter or verified answer always wins. Only a place with no applicable
// rule (not a rejected, stale, unparsed or conflicting one) can be upgraded.
export function evaluateWithNoRestrictionFound(base: RuleEvaluation, check: NrfResult): RuleEvaluation {
  if (base.classification !== 'UNKNOWN' || base.explanation !== 'no_rule' || check.classification !== 'NO_RESTRICTION_FOUND') return base;
  return { ...base, classification: 'NO_RESTRICTION_FOUND', explanation: check.textKey,
    timeLimitMinutes: check.limits[0]?.minutes ?? null, noRestrictionFound: check };
}
