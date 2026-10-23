import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { digest, canonical } from '../scripts/migration-lineage.mjs';
import { normalizeSchema } from '../scripts/schema-comparison.mjs';
import { executeReconciliation, migrationLock, restoreProcedure } from '../scripts/shared-dev-baseline-command.mjs';
import { productionBranchId, reconciliationTarget, verifyReconciliationSchema } from '../scripts/shared-dev-baseline.mjs';

const approval = { version: 1, branchId: 'br-rough-lake-arrxiape', branchName: 'dev', hostHash: digest('dev.invalid'), database: 'find-free-parking-db', owner: 'find-free-parking-db_owner' };
const url = 'postgres://find-free-parking-db_owner:private@dev.invalid/find-free-parking-db';
const reference = readFileSync('sql/migrations/1791676800000_baseline.sql', 'utf8');
// Fixture reproduces the two differences recorded in DATA before this command existed.
const before = reference.replace(/--\n-- Name: pg_stat_statements; Type: EXTENSION; Schema: -; Owner: -\n--\n\nCREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA public;\n\n\n/, '')
  .replace(/--\n-- Name: EXTENSION pg_stat_statements; Type: COMMENT; Schema: -; Owner:\n--\n\nCOMMENT ON EXTENSION pg_stat_statements IS 'track planning and execution statistics of all SQL statements executed';\n\n\n/, '')
  .replace('GRANT INSERT(reported_status)', 'GRANT SELECT(reported_status),INSERT(reported_status)');
const metadata = { version: 1, provenance: 'baseline-replay', projection: 'application', baselineHash: digest(reference),
  schemaHash: digest(normalizeSchema(reference, 'application')), pgDumpVersion: 'pg_dump (PostgreSQL) 17.6',
  options: ['--schema-only', '--exclude-schema=migration_meta'], review: 'https://github.com/BinaryDevil/find-free-parking/issues/120' };
const scratch = mkdtempSync(join(tmpdir(), 'ffp-120-'));
test.after(() => rmSync(scratch, { recursive: true, force: true }));
let runs = 0;

function commandInputs(change = () => {}) {
  const now = Date.now();
  const reviewed = { ...approval, beforeSchemaHash: digest(normalizeSchema(before, 'application')), referenceHash: digest(canonical(metadata)),
    operationHash: digest(readFileSync('sql/operations/reconcile_shared_dev_baseline.sql', 'utf8')), track: 'top',
    snapshot: { branchId: 'br-retained-snapshot', parentBranchId: approval.branchId, providerRecordHash: 'a'.repeat(64),
      createdAt: new Date(now - 120000).toISOString(), verifiedAt: new Date(now - 60000).toISOString(),
      retainedUntil: new Date(now + 86400000).toISOString(), restoreProcedure } };
  change(reviewed);
  const evidence = join(scratch, `run-${++runs}`);
  return { evidence, env: { MIGRATION_DATABASE_URL: url, DEV_BASELINE_APPROVED: digest(canonical(reviewed)), DEV_BASELINE_EVIDENCE_DIR: evidence },
    inputs: { approval: reviewed, reference: metadata, referenceDump: reference } };
}
function databaseBoundary({ state = {}, identity = {}, locked = true, changedFingerprint = false, commitError = false } = {}) {
  const statements = [];
  let fingerprints = 0;
  return { statements, async connect() {}, async end() {}, async query(sql) {
    statements.push(sql);
    if (sql.includes('pg_get_userbyid(datdba)')) return { rows: [{ database: approval.database, role: approval.owner, owner: approval.owner, ...identity }] };
    if (sql.includes('pg_try_advisory_lock')) return { rows: [{ locked }] };
    if (sql.includes('AS metadata')) return { rows: [{ metadata: false, foundation: false, track: 'top', ...state }] };
    if (sql.includes('pg_export_snapshot')) return { rows: [{ snapshot: 'test-exported-snapshot' }] };
    if (sql.includes('AS fingerprint')) {
      return { rows: [{ name: 'reports', count: '1', fingerprint: changedFingerprint && ++fingerprints === 2 ? 'changed' : 'original' }] };
    }
    if (sql === 'COMMIT' && commitError) throw new Error('connection terminated');
    return { rows: [] };
  } };
}
const options = (db, dumps = [before, reference]) => {
  const calls = [];
  return { calls, connect: () => db, dumpVersion: async () => metadata.pgDumpVersion,
    capture: async (_url, settings) => { calls.push(settings); return { dump: dumps[calls.length - 1], version: metadata.pgDumpVersion }; } };
};
const evidenceOf = dir => JSON.parse(readFileSync(join(dir, 'evidence.json'), 'utf8'));

