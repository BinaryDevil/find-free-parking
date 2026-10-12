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
