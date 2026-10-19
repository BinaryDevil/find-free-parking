import test from 'node:test';
import assert from 'node:assert/strict';
import { legacyServingSql } from '../lib/legacy-serving.ts';

test('pre-migration legacy context remains readable', async () => {
  assert.equal(await legacyServingSql(async () => ({ rows: [{ ready: false }] }), 'parking_meters'), '');
});

test('retired rows remain excluded until explicit reversal', async () => {
  const sql = await legacyServingSql(async () => ({ rows: [{ ready: true }] }), 'street_segments', 's');
  assert.match(sql, /m.place_id = s.id/);
  assert.match(sql, /r.reversed_at IS NULL/);
  assert.match(sql, /m.place_table = 'street_segments'/);
});

test('unrecognized tables and aliases cannot enter reader SQL', async () => {
  const query = async () => ({ rows: [{ ready: true }] });
  await assert.rejects(() => legacyServingSql(query, 'places'));
  await assert.rejects(() => legacyServingSql(query, 'parking_zones', 'z;DROP'));
});

test('partial archive schema fails closed instead of reviving context', async () => {
  await assert.rejects(() => legacyServingSql(async () => ({ rows: [{ ready: false, partial: true }] }), 'parking_meters'), /Incomplete archive schema/);
});
