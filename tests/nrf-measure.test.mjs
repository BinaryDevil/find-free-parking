import test from 'node:test';
import assert from 'node:assert/strict';
import { checkNoRestrictionFound } from '../lib/no-restriction-found.ts';
import {
  clopperPearsonUpper, drawSample, grade, heldOutInput, measure, mulberry32, oneIn, publicationSentence, validate,
} from '../scripts/nrf-measure.ts';

// Synthetic fixtures only. Snapshot Monday 2026-10-26 12:00 in Seattle; the sampled week starts the next Monday.
const now = '2026-10-26T19:00:00.000Z';
const hoursAgo = hours => new Date(Date.parse(now) - hours * 3600000).toISOString();
const approval = { state: 'approved', approvedBy: ['agent-a', 'agent-b'], approvalRefs: ['review-1', 'review-2'] };
const role = (name, placeType) => ({ role: name, placeType, approval });
const source = (id, evidenceType, extra = {}) => ({ id, name: `Official ${id}`, evidenceType, approvalState: 'approved',
  lastSyncAt: hoursAgo(2), formatValid: true, freshnessMinutes: 10080, ...extra });
const allWeek = [{ days: [0, 1, 2, 3, 4, 5, 6], startMinute: 0, endMinute: 1440 }];
// One minute a week, Sunday 03:00-03:01: almost never active at a sampled time.
const rarely = [{ days: [0], startMinute: 180, endMinute: 181 }];
const record = (id, sourceId, category, placeId, extra = {}) => ({ id, sourceId, category, bands: allWeek, scheduleComplete: true,
  location: { kind: 'exact', placeId }, ...extra });

function inputs({ placeCount = 60 } = {}) {
  const places = Array.from({ length: placeCount }, (_, i) => {
    const id = `side-${String(i).padStart(3, '0')}`;
    const restrictions = [];
    // Every fifth place has a blockface no-parking record: labelled out by the inputs.
    if (i % 5 === 0) restrictions.push(record(`bf-${i}`, 'blockface', 'no_parking', id));
    return { place: { id, placeType: 'street', blockId: `block-${i}` },
      parkingLayer: { sourceId: 'blockface', recordId: `bf-layer-${i}`, fetchedAt: hoursAgo(2) }, restrictions };
  });
  // The signal must carry records across the frame; this one lies far from every place.
  places[1].restrictions.push(record('sign-far', 'signs', 'no_parking', places[1].place.id, { location: { kind: 'point', distanceMeters: 40 } }));
  return {
    now, timeZone: 'America/Los_Angeles',
    sources: [
      source('blockface', 'E1', { roles: [role('parking_layer', 'street')] }),
      source('signs', 'E3'),
      source('meters', 'E2'),
      source('closures', 'E5', { freshnessMinutes: 1440, roles: [role('temporary_restrictions', 'street')] }),
    ],
    register: { id: 'register', approval, measurementRef: null, entries: [
      ...['no_stopping', 'tow_away', 'no_parking', 'peak_hour', 'permit', 'time_limit', 'street_cleaning'].map(category => ({ category, placeType: 'street', sourceId: 'blockface' })),
      ...['no_stopping', 'no_parking', 'loading', 'permit'].map(category => ({ category, placeType: 'street', sourceId: 'signs' })),
      { category: 'payment', placeType: 'street', sourceId: 'meters' },
      { category: 'temporary', placeType: 'street', sourceId: 'closures' },
    ] },
    places,
  };
}
const pre = (extra = {}) => ({
  id: 'synthetic-1', city: 'Synthetic City', seed: 20261026, sampleSize: 30, weekStart: '2026-11-02T08:00:00.000Z', stayMinutes: null,
  signal: { kind: 'held_out', sourceId: 'signs', label: "Synthetic City's sign inventory", reason: 'Separately maintained sign inventory with records citywide',
    separatelyMaintained: true, detects: ['no_stopping', 'no_parking', 'loading', 'permit'] },
  maxUpperBound: 0.2, ...extra,
});

test('the seeded sample is reproducible and independent of input order', () => {
  const a = drawSample(pre(), inputs());
  const b = drawSample(pre(), inputs());
  const shuffled = inputs();
  shuffled.places.reverse();
  const c = drawSample(pre(), shuffled);
  assert.equal(a.sample.length, 30);
  assert.deepEqual(a.sample.map(item => item.pair), b.sample.map(item => item.pair));
  assert.deepEqual(a.sample.map(item => item.pair), c.sample.map(item => item.pair));
  const other = drawSample(pre({ seed: 7 }), inputs());
  assert.notDeepEqual(a.sample.map(item => item.pair), other.sample.map(item => item.pair));
  const keys = a.sample.map(item => `${item.pair.placeId}@${item.pair.minute}`);
  assert.equal(new Set(keys).size, keys.length, 'no repeated pair');
  // Only labelled pairs, spread over the week.
  assert.ok(a.sample.every(item => item.label.classification === 'NO_RESTRICTION_FOUND'));
  assert.ok(a.sample.every(item => item.pair.minute >= 0 && item.pair.minute < 7 * 1440));
  assert.ok(new Set(a.sample.map(item => Math.floor(item.pair.minute / 1440))).size >= 4);
  const r1 = mulberry32(42), r2 = mulberry32(42);
  for (let i = 0; i < 5; i++) assert.equal(r1(), r2());
});

