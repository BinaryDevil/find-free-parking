# Database role rollout (#5)

This is a prepared change, not an applied migration or a production verification.
The grant map comes from the queries at `origin/dev` revision
`f3db697fcb22b852b8b67b5a6c187b4ad0dce9d0` and tracked SQL. No live schema
was inspected. Compare each target database before executing
[15.app_rw.sql](../sql/archived/15.app_rw.sql); never run the historical SQL folder in order.

## Role model and query permissions

| Role | Connection and purpose | Permissions |
| --- | --- | --- |
| `app_rw` | Pooled app connection; direct fallback also uses this role | Read the four map/coverage tables; limited report reads; insert report and city-request columns |
| `app_report_counts` | No login; security-definer trigger owner | Read report aggregation columns; read target IDs and update only `report_counts` on three parking tables |
| Existing migration/owner | Direct connection in a separate operator environment | Owns tables; migrations and explicitly approved imports; never in Vercel runtime variables |

`app_rw` owns no objects, has no memberships, cannot create roles/databases,
bypass RLS, create persistent objects or temporary tables, or update/delete/truncate
tables. It can read parking rules and insert advisory Driver Reports; this change
does not fix current classification policy.

| Source | Required access |
| --- | --- |
| `app/api/health/route.ts` | CONNECT, `SELECT 1` |
| `app/api/parking/route.ts` | SELECT parking_meters and street_segments |
| `app/api/parking/zones/route.ts` | SELECT parking_zones |
| `app/actions/coverage.ts` | SELECT covered_cities |
| `app/api/report/route.ts` | SELECT reports(id, target_id, target_type, user_ip, created_at); INSERT the six submitted columns |
| `app/actions/request-coverage.ts` | INSERT city_requests(city_name, state, country, location, user_ip) |

Report SELECT is required for duplicate detection and `RETURNING id`. No app
SELECT is granted on report text, email, precise location, or city requests.
The existing AFTER INSERT trigger reads reports and updates parking counts;
its restricted definer role preserves that behavior without app UPDATE grants.
The function has a fixed search path, qualified tables, no dynamic SQL, and no
PUBLIC/app execute grant. PostgreSQL checks trigger execute permission at trigger
creation; revoking it does not disable an existing trigger.

The #13 warning reader uses aggregate SELECT on `public.driver_warnings`,
granted by its additive migration. Apply it to an approved environment before
deploying the reader. The earlier #18
[column grant](../sql/archived/17.driver_warning_read.sql) is not required by
this reader; it exposes no private fields. Existing duplicate-detection column
permissions remain. The [Driver Warning rollout](DRIVER_WARNINGS.md) separately
gates retirement of the trigger/function and its UPDATE grants, then obsolete
count columns, after all relevant active/rollback readers are retired. The role
model above describes the legacy writer until that stage is applied.

## Human preflight (each isolated dev and production database)

1. Confirm the target in the provider UI, database name, owner connection, backup
   and restore point. Export role attributes, memberships, database/schema ACLs,
   table/column ACLs, RLS policies, defaults, triggers and function definitions to
   a private operator record. Never commit credentials or report data.
2. Confirm all six tables above exist in `public`, columns match their queries,
   report and city-request IDs default to UUIDs (no sequence grants), and PostGIS
   and enum type USAGE/function EXECUTE permissions are available. Check RLS as
   `app_rw` after migration; do not disable policies to make tests pass.
3. Compare `pg_get_functiondef` for `public.update_parking_report_counts()` to
   [11.zone_reports.sql](../sql/archived/11.zone_reports.sql). Confirm one enabled AFTER
   INSERT row trigger on reports and inspect every other trigger/default for
   extra permissions or privileged side effects. Stop and revise if live schema
   differs, including additional application queries on the deployed revision.
4. Ensure `app_rw` and `app_report_counts` do not already exist. Inventory PUBLIC
   database CREATE/TEMP and public-schema CREATE dependencies. The migration
   revokes those shared privileges: explicitly grant legitimate operators their
   needed privileges before execution. Inspect other schemas, PUBLIC writable
   tables, callable security-definer functions and default privileges; remove
   inherited mutation/DDL paths through separately reviewed SQL before rollout.
   Do not assume NOINHERIT removes PUBLIC access. No future-table blanket grants
   or owner membership should be added to either restricted role.
