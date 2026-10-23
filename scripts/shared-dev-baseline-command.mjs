import { execFile } from 'node:child_process';
import { mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { Client } from 'pg';
import { verifyMigrationIdentity } from './migration-connection.mjs';
import { canonical, digest, loadMigrationManifest } from './migration-lineage.mjs';
import { captureSchema, verifyAdoptionReference } from './preservation-adoption.mjs';
import { normalizeSchema } from './schema-comparison.mjs';
import { guard, guardMessages, reconciliationTarget, verifyReconciliationSchema } from './shared-dev-baseline.mjs';

// node-pg-migrate 9's lock identity, shared with migration-command.mjs so both
// commands exclude each other; a test keeps the two literals equal.
export const migrationLock = '7241865325823964';
export const restoreProcedure = 'docs/RECOVERY.md#recover-a-provider-snapshot-into-a-separate-branch';
const tables = ['city_requests', 'covered_cities', 'parking_meters', 'parking_zones', 'reports', 'street_segments'];
const fingerprintSql = tables.map(table => `SELECT '${table}' AS name, count(*)::text AS count,
  md5(COALESCE(string_agg(row_hash, '' ORDER BY row_hash), '')) AS fingerprint
  FROM (SELECT md5(row_to_json(t)::text) AS row_hash FROM public.${table} t) hashes`).join(' UNION ALL ');
const checkout = realpathSync(fileURLToPath(new URL('..', import.meta.url)));

function evidenceWriter(dir) {
  let path;
  try {
    if (!dir || !isAbsolute(dir)) throw new Error();
    path = join(realpathSync(dirname(dir)), basename(dir));
    const inside = relative(checkout, path);
    if (inside.split(sep)[0] !== '..' && !isAbsolute(inside)) throw new Error();
    mkdirSync(path, { mode: 0o700 });
  } catch {
    throw guard('DEV_BASELINE_EVIDENCE_DIR');
  }
  return (name, text) => writeFileSync(join(path, name), text, { mode: 0o600, flag: 'wx' });
}

/** Public command seam; injected dependencies are only external DB/dump boundaries. */
export async function executeReconciliation(env, { approval, reference, referenceDump }, {
  connect = url => new Client({ connectionString: url.toString(), connectionTimeoutMillis: 15000,
    options: '-c statement_timeout=120000 -c lock_timeout=15000' }),
  capture = captureSchema,
  dumpVersion = async () => (await promisify(execFile)('pg_dump', ['--version'])).stdout.trim(),
} = {}) {
  const url = reconciliationTarget(env.MIGRATION_DATABASE_URL, approval, env.DEV_BASELINE_APPROVED);
  const manifest = loadMigrationManifest();
  const operation = readFileSync('sql/operations/reconcile_shared_dev_baseline.sql', 'utf8');
  try {
    verifyAdoptionReference({ reference, approvedHash: approval.referenceHash, baseline: manifest.baseline,
      referenceDump, targetDump: referenceDump, pgDumpVersion: reference.pgDumpVersion });
  } catch {
    throw guard('DEV_BASELINE_REFERENCE_UNTRUSTED');
  }
  if (!/^[a-f0-9]{64}$/.test(approval.beforeSchemaHash || '') || !['top', 'all'].includes(approval.track)) throw guard('DEV_BASELINE_APPROVAL_INVALID');
  if (approval.operationHash !== digest(operation)) throw guard('DEV_BASELINE_OPERATION_CHANGED');
  const snapshot = approval.snapshot;
  const now = Date.now();
  const [created, verified, retained] = [snapshot?.createdAt, snapshot?.verifiedAt, snapshot?.retainedUntil].map(value => Date.parse(value));
  if (!/^br-[a-z0-9-]+$/.test(snapshot?.branchId || '') || snapshot.branchId === approval.branchId ||
      snapshot.parentBranchId !== approval.branchId || !/^[a-f0-9]{64}$/.test(snapshot.providerRecordHash || '') ||
      snapshot.restoreProcedure !== restoreProcedure || ![created, verified, retained].every(Number.isFinite) ||
      created > now || verified < created || verified > now) throw guard('DEV_BASELINE_SNAPSHOT_INVALID');
  if (now - verified > 3600000) throw guard('DEV_BASELINE_SNAPSHOT_STALE');
  if (retained <= now) throw guard('DEV_BASELINE_SNAPSHOT_EXPIRED');
  if (await dumpVersion() !== reference.pgDumpVersion) throw guard('DEV_BASELINE_PG_DUMP_VERSION');
  const write = evidenceWriter(env.DEV_BASELINE_EVIDENCE_DIR);
  const evidence = { reason: null, beforeSchemaHash: null, afterSchemaHash: null, fingerprints: {} };
  const committed = reason => { evidence.reason = reason; return guard('DEV_BASELINE_COMMITTED'); };
  const database = connect(url);
  let locked = false;
  let transaction = false;
  try {
    await database.connect();
    try { await verifyMigrationIdentity(database, url); } catch (error) { throw error?.code ? error : guard('DEV_BASELINE_IDENTITY_MISMATCH'); }
    locked = (await database.query('SELECT pg_try_advisory_lock($1::bigint) AS locked', [migrationLock])).rows[0].locked;
    if (!locked) throw guard('DEV_BASELINE_LOCK_BUSY');
    await database.query('BEGIN ISOLATION LEVEL REPEATABLE READ'); transaction = true;
    await database.query(`LOCK TABLE ${tables.map(table => `public.${table}`).join(', ')} IN SHARE MODE`);
    const state = (await database.query(`SELECT EXISTS (SELECT FROM pg_namespace WHERE nspname='migration_meta') AS metadata,
      to_regclass('public.evidence_sources') IS NOT NULL AS foundation,
      current_setting('pg_stat_statements.track', true) AS track`)).rows[0];
    if (state.metadata || state.foundation) throw guard('DEV_BASELINE_STATE_UNEXPECTED');
    if (state.track !== approval.track) throw guard('DEV_BASELINE_TRACK_MISMATCH');
    const exported = (await database.query('SELECT pg_export_snapshot() AS snapshot')).rows[0].snapshot;
    const before = await capture(url.toString(), { snapshot: exported });
    write('before.sql', before.dump);
    evidence.beforeSchemaHash = digest(normalizeSchema(before.dump, reference.projection));
    if (before.version !== reference.pgDumpVersion) throw guard('DEV_BASELINE_PG_DUMP_VERSION');
    if (evidence.beforeSchemaHash !== approval.beforeSchemaHash) throw guard('DEV_BASELINE_BEFORE_SCHEMA_CHANGED');
    verifyReconciliationSchema(before.dump, referenceDump, reference.projection);
    evidence.fingerprints.before = (await database.query(fingerprintSql)).rows;
    await database.query(operation);
    evidence.fingerprints.after = (await database.query(fingerprintSql)).rows;
    if (canonical(evidence.fingerprints.after) !== canonical(evidence.fingerprints.before)) throw guard('DEV_BASELINE_FINGERPRINT_CHANGED');
    // pg_dump in another session cannot see this transaction's DDL. Fixed SQL verifies
    // catalog postconditions before commit; exact independent dump comparison follows.
    try { await database.query('COMMIT'); } catch { throw guard('DEV_BASELINE_COMMIT_UNKNOWN'); }
    transaction = false;
    let after;
    try {
      after = await capture(url.toString());
      write('after.sql', after.dump);
    } catch {
      throw committed('AFTER_CAPTURE_FAILED');
    }
    evidence.afterSchemaHash = digest(normalizeSchema(after.dump, reference.projection));
    try {
      verifyAdoptionReference({ reference, approvedHash: approval.referenceHash, baseline: manifest.baseline,
        referenceDump, targetDump: after.dump, pgDumpVersion: after.version });
    } catch {
      throw committed('AFTER_SCHEMA_MISMATCH');
    }
    evidence.reason = 'COMMITTED_VERIFIED';
    return 'Dev baseline prerequisite committed and independently compared. No ledger marking, adoption or foundation was run.';
  } catch (error) {
    evidence.reason ??= guardMessages[error?.code] ? error.code : 'DEV_BASELINE_FAILED';
    throw error;
  } finally {
    if (transaction) await database.query('ROLLBACK').catch(() => {});
    if (locked) await database.query('SELECT pg_advisory_unlock($1::bigint)', [migrationLock]).catch(() => {});
    await database.end();
    try {
      write('evidence.json', `${JSON.stringify(evidence, null, 2)}\n`);
    } catch {
      // Losing the summary must not hide a commit; pre-commit failures keep their own code.
      if (evidence.reason === 'COMMITTED_VERIFIED') throw committed('EVIDENCE_WRITE_FAILED');
    }
  }
}
