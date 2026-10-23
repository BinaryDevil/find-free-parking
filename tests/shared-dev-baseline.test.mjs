import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from 'pg';
import { digest, canonical } from '../scripts/migration-lineage.mjs';
import { normalizeSchema } from '../scripts/schema-comparison.mjs';
import { executeReconciliation, migrationLock, restoreProcedure } from '../scripts/shared-dev-baseline-command.mjs';
import { productionBranchId, reconciliationTarget, verifyReconciliationSchema } from '../scripts/shared-dev-baseline.mjs';

const approval = { version: 1, branchId: 'br-rough-lake-arrxiape', branchName: 'dev', hostHash: digest('dev.invalid'), database: 'find-free-parking-db', owner: 'find-free-parking-db_owner' };
const url = 'postgres://find-free-parking-db_owner:private@dev.invalid/find-free-parking-db';
const reference = readFileSync('sql/migrations/1791676800000_baseline.sql', 'utf8');
// Fixture reproduces the two differences recorded in DATA before this command existed.
const extensionBlock = '--\n-- Name: pg_stat_statements; Type: EXTENSION; Schema: -; Owner: -\n--\n\nCREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA public;\n\n\n';
const commentBlock = "--\n-- Name: EXTENSION pg_stat_statements; Type: COMMENT; Schema: -; Owner:\n--\n\nCOMMENT ON EXTENSION pg_stat_statements IS 'track planning and execution statistics of all SQL statements executed';\n\n\n";
const appStatusGrant = 'GRANT INSERT(reported_status) ON TABLE public.reports TO app_rw;';
const before = reference.replace(extensionBlock, '').replace(commentBlock, '')
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
function databaseBoundary({ state = {}, prior = {}, identity = {}, locked = true, changedFingerprint = false, commitError = false, endError = false } = {}) {
  const statements = [];
  let fingerprints = 0;
  return { statements, async connect() {}, async end() { if (endError) throw new Error('close failed'); }, async query(sql) {
    statements.push(sql);
    if (sql.includes('pg_get_userbyid(datdba)')) return { rows: [{ database: approval.database, role: approval.owner, owner: approval.owner, ...identity }] };
    if (sql.includes('AS installed')) return { rows: [{ installed: false, adopted: false, ...prior }] };
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
  for (const target of [url.replace('dev.invalid', 'production.invalid'), url.replace('dev.invalid', 'dev-pooler.invalid'), `${url}?host=production.invalid`, url.replace('db_owner:', 'app_rw:'), url.replace('dev.invalid', 'dev.invalid:5433')]) {
    assert.throws(() => reconciliationTarget(target, approval, approvedHash), { code: 'DEV_BASELINE_TARGET_UNREVIEWED' });
  }
  for (const changed of [{ branchId: 'production' }, { database: 'other-db' }, { owner: 'other_owner' }, { version: 2 }]) {
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
    [reviewed => { reviewed.snapshot.providerRecordHash = 'z'.repeat(64); }, 'DEV_BASELINE_SNAPSHOT_INVALID'],
    [reviewed => { reviewed.snapshot.verifiedAt = new Date(Date.parse(reviewed.snapshot.createdAt) - 60000).toISOString(); }, 'DEV_BASELINE_SNAPSHOT_INVALID'],
    [reviewed => { delete reviewed.beforeSchemaHash; }, 'DEV_BASELINE_APPROVAL_INVALID'],
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
  assert.equal(recorded.connectionLost, false);
  // Read-only refusal check, then advisory lock, repeatable read, SHARE locks, then the exported snapshot.
  const order = [sql => sql.includes('AS installed'), sql => sql.includes('pg_try_advisory_lock'), sql => sql === 'BEGIN ISOLATION LEVEL REPEATABLE READ',
    sql => sql === 'LOCK TABLE public.city_requests, public.covered_cities, public.parking_meters, public.parking_zones, public.reports, public.street_segments IN SHARE MODE',
    sql => sql.includes('pg_export_snapshot')].map(match => db.statements.findIndex(match));
  assert.ok(order.every((index, i) => index >= 0 && (i === 0 || index > order[i - 1])), String(order));
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
  const cli = (...args) => spawnSync(process.execPath, ['scripts/reconcile-shared-dev-baseline.mjs', ...args], { encoding: 'utf8', env: { ...process.env, ...env,
    DEV_BASELINE_APPROVAL: join(dir, 'DEV_BASELINE_APPROVAL'), MIGRATION_REFERENCE_METADATA: join(dir, 'MIGRATION_REFERENCE_METADATA'), MIGRATION_REFERENCE_DUMP: join(dir, 'dump.sql') } });
  const result = cli();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /^DEV_BASELINE_PRODUCTION_DENIED: /);
  assert.ok(!result.stderr.includes('private') && !result.stderr.includes(dir));
  const extra = cli('--force');
  assert.equal(extra.status, 1);
  assert.match(extra.stderr, /^DEV_BASELINE_FAILED: /);
});

test('operator command shares the migration advisory lock identity', () => {
  assert.ok(readFileSync('scripts/migration-command.mjs', 'utf8').includes(`const migrationLock = '${migrationLock}';`));
});

test('read-only pre-lock check refuses reconciled or adopted targets before any lock', async () => {
  for (const [prior, code] of [[{ installed: true }, 'DEV_BASELINE_ALREADY_RECONCILED'], [{ adopted: true }, 'DEV_BASELINE_STATE_UNEXPECTED']]) {
    const { env, inputs, evidence } = commandInputs();
    const db = databaseBoundary({ prior });
    await assert.rejects(executeReconciliation(env, inputs, options(db)), { code });
    assert.equal(db.statements.some(sql => /pg_try_advisory_lock|^BEGIN|LOCK TABLE/.test(sql)), false, code);
    assert.equal(evidenceOf(evidence).reason, code);
  }
});

test('evidence files are never overwritten and the directory must resolve outside the checkout', async () => {
  const { env, inputs, evidence } = commandInputs();
  const db = databaseBoundary();
  const capture = async () => { writeFileSync(join(evidence, 'before.sql'), 'planted'); return { dump: before, version: metadata.pgDumpVersion }; };
  await assert.rejects(executeReconciliation(env, inputs, { ...options(db), capture }), { code: 'EEXIST' });
  assert.equal(readFileSync(join(evidence, 'before.sql'), 'utf8'), 'planted');
  assert.equal(db.statements.some(sql => sql.includes('CREATE EXTENSION')), false);
  assert.equal(evidenceOf(evidence).reason, 'DEV_BASELINE_FAILED');
  const link = join(scratch, 'checkout-link');
  const inside = join(process.cwd(), 'issue-120-evidence-link');
  symlinkSync(process.cwd(), link);
  try {
    let connected = false;
    await assert.rejects(executeReconciliation({ ...env, DEV_BASELINE_EVIDENCE_DIR: join(link, 'issue-120-evidence-link') }, inputs,
      { ...options(), connect: () => { connected = true; } }), { code: 'DEV_BASELINE_EVIDENCE_DIR' });
    assert.equal(connected, false);
    assert.equal(existsSync(inside), false);
  } finally {
    unlinkSync(link);
    rmSync(inside, { recursive: true, force: true });
  }
});

test('a verified commit is still reported as committed when its evidence summary cannot be written', async () => {
  const { env, inputs, evidence } = commandInputs();
  const db = databaseBoundary();
  const capture = async (_url, settings) => {
    if (!settings) writeFileSync(join(evidence, 'evidence.json'), 'planted');
    return { dump: settings ? before : reference, version: metadata.pgDumpVersion };
  };
  await assert.rejects(executeReconciliation(env, inputs, { ...options(db), capture }), { code: 'DEV_BASELINE_COMMITTED' });
  assert.ok(db.statements.includes('COMMIT'));
  assert.equal(readFileSync(join(evidence, 'evidence.json'), 'utf8'), 'planted');
});

test('a failed connection close still writes the evidence summary', async () => {
  const { env, inputs, evidence } = commandInputs();
  await executeReconciliation(env, inputs, options(databaseBoundary({ endError: true })));
  assert.equal(evidenceOf(evidence).reason, 'COMMITTED_VERIFIED');
});

test('the replayed reference must contain exactly the blocks and grant the comparison substitutes', () => {
  for (const missing of [extensionBlock, commentBlock, appStatusGrant]) {
    assert.ok(reference.includes(missing));
    assert.throws(() => verifyReconciliationSchema(before, reference.replace(missing, ''), 'application'), { code: 'DEV_BASELINE_REFERENCE_UNTRUSTED' });
  }
});

// Minimal PostgreSQL wire peer: trust auth, then it answers COMMIT or drops the socket on any query.
async function pgPeer(dropOnQuery) {
  const sockets = new Set();
  const server = net.createServer(socket => {
    sockets.add(socket);
    let started = false;
    socket.on('data', data => {
      if (!started) { started = true; socket.write(Buffer.from([0x52, 0, 0, 0, 8, 0, 0, 0, 0, 0x5a, 0, 0, 0, 5, 0x49])); return; }
      if (data[0] !== 0x51) return;
      if (dropOnQuery) { socket.destroy(); return; }
      const tag = Buffer.from('COMMIT\0');
      const complete = Buffer.from([0x43, 0, 0, 0, 0]);
      complete.writeInt32BE(4 + tag.length, 1);
      socket.write(Buffer.concat([complete, tag, Buffer.from([0x5a, 0, 0, 0, 5, 0x49])]));
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const client = new Client({ host: '127.0.0.1', port: server.address().port, user: 'u', database: 'd' });
  return { client, drop: () => sockets.forEach(socket => socket.destroy()), close: () => new Promise(resolve => server.close(resolve)) };
}
// The fake boundary answers until routeFrom matches; that and every later statement use the real pg client.
function routedBoundary(client, routeFrom) {
  const db = databaseBoundary();
  let routed = false;
  return { statements: db.statements, on: (event, listener) => client.on(event, listener), connect: () => client.connect(), end: () => client.end(),
    query(sql, params) {
      routed ||= routeFrom(sql);
      if (!routed) return db.query(sql, params);
      db.statements.push(sql);
      return client.query(sql, params);
    } };
}

test('a real pg connection drop is routed by commit phase and still writes evidence', async () => {
  for (const [phase, routeFrom, expected, reason] of [
    ['before COMMIT', sql => sql.includes('CREATE EXTENSION'), { message: /Connection terminated unexpectedly/ }, 'DEV_BASELINE_FAILED'],
    ['during COMMIT', sql => sql === 'COMMIT', { code: 'DEV_BASELINE_COMMIT_UNKNOWN' }, 'DEV_BASELINE_COMMIT_UNKNOWN'],
    ['after COMMIT', sql => sql === 'COMMIT', { code: 'DEV_BASELINE_COMMITTED' }, 'AFTER_CAPTURE_FAILED'],
  ]) {
    const peer = await pgPeer(phase !== 'after COMMIT');
    try {
      const { env, inputs, evidence } = commandInputs();
      const db = routedBoundary(peer.client, routeFrom);
      const capture = async (_url, settings) => {
        if (settings) return { dump: before, version: metadata.pgDumpVersion };
        // The session drops while the post-commit pg_dump runs.
        const ended = new Promise(resolve => peer.client.once('end', resolve));
        peer.drop();
        await ended;
        return { dump: reference, version: metadata.pgDumpVersion };
      };
      await assert.rejects(executeReconciliation(env, inputs, { ...options(db), capture }), expected, phase);
      const recorded = evidenceOf(evidence);
      assert.equal(recorded.reason, reason, phase);
      assert.equal(recorded.connectionLost, true, phase);
      assert.equal(db.statements.includes('COMMIT'), phase !== 'before COMMIT', phase);
      if (phase === 'before COMMIT') assert.ok(db.statements.includes('ROLLBACK'));
    } finally {
      await peer.close();
    }
  }
});