5. Confirm the operator can CREATE ROLE, transfer function ownership and adjust
   ACLs in this provider, including ownership of the public schema (older PostgreSQL
   databases may leave that schema owned by a different administrator). The script
   checks effective CREATE/TEMP privileges before commit because ACL statements
   can warn without failing when the operator lacks authority. It fails on
   duplicate roles or a missing expected trigger. Do not bypass a failure.

Useful read-only catalog queries (metadata only):

```sql
SELECT rolname, rolsuper, rolcreatedb, rolcreaterole, rolcanlogin,
       rolreplication, rolbypassrls FROM pg_roles;
SELECT pg_get_userbyid(roleid) AS role, pg_get_userbyid(member) AS member
FROM pg_auth_members;
SELECT datname, datacl FROM pg_database WHERE datname = current_database();
SELECT nspname, nspacl FROM pg_namespace WHERE nspname !~ '^pg_' AND nspname <> 'information_schema';
SELECT c.relname, c.relacl, c.relrowsecurity, c.relforcerowsecurity
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p', 'v', 'S');
SELECT table_name, column_name, column_default FROM information_schema.columns
WHERE table_schema = 'public' AND table_name IN ('reports', 'city_requests');
SELECT pg_get_triggerdef(oid) FROM pg_trigger
WHERE tgrelid = 'public.reports'::regclass AND NOT tgisinternal;
SELECT pg_get_functiondef('public.update_parking_report_counts()'::regprocedure);
SELECT schemaname, tablename, policyname, roles, cmd FROM pg_policies;
```

## Apply and verify with human approval

1. On an isolated dev database first, execute only `sql/archived/15.app_rw.sql` through
   the direct migration connection with stop-on-error enabled. Set an `app_rw`
   password privately via the provider or interactive `psql` `\password app_rw`;
   the SQL creates a login with no password. Never put a password in shell history.
2. Connect as the actual `app_rw` login and run
   [15.app_rw.verify.sql](../sql/archived/15.app_rw.verify.sql). All assertions must pass.
   Check catalogs against the preflight record: no app ownership/membership;
   function owner only `app_report_counts`; no remaining shared privilege paths.
3. Use an ignored local env with the dev `app_rw` pooled URL and, if needed, dev
   `app_rw` direct fallback. Exercise `/api/health`, map meter/street queries,
   zone bbox and point queries, coverage checking and city-request submission.
   Submit a report for each METER/STREET/ZONE fixture and verify its ID, duplicate
   behavior, and the persisted count. Check invalid submissions still fail.
   These checks write fixture data: perform them only on the isolated dev DB.
4. After passing dev checks and explicit human production approval, snapshot the
   production catalog/function definition and restore point, apply the reviewed
   SQL there, set a separate password and rerun read-only permission assertions.
5. In Vercel, set Preview variables to the isolated dev `app_rw` connection and
   Production variables to production `app_rw`. `lib/db.ts` prefers
   `DATABASE_URL_POOLED`; replace or remove owner credentials in BOTH variables,
   including branch overrides. Local pulled app env must contain no owner URL.
   Keep the direct owner URL only in a separate ignored operator environment.
   `scripts/seed_utils.ts` prefers DATABASE_URL but can fall back to pooled:
   inspect each script and its env before any authorized import.
6. Redeploy the approved revisions so functions use the new credentials. Confirm
   deployment revision, effective environment, actual database login identity in
   a private operator check, health, both parking APIs and public map. A 200 health
   check alone proves neither least privilege nor map/report correctness.
   For production report submission, obtain approval for the exact test target
   and cleanup; otherwise record this check as pending. Never delete user rows.
7. Record dated results on [#5](https://github.com/BinaryDevil/find-free-parking/issues/5).
   Keep it open until production traffic uses the restricted role and required
   public checks pass. No production work was authorized by preparing this PR.

## Rollback

Before commit, a failure rolls back the complete migration. After commit, revert
Vercel credentials to the privately retained previous values only with human
approval (this restores the unsafe owner role temporarily), redeploy and verify.
Keep data and the new roles; do not drop tables or replay old migrations. Restore
the saved function owner/body/ACLs and PUBLIC ACLs only through separately reviewed
SQL if necessary. Do not restore PUBLIC CREATE/TEMP automatically, or drop the
trigger owner while its function remains in use. A code revert does not undo SQL
or Vercel settings.
