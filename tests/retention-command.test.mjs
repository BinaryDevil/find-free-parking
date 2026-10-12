import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('retention refuses disabled and mismatched targets before connecting', () => {
  for (const configuration of [
    {},
    { RETENTION_APPROVED:'clear-expired-pii', RETENTION_DATABASE_URL:'postgres://unused:unused@example.invalid/test' },
    { RETENTION_APPROVED:'clear-expired-pii', RETENTION_DATABASE_URL:'postgres://unused:unused@example-pooler.invalid/test', RETENTION_EXPECTED_HOST:'example-pooler.invalid', RETENTION_EXPECTED_DATABASE:'test' },
    { RETENTION_APPROVED:'clear-expired-pii', RETENTION_DATABASE_URL:'postgres://unused:unused@example.invalid/other', RETENTION_EXPECTED_HOST:'example.invalid', RETENTION_EXPECTED_DATABASE:'test' },
  ]) {
    const result = spawnSync(process.execPath, ['scripts/retain-pii.mjs'], {
      encoding:'utf8', env: { ...process.env, RETENTION_APPROVED:'', RETENTION_DATABASE_URL:'', RETENTION_EXPECTED_HOST:'', RETENTION_EXPECTED_DATABASE:'', ...configuration },
    });
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, /^Retention failed or is disabled/);
    assert.ok(!result.stderr.includes('postgres://'));
  }
});