test('reconciliation binds a direct owner URL to the reviewed provider target before connecting', () => {
  const approvedHash = digest(canonical(approval));
  assert.equal(reconciliationTarget(url, approval, approvedHash).hostname, 'dev.invalid');
  for (const target of [url.replace('dev.invalid', 'production.invalid'), url.replace('dev.invalid', 'dev-pooler.invalid'), `${url}?host=production.invalid`, url.replace('db_owner:', 'app_rw:')]) {
    assert.throws(() => reconciliationTarget(target, approval, approvedHash), { code: 'DEV_BASELINE_TARGET_UNREVIEWED' });
  }
  for (const changed of [{ branchId: 'production' }, { database: 'other-db' }, { owner: 'other_owner' }]) {
    const reviewed = { ...approval, ...changed };
    assert.throws(() => reconciliationTarget(url, reviewed, digest(canonical(reviewed))), { code: 'DEV_BASELINE_TARGET_UNREVIEWED' });
  }
  assert.throws(() => reconciliationTarget(url, approval, 'unreviewed'), { code: 'DEV_BASELINE_TARGET_UNREVIEWED' });
});

test('rehearsal targets need a validation name and the exact dev parent', () => {
  const rehearsal = { ...approval, branchId: 'br-validation-120', branchName: 'validation/issue-120-rehearsal', parentBranchId: approval.branchId };
  assert.equal(reconciliationTarget(url, rehearsal, digest(canonical(rehearsal))).hostname, 'dev.invalid');
  for (const changed of [{ parentBranchId: undefined }, { parentBranchId: 'br-other-parent' }, { branchName: 'validation/issue-121-x' },
    { branchId: approval.branchId }, { branchName: 'dev' }]) {
    const reviewed = { ...rehearsal, ...changed };
    assert.throws(() => reconciliationTarget(url, reviewed, digest(canonical(reviewed))), { code: 'DEV_BASELINE_TARGET_UNREVIEWED' });
  }
});

test('production branch is denied on every path before connecting', async () => {
  for (const change of [
    reviewed => Object.assign(reviewed, { branchId: productionBranchId }),
    reviewed => Object.assign(reviewed, { branchId: productionBranchId, branchName: 'validation/issue-120-x', parentBranchId: approval.branchId }),
    reviewed => Object.assign(reviewed, { branchId: 'br-validation-120', branchName: 'validation/issue-120-x', parentBranchId: productionBranchId }),
    reviewed => Object.assign(reviewed.snapshot, { branchId: productionBranchId }),
  ]) {
    const { env, inputs, evidence } = commandInputs(change);
    let connected = false;
    await assert.rejects(executeReconciliation(env, inputs, { ...options(), connect: () => { connected = true; } }), { code: 'DEV_BASELINE_PRODUCTION_DENIED' });
    assert.equal(connected, false);
    assert.equal(existsSync(evidence), false);
  }
});

test('only the two documented baseline differences pass the pre-write schema guard', () => {
  verifyReconciliationSchema(before, reference, 'application');
  for (const changed of [reference, `${before}\nGRANT SELECT ON public.reports TO app_rw;`, before.replace('GRANT SELECT(reported_status) ON TABLE public.reports TO app_report_counts;', ''), before.replace('CREATE TABLE public.reports', 'CREATE TABLE public.other_reports')]) {
    assert.throws(() => verifyReconciliationSchema(changed, reference, 'application'), { code: 'DEV_BASELINE_SCHEMA_DRIFT' });
  }
});

