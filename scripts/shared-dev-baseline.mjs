import { directMigrationUrl } from './migration-connection.mjs';
import { canonical, digest } from './migration-lineage.mjs';

export function reconciliationTarget(connectionString, approval, approvedHash) {
  const url = directMigrationUrl(connectionString);
  const shared = approval.branchId === 'br-rough-lake-arrxiape' && approval.branchName === 'dev';
  const rehearsal = /^validation\/issue-120-[a-z0-9-]+$/.test(approval.branchName || '') &&
    /^br-[a-z0-9-]+$/.test(approval.branchId || '') && approval.branchId !== 'br-rough-lake-arrxiape' && approval.parentBranchId === 'br-rough-lake-arrxiape';
  if (approval.version !== 1 || digest(canonical(approval)) !== approvedHash || (!shared && !rehearsal) ||
      digest(url.hostname) !== approval.hostHash || approval.database !== 'find-free-parking-db' ||
      approval.owner !== 'find-free-parking-db_owner' || decodeURIComponent(url.pathname.slice(1)) !== approval.database ||
      decodeURIComponent(url.username) !== approval.owner) throw new Error('Reviewed shared-dev provider target required');
  return url;
}

import { normalizeSchema } from './schema-comparison.mjs';

/** Fixed inverse of this operation, solely to compare the independently replayed baseline. */
export function verifyReconciliationSchema(targetDump, referenceDump, projection) {
  let expected = normalizeSchema(referenceDump, projection);
  for (const block of [
    "--\n-- Name: pg_stat_statements; Type: EXTENSION; Schema: -; Owner: -\n--\n\nCREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA public;\n\n\n",
    "--\n-- Name: EXTENSION pg_stat_statements; Type: COMMENT; Schema: -; Owner:\n--\n\nCOMMENT ON EXTENSION pg_stat_statements IS 'track planning and execution statistics of all SQL statements executed';\n\n\n",
  ]) {
    if (expected.split(block).length !== 2) throw new Error('Unexpected baseline extension definition');
    expected = expected.replace(block, '');
  }
  const grant = 'GRANT INSERT(reported_status) ON TABLE public.reports TO app_rw;';
  if (expected.split(grant).length !== 2) throw new Error('Unexpected baseline report ACL');
  expected = expected.replace(grant, 'GRANT SELECT(reported_status),INSERT(reported_status) ON TABLE public.reports TO app_rw;');
  if (normalizeSchema(targetDump, projection) !== expected) throw new Error('Unexpected shared-dev schema drift');
}
