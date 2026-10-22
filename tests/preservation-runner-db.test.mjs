import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Client } from 'pg';
import { executeMigration } from '../scripts/migration-command.mjs';
import { captureSchema, readMigrationState } from '../scripts/preservation-adoption.mjs';
import { normalizeSchema } from '../scripts/schema-comparison.mjs';
import { loadMigrationManifest, canonical, digest } from '../scripts/migration-lineage.mjs';

const urls = [process.env.PRESERVATION_RUNNER_DATABASE_URL, process.env.PRESERVATION_RUNNER_FRESH_DATABASE_URL];
test('guarded commands bootstrap, compare, adopt and replay preservation without changing legacy history or rows', { skip: urls.some(url => !url) }, async () => {
  const manifest = loadMigrationManifest();
  const directory = mkdtempSync(join(tmpdir(), 'preservation-runner-proof-'));
  const clients = [];
  const environments = urls.map(connectionString => {
    const url = new URL(connectionString);
    assert.match(url.pathname, /^\/preservation_runner_test(?:_fresh)?$/);
    return { MIGRATION_DATABASE_URL: connectionString, MIGRATION_EXPECTED_HOST: url.hostname, MIGRATION_EXPECTED_DATABASE: url.pathname.slice(1), MIGRATION_BOOTSTRAP_APPROVED: manifest.baseline.sha256 };
  });
  try {
    for (const [index, env] of environments.entries()) {
      const client = new Client({ connectionString: env.MIGRATION_DATABASE_URL }); await client.connect(); clients.push(client);
      assert.equal((await client.query("SELECT count(*)::int AS n FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema')")).rows[0].n, 0, 'fresh empty target required');
      await executeMigration('bootstrap-preservation', env);
      await assert.rejects(executeMigration('bootstrap-preservation', env), /Fresh empty/);
      assert.deepEqual((await readMigrationState(client)).legacy, ['1791676800000_baseline']);
      const baseline = await captureSchema(env.MIGRATION_DATABASE_URL);
      if (index === 0) {
        const reference = { version: 1, provenance: 'baseline-replay', baselineHash: manifest.baseline.sha256, schemaHash: digest(normalizeSchema(baseline.dump)), projection: 'strict', pgDumpVersion: baseline.version, options: ['--schema-only','--exclude-schema=migration_meta'], review: 'https://github.com/BinaryDevil/find-free-parking/pull/116' };
        writeFileSync(join(directory, 'reference.json'), JSON.stringify(reference));
        writeFileSync(join(directory, 'baseline.sql'), baseline.dump);
      }
      env.MIGRATION_REFERENCE_METADATA = join(directory, 'reference.json'); env.MIGRATION_REFERENCE_DUMP = join(directory, 'baseline.sql');
      env.MIGRATION_ADOPTION_APPROVED = digest(canonical(JSON.parse(readFileSync(env.MIGRATION_REFERENCE_METADATA, 'utf8'))));
      env.MIGRATION_SNAPSHOT_REFERENCE = 'disposable:runner-before-adoption';
      if (index === 0) {
        await client.query("INSERT INTO public.city_requests(city_name,user_ip) VALUES ('Synthetic','unknown')");
        const before = (await client.query('SELECT * FROM public.city_requests ORDER BY id')).rows;
        await client.query('ALTER TABLE public.city_requests ADD COLUMN unreviewed text');
        await assert.rejects(executeMigration('adopt-preservation', env), /schema mismatch/);
        assert.equal((await readMigrationState(client)).adoption, null);
        await client.query('ALTER TABLE public.city_requests DROP COLUMN unreviewed');
        await client.query('GRANT CREATE ON SCHEMA migration_meta TO app_rw');
        await assert.rejects(executeMigration('adopt-preservation', env), /metadata is not protected/);
        await client.query('REVOKE CREATE ON SCHEMA migration_meta FROM app_rw');
        await client.query("INSERT INTO migration_meta.pgmigrations(name,run_on) VALUES ('unknown',CURRENT_TIMESTAMP)");
        await assert.rejects(executeMigration('adopt-preservation', env), /history/);
        await client.query("DELETE FROM migration_meta.pgmigrations WHERE name='unknown'");
        await client.query('SELECT pg_advisory_lock(7241865325823964::bigint)');
        try { await assert.rejects(executeMigration('adopt-preservation', env), /Another migration/); }
        finally { await client.query('SELECT pg_advisory_unlock(7241865325823964::bigint)'); }
        await executeMigration('adopt-preservation', env);
        assert.equal((await client.query("SELECT to_regclass('public.evidence_sources') AS relation")).rows[0].relation, null, 'adoption is metadata only');
        await executeMigration('up', env);
        assert.deepEqual((await client.query('SELECT * FROM public.city_requests ORDER BY id')).rows.map(row => ({ ...row })), before);
      } else {
        await executeMigration('adopt-preservation', env);
        await executeMigration('up', env);
      }
      await executeMigration('up', env);
      const state = await readMigrationState(client);
      assert.deepEqual(state.legacy, ['1791676800000_baseline']);
      assert.deepEqual(state.preservation, ['1792627200000_foundation']);
      assert.equal(state.adoption.snapshot_reference, env.MIGRATION_SNAPSHOT_REFERENCE);
      assert.equal((await client.query('SELECT count(*)::int AS n FROM public.evidence_sources')).rows[0].n, 0);
      assert.equal((await client.query("SELECT count(*)::int AS n FROM public.coverage_areas WHERE level='none'")).rows[0].n, 24);
    }
    const schemas = await Promise.all(environments.map(env => captureSchema(env.MIGRATION_DATABASE_URL)));
    assert.equal(normalizeSchema(schemas[0].dump), normalizeSchema(schemas[1].dump), 'fresh and populated adopted targets have identical application schema');
  } finally { await Promise.all(clients.map(client => client.end())); rmSync(directory, { recursive: true, force: true }); }
});
