import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyAdoptionReference } from '../scripts/preservation-adoption.mjs';
import { digest, canonical } from '../scripts/migration-lineage.mjs';

const schema = 'CREATE TABLE public.city_requests (user_ip text);\nGRANT INSERT ON public.city_requests TO app_rw;';
const baseline = { sha256: 'a'.repeat(64) };
const reference = { version: 1, provenance: 'baseline-replay', baselineHash: baseline.sha256, schemaHash: digest(schema), projection: 'strict', pgDumpVersion: 'pg_dump (PostgreSQL) 17.6', options: ['--schema-only', '--exclude-schema=migration_meta'], review: 'https://github.com/BinaryDevil/find-free-parking/pull/999' };
test('adoption requires reviewed baseline reference and a freshly matching target including ACLs', () => {
  const input = { reference, approvedHash: digest(canonical(reference)), baseline, referenceDump: schema, targetDump: schema, pgDumpVersion: reference.pgDumpVersion };
  assert.doesNotThrow(() => verifyAdoptionReference(input));
  for (const change of [
    { approvedHash: 'b'.repeat(64) }, { referenceDump: schema + '\nCREATE TABLE extra (id int);' },
    { targetDump: schema.replace('GRANT INSERT', 'GRANT ALL') }, { pgDumpVersion: 'pg_dump (PostgreSQL) 17.5' },
  ]) assert.throws(() => verifyAdoptionReference({ ...input, ...change }));
});

test('reference cannot omit the explicit comparison projection', () => {
  const incomplete = { ...reference }; delete incomplete.projection;
  assert.throws(() => verifyAdoptionReference({ reference: incomplete, approvedHash: digest(canonical(incomplete)), baseline, referenceDump: schema, targetDump: schema, pgDumpVersion: reference.pgDumpVersion }));
});

import { adoptPreservation } from '../scripts/preservation-adoption.mjs';
test('schema drift prevents every adoption write and valid adoption never records skipped legacy migrations', async () => {
  const manifest = { version: 1, baseline: { path: 'sql/migrations/1791676800000_baseline.sql', ...baseline }, legacy: [{ path: 'sql/migrations/1791676800000_baseline.sql', ...baseline }], preservation: [], superseded: [] };
  for (const valid of [false, true]) {
    const writes = [];
    const database = { query: async (sql, values) => {
      if (sql.startsWith('SELECT to_regclass')) return { rows: [{ legacy: 'present', preservation: null, adoption: null }] };
      if (sql.startsWith('SELECT name')) return { rows: [{ name: '1791676800000_baseline' }] };
      writes.push({ sql, values }); return { rows: [] };
    } };
    const run = () => adoptPreservation(database, manifest, { reference, approvedHash: digest(canonical(reference)), referenceDump: schema, snapshotReference: 'disposable:test', capture: async () => ({ dump: valid ? schema : schema.replace('text', 'inet'), version: reference.pgDumpVersion }), operationSql: 'CREATE TABLE metadata_only' });
    if (!valid) { await assert.rejects(run()); assert.deepEqual(writes, []); }
    else {
      await run(); assert.equal(writes.length, 2);
      assert.ok(writes[1].sql.startsWith('INSERT INTO migration_meta.lineage_adoption'));
      assert.equal(writes[1].values[0], 'preservation-v1');
      assert.ok(writes.every(write => !write.sql.includes('INSERT INTO migration_meta.pgmigrations')));
    }
  }
});
