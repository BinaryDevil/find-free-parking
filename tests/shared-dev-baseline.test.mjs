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
