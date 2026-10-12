import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { runner } from 'node-pg-migrate';
import { Pool } from 'pg';
import { importPlaces, importLegacyBatch } from '../scripts/evidence-import.ts';

const connectionString = process.env.EVIDENCE_TEST_DATABASE_URL;

test('provenance backfill preserves duplicates and imports replay without new places', { skip: !connectionString }, async () => {
  const url = new URL(connectionString);
  const database = decodeURIComponent(url.pathname.slice(1));
  assert.match(database, /^evidence_provenance_test(?:_\d+)?$/);
  assert.equal(url.hostname, process.env.EVIDENCE_TEST_EXPECTED_HOST, 'Confirm the disposable provider endpoint');
  assert.ok(!url.hostname.includes('-pooler'));
  const pool = new Pool({ connectionString, max: 2 });
  const client = await pool.connect();
  try {
    assert.deepEqual((await client.query("SELECT tablename FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema','migration_meta')")).rows, [], 'Provision a new empty disposable database for every run');
    await runner({ dbClient: client, dir: 'sql/migrations', migrationsSchema: 'migration_meta', createMigrationsSchema: true, migrationsTable: 'pgmigrations', direction: 'up', count: 1, singleTransaction: true, log() {}, logger: { debug() {}, info() {}, warn() {}, error() {} } });
    await client.query('SET search_path = public, pg_catalog');
    // Deliberately duplicated legacy rows and absent city metadata, independent
    // of publisher IDs. Production rows are never copied into test assertions.
    await client.query(`INSERT INTO public.street_segments (block_id, geom, raw_data, report_counts)
      VALUES ('same', ST_GeomFromText('LINESTRING(0 0,1 1)',4326), '{"city":"Seattle"}', '{"FREE":2}'),
             ('same', ST_GeomFromText('LINESTRING(0 0,1 1)',4326), '{"city":"Seattle"}', '{}'),
             ('missing-city', ST_GeomFromText('LINESTRING(0 0,1 1)',4326), '{}', '{}')`);
    await client.query(`INSERT INTO public.parking_meters (pay_station_id, geom, raw_data)
      SELECT 'same', ST_GeomFromText('POINT(0 0)',4326), '{"city":"Vancouver"}'::jsonb FROM generate_series(1,2)`);
    await client.query(`INSERT INTO public.parking_zones (city, type, geom)
      SELECT 'Seattle', 'MIXED', ST_GeomFromText('POLYGON((0 0,0 1,1 1,0 0))',4326) FROM generate_series(1,2)`);
    const tables = ['parking_meters','street_segments','parking_zones'];
    const before = {};
    for (const table of tables) before[table] = (await client.query(`SELECT * FROM public.${table} ORDER BY id`)).rows;
    const migrate = () => spawnSync(process.execPath, ['scripts/migrate.mjs','up'], {
      encoding: 'utf8', env: { ...process.env, MIGRATION_DATABASE_URL: connectionString, MIGRATION_EXPECTED_HOST: url.hostname, MIGRATION_EXPECTED_DATABASE: database },
    });
    assert.equal(migrate().status, 0, 'Forward migration succeeds');
    for (const table of tables) {
      const after = (await client.query(`SELECT * FROM public.${table} ORDER BY id`)).rows;
      assert.deepEqual(after.map(({ source_id, source_record_id, fetched_at, source_edited_at, ...row }) => {
        assert.ok(source_id && source_record_id);
        assert.equal(fetched_at, null);
        assert.equal(source_edited_at, null);
        return row;
      }), before[table], 'Every original column and duplicate survives');
    }
    const sources = (await client.query('SELECT source_key, area, evidence_type, approval_state, approved_by, approved_at FROM public.evidence_sources ORDER BY area')).rows;
    assert.deepEqual(sources.map(row => row.area), ['Seattle','Unknown legacy area','Vancouver']);
    assert.ok(sources.every(row => row.source_key === 'legacy-import-2025-12' && row.evidence_type === 'signal' && row.approval_state === 'rejected' && row.approved_by === null && row.approved_at === null));
    const history = (await client.query('SELECT * FROM migration_meta.pgmigrations ORDER BY id')).rows;
    assert.equal(migrate().status, 0);
    assert.deepEqual((await client.query('SELECT * FROM migration_meta.pgmigrations ORDER BY id')).rows, history);
    // This is explicitly synthetic fixture approval in the disposable database.
    const sourceId = (await client.query(`INSERT INTO public.evidence_sources
      (source_key, area, evidence_type, publisher, endpoint, licence, reuse_terms, approval_state, approved_by, approved_at, freshness_limit, inventory_doc_path)
      VALUES ('test-fixture','Fixture area','signal','Test fixture','https://example.invalid','Test only','Test only','approved','Synthetic test',now(),interval '7 days','tests/fixtures') RETURNING id`)).rows[0].id;
    const fixtures = {
      street_segments: { sourceRecordId: 'street-1', blockId: 's1', streetUse: 'Unknown', geom: { type: 'LineString', coordinates: [[0,0],[1,1]] }, rawData: { fixture: true } },
      parking_meters: { sourceRecordId: 'meter-1', payStationId: 'm1', geom: { type: 'Point', coordinates: [0,0] } },
      parking_zones: { sourceRecordId: 'lot-1', city: 'Fixture area', type: 'MIXED', geom: { type: 'Polygon', coordinates: [[[0,0],[0,1],[1,1],[0,0]]] } },
    };
    for (const [table, record] of Object.entries(fixtures)) {
      const input = { sourceId, table, records: [record, { ...record }], sourceEditedAt: '2026-10-01T00:00:00Z' };
      const first = await importPlaces(pool, input);
      assert.equal(first.added, 1);
      const count = (await client.query(`SELECT count(*) FROM public.${table}`)).rows;
      await client.query(`UPDATE public.${table} SET report_counts = '{"FREE":3}' WHERE id = $1`, [first.placeIds[0]]);
      const second = await importPlaces(pool, input);
      assert.equal(second.added, 0);
      assert.equal(second.updated, 1);
      assert.deepEqual(second.placeIds, first.placeIds);
      assert.deepEqual((await client.query(`SELECT count(*) FROM public.${table}`)).rows, count);
      const stored = (await client.query(`SELECT report_counts, fetched_at, source_edited_at FROM public.${table} WHERE id = $1`, first.placeIds)).rows[0];
      assert.deepEqual(stored.report_counts, { FREE: 3 });
      assert.ok(stored.fetched_at);
      assert.equal(stored.source_edited_at.toISOString(), '2026-10-01T00:00:00.000Z');
      const sync = (await client.query('SELECT status, format_check_passed, records_added, records_updated, records_removed FROM public.source_syncs WHERE id = $1', [second.syncId])).rows[0];
      assert.deepEqual(sync, { status: 'succeeded', format_check_passed: true, records_added: 0, records_updated: 1, records_removed: 0 });
    }
    const rejectedId = (await client.query("SELECT id FROM public.evidence_sources WHERE approval_state = 'rejected' LIMIT 1")).rows[0].id;
    await assert.rejects(() => importPlaces(pool, { sourceId: rejectedId, table: 'street_segments', records: [fixtures.street_segments] }), /human-approved/);
    await client.query("UPDATE public.evidence_sources SET evidence_type = 'E1' WHERE id = $1", [sourceId]);
    await assert.rejects(() => importPlaces(pool, { sourceId, table: 'street_segments', records: [fixtures.street_segments], signalOnly: true }), /signal context only/);
    const countBeforeFailure = (await client.query('SELECT count(*) FROM public.street_segments')).rows;
    await assert.rejects(() => importPlaces(pool, { sourceId, table: 'street_segments', records: [
      { ...fixtures.street_segments, sourceRecordId: 'rollback-first' },
      { ...fixtures.street_segments, sourceRecordId: 'bad-geometry', geom: { type: 'Point', coordinates: [0,0] } },
    ] }), /Import failed/);
    assert.deepEqual((await client.query('SELECT count(*) FROM public.street_segments')).rows, countBeforeFailure, 'A failed batch leaves no partial rows');
    const failedSync = (await client.query("SELECT status, format_check_passed, records_added, records_updated, error FROM public.source_syncs WHERE status = 'failed'")).rows;
    assert.deepEqual(failedSync, [{ status: 'failed', format_check_passed: false, records_added: 0, records_updated: 0, error: 'Import failed; inspect privately' }]);
    process.env.IMPORT_SOURCE_TEST_BATCH = sourceId;
    const mapped = ['mapped-block','Unknown',JSON.stringify(fixtures.street_segments.geom),'{"fixture":true}','[]'];
    await assert.rejects(() => importLegacyBatch(pool, 'TEST_BATCH', 'street_segments', mapped, ['mapped-1']), /signal context only/);
    await client.query("UPDATE public.evidence_sources SET evidence_type = 'signal' WHERE id = $1", [sourceId]);
    const mappedFirst = await importLegacyBatch(pool, 'TEST_BATCH', 'street_segments', mapped, ['mapped-1']);
    const mappedSecond = await importLegacyBatch(pool, 'TEST_BATCH', 'street_segments', mapped, ['mapped-1']);
    assert.equal(mappedFirst.added, 1);
    assert.equal(mappedSecond.added, 0);
    assert.deepEqual(mappedSecond.placeIds, mappedFirst.placeIds);
    delete process.env.IMPORT_SOURCE_TEST_BATCH;
    const changed = await importPlaces(pool, { sourceId, table: 'street_segments', records: [{ ...fixtures.street_segments, streetUse: 'Paid', rawData: { changed: true } }] });
    assert.equal(changed.added, 0);
    assert.deepEqual((await client.query('SELECT street_use, raw_data, report_counts FROM public.street_segments WHERE id = $1', changed.placeIds)).rows, [{ street_use: 'Paid', raw_data: { changed: true }, report_counts: { FREE: 3 } }]);
    const permissions = (await client.query(`SELECT
      has_table_privilege('app_rw','public.evidence_sources','SELECT') AS source_read,
      has_table_privilege('app_rw','public.evidence_sources','UPDATE') AS source_write,
      has_table_privilege('app_rw','public.source_syncs','INSERT') AS sync_write,
      has_column_privilege('app_report_counts','public.street_segments','report_counts','UPDATE') AS report_write,
      has_column_privilege('app_report_counts','public.street_segments','source_id','UPDATE') AS provenance_write`)).rows[0];
    assert.deepEqual(permissions, { source_read: true, source_write: false, sync_write: false, report_write: true, provenance_write: false });
    assert.equal((await client.query("SELECT tgenabled FROM pg_trigger WHERE tgrelid='public.parking_zones'::regclass AND tgname='set_timestamp_parking_zones'")).rows[0].tgenabled, 'O');
  } finally {
    client.release();
    await pool.end();
  }
});
