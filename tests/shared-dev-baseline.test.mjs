import test from 'node:test';
import assert from 'node:assert/strict';
import { digest, canonical } from '../scripts/migration-lineage.mjs';
import { reconciliationTarget } from '../scripts/shared-dev-baseline.mjs';

const approval = { version: 1, branchId: 'br-rough-lake-arrxiape', branchName: 'dev', hostHash: digest('dev.invalid'), database: 'find-free-parking-db', owner: 'find-free-parking-db_owner' };
const url = 'postgres://find-free-parking-db_owner:private@dev.invalid/find-free-parking-db';
test('reconciliation binds a direct owner URL to the reviewed provider target before connecting', () => {
  const approvedHash = digest(canonical(approval));
  assert.equal(reconciliationTarget(url, approval, approvedHash).hostname, 'dev.invalid');
  for (const target of [url.replace('dev.invalid', 'production.invalid'), url.replace('dev.invalid', 'dev-pooler.invalid'), `${url}?host=production.invalid`, url.replace('db_owner:', 'app_rw:')]) {
    assert.throws(() => reconciliationTarget(target, approval, approvedHash));
  }
  assert.throws(() => reconciliationTarget(url, { ...approval, branchId: 'production' }, approvedHash));
  assert.throws(() => reconciliationTarget(url, approval, 'unreviewed'));
});

import { readFileSync } from 'node:fs';
import { verifyReconciliationSchema } from '../scripts/shared-dev-baseline.mjs';
const reference = readFileSync('sql/migrations/1791676800000_baseline.sql', 'utf8');
// Fixture reproduces the two differences recorded in DATA before this command existed.
const before = reference.replace(/--\n-- Name: pg_stat_statements; Type: EXTENSION; Schema: -; Owner: -\n--\n\nCREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA public;\n\n\n/, '')
  .replace(/--\n-- Name: EXTENSION pg_stat_statements; Type: COMMENT; Schema: -; Owner:\n--\n\nCOMMENT ON EXTENSION pg_stat_statements IS 'track planning and execution statistics of all SQL statements executed';\n\n\n/, '')
  .replace('GRANT INSERT(reported_status)', 'GRANT SELECT(reported_status),INSERT(reported_status)');
test('only the two documented baseline differences pass the pre-write schema guard', () => {
  verifyReconciliationSchema(before, reference, 'application');
  for (const changed of [reference, `${before}\nGRANT SELECT ON public.reports TO app_rw;`, before.replace('GRANT SELECT(reported_status) ON TABLE public.reports TO app_report_counts;', ''), before.replace('CREATE TABLE public.reports', 'CREATE TABLE public.other_reports')]) {
    assert.throws(() => verifyReconciliationSchema(changed, reference, 'application'));
  }
});

import { executeReconciliation } from '../scripts/shared-dev-baseline-command.mjs';
import { normalizeSchema } from '../scripts/schema-comparison.mjs';
const metadata = { version: 1, provenance: 'baseline-replay', projection: 'application', baselineHash: digest(reference),
  schemaHash: digest(normalizeSchema(reference, 'application')), pgDumpVersion: 'pg_dump (PostgreSQL) 17.6',
  options: ['--schema-only', '--exclude-schema=migration_meta'], review: 'https://github.com/BinaryDevil/find-free-parking/issues/120' };
