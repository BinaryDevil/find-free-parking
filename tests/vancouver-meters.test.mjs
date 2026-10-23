import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { adaptVancouverMeters } from '../lib/vancouver-meters.ts';
const response = JSON.parse(readFileSync(new URL('./fixtures/vancouver/live-records.json', import.meta.url)));
const source = { id: 'synthetic-only', name: 'Synthetic meter evidence', evidenceType: 'E2', approvalState: 'approved', lastSyncAt: '2026-10-15T06:00:00Z', formatValid: true, freshnessMinutes: 10080 };
const options = { source, fetchedAt: source.lastSyncAt, sourceEditedAt: null };
const key = row => `feature:${row.feature_id}`;
test('current response retains string identities and rejects renamed or missing safety fields', () => {
  const result = adaptVancouverMeters(response.results, options);
  assert.equal(result.records[0].sourceRecordId, key(response.results[0]));
  assert.equal(result.records[0].raw.meter_id, 'K22106');
  const old = { ...response.results[0], meterid: 'K22106' }; delete old.meter_id;
  assert.throws(() => adaptVancouverMeters([old], options), /meter_id/);
  const missing = { ...response.results[0] }; delete missing.prohibition_2_zone;
  assert.throws(() => adaptVancouverMeters([missing], options), /prohibition_2_zone/);
});
import { evaluateParkingRules } from '../lib/parking-rules.ts';
const at = (rules, instant) => evaluateParkingRules({ rules, instant: new Date(instant), now: new Date('2026-10-15T06:30:00Z'), timeZone: 'America/Vancouver', placeKind: 'meter', context: {} });
const ordinary = () => ({ ...response.results[0], flat_rate: null });
test('weekday/weekend limits and current rates reach the driver without guessed after-hours permission', () => {
  const row = { ...ordinary(), time_limit_weekend_9am_6pm: '4 Hr' };
  const rules = adaptVancouverMeters([row], options).records[0].rules;
  const monday = at(rules, '2026-10-12T17:00:00Z');
  assert.equal(monday.classification, 'PAID'); assert.equal(monday.rate, 3.5); assert.equal(monday.timeLimitMinutes, 120);
  assert.equal(at(rules, '2026-10-17T17:00:00Z').timeLimitMinutes, 240);
  assert.equal(at(rules, '2026-10-15T06:30:00Z').classification, 'UNKNOWN');
});
test('loading restrictions override payment and unresolved rush-day semantics remain Unknown', () => {
  const loading = { ...ordinary(), prohibition_1_days: 'Mon-Fri', prohibition_1_time: '9:30 AM - 6:00 PM', prohibition_1_zone: 'LOADING ZONE' };
  assert.equal(at(adaptVancouverMeters([loading], options).records[0].rules, '2026-10-12T17:00:00Z').classification, 'RESTRICTED');
  const rush = { ...ordinary(), am_rush_hours: '7:00 AM - 9:30 AM' };
  assert.equal(at(adaptVancouverMeters([rush], options).records[0].rules, '2026-10-12T15:00:00Z').classification, 'UNKNOWN');
});
test('reviewed per-meter rush days and explicit permission allow the 2026-10-05 regressions safely', () => {
  const row = { ...ordinary(), am_rush_hours: '7:00 AM - 9:30 AM' };
  const reviewed = { [key(row)]: { rawRecord: row, evidence: 'synthetic-fixture-only', rushDays: [1,2,3,4,5], afterHours: { days: [0,1,2,3,4,5,6], timeLimitMinutes: 120 } } };
  const rules = adaptVancouverMeters([row], { ...options, reviewed }).records[0].rules;
  assert.equal(at(rules, '2026-10-12T15:00:00Z').classification, 'RESTRICTED');
  assert.equal(at(rules, '2026-10-12T17:00:00Z').classification, 'PAID');
  assert.equal(at(rules, '2026-10-15T06:30:00Z').classification, 'VERIFIED_FREE');
});

