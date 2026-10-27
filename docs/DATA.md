# Data and database operations

> **Approvals:** this runbook predates [ADR-0005](adr/0005-agent-verified-gates.md). Where it asks for human or separate approval, follow ADR-0005's *Reading older runbooks* section; its other steps are unchanged.

For seeding, schema changes, cleanup, or rollback, read this document and [ADR-0001](adr/0001-verified-rules-only.md). Existing imports are historical implementation examples, not approved evidence policies.

## Evidence before expansion

Which sources a city may be set up or seeded from is decided by [ADR-0002: Evidence Source Policy](adr/0002-evidence-source-policy.md), applied through the `cover-city` skill. Its output is a source inventory under `docs/sources/` (see [the inventory template](sources/TEMPLATE.md)); seed only from sources approved there. Registering a city page is separate from evidence approval.

When reusing existing import code, review parser defaults and incomplete records: `parseSignText` and the OSM helpers contain assumptions (default schedules, guessed rates, road-class mapping) that the policy does not accept as evidence.

## Safe execution

- Inspect `scripts/seed_utils.ts` and the chosen script to confirm connection selection and which rows it inserts, updates, deletes, or skips. The app prefers pooled connections; script helpers prefer direct connections.
- Parking data persists in PostgreSQL/PostGIS; it is not automatically rebuilt from repository files. Review imports against a backup or non-production database first. Do not assume all seed scripts are idempotent.
- Record schema changes in a reviewed `sql/migrations/<13-digit-timestamp>_<description>.sql` file before execution. Historical files are [archived](../sql/archived/README.md); never execute that directory in filename order.
- Seeding, cleanup scripts, `clear_db.ts`, and `migrate-to-neon.sh` can change data or infrastructure. Confirm the target, explicit scope, backup, and verification plan before shared/production writes.
- Preserve existing rows and previously applied additive evidence columns unless the user explicitly authorizes a data change. Code rollback does not require database rollback.
- Verify affected row counts, spatial placement, schedules, evidence eligibility, and API behavior after an authorized import. A successful script or row count alone does not prove accurate rules.

For #16's guarded retained archive, serving retirement, aggregate reconciliation
and reverse command, see [Legacy retirement](LEGACY_RETIREMENT.md). Production
execution requires the exact actions in a human-merged release PR.

For dated backup limits, recovery into a separate branch, and deployment rollback,
follow [Recovery](RECOVERY.md). A documented procedure is not a completed restore
rehearsal or evidence of continuous recovery beyond the provider's history window.

## Request-driven imports

`pnpm check-requests` runs `scripts/automate_seeding.ts` to group city requests case-insensitively and open `Cover city: <City>` GitHub issues when the count is more than 10. Issues carry `needs-triage`, the aggregate request count, and instructions to use the `cover-city` skill under ADR-0002. An exact, case-insensitive matching open issue in this repository is skipped (pull requests do not count). Legacy `covered_cities` and page registry entries do not suppress evidence-review requests or establish Coverage.

Use `pnpm check-requests --dry-run` to print complete proposed issues without creating them. Both modes only read the database; normal mode writes GitHub issues and requires an authenticated `gh` CLI with repository access. City names are untrusted data transported as JSON, never shell commands. No seed script is selected or executed, and no scheduler configuration is tracked here. Review the target database and use an isolated dev environment for validation. Demand prioritizes evidence discovery; source approval and any later database writes remain separate human decisions.

## Query statistics

See [query visibility](QUERY_STATS.md) for the #6 extension SQL, production approval, private diagnostics, and the review after a week of traffic.

## Migrations

### Guarded preservation execution

