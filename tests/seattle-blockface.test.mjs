import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { adaptSeattleBlockface, fetchSeattleBlockface } from '../scripts/adapters/seattle-blockface.ts';
import { evaluateParkingRules } from '../lib/parking-rules.ts';

const layer = JSON.parse(readFileSync(new URL('./fixtures/seattle-blockface/layer.json', import.meta.url)));
const records = JSON.parse(readFileSync(new URL('./fixtures/seattle-blockface/records.geojson', import.meta.url)));
const fetchedAt = '2026-10-15T06:21:00Z';

test('recorded mixed curb preserves published weekday and Saturday rates without claiming permission', () => {
  const places = adaptSeattleBlockface(layer, records).places;
  const place = places.find(place => place.sourceRecordId === '6357');
  assert.equal(place.city, 'Seattle');
  assert.equal(place.timezone, 'America/Los_Angeles');
  assert.equal(place.kind, 'curb');
  const morning = place.rules.find(rule => rule.sourceRecordId === '6357:paid:WKD:1');
  assert.equal(morning.kind, 'paid');
  assert.equal(morning.rate, 1);
  assert.deepEqual(morning.days, [1,2,3,4,5]);
  assert.equal(morning.startMinute, 480);
  assert.equal(morning.endMinute, 659); // Published bound, never guessed +1.
  assert.equal(morning.timeLimitMinutes, 240);
  assert.equal(morning.parsed, false);
  assert.equal(place.rules.find(rule => rule.sourceRecordId === '6357:paid:SAT:2').rate, 1.5);
  assert.ok(place.rules.some(rule => rule.kind === 'no_parking'));
  assert.ok(!place.rules.some(rule => rule.kind === 'free'));
  const source = { id:'synthetic', name:'Fixture', evidenceType:'E1', approvalState:'approved', lastSyncAt:fetchedAt, formatValid:true, freshnessMinutes:10080 };
  for (const at of ['2026-10-15T17:00:00Z','2026-10-18T20:00:00Z']) {
    assert.equal(evaluateParkingRules({ rules:place.rules.map(rule => ({ ...rule, id:rule.sourceRecordId, fetchedAt, source })), instant:new Date(at), now:new Date(fetchedAt), timeZone:place.timezone, context:{} }).classification, 'UNKNOWN');
  }
});

test('a renamed field, changed type, missing record value or invalid geometry fails the entire batch', () => {
  for (const mutate of [
    layer => { layer.fields.find(field => field.name === 'WKD_RATE1').name = 'NEW_RATE'; },
    layer => { layer.fields.find(field => field.name === 'PEAK_HOUR').type = 'esriFieldTypeDouble'; },
  ]) {
    const changed = structuredClone(layer);
    mutate(changed);
    assert.throws(() => adaptSeattleBlockface(changed, records), /Blockface format/);
  }
  for (const mutate of [
    row => { delete row.properties.NOSTOP; },
    row => { row.properties.WKD_RATE1 = '1'; },
    row => { row.geometry.coordinates[0][0] = 500000; },
    row => { row.properties.ELMNTKEY = null; },
  ]) {
    const changed = structuredClone(records);
    mutate(changed.features.at(-1));
    assert.throws(() => adaptSeattleBlockface(layer, changed), /Blockface format/);
  }
});

test('inventory peak, RPZ, no-parking and time-limited samples remain typed Unknown with raw evidence', () => {
  const places = adaptSeattleBlockface(layer, records).places;
  const peak = places.find(p => p.sourceRecordId === '70725').rules.find(r => r.sourceRecordId.endsWith(':peak'));
  assert.equal(peak.kind, 'no_stopping');
  assert.equal(peak.rawData.text, '6-9AM 3-7PM');
  assert.equal(peak.days, null); // No invented weekday/holiday interpretation.
  const rpz = places.find(p => p.sourceRecordId === '14366').rules.find(r => r.kind === 'permit_only');
  assert.equal(rpz.permitZone, '8');
  assert.equal(rpz.parsed, false);
  assert.equal(rpz.visitorAllowanceMinutes, undefined); // Paid-area limit is not a visitor allowance.
  const limited = places.find(p => p.sourceRecordId === '8281');
  assert.equal(limited.rawData.PARKING_TIME_LIMIT, 240);
  assert.ok(limited.rules.every(r => r.kind !== 'free'));
  assert.ok(places.find(p => p.sourceRecordId === '11009').rules.some(r => r.kind === 'no_parking' && !r.parsed));
});

