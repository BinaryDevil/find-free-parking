import test from 'node:test';
import assert from 'node:assert/strict';
import { checkNoRestrictionFound, evaluateWithNoRestrictionFound, RESTRICTION_CATEGORIES } from '../lib/no-restriction-found.ts';
import { evaluateParkingRules } from '../lib/parking-rules.ts';

// Synthetic fixtures only. Monday 2026-10-26 12:00 in Seattle.
const now = new Date('2026-10-26T19:00:00Z');
const hoursAgo = hours => new Date(now.getTime() - hours * 3600000).toISOString();
const approval = { state: 'approved', approvedBy: ['agent-a', 'agent-b'], approvalRefs: ['review-1', 'review-2'] };
const role = (name, placeType) => ({ role: name, placeType, approval });
const source = (id, evidenceType, extra = {}) => ({ id, name: `Official ${id}`, evidenceType, approvalState: 'approved',
  lastSyncAt: hoursAgo(2), formatValid: true, freshnessMinutes: 10080, ...extra });
const sources = () => [
  source('blockface', 'E1', { roles: [role('parking_layer', 'street')] }),
  source('lots', 'E6', { roles: [role('parking_layer', 'lot')] }),
  source('signs', 'E3'),
  source('meters', 'E2'),
  source('closures', 'E5', { freshnessMinutes: 1440, roles: [role('temporary_restrictions', 'street'), role('temporary_restrictions', 'lot')] }),
  source('citations', 'signal', { dataAsOf: hoursAgo(24 * 10) }),
];
const register = () => ({ id: 'register', approval, measurementRef: 'measurement-1', entries: [
  ...['no_stopping', 'tow_away', 'no_parking', 'peak_hour', 'permit', 'time_limit', 'street_cleaning'].flatMap(category => [
    { category, placeType: 'street', sourceId: 'blockface' }, { category, placeType: 'street', sourceId: 'signs' }]),
  { category: 'payment', placeType: 'street', sourceId: 'meters' },
  { category: 'temporary', placeType: 'street', sourceId: 'closures' },
  { category: 'no_stopping', placeType: 'street', sourceId: 'citations' },
  { category: 'bus_transit', placeType: 'street', sourceId: 'citations' },
  ...['eligibility', 'time_limit', 'payment', 'events_closures'].map(category => ({ category, placeType: 'lot', sourceId: 'lots' })),
  { category: 'temporary', placeType: 'lot', sourceId: 'closures' },
] });
const allWeek = [{ days: [0, 1, 2, 3, 4, 5, 6], startMinute: 0, endMinute: 1440 }];
const record = (category, extra = {}) => ({ id: `${category}-1`, sourceId: 'signs', category, bands: allWeek, scheduleComplete: true,
  location: { kind: 'exact', placeId: 'side-1' }, ...extra });
const street = (extra = {}) => ({ register: register(), sources: sources(), place: { id: 'side-1', placeType: 'street', blockId: 'block-1' },
  parkingLayer: { sourceId: 'blockface', recordId: 'bf-1', fetchedAt: hoursAgo(2) }, restrictions: [],
  instant: now, now, timeZone: 'America/Los_Angeles', ...extra });
const lot = (extra = {}) => street({ place: { id: 'lot-1', placeType: 'lot' },
  parkingLayer: { sourceId: 'lots', recordId: 'lot-1', fetchedAt: hoursAgo(2) }, ...extra });
const withSources = (patch) => sources().map(item => ({ ...item, ...(patch[item.id] ?? {}) }));
const withheld = (input, reason, name = '') => {
  const result = checkNoRestrictionFound(input);
  assert.equal(result.classification, 'WITHHELD', `${name}: ${JSON.stringify(result)}`);
  if (reason) assert.ok(result.reasons.includes(reason), `${name}: ${reason} not in ${result.reasons}`);
  return result;
};
const shown = (input, name = '') => {
  const result = checkNoRestrictionFound(input);
  assert.equal(result.classification, 'NO_RESTRICTION_FOUND', `${name}: ${JSON.stringify(result)}`);
  assert.equal(result.notVerified, true);
  return result;
};

