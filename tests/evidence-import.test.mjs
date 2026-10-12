import test from 'node:test';
import assert from 'node:assert/strict';

test('an import requires stable source record IDs before it can write', async () => {
  const { importPlaces } = await import('../scripts/evidence-import.ts');
  await assert.rejects(() => importPlaces(null, {
    sourceId: '00000000-0000-0000-0000-000000000001',
    table: 'street_segments',
    records: [{ sourceRecordId: '', geom: { type: 'LineString', coordinates: [[0, 0], [1, 1]] } }],
  }), /source record ID/);
});

test('geometry identities distinguish repeated block IDs and survive JSON field order changes', async () => {
  const { geometryRecordId } = await import('../scripts/evidence-import.ts');
  const first = geometryRecordId('block-1', { type: 'LineString', coordinates: [[0, 0], [1, 1]] });
  assert.equal(geometryRecordId('block-1', { coordinates: [[0, 0], [1, 1]], type: 'LineString' }), first);
  assert.notEqual(geometryRecordId('block-1', { type: 'LineString', coordinates: [[2, 2], [3, 3]] }), first);
});

test('conflicting records cannot share one source identity in a batch', async () => {
  const { importPlaces } = await import('../scripts/evidence-import.ts');
  await assert.rejects(() => importPlaces(null, {
    sourceId: '00000000-0000-0000-0000-000000000001', table: 'street_segments',
    records: [
      { sourceRecordId: 'same', streetUse: 'Unknown' },
      { sourceRecordId: 'same', streetUse: 'Paid' },
    ],
  }), /Conflicting source record ID/);
});
