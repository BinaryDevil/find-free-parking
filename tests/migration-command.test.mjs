import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('migration command rejects unsafe targets and unapproved baseline marking before connecting', () => {
  const base = { ...process.env, MIGRATION_DATABASE_URL: '', MIGRATION_EXPECTED_HOST: '', MIGRATION_EXPECTED_DATABASE: '', MIGRATION_BASELINE_APPROVED: '' };
  const run = (command, env = {}) => spawnSync(process.execPath, ['scripts/migrate.mjs', command], { encoding: 'utf8', env: { ...base, ...env } });
  assert.equal(run('down').status, 1);
  assert.equal(run('up').status, 1);
  const pooled = run('up', { MIGRATION_DATABASE_URL: 'postgres://operator:private@ep-test-pooler.invalid/test' });
  assert.equal(pooled.status, 1);
  assert.match(pooled.stderr, /direct PostgreSQL/);
  assert.ok(!pooled.stderr.includes('private'));
  const direct = { MIGRATION_DATABASE_URL: 'postgres://operator:private@ep-test.invalid/test', MIGRATION_EXPECTED_HOST: 'ep-test.invalid', MIGRATION_EXPECTED_DATABASE: 'test' };
  const mismatch = run('up', { ...direct, MIGRATION_EXPECTED_DATABASE: 'other' });
  assert.equal(mismatch.status, 1);
  assert.match(mismatch.stderr, /Confirm the provider branch/);
  const mark = run('mark-baseline', direct);
  assert.equal(mark.status, 1);
  assert.match(mark.stderr, /human approval/);
  assert.ok(!mark.stderr.includes('private'));
});

test('migration command rejects connection overrides before attempting a connection', () => {
  for (const query of ['host=other.invalid', 'hostaddr=127.0.0.1', 'port=5433', 'user=other',
    'password=override', 'dbname=other', 'database=other', 'options=-c%20role%3Dother',
    '%68ost=other.invalid', 'sslcert=unreviewed-file', 'sslmode=require&sslmode=disable']) {
    const result = spawnSync(process.execPath, ['scripts/migrate.mjs', 'up'], {
      encoding: 'utf8', env: { ...process.env,
        MIGRATION_DATABASE_URL: `postgres://operator:synthetic@expected.invalid/parking?${query}`,
        MIGRATION_EXPECTED_HOST: 'expected.invalid', MIGRATION_EXPECTED_DATABASE: 'parking' },
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Unsupported PostgreSQL connection options/);
    assert.ok(!result.stderr.includes('synthetic') && !result.stderr.includes('override'));
  }
});