test('a clean place yields the weaker answer with sources, as-of dates, missing categories and an assumed 2 h stay', () => {
  const result = shown(street());
  assert.equal(result.variant, 'no_limit');
  assert.equal(result.textKey, 'noRestrictionFound.noLimit');
  assert.equal(result.stayMinutes, 120);
  assert.equal(result.stayAssumed, true);
  assert.deepEqual(result.sourcesChecked.map(item => item.id).sort(), ['blockface', 'citations', 'closures', 'meters', 'signs']);
  assert.ok(result.sourcesChecked.every(item => item.asOf));
  // Citation-only categories are named as missing: citations never grant.
  assert.ok(result.missingCategories.includes('bus_transit'));
  assert.ok(result.missingCategories.includes('loading'));
  assert.ok(!result.missingCategories.includes('payment'));
  assert.ok(!RESTRICTION_CATEGORIES.some(category => result.missingCategories.includes(category) && ['no_parking', 'temporary'].includes(category)));
});

test('rule 1 variants', () => {
  const noPayment = () => ({ ...register(), entries: register().entries.filter(entry => entry.category !== 'payment') });
  const limit = record('time_limit', { limitMinutes: 240, bands: [{ days: [1, 2, 3, 4, 5, 6], startMinute: 420, endMinute: 1080 }] });
  for (const [name, input, variant, key] of [
    ['no limit', street(), 'no_limit', 'noRestrictionFound.noLimit'],
    ['limit fits', street({ restrictions: [limit] }), 'limit_fits', 'noRestrictionFound.limitFits'],
    ['no payment source', street({ register: noPayment() }), 'no_payment_source', 'noRestrictionFound.noPaymentSource'],
    ['limit with no payment source', street({ register: noPayment(), restrictions: [limit] }), 'limit_no_payment_source', 'noRestrictionFound.limitNoPaymentSource'],
  ]) {
    const result = shown(input);
    assert.equal(result.variant, variant, name);
    assert.equal(result.textKey, key, name);
  }
  assert.deepEqual(shown(street({ restrictions: [limit] })).limits, [{ minutes: 240, bands: limit.bands }]);
});

test('dark by construction: no, pending, single-agent or unmeasured registers never emit the class', () => {
  for (const [name, input, reason] of [
    ['no register', street({ register: null }), 'register_not_approved'],
    ['pending', street({ register: { ...register(), approval: { ...approval, state: 'pending' } } }), 'register_not_approved'],
    ['one approver twice', street({ register: { ...register(), approval: { ...approval, approvedBy: ['agent-a', ' agent-a '] } } }), 'register_not_approved'],
    ['one reference', street({ register: { ...register(), approval: { ...approval, approvalRefs: ['review-1'] } } }), 'register_not_approved'],
    ['not measured', street({ register: { ...register(), measurementRef: null } }), 'register_not_measured'],
    ['blank measurement', street({ register: { ...register(), measurementRef: ' ' } }), 'register_not_measured'],
    ['unapproved register source', street({ sources: withSources({ signs: { approvalState: 'pending' } }) }), 'register_source_unapproved'],
    ['register source absent', street({ sources: sources().filter(item => item.id !== 'meters') }), 'register_source_unapproved'],
  ]) withheld(input, reason, name);
});

test('rule 2: only an approved E1, E3 or E6 parking layer that records the place', () => {
  for (const [name, input, reason] of [
    ['no layer record', street({ parkingLayer: null }), 'no_parking_layer'],
    ['meter feed as layer', street({ parkingLayer: { sourceId: 'meters', recordId: 'm', fetchedAt: hoursAgo(1) } }), 'parking_layer_ineligible'],
    ['layer without role', street({ sources: withSources({ blockface: { roles: [] } }) }), 'parking_layer_ineligible'],
    ['role for lots only', street({ sources: withSources({ blockface: { roles: [role('parking_layer', 'lot')] } }) }), 'parking_layer_ineligible'],
    ['single-agent role', street({ sources: withSources({ blockface: { roles: [{ role: 'parking_layer', placeType: 'street', approval: { ...approval, approvedBy: ['agent-a'] } }] } }) }), 'parking_layer_ineligible'],
    ['source unapproved', street({ sources: withSources({ blockface: { approvalState: 'rejected' } }) }), 'parking_layer_ineligible'],
    ['E6 on a street', street({ parkingLayer: { sourceId: 'lots', recordId: 'l', fetchedAt: hoursAgo(1) }, sources: withSources({ lots: { roles: [role('parking_layer', 'street')] } }) }), 'parking_layer_ineligible'],
    ['E3 with an unparsed sign', street({ parkingLayer: { sourceId: 'signs', recordId: 's', fetchedAt: hoursAgo(1), allSignsParsed: false }, sources: withSources({ signs: { roles: [role('parking_layer', 'street')] } }) }), 'parking_layer_unparsed'],
  ]) withheld(input, reason, name);
  shown(street({ parkingLayer: { sourceId: 'signs', recordId: 's', fetchedAt: hoursAgo(1), allSignsParsed: true }, sources: withSources({ signs: { roles: [role('parking_layer', 'street')] } }) }));
});