test('operator command refuses unreviewed inputs before connecting', async () => {
  const hour = 3600000;
  const cases = [
    [reviewed => { reviewed.operationHash = 'b'.repeat(64); }, 'DEV_BASELINE_OPERATION_CHANGED'],
    [reviewed => { reviewed.track = 'none'; }, 'DEV_BASELINE_APPROVAL_INVALID'],
    [reviewed => { reviewed.referenceHash = 'c'.repeat(64); }, 'DEV_BASELINE_REFERENCE_UNTRUSTED'],
    [reviewed => { reviewed.snapshot.verifiedAt = 'invalid'; }, 'DEV_BASELINE_SNAPSHOT_INVALID'],
    [reviewed => { reviewed.snapshot.restoreProcedure = true; }, 'DEV_BASELINE_SNAPSHOT_INVALID'],
    [reviewed => { reviewed.snapshot.branchId = reviewed.branchId; }, 'DEV_BASELINE_SNAPSHOT_INVALID'],
    [reviewed => { reviewed.snapshot.parentBranchId = 'br-other-parent'; }, 'DEV_BASELINE_SNAPSHOT_INVALID'],
    [reviewed => Object.assign(reviewed.snapshot, { createdAt: new Date(Date.now() - 3 * hour).toISOString(), verifiedAt: new Date(Date.now() - 2 * hour).toISOString() }), 'DEV_BASELINE_SNAPSHOT_STALE'],
    [reviewed => { reviewed.snapshot.retainedUntil = new Date(Date.now() - 1000).toISOString(); }, 'DEV_BASELINE_SNAPSHOT_EXPIRED'],
  ];
  for (const [change, code] of cases) {
    const { env, inputs, evidence } = commandInputs(change);
    let connected = false;
    await assert.rejects(executeReconciliation(env, inputs, { ...options(), connect: () => { connected = true; } }), { code });
    assert.equal(connected, false, code);
    assert.equal(existsSync(evidence), false, code);
  }
  const { env, inputs } = commandInputs();
  let connected = false;
  await assert.rejects(executeReconciliation(env, inputs, { ...options(), dumpVersion: async () => 'pg_dump (PostgreSQL) 17.5', connect: () => { connected = true; } }),
    { code: 'DEV_BASELINE_PG_DUMP_VERSION' });
  for (const dir of [undefined, 'relative/evidence', join(process.cwd(), 'issue-120-evidence'), scratch]) {
    await assert.rejects(executeReconciliation({ ...env, DEV_BASELINE_EVIDENCE_DIR: dir }, inputs, { ...options(), connect: () => { connected = true; } }),
      { code: 'DEV_BASELINE_EVIDENCE_DIR' });
  }
  assert.equal(connected, false);
  assert.equal(existsSync(join(process.cwd(), 'issue-120-evidence')), false);
});

test('operator command refuses live guard failures before operation SQL and records the reason', async () => {
  const cases = [
    [{ identity: { owner: 'someone_else' } }, 'DEV_BASELINE_IDENTITY_MISMATCH'],
    [{ identity: { database: 'other-db' } }, 'DEV_BASELINE_IDENTITY_MISMATCH'],
    [{ locked: false }, 'DEV_BASELINE_LOCK_BUSY'],
    [{ state: { metadata: true } }, 'DEV_BASELINE_STATE_UNEXPECTED'],
    [{ state: { foundation: true } }, 'DEV_BASELINE_STATE_UNEXPECTED'],
    [{ state: { track: 'all' } }, 'DEV_BASELINE_TRACK_MISMATCH'],
  ];
  for (const [boundary, code] of cases) {
    const { env, inputs, evidence } = commandInputs();
    const db = databaseBoundary(boundary);
    await assert.rejects(executeReconciliation(env, inputs, options(db)), { code });
    assert.equal(db.statements.some(sql => sql.includes('CREATE EXTENSION')), false, code);
    assert.equal(db.statements.includes('COMMIT'), false, code);
    assert.equal(evidenceOf(evidence).reason, code);
    if (code === 'DEV_BASELINE_LOCK_BUSY') assert.equal(db.statements.some(sql => sql.startsWith('BEGIN')), false);
  }
});

test('operator command rejects changed before-schema, dump version or extra drift before operation SQL', async () => {
  const drifted = `${before}\nGRANT SELECT ON TABLE public.reports TO app_rw;`;
  for (const [dump, version, rehash, code] of [
    [drifted, metadata.pgDumpVersion, false, 'DEV_BASELINE_BEFORE_SCHEMA_CHANGED'],
    [before, 'pg_dump (PostgreSQL) 17.5', false, 'DEV_BASELINE_PG_DUMP_VERSION'],
    // Even a newly reviewed before hash cannot broaden the fixed two-difference contract.
    [drifted, metadata.pgDumpVersion, true, 'DEV_BASELINE_SCHEMA_DRIFT'],
    [before.replace('CREATE TABLE public.reports', 'CREATE TABLE public.other_reports'), metadata.pgDumpVersion, true, 'DEV_BASELINE_SCHEMA_DRIFT'],
  ]) {
    const { env, inputs, evidence } = commandInputs(reviewed => { if (rehash) reviewed.beforeSchemaHash = digest(normalizeSchema(dump, 'application')); });
    const db = databaseBoundary();
    await assert.rejects(executeReconciliation(env, inputs, { ...options(db), capture: async () => ({ dump, version }) }), { code });
    assert.equal(db.statements.some(sql => sql.includes('CREATE EXTENSION')), false, code);
    assert.ok(db.statements.includes('ROLLBACK'), code);
    assert.equal(readFileSync(join(evidence, 'before.sql'), 'utf8'), dump);
    assert.equal(evidenceOf(evidence).reason, code);
  }
});

test('changed original rows roll back without COMMIT', async () => {
  const { env, inputs, evidence } = commandInputs();
  const db = databaseBoundary({ changedFingerprint: true });
  await assert.rejects(executeReconciliation(env, inputs, options(db)), { code: 'DEV_BASELINE_FINGERPRINT_CHANGED' });
  assert.equal(db.statements.includes('COMMIT'), false);
  assert.ok(db.statements.includes('ROLLBACK'));
  const recorded = evidenceOf(evidence);
  assert.equal(recorded.reason, 'DEV_BASELINE_FINGERPRINT_CHANGED');
  assert.notDeepEqual(recorded.fingerprints.before, recorded.fingerprints.after);
});

