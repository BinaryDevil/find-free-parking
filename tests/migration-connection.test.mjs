import test from 'node:test';
import assert from 'node:assert/strict';
import { Client } from 'pg';
import { productionMigrationUrl } from '../scripts/release.mjs';
import { verifyMigrationIdentity } from '../scripts/migration-connection.mjs';

const parent = 'br-rough-base-aryz0z5a';
const endpoints = [{ branch_id: parent, type: 'read_write', host: 'expected.invalid' }];
const databases = [{ name: 'parking', owner_name: 'find-free-parking-db_owner' }];
const target = 'postgres://find-free-parking-db_owner:synthetic@expected.invalid/parking';

test('release rejects the pg host override that bypasses URL hostname validation', () => {
  const overridden = `${target}?host=other.invalid`;
  assert.equal(new URL(overridden).hostname, 'expected.invalid');
  assert.equal(new Client({ connectionString: overridden }).connectionParameters.host, 'other.invalid');
  assert.throws(() => productionMigrationUrl(overridden, endpoints, databases), /connection options/);
});

test('migration identity rejects a different session role or database owner', async () => {
  const url = new URL(target);
  for (const identity of [
    { database: 'other', role: 'find-free-parking-db_owner', owner: 'find-free-parking-db_owner' },
    { database: 'parking', role: 'other', owner: 'other' },
    { database: 'parking', role: 'find-free-parking-db_owner', owner: 'other' },
  ]) {
    await assert.rejects(verifyMigrationIdentity({ query: async () => ({ rows: [identity] }) }, url), /Database identity mismatch/);
  }
  await verifyMigrationIdentity({ query: async () => ({ rows: [{ database: 'parking',
    role: 'find-free-parking-db_owner', owner: 'find-free-parking-db_owner' }] }) }, url);
});

test('release preserves explicit TLS options and pg resolves the reviewed identity', () => {
  const url = productionMigrationUrl(`${target}?sslmode=verify-full&channel_binding=require`, endpoints, databases);
  assert.equal(url.search, '?sslmode=verify-full&channel_binding=require');
  const effective = new Client({ connectionString: url.toString() }).connectionParameters;
  assert.equal(effective.host, 'expected.invalid');
  assert.equal(effective.database, 'parking');
  assert.equal(effective.user, 'find-free-parking-db_owner');
  for (const query of ['user=other', 'dbname=other', 'port=5433', 'options=-c%20role%3Dother',
    '%68ost=other.invalid', 'sslmode=require&sslmode=disable', 'channel_binding=require&channel_binding=disable']) {
    assert.throws(() => productionMigrationUrl(`${target}?${query}`, endpoints, databases), /connection options/);
  }
});

test('release retains provider endpoint, database and owner checks', () => {
  for (const endpoint of [[], [{ ...endpoints[0], branch_id: 'br-other' }],
    [{ ...endpoints[0], type: 'read_only' }], [{ ...endpoints[0], host: 'other.invalid' }]]) {
    assert.throws(() => productionMigrationUrl(target, endpoint, databases), /Production identity mismatch/);
  }
  for (const database of [[], [{ ...databases[0], name: 'other' }], [{ ...databases[0], owner_name: 'other' }]]) {
    assert.throws(() => productionMigrationUrl(target, endpoints, database), /Production identity mismatch/);
  }
  assert.throws(() => productionMigrationUrl(target.replace('find-free-parking-db_owner', 'other'), endpoints, databases), /Production identity mismatch/);
});
