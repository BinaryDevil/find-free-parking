# Production release automation

The `Production release` workflow runs on pushes to `main`. It uses the
`production` environment and the existing `NEON_API_KEY` and
`PRODUCTION_MIGRATION_DATABASE_URL` secrets. A credentials job emits only a
boolean; the release job is skipped when either secret is absent. No owner
credential is copied into app runtime configuration.

A push alone authorizes nothing. The runner requires a unique merged PR from
this repository's `dev` into `main`, whose merge commit is the workflow SHA
and whose merger is a GitHub User (not a Bot). It skips other pushes and stale
runs after a newer main revision. Humans alone merge release PRs under
[ADR-0005](adr/0005-agent-verified-gates.md).

## Preparing a release

Before the human merge, update `.github/production-migrations.json` to a JSON
array of the exact SQL filenames to apply for this release. Include those same
files in the release PR description using this format:

```markdown
## Production actions
- Migration: `sql/migrations/1791849600000_evidence_provenance.sql`

Verification: schema/history and old-code compatibility evidence linked here.
Rollback: redeploy the previous compatible deployment; preserve database data.
```

The example names a historical migration; select the actual pending files.
For a release without automated migrations, commit `[]` and write
`No automated migrations.` under `## Production actions`. Do not combine that
line with migration entries. List manual baseline adoption, loads and retirement
steps separately, with their order, verification and rollback. This workflow
runs only migrations and read-only smoke checks. Any manual prerequisite must
finish before the workflow is rerun; it never marks the baseline automatically.

The committed plan prevents a later PR-body edit from expanding authorization.
Every pending file must be listed in both places. Unexpected migration history,
unlisted pending migrations or a missing baseline ledger stop the run before
snapshot creation or migration. Applied files can remain in the plan on a rerun;
the migration ledger makes the rerun a no-op.

## Execution and recovery

The production target is pinned to Neon project `misty-breeze-47060812`, branch
`br-rough-base-aryz0z5a`. Before database access, Neon endpoint and database
metadata must match the direct owner connection. The existing guarded migration
command receives its expected host and database from that verified connection.
Changing targets requires a reviewed code change; there is no workflow input
that redirects production writes.

The runner creates a no-compute `snapshot/<merge-sha>` child branch, waits for
it to be ready and verifies its parent. Reruns retain that same restore point.
Snapshots are retained for recovery, not deleted automatically. It then runs
`pnpm db:migrate`, verifies the ledger and smoke-checks `/api/health` plus
`/api/parking` and `/api/parking/zones` for Seattle and Vancouver. Smoke checks
retry while the independent deployment settles. They validate HTTP/JSON
contracts; they do not prove deployment revision, browser behavior, vacancy,
source approval or every release check.

Results go to the release PR. Failures also create or update one `needs-triage`
issue per release SHA using the sync runner's shared alert helper. Reports
contain only fixed diagnostics, migration counts, snapshot IDs and run links;
raw errors, API bodies, SQL and connection details are suppressed. Comment and
issue delivery are attempted independently. A notification outage fails the run;
rerun after repairing access. The same applies to failed snapshot creation,
identity checks, migrations or smoke checks. Infrastructure failure before the
runner starts (installation, runner loss or cancellation) remains visible in
Actions and may require an agent to record results manually.

On failure follow [release gates](agents/release-gates.md): restore the previous
compatible deployment as needed and record remaining release checks. The
workflow does not restore database data, run data loads, approve sources or
retire legacy data. A human must authorize restoration over user data.

## Disposable validation

Unit tests inject only external API/database boundaries. Run the regular suite
with `pnpm test`. For live migration validation, provision a fresh empty
database named `release_workflow_test` in an agent-owned local PostGIS container
or unused Neon validation branch. Privately set `RELEASE_TEST_DATABASE_URL`,
then run `node --test tests/release-db.test.mjs`. It refuses existing tables,
replays the baseline, applies the approved forward migrations through the real
migration command, checks unchanged history on rerun and exercises redacted,
deduplicated failure reports. Its GitHub and snapshot boundaries are fixtures;
record provider snapshot and live alert-delivery evidence separately. Follow
[data operations](DATA.md#safe-execution) and ADR-0005; never
point tests at shared dev or production.
