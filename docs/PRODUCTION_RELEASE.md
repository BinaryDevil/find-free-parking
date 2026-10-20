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
For a nonempty plan, every pending file must be listed in both places. Unexpected migration history,
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

For every nonempty committed migration plan (including safe retries), the runner
first requires a successful `Vercel` GitHub commit status for the exact
human-merged release SHA and reads `https://findfreeparking.info/api/revision`
without caching or redirects. That public runtime must report the same SHA and
`production` environment from Vercel's deployment metadata. The endpoint is
independent of database health so the release code can identify itself before
schema changes. No additional token is needed. Vercel system environment
variables must be available to the runtime; absent metadata fails closed.
Pending, failed, absent or stale evidence stops before snapshot creation and
migration execution and uses the existing redacted failure report. The gate
does not wait or infer readiness from elapsed time: rerun the authorized workflow
after deployment is ready. A healthy endpoint alone never proves a revision.

This gate establishes ordering only. It does not make the immutable non-additive
schema-hygiene migration satisfy ADR-0005, adopt a missing baseline, or make the
old raw-header writer a compatible rollback. Those release blockers require
separate resolution. The report/coverage writer must be deployed before inet
conversion, and every active or rollback deployment must use that writer; see
[PII retention rollout](PII_RETENTION.md#target-specific-rollout-not-enabled-by-a-deployment).
For the staged writer rollout, prepare two separately human-merged release PRs:

1. Ship the validated writer with committed `[]` and `No automated migrations.`.
   The code-only run verifies the production target, retains its snapshot, checks
   the exact deployed release revision and current main after snapshot readiness,
   and runs the health/parking smoke checks. It performs no baseline adoption,
   migration invocation or migration-history writes. Pending files, an absent
   ledger or ledger contents do not block this stage; migration-only history,
   baseline and pending-file checks do not apply.
2. Verify the writer in production and confirm every active deployment and every
   eligible rollback candidate uses the compatible validated writer. Only then
   prepare a later release PR listing the exact conversion actions and its
   verification/rollback evidence. Its human merge authorizes only those listed
   actions; it does not extend the first release's authorization.

This support does not resolve the non-additive migration-policy conflict tracked
in #91 or make either release ready. Resolve that policy and independently verify
production-derived schema, historical values and rollback compatibility before
listing a conversion action. Never rewrite or fake-mark immutable migrations.

After snapshot readiness, every release verifies deployment/runtime and checks
that main still equals the authorized SHA. A nonempty plan repeats its earlier
verification immediately before invoking migrations.
These are point-in-time checks, not an atomic lock on external deployment changes.

The runner then creates a no-compute `snapshot/<merge-sha>` child branch, waits for
it to be ready and verifies its parent. Reruns retain that same restore point.
Snapshots are retained for recovery, not deleted automatically. For nonempty
plans it then runs `pnpm db:migrate` and verifies the ledger. Every release smoke-checks `/api/health` plus
`/api/parking` and `/api/parking/zones` for Seattle and Vancouver. Smoke checks
retry transient API failures after the revision gate. They validate HTTP/JSON
contracts; they do not prove browser behavior, vacancy,
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
proves code-only releases leave an absent ledger and existing history/data
unchanged despite pending files, replays the baseline, applies the approved forward migrations through the real
migration command, checks unchanged history on rerun and exercises redacted,
deduplicated failure reports. Its GitHub and snapshot boundaries are fixtures;
record provider snapshot and live alert-delivery evidence separately. Follow
[data operations](DATA.md#safe-execution) and ADR-0005; never
point tests at shared dev or production.