// Independent references: the binomial CDF for x <= 2 written out as polynomials and
// solved by bisection, plus values computed once with exact rational arithmetic.
const cdf = [
  p => (1 - p) ** 30,
  p => (1 - p) ** 29 * (1 + 29 * p),
  p => (1 - p) ** 28 * ((1 - p) ** 2 + 30 * p * (1 - p) + 435 * p * p),
];
const solve = f => { let lo = 0, hi = 1; for (let i = 0; i < 100; i++) { const m = (lo + hi) / 2; if (f(m) > 0.05) lo = m; else hi = m; } return hi; };
test('exact one-sided 95% Clopper-Pearson upper bounds', () => {
  const exact = [0.09503385285530414, 0.14859606865911315, 0.195326043654926];
  for (const x of [0, 1, 2]) {
    const value = clopperPearsonUpper(x, 30);
    assert.ok(Math.abs(value - exact[x]) < 1e-9, `${x}/30: ${value}`);
    assert.ok(Math.abs(value - solve(cdf[x])) < 1e-9, `${x}/30 polynomial`);
  }
  assert.ok(Math.abs(clopperPearsonUpper(0, 30) - (1 - 0.05 ** (1 / 30))) < 1e-12);
  assert.equal(clopperPearsonUpper(30, 30), 1);
  assert.ok(clopperPearsonUpper(0, 60) < clopperPearsonUpper(0, 30));
  assert.throws(() => clopperPearsonUpper(31, 30));
  assert.deepEqual([0, 1, 2].map(x => oneIn(exact[x])), [11, 7, 5]);
});

test('held-out labels drop the signal; the served label can only withhold more', () => {
  const data = inputs();
  const frame = data.places[2];
  frame.restrictions.push(record('sign-np', 'signs', 'no_parking', frame.place.id));
  const instant = new Date('2026-11-03T18:00:00.000Z');
  const held = heldOutInput(data, pre(), frame, instant);
  assert.ok(held.restrictions.every(item => item.sourceId !== 'signs'));
  assert.ok(held.register.entries.every(entry => entry.sourceId !== 'signs'));
  assert.equal(data.register.measurementRef, null, 'saved inputs are not modified');
  assert.equal(checkNoRestrictionFound(held).classification, 'NO_RESTRICTION_FOUND');
  const served = checkNoRestrictionFound({ ...held, register: { ...held.register, entries: data.register.entries }, restrictions: frame.restrictions });
  assert.equal(served.classification, 'WITHHELD');
  const miss = grade(pre(), data, frame, instant);
  assert.deepEqual(miss.recordIds, ['sign-np']);
  assert.ok(miss.reasons.includes('restriction_applies'));
  // A signal record out of reach (40 m point) is not a miss.
  assert.equal(grade(pre(), data, data.places[1], instant), null);
  // A record the inputs already withhold is never sampled.
  assert.ok(drawSample(pre(), data).sample.every(item => Number(item.pair.placeId.slice(-3)) % 5 !== 0));
});

test('hard block: a prohibiting or tow-type miss at the sampled time blocks; payment and inactive records do not', () => {
  const data = inputs();
  const at = new Date('2026-11-03T18:00:00.000Z');
  const grading = (category, extra = {}) => {
    const copy = structuredClone(data);
    copy.places[3].restrictions.push(record('sign-x', 'signs', category, copy.places[3].place.id, extra));
    return grade(pre({ signal: { ...pre().signal, detects: ['no_stopping', 'no_parking', 'loading', 'permit'] } }), copy, copy.places[3], at);
  };
  assert.equal(grading('no_parking').hardBlock, true);
  assert.equal(grading('loading').hardBlock, true);
  assert.equal(grading('tow_away').hardBlock, true);
  assert.equal(grading('payment').hardBlock, false, 'paid parking does not prohibit');
  const outside = grading('no_parking', { bands: rarely });
  assert.deepEqual(outside.reasons, ['restriction_recorded']);
  assert.equal(outside.hardBlock, false, 'recorded outside the sampled stay');
  assert.equal(grading(null).hardBlock, true, 'an unclassifiable record cannot be cleared');

  // A single prohibiting miss fails the city even when the bound would pass.
  const blocked = inputs();
  const first = drawSample(pre(), blocked).sample[0].pair.placeId;
  blocked.places.find(frame => frame.place.id === first).restrictions.push(record('sign-np', 'signs', 'no_parking', first));
  const result = measure(pre({ maxUpperBound: 0.5 }), blocked);
  assert.ok(result.misses >= 1);
  assert.ok(result.upperBound95 <= 0.5);
  assert.equal(result.hardBlock, true);
  assert.equal(result.verdict, 'fail');
});