test('operator command commits only the prerequisite and persists private evidence', async () => {
  const { env, inputs, evidence } = commandInputs();
  const db = databaseBoundary();
  const boundary = options(db);
  const result = await executeReconciliation(env, inputs, boundary);
  assert.match(result, /No ledger marking, adoption or foundation/);
  assert.deepEqual(boundary.calls[0], { snapshot: 'test-exported-snapshot' });
  assert.equal(db.statements.filter(sql => sql.includes('CREATE EXTENSION')).length, 1);
  assert.ok(db.statements.includes('COMMIT'));
  assert.ok(db.statements.some(sql => sql.includes('pg_advisory_unlock')));
  assert.equal(db.statements.some(sql => /INSERT INTO migration_meta|CREATE SCHEMA migration_meta/.test(sql)), false);
  assert.equal(statSync(evidence).mode & 0o077, 0);
  for (const name of ['before.sql', 'after.sql', 'evidence.json']) {
    assert.equal(statSync(join(evidence, name)).mode & 0o777, 0o600, name);
    const text = readFileSync(join(evidence, name), 'utf8');
    assert.ok(!text.includes('private') && !text.includes('dev.invalid'), name);
  }
  const recorded = evidenceOf(evidence);
  assert.equal(recorded.reason, 'COMMITTED_VERIFIED');
  assert.equal(recorded.beforeSchemaHash, inputs.approval.beforeSchemaHash);
  assert.equal(recorded.afterSchemaHash, metadata.schemaHash);
  assert.deepEqual(recorded.fingerprints.before, recorded.fingerprints.after);
});

test('postcommit comparison or capture failure reports the commit and keeps the before capture', async () => {
  for (const [capture, reason] of [
    [async (_url, settings) => ({ dump: before, version: metadata.pgDumpVersion, settings }), 'AFTER_SCHEMA_MISMATCH'],
    [async (_url, settings) => { if (!settings) throw new Error('pg_dump failed'); return { dump: before, version: metadata.pgDumpVersion }; }, 'AFTER_CAPTURE_FAILED'],
  ]) {
    const { env, inputs, evidence } = commandInputs();
    const db = databaseBoundary();
    await assert.rejects(executeReconciliation(env, inputs, { ...options(db), capture }), { code: 'DEV_BASELINE_COMMITTED' });
    assert.ok(db.statements.includes('COMMIT'));
    assert.equal(db.statements.includes('ROLLBACK'), false);
    assert.equal(readFileSync(join(evidence, 'before.sql'), 'utf8'), before);
    assert.equal(evidenceOf(evidence).reason, reason);
  }
});

test('a failed COMMIT is reported as unknown outcome, not as a plain failure', async () => {
  const { env, inputs, evidence } = commandInputs();
  await assert.rejects(executeReconciliation(env, inputs, options(databaseBoundary({ commitError: true }))), { code: 'DEV_BASELINE_COMMIT_UNKNOWN' });
  assert.equal(evidenceOf(evidence).reason, 'DEV_BASELINE_COMMIT_UNKNOWN');
});

test('operator CLI prints the fixed reason code and no private input', () => {
  const { env, inputs } = commandInputs(reviewed => { reviewed.branchId = productionBranchId; });
  const dir = mkdtempSync(join(scratch, 'cli-'));
  const files = { DEV_BASELINE_APPROVAL: inputs.approval, MIGRATION_REFERENCE_METADATA: metadata };
  for (const [name, value] of Object.entries(files)) writeFileSync(join(dir, name), JSON.stringify(value));
  writeFileSync(join(dir, 'dump.sql'), reference);
  const result = spawnSync(process.execPath, ['scripts/reconcile-shared-dev-baseline.mjs'], { encoding: 'utf8', env: { ...process.env, ...env,
    DEV_BASELINE_APPROVAL: join(dir, 'DEV_BASELINE_APPROVAL'), MIGRATION_REFERENCE_METADATA: join(dir, 'MIGRATION_REFERENCE_METADATA'), MIGRATION_REFERENCE_DUMP: join(dir, 'dump.sql') } });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /^DEV_BASELINE_PRODUCTION_DENIED: /);
  assert.ok(!result.stderr.includes('private') && !result.stderr.includes(dir));
});

test('operator command shares the migration advisory lock identity', () => {
  assert.ok(readFileSync('scripts/migration-command.mjs', 'utf8').includes(`const migrationLock = '${migrationLock}';`));
});
