import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { adaptVancouverPermitZones, fetchVancouverPermitZones } from '../scripts/adapters/vancouver-permit.ts';
import { evaluateParkingRules } from '../lib/parking-rules.ts';
const layer = JSON.parse(readFileSync(new URL('./fixtures/vancouver-permit/layer.json', import.meta.url)));
const records = JSON.parse(readFileSync(new URL('./fixtures/vancouver-permit/records.geojson', import.meta.url)));

test('recorded RPO, RPP and VRPP preserve zone names and stay Unknown without signed curb schedules', () => {
  const snapshot = adaptVancouverPermitZones(layer, records);
  assert.deepEqual(new Set(snapshot.places.map(p => p.rawData.TYPE)), new Set(['RPP','RPO','VRPP']));
  assert.ok(snapshot.places.some(p => p.name === 'RPP025 · West End Plateau'));
  const now = '2026-10-19T12:00:00Z';
  const source = { id:'synthetic', name:'Synthetic approval only', evidenceType:'E4', approvalState:'approved', lastSyncAt:now, formatValid:true, freshnessMinutes:10080 };
  for (const place of snapshot.places) {
    assert.equal(place.kind, 'zone');
    assert.ok(place.rules.every(r => r.kind === 'permit_only' && !r.parsed && r.days === null));
    assert.equal(evaluateParkingRules({ rules:place.rules.map(r => ({...r,id:r.sourceRecordId,source,fetchedAt:now})), instant:new Date(now), now:new Date(now),timeZone:place.timezone,context:{} }).classification,'UNKNOWN');
  }
  assert.equal(evaluateParkingRules({rules:[],instant:new Date(now),now:new Date(now),timeZone:'America/Vancouver',context:{}}).classification,'UNKNOWN');
});

test('renamed fields, unknown types, broken rings and repeated polygon parts reject the snapshot', () => {
  const changedLayer = structuredClone(layer);
  changedLayer.fields.find(f => f.name === 'TYPE').name = 'NEW_TYPE';
  assert.throws(() => adaptVancouverPermitZones(changedLayer,records), /Permit format/);
  for (const mutate of [
    f => { delete f.properties.MAPID; },
    f => { f.properties.TYPE = 'UNKNOWN'; },
    f => { f.geometry.coordinates[0][0][0] = 500000; },
    f => { f.geometry.coordinates[0].pop(); },
  ]) {
    const changed = structuredClone(records);
    mutate(changed.features[0]);
    assert.throws(() => adaptVancouverPermitZones(layer,changed), /Permit format/);
  }
  assert.throws(() => adaptVancouverPermitZones(layer,{...records,features:[records.features[0],records.features[0]]}), /duplicate/);
  const changed = structuredClone(records);
  changed.features[0].properties.OBJECTID += 10000;
  assert.equal(adaptVancouverPermitZones(layer,changed).places[0].sourceRecordId,adaptVancouverPermitZones(layer,records).places[0].sourceRecordId);
});

test('full snapshot validates ID membership, truncation, metadata changes and abort propagation', async () => {
  const ids = records.features.map(f => f.properties.OBJECTID);
  const signal = new AbortController().signal;
  const run = async queue => fetchVancouverPermitZones(signal, async (_url,options) => {
    assert.equal(options.signal,signal);
    return {ok:true,json:async () => queue.shift()};
  });
  assert.equal((await run([layer,{objectIds:ids},records,layer])).places.length,ids.length);
  await assert.rejects(run([layer,{objectIds:ids},{...records,exceededTransferLimit:true}]),/Permit format/);
  await assert.rejects(run([layer,{objectIds:[...ids,99999]},records]),/incomplete ID page/);
  const edited = structuredClone(layer);
  edited.editingInfo.lastEditDate++;
  await assert.rejects(run([layer,{objectIds:ids},records,edited]),/source changed/);
});

test('a synthetic precisely signed all-day E4 rule restricts ordinary cars, never implies outside permission', () => {
  const now = '2026-10-19T12:00:00Z';
  const source = {id:'synthetic',name:'Synthetic signed curb',evidenceType:'E4',approvalState:'approved',lastSyncAt:now,formatValid:true,freshnessMinutes:10080};
  const rule = {id:'signed-curb',sourceRecordId:'synthetic-only',kind:'permit_only',permitZone:'RPP025',days:[0,1,2,3,4,5,6],startMinute:0,endMinute:1440,priority:0,parsed:true,permissionComplete:false,source,fetchedAt:now};
  const input = {instant:new Date(now),now:new Date(now),timeZone:'America/Vancouver',context:{vehicleType:'car'}};
  assert.equal(evaluateParkingRules({...input,rules:[rule]}).classification,'RESTRICTED');
  assert.equal(evaluateParkingRules({...input,rules:[]}).classification,'UNKNOWN');
});
