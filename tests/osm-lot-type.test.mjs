import test from 'node:test';
import assert from 'node:assert/strict';
import { mapOsmToZoneType } from '../scripts/osm-lot-type.ts';
import { classifyParking } from '../lib/parking-classification.ts';

test('unknown OSM fees stay context without a paid claim', () => {
  for (const tags of [{}, { fee: 'unknown' }, { access: 'public' }, { parking: 'park_and_ride' }]) {
    const type = mapOsmToZoneType(tags);
    assert.equal(type, 'MIXED');
    assert.equal(classifyParking('ZONE', { type, source: 'OSM' }, new Date()), 'UNKNOWN');
  }
  assert.equal(mapOsmToZoneType({ access: 'customers' }), null);
  assert.equal(mapOsmToZoneType({ fee: 'yes' }), 'PAID');
  assert.equal(mapOsmToZoneType({ fee: 'no' }), 'FREE_UNLIMITED');
  assert.equal(classifyParking('ZONE', { type: 'PAID', source: 'OSM' }, new Date()), 'UNKNOWN');
});