test('rule 4: a restriction that applies at the selected time and vehicle withholds, for every category', () => {
  for (const category of RESTRICTION_CATEGORIES.filter(category => category !== 'time_limit')) {
    withheld(street({ restrictions: [record(category)] }), 'restriction_applies');
  }
  // Outside its hours the record does not apply, but it is still recorded here.
  const evening = withheld(street({ restrictions: [record('payment', { bands: [{ days: [1, 2, 3, 4, 5], startMinute: 1080, endMinute: 1320 }] })] }), 'restriction_recorded');
  assert.ok(!evening.reasons.includes('restriction_applies'));
  // A stay that runs into the band does.
  withheld(street({ stayMinutes: 420, restrictions: [record('payment', { bands: [{ days: [1], startMinute: 1080, endMinute: 1320 }] })] }), 'restriction_applies');
  // A band ending exactly when the stay starts does not apply, but is recorded.
  assert.ok(!withheld(street({ restrictions: [record('no_parking', { bands: [{ days: [1], startMinute: 420, endMinute: 720 }] })] }), 'restriction_recorded').reasons.includes('restriction_applies'));
  // A dated closure applies only within its dates; a future one is still recorded, an expired one is not.
  assert.ok(!withheld(street({ restrictions: [record('events_closures', { validFrom: '2026-11-01T00:00:00Z', validUntil: '2026-11-02T00:00:00Z' })] }), 'restriction_recorded').reasons.includes('restriction_applies'));
  shown(street({ restrictions: [record('events_closures', { validFrom: '2026-10-01T00:00:00Z', validUntil: '2026-10-02T00:00:00Z' })] }), 'expired closure');
  withheld(street({ stayMinutes: 600, restrictions: [record('events_closures', { validFrom: '2026-10-27T00:00:00Z', validUntil: '2026-11-02T00:00:00Z' })] }), 'restriction_applies');
  // Vehicle: an exemption for the selected vehicle lifts that record only.
  shown(street({ vehicleType: 'motorcycle', restrictions: [record('vehicle_class', { exemptVehicles: ['motorcycle'] })] }));
  withheld(street({ restrictions: [record('vehicle_class', { exemptVehicles: ['motorcycle'] })] }), 'restriction_applies');
});

test('review probe: payment or a restriction recorded only at other times still withholds', () => {
  for (const [name, item] of [
    ['payment Mon–Fri 18:00–22:00, queried Monday noon', record('payment', { sourceId: 'meters', bands: [{ days: [1, 2, 3, 4, 5], startMinute: 1080, endMinute: 1320 }] })],
    ['street cleaning on Tuesday', record('street_cleaning', { bands: [{ days: [2], startMinute: 480, endMinute: 600 }] })],
  ]) {
    const result = withheld(street({ restrictions: [item] }), 'restriction_recorded', name);
    assert.ok(!result.reasons.includes('restriction_applies'), name);
  }
});

test('rule 1: a limit recorded by the parking layer itself reaches the limit variants', () => {
  const layer = limit => ({ sourceId: 'blockface', recordId: 'bf-1', fetchedAt: hoursAgo(2), limit });
  const band = [{ days: [1, 2, 3, 4, 5, 6], startMinute: 420, endMinute: 1080 }];
  const fits = shown(street({ parkingLayer: layer({ minutes: 120, bands: band, scheduleComplete: true }) }), 'layer limit fits');
  assert.equal(fits.variant, 'limit_fits');
  assert.deepEqual(fits.limits, [{ minutes: 120, bands: band }]);
  withheld(street({ stayMinutes: 180, parkingLayer: layer({ minutes: 120, bands: band, scheduleComplete: true }) }), 'limit_exceeded', 'layer limit exceeded');
  withheld(street({ parkingLayer: layer({ minutes: null, bands: band, scheduleComplete: true }) }), 'unclassifiable_record', 'layer limit without minutes');
  withheld(street({ parkingLayer: layer({ minutes: 120, bands: null, scheduleComplete: true }) }), 'empty_band', 'layer limit without hours');
  withheld(street({ parkingLayer: layer({ minutes: 120, bands: band, scheduleComplete: false }) }), 'incomplete_schedule', 'layer limit incomplete');
});

