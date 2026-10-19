import test from 'node:test';
import assert from 'node:assert/strict';

test('retirement refuses missing action approval before connecting', async () => {
  const { runLegacyRetirement } = await import('../scripts/legacy-retirement.ts');
  await assert.rejects(() => runLegacyRetirement(null, { action: 'retire' }), /approval|snapshot/i);
});

test('operator connection refuses pooled and mismatched targets', async () => {
  const { retirementConnection } = await import('../scripts/legacy-retirement.ts');
  const env = { RETIREMENT_DATABASE_URL: 'postgres://owner:private@ep-test-pooler.example/db', RETIREMENT_EXPECTED_HOST: 'ep-test-pooler.example', RETIREMENT_EXPECTED_DATABASE: 'db' };
  assert.throws(() => retirementConnection(env), /direct owner/);
  env.RETIREMENT_DATABASE_URL = 'postgres://owner:private@ep-test.example/db';
  assert.throws(() => retirementConnection(env), /direct owner/);
  env.RETIREMENT_EXPECTED_HOST = 'ep-test.example';
  assert.equal(new URL(retirementConnection(env)).hostname, 'ep-test.example');
  env.RETIREMENT_EXPECTED_DATABASE = 'other';
  assert.throws(() => retirementConnection(env), /direct owner/);
});

test('retirement refuses missing count/hash baseline before connecting', async () => {
  const { runLegacyRetirement } = await import('../scripts/legacy-retirement.ts');
  await assert.rejects(() => runLegacyRetirement(null, {
    action: 'retire', retirementId: 'reviewed', approvalRef: 'release-action', snapshotRef: 'retained', expectedDatabase: 'test', expected: {},
  }), /counts and hashes/);
});
