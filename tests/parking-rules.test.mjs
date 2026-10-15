import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateParkingRules } from '../lib/parking-rules.ts';

const now = new Date('2026-10-12T15:00:00Z');
const source = { id: 'official-fixture', name: 'Official fixture', evidenceType: 'E1', approvalState: 'approved', lastSyncAt: '2026-10-12T12:00:00Z', formatValid: true, freshnessMinutes: 10080 };
const rule = (kind, extra = {}) => ({ id: kind, kind, days: [0,1,2,3,4,5,6], startMinute: 0, endMinute: 1440, source, sourceRecordId: kind, fetchedAt: source.lastSyncAt, parsed: true, priority: 0, ...extra });
const evaluate = (rules, instant = now, context = {}) => evaluateParkingRules({ rules, instant, now, timeZone: 'America/Vancouver', context });

test('Vancouver permit-only takes precedence over a free rule', () => {
  const result = evaluate([rule('free'), rule('permit_only', { permitZone: 'RPP025' })]);
  assert.equal(result.classification, 'RESTRICTED');
  assert.equal(result.explanation, 'permit_only');
  assert.equal(result.source.id, 'official-fixture');
});

for (const [name, rules, instant, expected, reason] of [
  ['rush hour', [rule('free'), rule('paid', { startMinute: 570, endMinute: 1080, rate: 3 }), rule('tow_away', { startMinute: 420, endMinute: 570 })], '2026-10-12T15:00:00Z', 'RESTRICTED', 'tow_away'],
  ['meter at 10am', [rule('free'), rule('paid', { startMinute: 570, endMinute: 1080, rate: 3 }), rule('tow_away', { startMinute: 420, endMinute: 570 })], '2026-10-12T17:00:00Z', 'PAID', 'paid'],
  ['after hours explicit permission', [rule('free'), rule('paid', { startMinute: 570, endMinute: 1080, rate: 3 })], '2026-10-13T02:00:00Z', 'VERIFIED_FREE', 'free'],
  ['missing after-hours permission', [rule('paid', { startMinute: 570, endMinute: 1080, rate: 3 })], '2026-10-13T02:00:00Z', 'UNKNOWN', 'no_rule'],
  ['loading prohibition', [rule('free'), rule('loading', { days: [1,2,3,4,5], startMinute: 570, endMinute: 1080 })], '2026-10-12T17:00:00Z', 'RESTRICTED', 'loading'],
  ['OSM-only street', [], '2026-10-12T17:00:00Z', 'UNKNOWN', 'no_rule'],
  ['Monday overnight owns Tuesday morning', [rule('free', { days: [1], startMinute: 1080, endMinute: 120 })], '2026-10-13T08:00:00Z', 'VERIFIED_FREE', 'free'],
  ['overnight ends exclusively', [rule('free', { days: [1], startMinute: 1080, endMinute: 120 })], '2026-10-13T09:00:00Z', 'UNKNOWN', 'no_rule'],
]) test(name, () => {
  const result = evaluate(rules, new Date(instant));
  assert.equal(result.classification, expected);
  assert.equal(result.explanation, reason);
});

test('stale, rejected, signal, unparsed, malformed and failed sources cannot establish permission', () => {
  for (const extra of [
    { source: { ...source, lastSyncAt: '2026-10-01T12:00:00Z' } },
    { source: { ...source, approvalState: 'pending' } },
    { source: { ...source, evidenceType: 'signal' } },
    { source: { ...source, formatValid: false } },
    { parsed: false }, { days: [] }, { startMinute: 600, endMinute: 600 },
  ]) assert.equal(evaluate([rule('free', extra)]).classification, 'UNKNOWN');
  assert.equal(evaluate([rule('free'), rule('loading', { parsed: false })]).classification, 'UNKNOWN');
});

test('Seattle visitor allowance and time limits apply to the intended stay', () => {
  const rules = [rule('free'), rule('permit_only', { startMinute: 420, endMinute: 1080, visitorAllowanceMinutes: 120, permitZone: 'RPZ' })];
  assert.equal(evaluate(rules, now, { stayMinutes: 60 }).classification, 'VERIFIED_FREE');
  assert.equal(evaluate(rules, now, { stayMinutes: 180 }).classification, 'RESTRICTED');
  assert.equal(evaluate(rules, new Date('2026-10-13T02:00:00Z'), { stayMinutes: 60 }).classification, 'VERIFIED_FREE');
  assert.equal(evaluate([rule('free', { timeLimitMinutes: 120 })], now, { stayMinutes: 180 }).classification, 'RESTRICTED');
  assert.equal(evaluate([rule('free', { vehicleType: 'motorcycle' })]).classification, 'RESTRICTED');
});

test('Driver Warnings never change classification and retain their dates and counts', () => {
  const warnings = [{ status: 'FREE', count: 3, latest_at: '2026-10-12T14:00:00Z' }];
  const result = evaluateParkingRules({ rules: [], instant: now, now, timeZone: 'America/Vancouver', context: {}, driverWarnings: warnings });
  assert.equal(result.classification, 'UNKNOWN');
  assert.deepEqual(result.driverWarnings, warnings);
});

