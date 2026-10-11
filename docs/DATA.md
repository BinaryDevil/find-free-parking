# Data and database operations

For seeding, schema changes, cleanup, or rollback, read this document and [ADR-0001](adr/0001-verified-rules-only.md). Existing imports are historical implementation examples, not approved evidence policies.

## Evidence before expansion

Which sources a city may be set up or seeded from is decided by [ADR-0002: Evidence Source Policy](adr/0002-evidence-source-policy.md), applied through the `cover-city` skill. Its output is a source inventory under `docs/sources/` (see [the inventory template](sources/TEMPLATE.md)); seed only from sources approved there. Registering a city page is separate from evidence approval.

When reusing existing import code, review parser defaults and incomplete records: `parseSignText` and the OSM helpers contain assumptions (default schedules, guessed rates, road-class mapping) that the policy does not accept as evidence.

## Safe execution

- Inspect `scripts/seed_utils.ts` and the chosen script to confirm connection selection and which rows it inserts, updates, deletes, or skips. The app prefers pooled connections; script helpers prefer direct connections.
- Parking data persists in PostgreSQL/PostGIS; it is not automatically rebuilt from repository files. Review imports against a backup or non-production database first. Do not assume all seed scripts are idempotent.
- Record schema changes in a reviewed `sql/N.description.sql` file before execution. Existing SQL numbering has collisions; inspect files and actual schema rather than blindly executing the folder in filename order.
- Seeding, cleanup scripts, `clear_db.ts`, and `migrate-to-neon.sh` can change data or infrastructure. Confirm the target, explicit scope, backup, and verification plan before shared/production writes.
- Preserve existing rows and previously applied additive evidence columns unless the user explicitly authorizes a data change. Code rollback does not require database rollback.
- Verify affected row counts, spatial placement, schedules, evidence eligibility, and API behavior after an authorized import. A successful script or row count alone does not prove accurate rules.

## Request-driven imports

`pnpm check-requests` runs `scripts/automate_seeding.ts` to group city requests case-insensitively and open `Cover city: <City>` GitHub issues when the count is more than 10. Issues carry `needs-triage`, the aggregate request count, and instructions to use the `cover-city` skill under ADR-0002. An exact, case-insensitive matching open issue in this repository is skipped (pull requests do not count). Legacy `covered_cities` and page registry entries do not suppress evidence-review requests or establish Coverage.

Use `pnpm check-requests --dry-run` to print complete proposed issues without creating them. Both modes only read the database; normal mode writes GitHub issues and requires an authenticated `gh` CLI with repository access. City names are untrusted data transported as JSON, never shell commands. No seed script is selected or executed, and no scheduler configuration is tracked here. Review the target database and use an isolated dev environment for validation. Demand prioritizes evidence discovery; source approval and any later database writes remain separate human decisions.

## Query statistics

See [query visibility](QUERY_STATS.md) for the #6 extension SQL, production approval, private diagnostics, and the review after a week of traffic.