function commandInputs() {
  const now = Date.now();
  const reviewed = { ...approval, beforeSchemaHash: digest(normalizeSchema(before, 'application')), referenceHash: digest(canonical(metadata)),
    operationHash: digest(readFileSync('sql/operations/reconcile_shared_dev_baseline.sql', 'utf8')), track: 'top',
    snapshot: { branchId: 'br-retained-snapshot', parentBranchId: approval.branchId, providerRecordHash: 'a'.repeat(64),
      createdAt: new Date(now - 120000).toISOString(), verifiedAt: new Date(now - 60000).toISOString(),
      retainedUntil: new Date(now + 86400000).toISOString(), restoreProcedure: 'Reviewed provider restore procedure' } };
  return { env: { MIGRATION_DATABASE_URL: url, DEV_BASELINE_APPROVED: digest(canonical(reviewed)) },
    inputs: { approval: reviewed, reference: metadata, referenceDump: reference } };
}
function databaseBoundary(state = {}) {
  const statements = [];
  return { statements, async connect() {}, async end() {}, async query(sql) {
    statements.push(sql);
    if (sql.includes('current_database()')) return { rows: [{ database: approval.database, role: approval.owner, owner: approval.owner }] };
    if (sql.includes('pg_try_advisory_lock')) return { rows: [{ locked: true }] };
    if (sql.includes('AS metadata')) return { rows: [{ metadata: false, foundation: false, track: 'top', ...state }] };
    if (sql.includes('pg_export_snapshot')) return { rows: [{ snapshot: 'test-exported-snapshot' }] };
    return { rows: [] };
  } };
}
test('operator command rejects unknown schema or extra ACL drift before operation SQL', async () => {
  for (const dump of [before.replace('CREATE TABLE public.reports', 'CREATE TABLE public.other_reports'), `${before}\nGRANT SELECT ON TABLE public.reports TO app_rw;`]) {
    const { env, inputs } = commandInputs();
    // Even a newly reviewed before hash cannot broaden the fixed two-difference contract.
    inputs.approval.beforeSchemaHash = digest(normalizeSchema(dump, 'application'));
    env.DEV_BASELINE_APPROVED = digest(canonical(inputs.approval));
    const db = databaseBoundary();
    await assert.rejects(executeReconciliation(env, inputs, { connect: () => db, capture: async () => ({ dump, version: metadata.pgDumpVersion }) }), /Unexpected shared-dev schema drift/);
    assert.equal(db.statements.some(sql => sql.includes('CREATE EXTENSION')), false);
    assert.ok(db.statements.includes('ROLLBACK'));
  }
});
test('operator command rejects any metadata namespace or foundation before operation SQL', async () => {
  for (const state of [{ metadata: true }, { foundation: true }, { track: 'none' }]) {
    const { env, inputs } = commandInputs();
    const db = databaseBoundary(state);
    await assert.rejects(executeReconciliation(env, inputs, { connect: () => db }), /Unexpected history/);
    assert.equal(db.statements.some(sql => sql.includes('CREATE EXTENSION')), false);
  }
});
test('operator command rejects unverified snapshot evidence before connecting', async () => {
  const { env, inputs } = commandInputs();
  inputs.approval.snapshot.verifiedAt = 'invalid';
  env.DEV_BASELINE_APPROVED = digest(canonical(inputs.approval));
  let connected = false;
  await assert.rejects(executeReconciliation(env, inputs, { connect: () => { connected = true; } }), /snapshot proof/);
  assert.equal(connected, false);
});
test('operator command commits only the prerequisite and verifies the independent post-schema', async () => {
  const { env, inputs } = commandInputs();
  const db = databaseBoundary();
  let captures = 0;
  const result = await executeReconciliation(env, inputs, { connect: () => db,
    capture: async () => ({ dump: ++captures === 1 ? before : reference, version: metadata.pgDumpVersion }) });
  assert.match(result, /No ledger marking, adoption or foundation/);
  assert.equal(db.statements.filter(sql => sql.includes('CREATE EXTENSION')).length, 1);
  assert.ok(db.statements.includes('COMMIT'));
  assert.equal(db.statements.some(sql => /INSERT INTO migration_meta|CREATE SCHEMA migration_meta/.test(sql)), false);
});
test('postcommit comparison failure does not pretend the operation rolled back', async () => {
  const { env, inputs } = commandInputs();
  const db = databaseBoundary();
  await assert.rejects(executeReconciliation(env, inputs, { connect: () => db,
    capture: async () => ({ dump: before, version: metadata.pgDumpVersion }) }), { code: 'DEV_BASELINE_COMMITTED' });
  assert.ok(db.statements.includes('COMMIT'));
  assert.equal(db.statements.includes('ROLLBACK'), false);
});
