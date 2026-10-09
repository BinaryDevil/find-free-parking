# Data and database operations

For seeding, schema changes, cleanup, or rollback, read this document and [ADR-0001](adr/0001-verified-rules-only.md). Existing imports are historical implementation examples, not approved evidence policies.

## Evidence before expansion

Which sources a city may be set up or seeded from is decided by the Evidence Source Policy in the verified-rules spec ([BinaryDevil/find-free-parking#2](https://github.com/BinaryDevil/find-free-parking/issues/2)), applied through the `cover-city` skill. Its output is a source inventory under `docs/sources/` (see `docs/sources/TEMPLATE.md`); seed only from sources approved there. Registering a city page is separate from evidence approval.

When reusing existing import code, review parser defaults and incomplete records: `parseSignText` and the OSM helpers contain assumptions (default schedules, guessed rates, road-class mapping) that the policy does not accept as evidence.

## Safe execution

- Inspect `scripts/seed_utils.ts` and the chosen script to confirm connection selection and which rows it inserts, updates, deletes, or skips. The app prefers pooled connections; script helpers prefer direct connections.
- Parking data persists in PostgreSQL/PostGIS; it is not automatically rebuilt from repository files. Review imports against a backup or non-production database first. Do not assume all seed scripts are idempotent.
- Record schema changes in a reviewed `sql/N.description.sql` file before execution. Existing SQL numbering has collisions; inspect files and actual schema rather than blindly executing the folder in filename order.
- Seeding, `pnpm check-requests`, cleanup scripts, `clear_db.ts`, and `migrate-to-neon.sh` can change data or infrastructure. Confirm the target, explicit scope, backup, and verification plan before shared/production writes.
- Preserve existing rows and previously applied additive evidence columns unless the user explicitly authorizes a data change. Code rollback does not require database rollback.
- Verify affected row counts, spatial placement, schedules, evidence eligibility, and API behavior after an authorized import. A successful script or row count alone does not prove accurate rules.

## Request-driven imports

`scripts/automate_seeding.ts` selects inactive requested cities with more than 10 requests and runs a matching script. No scheduler configuration is tracked here. Before enabling it, review command construction from city names, rerun behavior, error handling, and evidence approval. Demand is a prioritization signal, not permission to assert verified Coverage.

## Query statistics

See [query visibility](QUERY_STATS.md) for the #6 extension SQL, production approval, private diagnostics, and the review after a week of traffic.