test('Sunday and zero/missing payment bands never become free permission', () => {
  const changed = structuredClone(records);
  const p = changed.features[0].properties;
  Object.assign(p, { SUN_RATE1:2, SUN_START1:600, SUN_END1:1079, SUN_RATE2:0, SUN_START2:1080, SUN_END2:1199 });
  const place = adaptSeattleBlockface(layer, changed).places[0];
  assert.deepEqual(place.rules.find(r => r.sourceRecordId.endsWith(':paid:SUN:1')).days, [0]);
  const zero = place.rules.find(r => r.sourceRecordId.endsWith(':paid:SUN:2'));
  assert.equal(zero.parsed, false);
  assert.equal(zero.rate, null);
  assert.equal(zero.rawData.rate, 0);
  assert.ok(place.rules.every(r => r.kind !== 'free'));
});

test('reader obtains all ID pages, validates complete membership and refuses truncated responses', async () => {
  const queue = [layer, { objectIds: records.features.map(f => f.properties.OBJECTID) }, records, layer];
  const urls = [];
  const snapshot = await fetchSeattleBlockface(AbortSignal.timeout(10000), async url => {
    urls.push(new URL(url));
    return Response.json(queue.shift());
  });
  assert.equal(snapshot.complete, true);
  assert.equal(snapshot.places.length, 28);
  assert.equal(urls[2].searchParams.get('outSR'), '4326');
  assert.equal(urls[1].searchParams.get('returnIdsOnly'), 'true');
  const truncated = [layer, { objectIds: records.features.map(f => f.properties.OBJECTID) }, { ...records, exceededTransferLimit:true }];
  await assert.rejects(fetchSeattleBlockface(AbortSignal.timeout(10000), async () => Response.json(truncated.shift())), /Blockface format/);
  const missing = [layer, { objectIds: records.features.map(f => f.properties.OBJECTID) }, { ...records, features:records.features.slice(1) }];
  await assert.rejects(fetchSeattleBlockface(AbortSignal.timeout(10000), async () => Response.json(missing.shift())), /Blockface format/);
});

test('reader crosses the page boundary and rejects an export changing during retrieval', async () => {
  const many = Array.from({ length:201 }, (_, index) => {
    const feature = structuredClone(records.features[0]);
    feature.properties.OBJECTID = index + 1;
    feature.properties.ELMNTKEY = index + 1;
    return feature;
  });
  const queue = [layer, { objectIds:many.map(f => f.properties.OBJECTID) }, { type:'FeatureCollection', features:many.slice(0,200) }, { type:'FeatureCollection', features:many.slice(200) }, layer];
  const result = await fetchSeattleBlockface(AbortSignal.timeout(10000), async () => Response.json(queue.shift()));
  assert.equal(result.places.length, 201);
  assert.equal(result.places[200].sourceRecordId, '201');
  assert.equal(queue.length, 0);
  const edited = structuredClone(layer);
  edited.editingInfo.lastEditDate += 1000;
  const changed = [layer, { objectIds:records.features.map(f => f.properties.OBJECTID) }, records, edited];
  await assert.rejects(fetchSeattleBlockface(AbortSignal.timeout(10000), async () => Response.json(changed.shift())), /source changed/);
});

test('ELMNTKEY survives export row renumbering and unreviewed added columns are excluded', () => {
  const changed = structuredClone(records);
  changed.features[0].properties.OBJECTID += 100000;
  changed.features[0].properties.NEW_UNREVIEWED_FIELD = 'not retained';
  const before = adaptSeattleBlockface(layer, records).places[0];
  const after = adaptSeattleBlockface(layer, changed).places[0];
  assert.equal(after.sourceRecordId, before.sourceRecordId);
  assert.deepEqual(after.rules.map(r => r.sourceRecordId), before.rules.map(r => r.sourceRecordId));
  assert.equal(after.rawData.NEW_UNREVIEWED_FIELD, undefined);
});
