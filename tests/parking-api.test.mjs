import test from 'node:test';
import assert from 'node:assert/strict';
import { legacyParkingEvaluation } from '../lib/legacy-parking-evaluation.ts';
import { parseParkingSelection } from '../lib/parking-selection.ts';
import { approvedParkingPlaceIds } from '../lib/approved-parking-coverage.ts';
import { classifiedPlaces } from '../lib/classified-places.ts';
import { classifiedMapFeatures } from '../components/parking-map/data.ts';

test('no approved Coverage leaves the new model dark without requiring its tables', async () => {
  const ids = await approvedParkingPlaceIds(async () => ({ rows: [{ ready: false }] }), [-1,-1,1,1]);
  const features = await classifiedPlaces(() => { throw new Error('New tables must not be read'); }, ids, [-1,-1,1,1], parseParkingSelection(new URLSearchParams()), new Date());
  assert.deepEqual(features, []);
});

test('interim payment display matches the viewer clock while streets and lots stay Unknown', () => {
  const selection = parseParkingSelection(new URLSearchParams({ at: '2026-10-12T17:00:00Z', legacyTimeZone: 'America/Vancouver' }));
  const data = { schedules: [{ days: ['Mon'], start: '09:00', end: '18:00', rate: 3 }], driver_warnings: [{ status: 'FREE', count: 3, latest_at: '2026-10-12T16:00:00Z' }] };
  assert.equal(legacyParkingEvaluation('METER', data, selection).classification, 'PAID');
  const abroad = { ...selection, legacyTimeZone: 'Asia/Tokyo' };
  assert.equal(legacyParkingEvaluation('METER', data, abroad).classification, 'UNKNOWN');
  for (const kind of ['STREET','ZONE']) {
    const result = legacyParkingEvaluation(kind, data, selection);
    assert.equal(result.classification, 'UNKNOWN');
    assert.deepEqual(result.evaluation.driverWarnings, data.driver_warnings);
  }
});

test('selection rejects wall clocks, invalid instants, stays and vehicle types', () => {
  for (const params of [{ at:'2026-10-12T10:00' }, { at:'wrong' }, { stayMinutes:'-1' }, { stayMinutes:'1.5' }, { stayMinutes:'' }, { stayMinutes:'10081' }, { vehicleType:'spaceship' }, { legacyTimeZone:'wrong' }]) {
    assert.throws(() => parseParkingSelection(new URLSearchParams(params)));
  }
});

test('map presentation consumes server classifications without interpreting evidence or warnings', () => {
  const feature = (classification, type = 'Point') => ({ type: 'Feature', geometry: { type, coordinates: [0,0] }, properties: { evaluation: { classification, driverWarnings: [], timeLimitMinutes: 120, rate: null } } });
  const result = classifiedMapFeatures([feature('VERIFIED_FREE'), feature('PAID'), feature('UNKNOWN'), feature('RESTRICTED')], 'FREE');
  assert.deepEqual(result.points.map(f => f.properties.classification), ['FREE','UNKNOWN','RESTRICTED']);
  assert.equal(result.pointCount, 1);
  assert.equal(result.unknownCount, 1);
});
