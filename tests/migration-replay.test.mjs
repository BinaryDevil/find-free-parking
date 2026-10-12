import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { Client } from 'pg';

const connectionString = process.env.MIGRATION_TEST_DATABASE_URL;

test('an empty disposable database replays the baseline once with live-schema evidence defaults', { skip: !connectionString }, async () => {
  const url = new URL(connectionString);
  assert.equal(decodeURIComponent(url.pathname.slice(1)), 'migration_baseline_test', 'Use a dedicated empty validation database');
  assert.ok(!url.hostname.includes('-pooler'));
  const client = new Client({ connectionString });
  await client.connect();
  const run = () => spawnSync(process.execPath, ['scripts/migrate.mjs', 'up'], {
    encoding: 'utf8',
    env: { ...process.env, MIGRATION_DATABASE_URL: connectionString, MIGRATION_EXPECTED_HOST: url.hostname, MIGRATION_EXPECTED_DATABASE: 'migration_baseline_test' },
  });
  try {
    const existing = await client.query("SELECT tablename FROM pg_tables WHERE schemaname NOT IN ('pg_catalog', 'information_schema', 'migration_meta')");
    assert.deepEqual(existing.rows, [], 'Refuse an existing database: provision a new empty disposable database');
    const ledger = await client.query("SELECT to_regclass('migration_meta.pgmigrations') AS table_name");
    if (ledger.rows[0].table_name) {
      assert.deepEqual((await client.query('SELECT name FROM migration_meta.pgmigrations')).rows, [], 'No previously applied migrations');
    }
    const first = run();
    assert.equal(first.status, 0, first.stderr);
    const history = await client.query('SELECT name, run_on FROM migration_meta.pgmigrations ORDER BY id');
    assert.deepEqual(history.rows.map(row => row.name), ['1791676800000_baseline', '1791849600000_evidence_provenance', '1791853200000_schema_hygiene']);
    const columns = await client.query("SELECT table_name, column_default, is_nullable FROM information_schema.columns WHERE table_schema='public' AND column_name='parking_evidence' ORDER BY table_name");
    assert.deepEqual(columns.rows, ['parking_meters', 'parking_zones', 'street_segments'].map(table_name => ({ table_name, column_default: "'{}'::jsonb", is_nullable: 'NO' })));
    const second = run();
    assert.equal(second.status, 0, second.stderr);
    assert.deepEqual((await client.query('SELECT name, run_on FROM migration_meta.pgmigrations ORDER BY id')).rows, history.rows);
    // Schema fidelity beyond these defaults is verified by full pg_dump and Neon
    // schema comparison, not by duplicating the migration text in this test.
  } finally {
    await client.end();
  }
});
