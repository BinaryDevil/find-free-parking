import { readFileSync } from 'node:fs';
import { Client } from 'pg';
import { verifyMigrationIdentity } from './migration-connection.mjs';
import { canonical, digest, loadMigrationManifest } from './migration-lineage.mjs';
import { captureSchema, verifyAdoptionReference } from './preservation-adoption.mjs';
import { normalizeSchema } from './schema-comparison.mjs';
import { reconciliationTarget, verifyReconciliationSchema } from './shared-dev-baseline.mjs';

const lock = '7241865325823964';
const tables = ['city_requests', 'covered_cities', 'parking_meters', 'parking_zones', 'reports', 'street_segments'];
const fingerprintSql = tables.map(table => `SELECT '${table}' AS name, count(*)::text AS count,
  md5(COALESCE(string_agg(row_hash, '' ORDER BY row_hash), '')) AS fingerprint
  FROM (SELECT md5(row_to_json(t)::text) AS row_hash FROM public.${table} t) hashes`).join(' UNION ALL ');

/** Public command seam; injected dependencies are only external DB/dump boundaries. */
export async function executeReconciliation(env, { approval, reference, referenceDump }, {
  connect = url => new Client({ connectionString: url.toString(), connectionTimeoutMillis: 15000,
    options: '-c statement_timeout=120000 -c lock_timeout=15000' }),
  capture = captureSchema,
} = {}) {
  const url = reconciliationTarget(env.MIGRATION_DATABASE_URL, approval, env.DEV_BASELINE_APPROVED);
  const manifest = loadMigrationManifest();
  const operation = readFileSync('sql/operations/reconcile_shared_dev_baseline.sql', 'utf8');
  verifyAdoptionReference({ reference, approvedHash: approval.referenceHash, baseline: manifest.baseline,
    referenceDump, targetDump: referenceDump, pgDumpVersion: reference.pgDumpVersion });
  const snapshot = approval.snapshot;
  const now = Date.now();
  if (!/^[a-f0-9]{64}$/.test(approval.beforeSchemaHash || '') || approval.operationHash !== digest(operation) ||
      !['top', 'all'].includes(approval.track) || !snapshot || !/^br-[a-z0-9-]+$/.test(snapshot.branchId || '') ||
      snapshot.branchId === approval.branchId || snapshot.parentBranchId !== approval.branchId ||
      !/^[a-f0-9]{64}$/.test(snapshot.providerRecordHash || '') || !snapshot.restoreProcedure ||
      !Number.isFinite(Date.parse(snapshot.createdAt)) || Date.parse(snapshot.createdAt) > now ||
      Date.parse(snapshot.verifiedAt) < Date.parse(snapshot.createdAt) || Date.parse(snapshot.verifiedAt) > now ||
      !Number.isFinite(Date.parse(snapshot.verifiedAt)) || !Number.isFinite(Date.parse(snapshot.retainedUntil)) ||
      Date.parse(snapshot.retainedUntil) <= now || now - Date.parse(snapshot.verifiedAt) > 3600000) {
    throw new Error('Current reviewed schema, operation and retained snapshot proof required');
  }
  const database = connect(url);
  let locked = false;
  let transaction = false;
  try {
    await database.connect();
    await verifyMigrationIdentity(database, url);
    locked = (await database.query('SELECT pg_try_advisory_lock($1::bigint) AS locked', [lock])).rows[0].locked;
    if (!locked) throw new Error('Another migration is running');
    await database.query('BEGIN ISOLATION LEVEL REPEATABLE READ'); transaction = true;
    await database.query(`LOCK TABLE ${tables.map(table => `public.${table}`).join(', ')} IN SHARE MODE`);
    const state = (await database.query(`SELECT EXISTS (SELECT FROM pg_namespace WHERE nspname='migration_meta') AS metadata,
      to_regclass('public.evidence_sources') IS NOT NULL AS foundation,
      current_setting('pg_stat_statements.track', true) AS track`)).rows[0];
    if (state.metadata || state.foundation || state.track !== approval.track) throw new Error('Unexpected history, foundation or statistics configuration');
    const exported = (await database.query('SELECT pg_export_snapshot() AS snapshot')).rows[0].snapshot;
    const before = await capture(url.toString(), { snapshot: exported });
    if (before.version !== reference.pgDumpVersion || digest(normalizeSchema(before.dump, reference.projection)) !== approval.beforeSchemaHash) throw new Error('Reviewed before-schema changed');
    verifyReconciliationSchema(before.dump, referenceDump, reference.projection);
    const fingerprints = (await database.query(fingerprintSql)).rows;
    await database.query(operation);
    if (canonical((await database.query(fingerprintSql)).rows) !== canonical(fingerprints)) throw new Error('Original rows or fields changed');
    // pg_dump in another session cannot see this transaction's DDL. Fixed SQL verifies
    // catalog postconditions before commit; exact independent dump comparison follows.
    await database.query('COMMIT'); transaction = false;
    const after = await capture(url.toString());
    verifyAdoptionReference({ reference, approvedHash: approval.referenceHash, baseline: manifest.baseline,
      referenceDump, targetDump: after.dump, pgDumpVersion: after.version });
    return 'Dev baseline prerequisite committed and independently compared. No ledger marking, adoption or foundation was run.';
  } finally {
    if (transaction) await database.query('ROLLBACK').catch(() => {});
    if (locked) await database.query('SELECT pg_advisory_unlock($1::bigint)', [lock]).catch(() => {});
    await database.end();
  }
}