test('rule 4: a limit shorter than the stay withholds; a fitting limit is shown', () => {
  const limit = record('time_limit', { limitMinutes: 60, bands: [{ days: [1, 2, 3, 4, 5, 6], startMinute: 420, endMinute: 1080 }] });
  withheld(street({ restrictions: [limit] }), 'limit_exceeded');
  assert.equal(shown(street({ stayMinutes: 60, restrictions: [limit] })).variant, 'limit_fits');
  // Inactive on Sunday, still recorded and shown.
  assert.equal(shown(street({ instant: new Date('2026-10-25T19:00:00Z'), restrictions: [limit] })).variant, 'limit_fits');
});

test('rule 4: silence outside listed hours, empty bands and unclassifiable records', () => {
  for (const [name, item, reason] of [
    ['incomplete schedule', record('permit', { scheduleComplete: false, bands: [{ days: [1], startMinute: 1080, endMinute: 1320 }] }), 'incomplete_schedule'],
    ['null band', record('payment', { bands: null }), 'empty_band'],
    ['empty band', record('permit', { bands: [] }), 'empty_band'],
    ['null category', record(null), 'unclassifiable_record'],
    ['unknown category', record('valet'), 'unclassifiable_record'],
    ['malformed band', record('payment', { bands: [{ days: [9], startMinute: 0, endMinute: 60 }] }), 'unclassifiable_record'],
    ['zero-length band', record('payment', { bands: [{ days: [1], startMinute: 60, endMinute: 60 }] }), 'unclassifiable_record'],
    ['time limit without minutes', record('time_limit', { limitMinutes: null }), 'unclassifiable_record'],
    ['malformed date', record('events_closures', { validFrom: 'soon' }), 'unclassifiable_record'],
  ]) withheld(street({ restrictions: [item] }), reason, name);
});

test('rule 4: location uncertainty withholds every place a record could belong to', () => {
  for (const [name, input, expected] of [
    ['point at 15 m', street({ restrictions: [record('no_parking', { location: { kind: 'point', distanceMeters: 15 } })] }), 'restriction_applies'],
    ['point at 15.1 m', street({ restrictions: [record('no_parking', { location: { kind: 'point', distanceMeters: 15.1 } })] }), null],
    ['block record, this block (both sides)', street({ restrictions: [record('loading', { location: { kind: 'block', blockId: 'block-1' } })] }), 'restriction_applies'],
    ['block record, other block', street({ restrictions: [record('loading', { location: { kind: 'block', blockId: 'block-2' } })] }), null],
    ['exact, other side', street({ restrictions: [record('loading', { location: { kind: 'exact', placeId: 'side-2' } })] }), null],
    ['unknown location', street({ restrictions: [record('loading', { location: { kind: 'unknown' } })] }), 'uncertain_location'],
    ['lot: record inside', lot({ restrictions: [record('loading', { location: { kind: 'area', distanceMeters: 0 } })] }), 'restriction_applies'],
    ['lot: within 15 m of footprint', lot({ restrictions: [record('loading', { location: { kind: 'point', distanceMeters: 14 } })] }), 'restriction_applies'],
    ['lot: beyond 15 m', lot({ restrictions: [record('loading', { location: { kind: 'point', distanceMeters: 16 } })] }), null],
    ['NaN distance', street({ restrictions: [record('loading', { location: { kind: 'point', distanceMeters: NaN } })] }), 'restriction_applies'],
  ]) {
    if (expected) withheld(input, expected, name); else shown(input, name);
  }
});

