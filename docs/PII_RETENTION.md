# Schema hygiene and private-field retention (#14)

The report and coverage request writers use `lib/client-ip.ts`: prefer one valid
`x-real-ip`, otherwise the first `x-forwarded-for` address, otherwise NULL. This
validates syntax, not identity. Only trusted proxy header replacement establishes
the originating address; these headers must not be used as authentication.

`1791853200000_schema_hygiene.sql` converts historical request IPs to `inet`.
It keeps a valid first address from a forwarded list; invalid, short-form, CIDR,
or scoped addresses become NULL. It does not retain a second copy of private
values. No request/report rows are removed. The migration locks both tables and
rewrites their typed columns; review counts and lock/runtime impact beforehand.

The migration refuses historical `SPOT` reports rather than deleting or
reassigning them. Replacing `target_type` keeps ZONE, METER and STREET in their
original order and preserves the column/index/grants. Any unexpected enum
dependency stops the migration. Existing `FREE_*` lot enum values remain.

Extension removal uses PostgreSQL's live dependency check (`DROP ... RESTRICT`),
never CASCADE. Built-in `pg_catalog.gen_random_uuid()` defaults keep generating
IDs. A default using `extensions.uuid_generate_v4()`, a crypto function, or any
other extension dependent stops and rolls back the complete migration. Inspect
dependencies read-only first. If present, prepare a reviewed forward migration
to an equivalent built-in function where one exists; do not remove defaults or
drop dependent objects to force this migration through.

New OSM lots with unknown fee use the existing MIXED context type. The importer
still requires an explicitly approved signal source under #10. OSM tags never
establish authoritative payment or free permission; the legacy map renders all
lots as Unknown. This ticket performs no import or historical lot cleanup.

## Retention behavior

`public.clear_expired_pii()` clears report IPs and `user_location`, and request
IPs and `location`, when `created_at <= now() - interval '90 days'`. At exactly
90 days they are eligible. A daily run means execution can lag eligibility by
up to one schedule interval. It clears `reporter_email` on RESOLVED reports
regardless of age; OPEN and DISMISSED emails remain. Status is the resolution
authority: a timestamp alone does not mean resolved, and RESOLVED works even
when its timestamp is absent. There is no current application resolution writer;
maintainers must update status through their separately approved workflow.
Reopening after cleanup cannot recover an email. Report contents, target IDs,
warning counts, resolution notes and rows are preserved. Repeat runs are safe.

The fixed, parameterless SECURITY DEFINER function has a `pg_catalog` search
path and fully qualified tables. PUBLIC has no execution permission. The
non-login `pii_retention_executor` role receives only schema usage and execution,
not private-field reads or arbitrary table writes. `app_rw` receives nothing.
The job logs aggregate changed-row counts or a generic failure only.

## Target-specific rollout (not enabled by a deployment)

1. Review and integrate the ticket PR into `dev`. Follow [DATA.md](DATA.md) for
   branch/database/owner verification, current restore point, ledger and pending
   migration review. Never replay the baseline against an existing database.
   Review SPOT counts and extension dependencies without printing private data.
2. Test the migration over copied data on a disposable branch, and replay from
   an empty database with synthetic fixtures. The integration test requires a
   new empty `schema_hygiene_test` (optional numeric suffix), direct
   `HYGIENE_TEST_DATABASE_URL`, and independently confirmed
   `HYGIENE_TEST_EXPECTED_HOST`. It never loads `.env.local`.
3. Obtain explicit approval naming the environment, commit, snapshot and
   migration scope before shared/production writes. Apply with the guarded
   migration command; verify history, row counts, enum/extension dependencies,
   UUID defaults, preserved grants/provenance and old-code compatibility.
4. Separately approve retention execution for the target. An operator provisions
   `pii_retention_login` as a restricted LOGIN NOINHERIT NOSUPERUSER NOCREATEDB
   NOCREATEROLE NOREPLICATION NOBYPASSRLS role, grants database CONNECT and
   membership in `pii_retention_executor` with SET permission, without admin
   option or other memberships. Set a private password through provider tools;
   do not put owner or app credentials in the job. Verify it cannot read private
   fields or write tables and can invoke only the retention capability.
5. Configure the GitHub `pii-retention` environment with restricted deployment
   branches and required human approval for production. Store the direct login
   URL, expected host and database in environment secrets named
   `RETENTION_DATABASE_URL`, `RETENTION_EXPECTED_HOST`, and
   `RETENTION_EXPECTED_DATABASE`. Set environment variable `RETENTION_APPROVED`
   to `clear-expired-pii` only after approval. Enable the repository variable
   `PII_RETENTION_ENABLED=true` only after reviewing that configuration. It is
   absent/disabled by default. The daily workflow runs at 09:17 UTC from the
   default branch; before integration there, dispatch the reviewed `dev` revision
   manually against the approved dev target. Do not enable a default-branch
   schedule until it contains this reviewed migration/job and its target is approved.
6. Inspect the first run's aggregate counts and private boundary checks, repeat
   to confirm no further changes, and record execution evidence on #14. Monitor
   failed/missed Actions runs; scheduler availability is part of retention
   acceptance. Disable the repository variable to pause the scheduler. No code
   push, merge, workflow definition or passing test proves that retention runs.

Production migration, scheduled execution and live acceptance remain separate
human gates. Rollback means disabling the job/redeploying prior app code, not
restoring expired private values or undoing the schema over live user data.
