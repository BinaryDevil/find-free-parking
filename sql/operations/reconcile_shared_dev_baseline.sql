-- #120 only. Run through scripts/reconcile-shared-dev-baseline.mjs, never psql.
-- The caller verifies the independently reviewed target/schema/snapshot binding,
-- holds the common migration advisory lock, transaction and application SHARE locks.
DO $reconcile$
BEGIN
  IF current_database() <> 'find-free-parking-db' OR current_user <> 'find-free-parking-db_owner'
    OR EXISTS (SELECT FROM pg_namespace WHERE nspname = 'migration_meta')
    OR to_regclass('public.evidence_sources') IS NOT NULL
    OR EXISTS (SELECT FROM pg_extension WHERE extname = 'pg_stat_statements')
    OR NOT EXISTS (SELECT FROM pg_available_extension_versions WHERE name = 'pg_stat_statements' AND version = '1.11')
    OR NOT ('pg_stat_statements' = ANY (string_to_array(replace(current_setting('shared_preload_libraries'), ' ', ''), ',')))
    OR COALESCE(current_setting('pg_stat_statements.track', true), 'none') NOT IN ('top', 'all')
  THEN RAISE EXCEPTION 'Unexpected dev prerequisite state'; END IF;
  IF NOT EXISTS (
    SELECT FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname='reports' AND a.attname='reported_status'
      AND EXISTS (SELECT FROM aclexplode(a.attacl) x WHERE x.grantee='app_rw'::regrole AND x.grantor=c.relowner AND x.privilege_type='SELECT' AND NOT x.is_grantable)
      AND EXISTS (SELECT FROM aclexplode(a.attacl) x WHERE x.grantee='app_rw'::regrole AND x.grantor=c.relowner AND x.privilege_type='INSERT' AND NOT x.is_grantable)
      AND EXISTS (SELECT FROM aclexplode(a.attacl) x WHERE x.grantee='app_report_counts'::regrole AND x.grantor=c.relowner AND x.privilege_type='SELECT' AND NOT x.is_grantable)
  ) THEN RAISE EXCEPTION 'Unexpected direct status ACL provenance'; END IF;
END
$reconcile$;

CREATE EXTENSION pg_stat_statements WITH SCHEMA public VERSION '1.11';
COMMENT ON EXTENSION pg_stat_statements IS 'track planning and execution statistics of all SQL statements executed';
REVOKE SELECT (reported_status) ON TABLE public.reports FROM app_rw;

DO $verify$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace
      WHERE e.extname='pg_stat_statements' AND e.extversion='1.11' AND n.nspname='public'
        AND obj_description(e.oid, 'pg_extension')='track planning and execution statistics of all SQL statements executed')
    OR has_column_privilege('app_rw', 'public.reports', 'reported_status', 'SELECT')
    OR NOT has_column_privilege('app_rw', 'public.reports', 'reported_status', 'INSERT')
    OR NOT has_column_privilege('app_report_counts', 'public.reports', 'reported_status', 'SELECT')
  THEN RAISE EXCEPTION 'Dev prerequisite postcondition failed'; END IF;
END
$verify$;
