import { directMigrationUrl } from './migration-connection.mjs';
import { canonical, digest } from './migration-lineage.mjs';
import { normalizeSchema } from './schema-comparison.mjs';

export const productionBranchId = 'br-rough-base-aryz0z5a';
const devBranchId = 'br-rough-lake-arrxiape';

/** Fixed, credential-free operator messages; the CLI prints only these. */
export const guardMessages = {
  DEV_BASELINE_PRODUCTION_DENIED: 'Production branch is never a reconciliation target.',
  DEV_BASELINE_TARGET_UNREVIEWED: 'Reviewed shared-dev provider target required.',
  DEV_BASELINE_PG_DUMP_VERSION: 'Local pg_dump version differs from the reviewed reference.',
  DEV_BASELINE_REFERENCE_UNTRUSTED: 'Reviewed baseline replay reference required.',
  DEV_BASELINE_APPROVAL_INVALID: 'Approval needs a reviewed before-schema hash and track.',
  DEV_BASELINE_OPERATION_CHANGED: 'Operation SQL differs from the reviewed operation hash.',
  DEV_BASELINE_SNAPSHOT_INVALID: 'Retained snapshot evidence is missing or does not match the target.',
  DEV_BASELINE_SNAPSHOT_STALE: 'Snapshot inspection is older than one hour; re-fetch and re-review it.',
  DEV_BASELINE_SNAPSHOT_EXPIRED: 'Snapshot retention ends before execution; re-fetch and re-review it.',
  DEV_BASELINE_EVIDENCE_DIR: 'DEV_BASELINE_EVIDENCE_DIR must name a new directory outside the checkout.',
  DEV_BASELINE_IDENTITY_MISMATCH: 'Connected database or owner differs from the reviewed target.',
  DEV_BASELINE_ALREADY_RECONCILED: 'pg_stat_statements is already installed; target is not the unreconciled shared dev database.',
  DEV_BASELINE_LOCK_BUSY: 'Another migration is running.',
  DEV_BASELINE_STATE_UNEXPECTED: 'Migration history or foundation objects exist.',
  DEV_BASELINE_TRACK_MISMATCH: 'pg_stat_statements.track differs from the approval.',
  DEV_BASELINE_BEFORE_SCHEMA_CHANGED: 'Live before-schema differs from the reviewed hash.',
  DEV_BASELINE_SCHEMA_DRIFT: 'Live schema has drift beyond the two documented differences.',
  DEV_BASELINE_FINGERPRINT_CHANGED: 'Original rows or fields changed; rolled back.',
  DEV_BASELINE_COMMIT_UNKNOWN: 'COMMIT outcome unknown. Verify catalog state before anything else.',
  DEV_BASELINE_COMMITTED: 'Committed, but final capture, comparison or evidence write failed. Stop; do not run baseline marking, adoption or replay.',
};

export function guard(code) {
  return Object.assign(new Error(guardMessages[code]), { code });
}

export function reconciliationTarget(connectionString, approval, approvedHash) {
  if ([approval?.branchId, approval?.parentBranchId, approval?.snapshot?.sourceBranchId].includes(productionBranchId)) {
    throw guard('DEV_BASELINE_PRODUCTION_DENIED');
  }
  let url;
  try { url = directMigrationUrl(connectionString); } catch { throw guard('DEV_BASELINE_TARGET_UNREVIEWED'); }
  const shared = approval.branchId === devBranchId && approval.branchName === 'dev';
  const rehearsal = /^validation\/issue-120-[a-z0-9-]+$/.test(approval.branchName || '') &&
    /^br-[a-z0-9-]+$/.test(approval.branchId || '') && approval.branchId !== devBranchId && approval.parentBranchId === devBranchId;
  if (approval.version !== 1 || digest(canonical(approval)) !== approvedHash || (!shared && !rehearsal) ||
      url.port !== '5432' || digest(url.hostname) !== approval.hostHash || approval.database !== 'find-free-parking-db' ||
      approval.owner !== 'find-free-parking-db_owner' || decodeURIComponent(url.pathname.slice(1)) !== approval.database ||
      decodeURIComponent(url.username) !== approval.owner) throw guard('DEV_BASELINE_TARGET_UNREVIEWED');
  return url;
}

/** Fixed inverse of this operation, solely to compare the independently replayed baseline. */
export function verifyReconciliationSchema(targetDump, referenceDump, projection) {
  let expected = normalizeSchema(referenceDump, projection);
  for (const block of [
    "--\n-- Name: pg_stat_statements; Type: EXTENSION; Schema: -; Owner: -\n--\n\nCREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA public;\n\n\n",
    "--\n-- Name: EXTENSION pg_stat_statements; Type: COMMENT; Schema: -; Owner: \n--\n\nCOMMENT ON EXTENSION pg_stat_statements IS 'track planning and execution statistics of all SQL statements executed';\n\n\n",
  ]) {
    if (expected.split(block).length !== 2) throw guard('DEV_BASELINE_REFERENCE_UNTRUSTED');
    expected = expected.replace(block, '');
  }
  const grant = 'GRANT INSERT(reported_status) ON TABLE public.reports TO app_rw;';
  if (expected.split(grant).length !== 2) throw guard('DEV_BASELINE_REFERENCE_UNTRUSTED');
  expected = expected.replace(grant, 'GRANT SELECT(reported_status),INSERT(reported_status) ON TABLE public.reports TO app_rw;');
  if (normalizeSchema(targetDump, projection) !== expected) throw guard('DEV_BASELINE_SCHEMA_DRIFT');
}
