import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
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
  const cli = (command, env) => promisify(execFile)(process.execPath, ['scripts/migrate.mjs', command], { env: { ...process.env, ...env, PGOPTIONS: '-c role=app_rw' } });
  const environments = urls.map(connectionString => {
    const url = new URL(connectionString);
    assert.match(url.pathname, /^\/preservation_runner_test(?:_fresh)?$/);
    return { MIGRATION_DATABASE_URL: connectionString, MIGRATION_EXPECTED_HOST: url.hostname, MIGRATION_EXPECTED_DATABASE: url.pathname.slice(1), MIGRATION_BOOTSTRAP_APPROVED: manifest.baseline.sha256 };
  });
  try {
    for (const [index, env] of environments.entries()) {
      const client = new Client({ connectionString: env.MIGRATION_DATABASE_URL }); await client.connect(); clients.push(client);
      assert.equal((await client.query("SELECT count(*)::int AS n FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema')")).rows[0].n, 0, 'fresh empty target required');
      await cli('bootstrap-preservation', env);
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
        await cli('adopt-preservation', env);
        assert.equal((await client.query("SELECT to_regclass('public.evidence_sources') AS relation")).rows[0].relation, null, 'adoption is metadata only');
        await cli('up', env);
        assert.deepEqual((await client.query('SELECT * FROM public.city_requests ORDER BY id')).rows.map(row => ({ ...row })), before);
      } else {
        await cli('adopt-preservation', env);
        await cli('up', env);
      }
      await cli('up', env);
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

const unrecordedUrl = process.env.PRESERVATION_UNRECORDED_DATABASE_URL;
test('existing baseline without a ledger cannot implicitly bootstrap or adopt preservation', { skip: !unrecordedUrl }, async () => {
  const url = new URL(unrecordedUrl);
  assert.equal(url.pathname, '/preservation_runner_unrecorded_test');
  const client = new Client({ connectionString: unrecordedUrl });
  const directory = mkdtempSync(join(tmpdir(), 'preservation-unrecorded-proof-'));
  await client.connect();
  try {
    assert.equal((await client.query("SELECT count(*)::int AS n FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema')")).rows[0].n, 0);
    await client.query(readFileSync('sql/migrations/1791676800000_baseline.sql', 'utf8'));
    await client.query("INSERT INTO public.city_requests(city_name,user_ip) VALUES ('Unrecorded baseline','unknown')");
    const original = (await client.query('SELECT * FROM public.city_requests')).rows;
    const manifest = loadMigrationManifest();
    const capture = await captureSchema(unrecordedUrl);
    const reference = { version: 1, provenance: 'baseline-replay', baselineHash: manifest.baseline.sha256, schemaHash: digest(normalizeSchema(capture.dump)), projection: 'strict', pgDumpVersion: capture.version, options: ['--schema-only','--exclude-schema=migration_meta'], review: 'https://github.com/BinaryDevil/find-free-parking/pull/116' };
    writeFileSync(join(directory, 'reference.json'), JSON.stringify(reference)); writeFileSync(join(directory, 'baseline.sql'), capture.dump);
    const env = { MIGRATION_DATABASE_URL: unrecordedUrl, MIGRATION_EXPECTED_HOST: url.hostname, MIGRATION_EXPECTED_DATABASE: url.pathname.slice(1), MIGRATION_BOOTSTRAP_APPROVED: manifest.baseline.sha256,
      MIGRATION_REFERENCE_METADATA: join(directory,'reference.json'), MIGRATION_REFERENCE_DUMP: join(directory,'baseline.sql'), MIGRATION_ADOPTION_APPROVED: digest(canonical(reference)), MIGRATION_SNAPSHOT_REFERENCE: 'disposable:unrecorded' };
    await assert.rejects(executeMigration('up', env), /Baseline adoption required/);
    await assert.rejects(executeMigration('bootstrap-preservation', env), /Fresh empty/);
    await assert.rejects(executeMigration('adopt-preservation', env), /Execute the unchanged baseline/);
    assert.equal((await client.query("SELECT to_regclass('migration_meta.pgmigrations') AS ledger, to_regclass('migration_meta.lineage_adoption') AS adoption")).rows[0].ledger, null);
    assert.equal((await readMigrationState(client)).adoption, null);
    assert.deepEqual((await client.query('SELECT * FROM public.city_requests')).rows, original);
  } finally { await client.end(); rmSync(directory, { recursive: true, force: true }); }
});

import { runRelease, authorizeRelease } from '../scripts/release.mjs';
const releaseUrl = process.env.PRESERVATION_RELEASE_DATABASE_URL;
test('release orchestration binds a real disposable adoption and replay to its separately listed snapshot and SQL', { skip: !releaseUrl }, async () => {
  const url = new URL(releaseUrl); assert.equal(url.pathname, '/preservation_release_test');
  const manifest = loadMigrationManifest();
  const env = { MIGRATION_DATABASE_URL: releaseUrl, MIGRATION_EXPECTED_HOST: url.hostname, MIGRATION_EXPECTED_DATABASE: url.pathname.slice(1), MIGRATION_BOOTSTRAP_APPROVED: manifest.baseline.sha256 };
  const client = new Client({ connectionString: releaseUrl }); await client.connect();
  const directory = mkdtempSync(join(tmpdir(), 'preservation-release-proof-'));
  try {
    assert.equal((await client.query("SELECT count(*)::int AS n FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema')")).rows[0].n, 0);
    await executeMigration('bootstrap-preservation', env);
    const captured = await captureSchema(releaseUrl);
    const reference = { version: 1, provenance: 'baseline-replay', baselineHash: manifest.baseline.sha256, schemaHash: digest(normalizeSchema(captured.dump)), projection: 'strict', pgDumpVersion: captured.version, options: ['--schema-only','--exclude-schema=migration_meta'], review: 'https://github.com/BinaryDevil/find-free-parking/pull/116' };
    writeFileSync(join(directory,'reference.json'),JSON.stringify(reference)); writeFileSync(join(directory,'baseline.sql'),captured.dump);
    env.MIGRATION_REFERENCE_METADATA=join(directory,'reference.json'); env.MIGRATION_REFERENCE_DUMP=join(directory,'baseline.sql'); env.MIGRATION_ADOPTION_APPROVED=digest(canonical(reference));
    const sha='a'.repeat(40); const manifestHash=digest(canonical(manifest));
    const body=`## Production actions\n- Migration lineage: \`preservation-v1\`\n- Migration manifest: \`${manifestHash}\`\n- Adoption reference: \`${env.MIGRATION_ADOPTION_APPROVED}\`\n- Migration: \`sql/preservation-v1/1792627200000_foundation.sql\`\n`;
    const release=authorizeRelease([{number:999,merged:true,merge_commit_sha:sha,merged_by:{type:'User'},base:{ref:'main',repo:{full_name:'BinaryDevil/find-free-parking'}},head:{ref:'dev',repo:{full_name:'BinaryDevil/find-free-parking'}},body}],sha);
    const events=[];
    const dependencies={database:client,github:async()=> '[]',readiness:async()=>events.push('revision'),snapshot:async()=> {events.push('snapshot');return 'disposable:release-snapshot';},
      preflightAdoption:async()=> {const target=await captureSchema(releaseUrl);assert.equal(normalizeSchema(target.dump),normalizeSchema(captured.dump));},
      adopt:async({snapshotReference})=> {events.push('adoption');await executeMigration('adopt-preservation',{...env,MIGRATION_SNAPSHOT_REFERENCE:snapshotReference});},
      migrate:async()=> {events.push('migration');await executeMigration('up',env);},
      smoke:async()=> {assert.equal((await client.query('SELECT count(*)::int AS n FROM public.evidence_sources')).rows[0].n,0);}};
    const config={sha,manifest,plan:{lineage:release.lineage,manifestHash,adoptionReference:release.adoptionReference,migrations:release.migrations}};
    await runRelease(release,config,dependencies);
    assert.deepEqual(events,['revision','snapshot','revision','adoption','revision','migration']);
    assert.equal((await readMigrationState(client)).adoption.snapshot_reference,'disposable:release-snapshot');
    events.length=0;await runRelease(release,config,dependencies);
    assert.deepEqual(events,['revision','snapshot','revision','migration']);
  } finally {await client.end();rmSync(directory,{recursive:true,force:true});}
});