test('rule 4: lots — eligibility and system rules restrict, the shortest maximum is the limit, operator conflicts are Unknown', () => {
  const at = { location: { kind: 'exact', placeId: 'lot-1' }, sourceId: 'lots' };
  withheld(lot({ restrictions: [record('eligibility', { ...at, operator: 'metro' })] }), 'restriction_applies');
  withheld(lot({ restrictions: [record('eligibility', { ...at, operator: 'st', id: 'system-wide' })] }), 'restriction_applies');
  const max = minutes => record('time_limit', { ...at, limitMinutes: minutes, operator: 'st', id: `max-${minutes}` });
  const fits = shown(lot({ restrictions: [max(1440), max(4320)] }));
  assert.equal(fits.limits[0].minutes, 1440);
  withheld(lot({ stayMinutes: 1500, restrictions: [max(1440), max(4320)] }), 'limit_exceeded');
  withheld(lot({ restrictions: [max(1440), { ...max(4320), operator: 'metro' }] }), 'operator_conflict');
  shown(lot({ restrictions: [max(1440), { ...max(1440), operator: 'metro', id: 'metro-max' }] }));
});

test('rule 4: freshness — 7 days, E5 within 24 h, citations within 60 days, E5 required per place type', () => {
  for (const [name, input, reason] of [
    ['layer synced 8 days ago', street({ sources: withSources({ blockface: { lastSyncAt: hoursAgo(24 * 8) } }) }), 'stale_source'],
    ['layer record fetched 8 days ago', street({ parkingLayer: { sourceId: 'blockface', recordId: 'bf-1', fetchedAt: hoursAgo(24 * 8) } }), 'stale_source'],
    ['layer sync failed format check', street({ sources: withSources({ blockface: { formatValid: false } }) }), 'stale_source'],
    ['restriction source synced 8 days ago', street({ sources: withSources({ signs: { lastSyncAt: hoursAgo(24 * 8) } }) }), 'stale_source'],
    ['sync in the future', street({ sources: withSources({ signs: { lastSyncAt: hoursAgo(-1) } }) }), 'stale_source'],
    ['E5 synced 25 h ago', street({ sources: withSources({ closures: { lastSyncAt: hoursAgo(25) } }) }), 'no_temporary_source'],
    ['E5 policy caps a looser source limit', street({ sources: withSources({ closures: { lastSyncAt: hoursAgo(25), freshnessMinutes: 10080 } }) }), 'no_temporary_source'],
    ['citations 61 days behind', street({ sources: withSources({ citations: { dataAsOf: hoursAgo(24 * 61) } }) }), 'stale_citations'],
    ['citations without as-of', street({ sources: withSources({ citations: { dataAsOf: null } }) }), 'stale_citations'],
    ['no E5 for lots', lot({ register: { ...register(), entries: register().entries.filter(entry => !(entry.placeType === 'lot' && entry.category === 'temporary')) } }), 'no_temporary_source'],
    ['E5 without its role', street({ sources: withSources({ closures: { roles: [] } }) }), 'no_temporary_source'],
  ]) withheld(input, reason, name);
  shown(street({ sources: withSources({ blockface: { lastSyncAt: hoursAgo(24 * 7 - 1) }, closures: { lastSyncAt: hoursAgo(23) }, citations: { dataAsOf: hoursAgo(24 * 59) } }) }));
  shown(lot());
});

test('rule 4: stay cap — 72 h, the general limit, and invalid input', () => {
  shown(street({ stayMinutes: 72 * 60 }));
  withheld(street({ stayMinutes: 72 * 60 + 1 }), 'stay_too_long');
  withheld(street({ stayMinutes: 180, generalLimitMinutes: 120 }), 'stay_too_long');
  const given = shown(street({ stayMinutes: 30 }));
  assert.equal(given.stayAssumed, false);
  for (const input of [street({ stayMinutes: -1 }), street({ stayMinutes: 1.5 }), street({ timeZone: 'Nowhere/City' }), street({ instant: new Date('x') }), street({ generalLimitMinutes: 0 })]) {
    withheld(input, 'invalid_input');
  }
});

test('withholding is a union: every applicable reason is reported', () => {
  const result = withheld(street({ register: null, parkingLayer: null, restrictions: [record('payment'), record(null)] }));
  for (const reason of ['register_not_approved', 'register_not_measured', 'no_parking_layer', 'restriction_applies', 'unclassifiable_record']) {
    assert.ok(result.reasons.includes(reason), reason);
  }
});