test('measure: counts, bound, verdicts and the published sentence', () => {
  const clean = measure(pre(), inputs());
  assert.equal(clean.sampleSize, 30);
  assert.equal(clean.misses, 0);
  assert.ok(Math.abs(clean.upperBound95 - 0.09503385285530414) < 1e-9);
  assert.equal(clean.hardBlock, false);
  assert.equal(clean.verdict, 'pass');
  assert.equal(measure(pre({ maxUpperBound: null }), inputs()).verdict, 'no_threshold');
  assert.equal(measure(pre({ maxUpperBound: 0.05 }), inputs()).verdict, 'fail');
  assert.deepEqual(measure(pre(), inputs()), clean, 'deterministic');

  // Payment-only signal records on every place: misses that are not hard blocks.
  const paid = inputs();
  paid.register.entries.push({ category: 'payment', placeType: 'street', sourceId: 'signs' });
  for (const frame of paid.places) frame.restrictions.push(record(`sign-pay-${frame.place.id}`, 'signs', 'payment', frame.place.id, { bands: rarely }));
  const paidResult = measure(pre({ signal: { ...pre().signal, detects: ['payment'] } }), paid);
  assert.equal(paidResult.misses, 30);
  assert.equal(paidResult.hardBlock, false);
  assert.equal(paidResult.upperBound95, 1);
  assert.equal(paidResult.verdict, 'fail');

  assert.ok(clean.notCheckedNoSource.includes('bus_transit'));
  assert.ok(clean.notCheckedBySignal.includes('street_cleaning'));
  assert.ok(!clean.notCheckedBySignal.includes('loading'));
  assert.match(clean.sentence, /^Checked 30 places against Synthetic City's sign inventory: none had a restriction the other data missed \(up to about 1 in 11\)\. /);
  assert.match(clean.sentence, /Bus stops and transit layovers.* are not in any official dataset here and were not checked\./);
  assert.match(clean.sentence, /Synthetic City's sign inventory does not record .*street cleaning.*, so they were not checked\.$/);
});

test('sentence formatting follows the ADR example', () => {
  assert.equal(
    publicationSentence({ n: 30, misses: 1, upperBound: clopperPearsonUpper(1, 30), signalLabel: "Seattle's sign inventory", noSource: ['bus_transit', 'loading'], notBySignal: [] }),
    "Checked 30 places against Seattle's sign inventory: 1 had a restriction the other data missed (up to about 1 in 7). Bus stops and transit layovers and loading zones are not in any official dataset here and were not checked.");
  assert.equal(
    publicationSentence({ n: 30, misses: 2, upperBound: clopperPearsonUpper(2, 30), signalLabel: 'the closure feed', noSource: [], notBySignal: ['payment', 'time_limit', 'school_zone'] }),
    'Checked 30 places against the closure feed: 2 had a restriction the other data missed (up to about 1 in 5). The closure feed does not record payment, time limits and school zones, so they were not checked.');
});

test('validation enforces rule 5 eligibility', () => {
  assert.deepEqual(validate(pre(), inputs()), []);
  const errors = (p, d = inputs()) => validate(p, d).join('\n');
  assert.match(errors(pre({ sampleSize: 29 })), /at least 30/);
  assert.match(errors(pre({ signal: { ...pre().signal, separatelyMaintained: false } })), /separately maintained/);
  assert.match(errors(pre({ signal: { ...pre().signal, sourceId: 'blockface' } })), /parking layer/);
  assert.match(errors(pre({ signal: { ...pre().signal, detects: ['school_zone'] } })), /does not record school_zone/);
  assert.match(errors(pre({ signal: { ...pre().signal, kind: 'independent' } })), /must not be a label input/);
  const noRecords = inputs();
  noRecords.places[1].restrictions = noRecords.places[1].restrictions.filter(item => item.sourceId !== 'signs');
  assert.match(errors(pre(), noRecords), /no records/);
  assert.throws(() => measure(pre({ seed: 1.5 }), inputs()), /seed/);
  // A frame with too few labelled pairs is reported, not padded.
  const dark = inputs();
  for (const frame of dark.places) frame.restrictions.push(record(`bf-all-${frame.place.id}`, 'blockface', 'no_parking', frame.place.id));
  const short = measure(pre(), dark);
  assert.equal(short.sampleSize, 0);
  assert.equal(short.verdict, 'insufficient_sample');
});
