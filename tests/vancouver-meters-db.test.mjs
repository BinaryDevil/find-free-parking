import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Pool } from 'pg';
import { runner } from 'node-pg-migrate';
import { createVancouverMeterAdapter, VANCOUVER_METERS_ENDPOINT } from '../lib/vancouver-meters.ts';
import { syncSource } from '../scripts/source-sync.ts';
import { classifiedPlaces } from '../lib/classified-places.ts';

const connectionString = process.env.METER_TEST_DATABASE_URL;
test('meter snapshots reach classified reads and retire absent/Removed meters without deleting history', { skip: !connectionString }, async () => {
  const url = new URL(connectionString);
  assert.equal(url.hostname, '127.0.0.1');
  assert.match(url.pathname, /^\/vancouver_meter_test_28(?:_\d+)?$/);
  const pool = new Pool({ connectionString, max: 3 });
  const client = await pool.connect();
  try {
    assert.deepEqual((await client.query("SELECT tablename FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema','migration_meta')")).rows, []);
    await runner({ dbClient: client, dir: 'sql/migrations', migrationsSchema: 'migration_meta', migrationsTable: 'pgmigrations', createMigrationsSchema: true,
      direction: 'up', singleTransaction: true, log() {}, logger: { debug() {}, info() {}, warn() {}, error() {} } });
    await client.query('SET search_path = public, pg_catalog');
    const source = (await client.query(`INSERT INTO public.evidence_sources
      (source_key,area,evidence_type,approval_state,approved_by,approved_at,publisher,endpoint,licence,reuse_terms,inventory_doc_path,freshness_limit)
      VALUES ('vancouver-parking-meters','Vancouver','E2','approved','synthetic test only',now(),'Synthetic City fixture',
      $1,'fixture','fixture','fixture',interval '7 days') RETURNING *`, [VANCOUVER_METERS_ENDPOINT])).rows[0];
    const recorded = JSON.parse(readFileSync(new URL('./fixtures/vancouver/live-records.json', import.meta.url))).results[0];
    // Only the input format is recorded. Identities and reviewed permissions here
    // are synthetic contracts, never evidence for approving an actual City meter.
    const row = { ...recorded, meter_id: 'synthetic-rush', flat_rate: null, am_rush_hours: '7:00 AM - 9:30 AM' };
    const removed = { ...row, meter_id: 'synthetic-removed', am_rush_hours: null };
    const absent = { ...removed, meter_id: 'synthetic-absent' };
    let rows = [row, removed, absent];
    let malformed = false;
    const request = async path => ({ ok: true, json: async () => path.includes('/records?')
      ? { total_count: rows.length, results: malformed ? rows.map(({ meter_id, ...rest }) => ({ ...rest, meterid: meter_id })) : rows }
      : { metas: { default: { records_count: rows.length, modified: '2026-10-12T13:31:51Z' } } } });
    const adapter = createVancouverMeterAdapter({ source: { id: source.id, name: 'Synthetic fixture', evidenceType: 'E2',
      approvalState: 'approved', lastSyncAt: null, formatValid: true, freshnessMinutes: 10080 },
      fetchedAt: new Date().toISOString(), sourceEditedAt: null,
      reviewed: { [row.meter_id]: { rawRecord: row, evidence: 'synthetic-only', rushDays: [1,2,3,4,5],
        afterHours: { days: [0,1,2,3,4,5,6], timeLimitMinutes: 120 } } },
    }, request);
    const run = () => syncSource(pool, source, adapter);
    assert.equal((await run()).status, 'succeeded');
    const identityRows = (await client.query('SELECT id,source_record_id FROM public.places WHERE source_id=$1', [source.id])).rows;
    const ids = identityRows.map(p => p.id);
    const rushId = identityRows.find(p => p.source_record_id === row.meter_id).id;
    const features = instant => classifiedPlaces(client.query.bind(client), ids, [-124,49,-123,50],
      { instant: new Date(instant), context: {} }, new Date());
    const evaluation = async instant => (await features(instant)).find(f => f.properties.id === rushId).properties.evaluation;
    assert.equal((await evaluation('2026-10-12T15:00:00Z')).classification, 'RESTRICTED');
    const paid = await evaluation('2026-10-12T17:00:00Z');
    assert.equal(paid.classification, 'PAID'); assert.equal(paid.rate, 3.5); assert.equal(paid.timeLimitMinutes, 120);
    assert.equal((await evaluation('2026-10-13T06:00:00Z')).classification, 'VERIFIED_FREE');
    assert.equal((await run()).drift.unchanged, 3);
    assert.deepEqual((await client.query('SELECT id,source_record_id FROM public.places WHERE source_id=$1', [source.id])).rows, identityRows);
    const historyCount = Number((await client.query('SELECT count(*) FROM public.parking_rules WHERE source_id=$1', [source.id])).rows[0].count);
    rows = [row, { ...removed, service_status: 'Removed' }];
    assert.deepEqual((await run()).drift.removed.sort(), ['synthetic-absent','synthetic-removed']);
    assert.equal((await features('2026-10-12T17:00:00Z')).length, 1);
    assert.equal(Number((await client.query('SELECT count(*) FROM public.places WHERE source_id=$1', [source.id])).rows[0].count), 3);
    assert.equal(Number((await client.query('SELECT count(*) FROM public.parking_rules WHERE source_id=$1', [source.id])).rows[0].count), historyCount);
    malformed = true;
    assert.equal((await run()).status, 'failed');
    assert.equal((await evaluation('2026-10-13T06:00:00Z')).classification, 'UNKNOWN');
    malformed = false;
    assert.equal((await run()).status, 'succeeded');
    rows = [];
    assert.deepEqual((await run()).drift.removed, ['synthetic-rush']);
    assert.deepEqual(await features('2026-10-12T17:00:00Z'), []);
    assert.equal(Number((await client.query('SELECT count(*) FROM public.places WHERE source_id=$1', [source.id])).rows[0].count), 3);
  } finally { client.release(); await pool.end(); }
});
