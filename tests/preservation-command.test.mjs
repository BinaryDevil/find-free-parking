import test from 'node:test';
import assert from 'node:assert/strict';
import { migrationTarget } from '../scripts/migration-command.mjs';

const env = { MIGRATION_DATABASE_URL: 'postgres://owner:private@validation.invalid/disposable', MIGRATION_EXPECTED_HOST: 'validation.invalid', MIGRATION_EXPECTED_DATABASE: 'disposable' };
test('guarded preservation commands reject unsafe targets before opening a connection', () => {
  assert.equal(migrationTarget('adopt-preservation', env).hostname, 'validation.invalid');
  for (const change of [
    { MIGRATION_DATABASE_URL: 'postgres://owner:private@validation-pooler.invalid/disposable' },
    { MIGRATION_EXPECTED_HOST: 'other.invalid' }, { MIGRATION_EXPECTED_DATABASE: 'shared' },
    { MIGRATION_DATABASE_URL: 'postgres://app_rw:private@validation.invalid/disposable' },
  ]) assert.throws(() => migrationTarget('adopt-preservation', { ...env, ...change }));
  assert.throws(() => migrationTarget('down', env));
  assert.throws(() => migrationTarget('mark-baseline', env));
});

test('URI query overrides cannot bypass the confirmed endpoint, database or role', () => {
  for (const query of ['host=other.invalid', 'user=app_rw', 'dbname=shared', 'options=-c%20role%3Dapp_rw', 'service=other']) {
    assert.throws(() => migrationTarget('adopt-preservation', { ...env, MIGRATION_DATABASE_URL: `${env.MIGRATION_DATABASE_URL}?${query}` }));
  }
});