const restrictions = JSON.parse(readFileSync(new URL('./fixtures/vancouver/live-restrictions.json', import.meta.url))).results;
test('recorded City to-ranges, seven-day labels, leading zeros and overnight restrictions parse', () => {
  const rows = adaptVancouverMeters(restrictions, options).records;
  assert.equal(rows[1].raw.meter_id, '060804');
  const loading = rows[0].rules.find(rule => rule.kind === 'loading');
  assert.equal(loading.startMinute, 570); assert.equal(loading.endMinute, 900);
  const taxi = rows.find(row => row.raw.meter_id === '600528').rules.find(rule => rule.kind === 'no_parking' && rule.parsed);
  assert.deepEqual(taxi.days, [0,1,2,3,4,5,6]); assert.equal(taxi.startMinute, 1260); assert.equal(taxi.endMinute, 240);
});
import { createVancouverMeterAdapter } from '../lib/vancouver-meters.ts';
test('complete feed retrieval paginates, omits Removed meters and rejects incomplete or changing feeds', async () => {
  const rows = [ordinary(), { ...ordinary(), meter_id: 'gone', feature_id: ordinary().feature_id + 1, service_status: 'Removed' }];
  const metadata = { metas: { default: { records_count: 2, modified: '2026-10-12T13:31:51Z' } } };
  const request = async url => ({ ok: true, json: async () => url.includes('/records?') ? { total_count: 2, results: rows } : metadata });
  const adapter = createVancouverMeterAdapter(options, request);
  const snapshot = await adapter.fetchSnapshot(new AbortController().signal);
  assert.equal(snapshot.complete, true); assert.equal(snapshot.places.length, 1);
  assert.equal(snapshot.places[0].timezone, 'America/Vancouver');
  assert.equal(snapshot.places[0].rawData.meter_id, 'K22106');
  const truncated = async url => ({ ok: true, json: async () => url.includes('/records?') ? { total_count: 2, results: [] } : metadata });
  await assert.rejects(() => createVancouverMeterAdapter(options, truncated).fetchSnapshot(new AbortController().signal), /incomplete|Incomplete/);
});
test('PM rush, overnight second prohibition and intended stay remain restrictive', () => {
  const row = { ...ordinary(), pm_rush_hours: '3:00pm to 6:00pm', prohibition_2_days: 'Mon-Fri', prohibition_2_time: '10:00pm to 5:00am', prohibition_2_zone: 'NO STOPPING' };
  const reviewed = { [key(row)]: { rawRecord: row, evidence: 'synthetic-only', rushDays: [1,2,3,4,5], afterHours: { days: [0,1,2,3,4,5,6], timeLimitMinutes: 120 } } };
  const rules = adaptVancouverMeters([row], { ...options, reviewed }).records[0].rules;
  assert.equal(at(rules, '2026-10-12T23:00:00Z').explanation, 'tow_away');
  assert.equal(at(rules, '2026-10-13T06:00:00Z').explanation, 'no_stopping');
  assert.equal(at(rules, '2026-10-13T12:00:00Z').classification, 'VERIFIED_FREE');
  const result = evaluateParkingRules({ rules, instant: new Date('2026-10-13T12:00:00Z'), now: new Date('2026-10-15T06:30:00Z'), timeZone: 'America/Vancouver', placeKind: 'meter', context: { stayMinutes: 180 } });
  assert.equal(result.classification, 'RESTRICTED');
});
test('ambiguity, overrides, service status and changed reviewed records never yield free', () => {
  for (const change of [
    { time_limit_9am_6pm: null }, { time_limit_weekend_6pm_10pm: 'someday' },
    { time_limit_override: 'Yes' }, { prohibition_override: 'Yes' },
    { prohibition_2_zone: 'NEW ZONE' }, { vehicle_type: 'New Vehicle' },
    { service_status: 'Out of Service' }, { flat_rate: '$10 flat rate' },
    { prohibition_1_days: 'Mon-Fri', prohibition_1_time: 'nonsense', prohibition_1_zone: 'NO STOPPING' },
  ]) {
    const row = { ...ordinary(), ...change };
    const reviewed = { [key(row)]: { rawRecord: row, evidence: 'synthetic-only', afterHours: { days: [0,1,2,3,4,5,6], timeLimitMinutes: null } } };
    assert.equal(at(adaptVancouverMeters([row], { ...options, reviewed }).records[0].rules, '2026-10-15T06:30:00Z').classification, 'UNKNOWN');
  }
  const row = ordinary();
  const reviewed = { [key(row)]: { rawRecord: row, evidence: 'synthetic-only', afterHours: { days: [0,1,2,3,4,5,6], timeLimitMinutes: null } } };
  const changed = { ...row, rate_9am_6pm: '$9.00' };
  assert.equal(at(adaptVancouverMeters([changed], { ...options, reviewed }).records[0].rules, '2026-10-15T06:30:00Z').classification, 'UNKNOWN');
  const pending = { ...options, reviewed, source: { ...source, approvalState: 'pending' } };
  assert.equal(at(adaptVancouverMeters([row], pending).records[0].rules, '2026-10-15T06:30:00Z').classification, 'UNKNOWN');
});
test('motorcycle-only paid rules respect the vehicle, missing limits are not unlimited', () => {
  const rules = adaptVancouverMeters([{ ...ordinary(), vehicle_type: 'Motorcycle', time_limit_9am_6pm: 'No Time Limit' }], options).records[0].rules;
  assert.equal(at(rules, '2026-10-12T17:00:00Z').classification, 'RESTRICTED');
  const result = evaluateParkingRules({ rules, instant: new Date('2026-10-12T17:00:00Z'), now: new Date('2026-10-15T06:30:00Z'), timeZone: 'America/Vancouver', context: { vehicleType: 'motorcycle' } });
  assert.equal(result.classification, 'PAID'); assert.equal(result.timeLimitMinutes, null);
  assert.throws(() => adaptVancouverMeters([ordinary(), ordinary()], options), /Duplicate feature_id/);
  assert.throws(() => adaptVancouverMeters([{ ...ordinary(), geom: null }], options), /geom/);
});
test('multi-page snapshots fail on HTTP errors, count drift, duplicates and edit drift', async () => {
  const rows = Array.from({ length: 101 }, (_, i) => ({ ...ordinary(), meter_id: `synthetic-${i}`, feature_id: i + 1 }));
  const metadata = { metas: { default: { records_count: 101, modified: '2026-10-12T13:31:51Z' } } };
  const request = async (url, init) => {
    assert.equal(init?.redirect, 'error');
    const endpoint = createVancouverMeterAdapter(options).endpoint;
    const target = new URL(url);
    assert.ok([endpoint, `${endpoint}/records`].includes(`${target.origin}${target.pathname}`));
    const offset = Number(new URL(url).searchParams.get('offset'));
    return { ok: true, json: async () => url.includes('/records?') ? { total_count: 101, results: rows.slice(offset, offset + 100) } : metadata };
  };
  const signal = new AbortController().signal;
  assert.equal((await createVancouverMeterAdapter(options, request).fetchSnapshot(signal)).places.length, 101);
  await assert.rejects(() => createVancouverMeterAdapter(options, async () => ({ ok: false })).fetchSnapshot(signal), /retrieval failed/);
  let reads = 0;
  const drift = async (url, init) => {
    const result = await request(url, init);
    if (url.includes('/records?')) return result;
    reads++;
    return { ok: true, json: async () => reads === 1 ? metadata : { metas: { default: { records_count: 101, modified: '2026-10-13T13:31:51Z' } } } };
  };
  await assert.rejects(() => createVancouverMeterAdapter(options, drift).fetchSnapshot(signal), /changed during retrieval/);
});
test('feed count mismatches and duplicate identities cannot authorize missing-record retirement', async () => {
  const metadata = { metas: { default: { records_count: 2, modified: '2026-10-12T13:31:51Z' } } };
  const signal = new AbortController().signal;
  for (const page of [{ total_count: 3, results: [ordinary()] }, { total_count: 2, results: [ordinary(), ordinary()] }]) {
    const request = async url => ({ ok: true, json: async () => url.includes('/records?') ? page : metadata });
    await assert.rejects(() => createVancouverMeterAdapter(options, request).fetchSnapshot(signal), /Incomplete|order/);
  }
});
test('review evidence survives the sync boundary alongside the exact raw record', async () => {
  const row = ordinary();
  const reviewed = { [key(row)]: { rawRecord: row, evidence: 'synthetic-positive-permission', afterHours: { days: [0,1,2,3,4,5,6], timeLimitMinutes: 120 } } };
  const request = async url => ({ ok: true, json: async () => url.includes('/records?') ? { total_count: 1, results: [row] } : { metas: { default: { records_count: 1, modified: '2026-10-12T13:31:51Z' } } } });
  const snapshot = await createVancouverMeterAdapter({ ...options, reviewed }, request).fetchSnapshot(new AbortController().signal);
  const free = snapshot.places[0].rules.find(rule => rule.kind === 'free');
  assert.equal(free.rawData.semanticEvidence, 'synthetic-positive-permission');
  assert.deepEqual(free.rawData.record, row);
});