test('next change and stays crossing into payment or a prohibition are evaluated', () => {
  const rules = [rule('free'), rule('paid', { startMinute: 540, endMinute: 1080, rate: 3 })];
  assert.equal(evaluate(rules).nextChange, '2026-10-12T16:00:00.000Z');
  assert.equal(evaluate(rules, now, { stayMinutes: 120 }).classification, 'RESTRICTED');
  assert.equal(evaluate(rules, now, { stayMinutes: 60 }).classification, 'VERIFIED_FREE');
});

for (const timeZone of ['America/Vancouver', 'America/Los_Angeles']) {
  test(`${timeZone} spring jump and both autumn hours use the city's clock`, () => {
    const rules = [rule('free'), rule('no_stopping', { startMinute: 90, endMinute: 150 })];
    const at = instant => evaluateParkingRules({ rules, instant: new Date(instant), now: new Date(instant), timeZone, context: {} });
    // Use fresh fixture evidence for each seasonal test, without approving a real source.
    for (const r of rules) { r.source = { ...source, lastSyncAt: '2026-03-08T08:00:00Z' }; r.fetchedAt = r.source.lastSyncAt; }
    assert.equal(at('2026-03-08T09:45:00Z').classification, 'RESTRICTED');
    assert.equal(at('2026-03-08T09:45:00Z').nextChange, '2026-03-08T10:00:00.000Z');
    assert.equal(at('2026-03-08T10:00:00Z').classification, 'VERIFIED_FREE');
    for (const r of rules) { r.source = { ...source, lastSyncAt: '2026-11-01T07:00:00Z' }; r.fetchedAt = r.source.lastSyncAt; }
    assert.equal(at('2026-11-01T08:45:00Z').classification, 'RESTRICTED');
    assert.equal(at('2026-11-01T08:45:00Z').nextChange, '2026-11-01T09:00:00.000Z');
    assert.equal(at('2026-11-01T09:15:00Z').classification, 'VERIFIED_FREE');
    assert.equal(at('2026-11-01T09:45:00Z').classification, 'RESTRICTED');
  });
}

test('temporary reservations have inclusive start and exclusive expiry', () => {
  const rules = [rule('free'), rule('temporary_no_parking', { validFrom: '2026-10-12T16:00:00Z', validUntil: '2026-10-12T17:00:00Z', source: { ...source, evidenceType: 'E5', freshnessMinutes: 1440 } })];
  assert.equal(evaluate(rules).classification, 'VERIFIED_FREE');
  assert.equal(evaluate(rules, new Date('2026-10-12T16:00:00Z')).classification, 'RESTRICTED');
  assert.equal(evaluate(rules, new Date('2026-10-12T17:00:00Z')).classification, 'VERIFIED_FREE');
});

test('visitor allowance does not waive payment and prohibitions stay dominant', () => {
  const permit = rule('permit_only', { visitorAllowanceMinutes: 120 });
  assert.equal(evaluate([permit, rule('paid', { rate: 3 })], now, { stayMinutes: 60 }).classification, 'PAID');
  assert.equal(evaluate([permit, rule('loading')], now, { stayMinutes: 60 }).classification, 'RESTRICTED');
});

test('evidence capabilities cannot turn zones or temporary restrictions into free permission', () => {
  for (const evidenceType of ['E4','E5','E7','signal']) {
    assert.equal(evaluate([rule('free', { source: { ...source, evidenceType } })]).classification, 'UNKNOWN');
  }
  for (const evidenceType of ['E2','E3']) {
    assert.equal(evaluate([rule('free', { source: { ...source, evidenceType } })]).classification, 'UNKNOWN');
    assert.equal(evaluate([rule('free', { source: { ...source, evidenceType }, permissionComplete: true })]).classification, 'VERIFIED_FREE');
  }
});

test('official lot evidence cannot establish curb rules', () => {
  const rules = [rule('free', { source: { ...source, evidenceType: 'E6' } })];
  const input = { rules, instant: now, now, timeZone: 'America/Vancouver', context: {} };
  assert.equal(evaluateParkingRules({ ...input, placeKind: 'curb' }).classification, 'UNKNOWN');
  assert.equal(evaluateParkingRules({ ...input, placeKind: 'lot' }).classification, 'VERIFIED_FREE');
});

test('visitor payment cites the payment source and retrieval date', () => {
  const paymentSource = { ...source, id: 'payment-fixture', name: 'Official payment fixture' };
  const result = evaluate([
    rule('permit_only', { visitorAllowanceMinutes: 120 }),
    rule('paid', { rate: 3, source: paymentSource, fetchedAt: '2026-10-12T13:00:00Z' }),
  ], now, { stayMinutes: 60 });
  assert.equal(result.classification, 'PAID');
  assert.equal(result.source.id, 'payment-fixture');
  assert.equal(result.asOf, '2026-10-12T13:00:00Z');
  assert.equal(result.rate, 3);
});