The owner-approved [ADR-0003 amendment](adr/0003-sql-migrations.md#preservation-lineage-amendment--accepted-2026-10-21) permits an explicitly adopted preservation-v1 lineage while keeping sealed legacy SQL and history intact. The [implementation design](plans/schema91-preservation-design.md) defines immutable manifest/hash/order checks, separate history, and initial empty or exact-baseline-only adoption. Matching ledger names alone do not establish schema compatibility; unknown history, partial objects or drift stop adoption.

The commands and replay procedures below describe the legacy path. The [guarded preservation runbook](implementation/preservation-runner.md) documents the implemented fixed manifest, explicit bootstrap/adoption and selected-lineage commands. Local disposable proof does not authorize shared adoption or establish target compatibility. Snapshot and exact schema/history comparison precede authorized adoption writes; production adoption metadata writes and migrations must be listed separately under a human-merged release PR. Code-only releases continue to write neither. Retention execution, source approval, sync and legacy retirement remain separately gated.

For #14's IP conversion, safe enum/extension migration and separately enabled
private-field retention scheduler, see [PII retention](PII_RETENTION.md).

For #10's additive Evidence Sources, legacy backfill, import identities and
separately gated production procedure, see [Evidence provenance](EVIDENCE_PROVENANCE.md).

[ADR-0003](adr/0003-sql-migrations.md) adopts `node-pg-migrate` 9.0.0, raw SQL,
and `migration_meta.pgmigrations`. Commands never load app `.env.local` implicitly
and never fall back to pooled credentials. Privately set `MIGRATION_DATABASE_URL`
to the **direct owner** URL from the explicitly selected Neon branch, plus
`MIGRATION_EXPECTED_HOST` and `MIGRATION_EXPECTED_DATABASE` from that branch's
provider record. Do not put values in tracked files, command arguments, issue
comments or ordinary logs. The checks match endpoint/database but cannot prove
the branch's purpose: verify its branch ID/name in Neon before every operation.
App credentials must remain separate; no migration runs during build/deployment.

Migration and release owner URLs accept only `sslmode` and `channel_binding`
query options, each once. Other options are rejected before connecting because
`pg` can use them to override the inspected host, database or role. The connected
database and role must match the URL, and the role must own that database.

All integrated migrations are immutable, including ones not applied yet. CI checks
against the PR base, previous push on dev/main, or dev for feature pushes, without
database credentials. Unmerged migrations can be corrected during disposable
validation. Locally run
`pnpm db:check-files origin/dev`. Integrate and review each migration before any
shared-database execution; correct integrated migrations with a new timestamped migration. Use only
SQL files, no down section for the baseline. No down/reset command is provided.

### Fresh baseline verification

`pnpm db:migrate` replays **all** pending migrations, not only the baseline.
The exact baseline-only parity evidence below was captured for #9 before later
migrations existed. With #10 integrated but not yet applied to production, a
fresh replay intentionally includes the reviewed Evidence Source/provenance
additions described in [EVIDENCE_PROVENANCE.md](EVIDENCE_PROVENANCE.md). Retain
and review those schema differences; do not ignore them or claim full parity
with a production database still at the baseline. Final R2 production parity
requires separately approved application of the pending additive migrations.

1. Create a disposable Neon branch explicitly named for migration validation,
   using a current production parent. Existing `dev` and production must retain
   all data. A copied or schema-only branch already has the schema and does not
   prove replay: create a **new empty database**, or recreate only the copied
   database on this disposable branch after verifying its branch endpoint.
   For exact provider-ACL parity, retain the copied `public` schema and provider
   default ACLs, and remove only the reviewed copied application tables, enums,
   functions and installed extensions before replay. This destructive preparation
   requires explicit approval naming the disposable branch; it is never a shared
   database cleanup. Rebuild every application object through migrations.
   Never clear tables or reset a shared database. If branch capacity is exhausted,
   obtain an explicitly disposable target; do not delete unrelated branches.
2. Use the same project database owner (`find-free-parking-db_owner`) and the
   PostgreSQL/extension versions found in production. Neon supplies provider roles
   and default ACLs. The baseline creates app roles only if missing, without
   passwords; existing role attributes/passwords are preserved. Database-level
   CONNECT/TEMP/CREATE ACLs remain a separate [role rollout](DB_ROLES.md).
3. Confirm the direct endpoint and empty database, then run `pnpm db:migrate`.
   Run it again: history must contain exactly one baseline plus each pending
   forward migration once, and the second run must leave schema/history
   unchanged. For the automated replay test, provision
   the empty database named `migration_baseline_test` and privately set
   `MIGRATION_TEST_DATABASE_URL`; run `node --test tests/migration-replay.test.mjs`.
   The regular suite skips this integration test without that variable. It refuses
   existing application tables or a nonempty ledger. A failed migration can leave
   an empty history table because the tool prepares history before its migration
   transaction. Check extension versions/namespaces using
   `pg_extension`, function owner/search path/definer security, three evidence
   defaults and NOT NULL, all constraints/indexes/triggers and grants.
4. Capture schema-only dumps of production **read-only** and the fresh target
   using the same PostgreSQL 17 `pg_dump`, including ownership/ACLs, with
   `--schema-only --exclude-schema=migration_meta`. Pass credentials via private
   environment variables, never URL arguments. Use `PGOPTIONS=-c
   default_transaction_read_only=on` for production. Store dumps outside tracked
   context. Run `node scripts/compare-schema.mjs <production-dump> <fresh-dump>`.
   Before pending production application, the comparison must report exactly
   the reviewed additive migrations as well as any provider difference below;
   it must not report a full match. Only dump session tokens/version comments are normalized. Defaults, ACLs,
   owners and function bodies are not discarded. Compare extension versions
   separately (pg_dump does not pin them). New Neon databases can have different
   provider `cloud_admin` default ACLs: the current fresh database grants fewer
   privileges to `neon_superuser` than production's older `GRANT ALL`. Do not
   broaden them to force a match. Record the strict diff, then optionally use
   `--application` to exclude only the two public-schema cloud_admin default ACL
   sections. That result establishes application-schema parity, not full database
   parity; keep full-parity acceptance pending explicit human review of this
   provider difference. Application default ACLs remain compared.
5. Run Neon schema diff for the same database on fresh and production branches.
   Expected differences are `migration_meta` (history), the exact reviewed
   additive objects not yet applied to production (currently #10), and any
   explicitly recorded provider default ACL difference above. Review the complete diff; do not wave
   away application-schema differences. Record dated evidence
   on #9, retaining private dumps. Delete only the disposable validation resource
   after evidence is recorded and cleanup is authorized.

Historical baseline-only validation for #9 (before #10): the approved isolated branch
`validation/issue-9-migration-baseline` was cleared of copied application objects
and rebuilt solely through migrations. Repeat execution preserved the single
baseline history entry. Strict PostgreSQL 17.11 schema-only dumps match production
with only `migration_meta` excluded, retaining all provider/application ACLs and
ownership. Neon schema diff confirms only the migration history schema/table/
sequence/default/primary key are added; extension versions/namespaces match.
No provider ACL exception was needed on this branch. Production ledger adoption
still requires the separate human approval below.

### Adopting the baseline on an existing database

For the shared dev database's reconciliation prerequisite, see
[shared-dev-baseline](implementation/shared-dev-baseline.md).

**Never run the baseline DDL on production or existing dev.** Baseline ledger
marking is a database write: for production it is a release-PR *Production action*; for dev it follows ADR-0005's shared-dev rule.
Ticket #9 remains incomplete until production marking and verification are done.

1. Review the PR/commit, fresh replay and schema-diff evidence. Reinspect the target
   live schema read-only immediately before adoption; compare to the validated
   baseline. Stop for drift. In the 2026-10-10 inspection, dev lacked production's
   `pg_stat_statements` and had the additional #18 `reports.reported_status` SELECT
   grant. These differences need separately reviewed reconciliation/recording;
   do not silently replay archived SQL or claim dev equals production.
2. Verify target branch/database/direct owner, empty migration ledger (or that
   this exact baseline is already recorded), and restricted role/database ACLs.
   Take a provider snapshot/retained restore point and record its identity/time
   privately. Confirm the restore procedure and retention; an old branch name
   alone is not proof of a current backup. Record on #9 the release PR (production) or ticket (dev)
   authorizing **ledger-only marking**, naming the reviewed commit and target.
3. Privately set the three migration connection/identity variables above. Set
   `MIGRATION_BASELINE_APPROVED=1791676800000_baseline`, then run
   `pnpm db:baseline`. This pins fake marking to the baseline only (count 1); it
   creates the history schema/table and row without executing baseline SQL or
   later migrations. Unset the approval variable afterwards. No password, seed,
   cleanup, schema repair or release is authorized by this procedure.
4. Verify one `migration_meta.pgmigrations` baseline row and compare fresh
   read-only before/after schema dumps excluding `migration_meta`: no differences.
   Record that data was not touched and roles/grants did not change. Record
   production adoption separately from source implementation, local validation,
   integration, deployment and public production behavior.

### Later additive changes and production releases

Create a Neon test branch from production → adopt the baseline there only after
comparison → apply the reviewed new migrations over its direct owner connection
with `pnpm db:migrate` → verify schema diff, backward compatibility and relevant
behavior → list the migrations under the release PR's *Production actions* →
human merges the release PR → take a production snapshot → apply the listed
migrations → verify schema/history and old-code compatibility. The release code
must fail closed until its migrations are applied. Follow
[release gates](agents/release-gates.md); a ticket PR into `dev` is not a release.
Keep previous deployments usable against additive schema. A code rollback does
not authorize schema rollback, ledger deletion or restoration over user data.