test('a stable official empty feed is a complete snapshot that can retire the final meter', async () => {
  const metadata = { metas: { default: { records_count: 0, modified: '2026-10-12T13:31:51Z' } } };
  const calls = [];
  const request = async url => { calls.push(url); return { ok: true, json: async () => metadata }; };
  const snapshot = await createVancouverMeterAdapter(options, request).fetchSnapshot(new AbortController().signal);
  assert.deepEqual(snapshot, { complete: true, sourceEditedAt: '2026-10-12T13:31:51Z', places: [] });
  assert.equal(calls.length, 2, 'both metadata reads must confirm the empty feed');
  let reads = 0;
  const changing = async () => ({ ok: true, json: async () => ({ metas: { default: {
    records_count: reads++ === 0 ? 0 : 1, modified: '2026-10-12T13:31:51Z',
  } } }) });
  await assert.rejects(() => createVancouverMeterAdapter(options, changing).fetchSnapshot(new AbortController().signal), /changed during retrieval/);
});

test('recorded City restrictions remain Unknown without complete rush semantics, including loading and overnight taxi', () => {
  for (const [id, instant] of [
    ['512404', '2026-10-12T15:00:00Z'], // 08:00 rush: no documented days
    ['512404', '2026-10-12T17:00:00Z'], // 10:00 loading: other applicable rules incomplete
    ['600528', '2026-10-13T06:00:00Z'], // 23:00 taxi, beyond payment hours
    ['301837', '2026-10-12T17:00:00Z'], // out of service
  ]) {
    const row = restrictions.find(row => row.meter_id === id);
    assert.ok(row);
    assert.equal(at(adaptVancouverMeters([row], options).records[0].rules, instant).classification, 'UNKNOWN', id);
  }
});
