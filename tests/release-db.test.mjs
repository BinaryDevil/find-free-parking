import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Client } from 'pg';
import { runner } from 'node-pg-migrate';
import { runRelease } from '../scripts/release.mjs';

const connectionString = process.env.RELEASE_TEST_DATABASE_URL;
const execute = promisify(execFile);
test('disposable release applies approved forward migrations, reruns without changing history, and reports smoke failure', { skip: !connectionString }, async () => {
  const url = new URL(connectionString);
  assert.equal(url.pathname, '/release_workflow_test');
  const database = new Client({ connectionString });
  await database.connect();
  try {
    assert.deepEqual((await database.query("SELECT tablename FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema')")).rows, [], 'Fresh empty database required');
    await runner({ dbClient: database, dir: 'sql/migrations', direction: 'up', count: 1, migrationsSchema: 'migration_meta', createMigrationsSchema: true, migrationsTable: 'pgmigrations', log() {}, logger: { debug() {}, info() {}, warn() {}, error() {} } });
    const files = readdirSync('sql/migrations').sort();
    const plan = files.filter(f => !f.endsWith('_baseline.sql'));
    const history = async () => (await database.query('SELECT name, run_on FROM migration_meta.pgmigrations ORDER BY id')).rows;
    const before = await history();
    let restorePoint;
    const issues = [];
    const comments = [];
    const github = async (args, input) => {
      if (args.includes('--slurp')) return JSON.stringify([issues]);
      const body = JSON.parse(input);
      if (args[1].endsWith('/comments')) comments.push(body);
      else if (args.includes('PATCH')) Object.assign(issues[0], body);
      else issues.push({ number: 900, ...body });
      return '{}';
    };
    const config = { sha: 'c'.repeat(40), files, plan };
    const release = { number: 80, migrations: plan };
    const deps = { database, github,
      snapshot: async () => { restorePoint ??= await history(); return 'br-local-snapshot'; },
      migrate: () => execute('pnpm', ['db:migrate'], { env: { ...process.env, MIGRATION_DATABASE_URL: connectionString, MIGRATION_EXPECTED_HOST: url.hostname, MIGRATION_EXPECTED_DATABASE: 'release_workflow_test' } }),
      smoke: async () => {},
    };
    assert.deepEqual((await runRelease(release, config, deps)).applied, plan);
    assert.deepEqual(restorePoint, before, 'Snapshot precedes forward migrations');
    const after = await history();
    assert.equal(after.length, files.length);
    assert.deepEqual((await runRelease(release, config, deps)).applied, []);
    assert.deepEqual(await history(), after);
    const failing = { ...deps, smoke: async () => { throw new Error('SECRET_database_URL'); } };
    await assert.rejects(runRelease(release, config, failing));
    await assert.rejects(runRelease(release, config, failing));
    assert.equal(issues.length, 1, 'Failure retries update the existing alert');
    assert.ok(issues[0].title.startsWith('Production release failed'));
    assert.ok(!JSON.stringify({ issues, comments }).includes('SECRET_database_URL'));
  } finally { await database.end(); }
});