// Review cases from PRs #123, #124, #128 and #132, as synthetic fixtures.
test('review case Seattle T2: no-parking signs inside a side the layer records as a 60-minute limit', () => {
  const limit = record('time_limit', { sourceId: 'blockface', limitMinutes: 60, bands: [{ days: [1, 2, 3, 4, 5, 6], startMinute: 420, endMinute: 1080 }] });
  const signs = [
    record('no_parking', { id: 'R7-WI30', location: { kind: 'point', distanceMeters: 0 } }),
    record('no_parking', { id: 'R7-NPR', location: { kind: 'point', distanceMeters: 3 } }),
  ];
  withheld(street({ stayMinutes: 60, restrictions: [limit, ...signs] }), 'restriction_applies');
  // Without the sign layer's records, only the limit is known and it is shown.
  assert.equal(shown(street({ stayMinutes: 60, restrictions: [limit] })).variant, 'limit_fits');
});

test('review case sign-test side 7: truck-loading signs on a side the curb layer marks as plain time-limited', () => {
  const restrictions = [
    record('time_limit', { sourceId: 'blockface', limitMinutes: 120 }),
    record('loading', { id: 'truck-load-only', exemptVehicles: ['truck'], location: { kind: 'point', distanceMeters: 4 } }),
  ];
  withheld(street({ restrictions }), 'restriction_applies');
});

test('review case Vancouver MT1: a meter feed is not a parking layer, and a bus stop and no-stopping withhold', () => {
  const result = withheld(street({
    parkingLayer: { sourceId: 'meters', recordId: '302911', fetchedAt: hoursAgo(2) },
    restrictions: [
      record('bus_transit', { sourceId: 'citations', location: { kind: 'point', distanceMeters: 9 } }),
      record('no_stopping', { sourceId: 'citations', location: { kind: 'block', blockId: 'block-1' } }),
    ],
  }));
  assert.ok(result.reasons.includes('parking_layer_ineligible'));
  assert.ok(result.reasons.includes('restriction_applies'));
});

test('review case Metro 751: a carpool and vanpool only lot', () => {
  withheld(lot({ restrictions: [record('eligibility', { sourceId: 'lots', operator: 'metro', location: { kind: 'point', distanceMeters: 11 } })] }), 'restriction_applies');
});

test('review case Kent 872.1: conflicting operator maximums and a closure', () => {
  const at = { sourceId: 'lots', location: { kind: 'exact', placeId: 'lot-1' } };
  const st = record('time_limit', { ...at, id: 'st-24h', operator: 'st', limitMinutes: 1440 });
  const metro = record('time_limit', { ...at, id: 'metro-72h', operator: 'metro', limitMinutes: 4320 });
  const closure = record('events_closures', { ...at, id: 'nw-closure', validFrom: '2026-03-16T07:00:00Z', validUntil: '2027-01-01T08:00:00Z' });
  const result = withheld(lot({ restrictions: [st, metro, closure] }));
  assert.ok(result.reasons.includes('operator_conflict'));
  assert.ok(result.reasons.includes('restriction_applies'));
  withheld(lot({ restrictions: [st, metro] }), 'operator_conflict');
});

test('the evaluator answer is unchanged unless it is Unknown for lack of any rule', () => {
  const ruleSource = { id: 'official', name: 'Official', evidenceType: 'E1', approvalState: 'approved', lastSyncAt: hoursAgo(2), formatValid: true, freshnessMinutes: 10080 };
  const rule = (kind, extra = {}) => ({ id: kind, kind, days: [0, 1, 2, 3, 4, 5, 6], startMinute: 0, endMinute: 1440, source: ruleSource,
    sourceRecordId: kind, fetchedAt: ruleSource.lastSyncAt, parsed: true, priority: 0, ...extra });
  const evaluate = rules => evaluateParkingRules({ rules, instant: now, now, timeZone: 'America/Los_Angeles', context: {} });
  const passed = shown(street());
  const failed = withheld(street({ register: null }));
  for (const rules of [[rule('free')], [rule('paid', { rate: 2 })], [rule('no_parking')], [rule('free', { parsed: false })]]) {
    const base = evaluate(rules);
    assert.deepEqual(evaluateWithNoRestrictionFound(base, passed), base);
  }
  const none = evaluate([]);
  assert.equal(none.explanation, 'no_rule');
  assert.deepEqual(evaluateWithNoRestrictionFound(none, failed), none);
  const upgraded = evaluateWithNoRestrictionFound(none, passed);
  assert.equal(upgraded.classification, 'NO_RESTRICTION_FOUND');
  assert.equal(upgraded.explanation, 'noRestrictionFound.noLimit');
  assert.equal(upgraded.noRestrictionFound, passed);
});
