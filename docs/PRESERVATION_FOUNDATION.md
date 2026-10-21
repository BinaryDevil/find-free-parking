# Preservation foundation (#114)

`sql/preservation-v1/1792627200000_foundation.sql` defines the additive foundation
for the owner-approved preservation lineage in [ADR-0003](adr/0003-sql-migrations.md).
It is separate from the eight sealed legacy migrations. This file does not add an
execution command, adopt a target, change the production plan, approve a source,
run a sync, clear private fields or retire a legacy place. Guarded lineage selection
and explicit adoption are tracked in [#113](https://github.com/BinaryDevil/find-free-parking/issues/113).

## Installation contract

- All original columns and rows remain untouched, including duplicate legacy
  places, text IP chains/invalid text and historical SPOT reports. Existing UUID
  and crypto extensions, report-count writers and timestamp triggers remain.
- Legacy provenance is nullable and initially unknown. Paired identity checks
  reject half-filled identities; ordinary nullable UNIQUE constraints keep
  `ON CONFLICT (source_id, source_record_id)` imports idempotent without backfill.
- Evidence Sources, sync history, places/rules, Coverage, Driver Warnings and
  retained-in-place retirement manifests have the current runtime contracts.
  There are no source rows or source links; the 24 page anchors have Coverage
  none. Existing legacy geometry never becomes permission evidence.
- Licence and reuse text remain optional publisher metadata. The approval
  constraint retains publisher, endpoint, inventory and written approval/date
  requirements. The inventory still needs all seven criteria and author plus
  independent reviewer agreement; a database insert does not supply that review.
- Retention is a restricted SECURITY DEFINER capability with an explicit owner
  and `pg_catalog` search path. Installation never calls it. An existing role
  with login, elevated attributes, memberships, owned objects or direct table
  grants is rejected rather than repaired. Normal PUBLIC PostGIS metadata
  access is not confused with a private-field grant.
- A later, separately authorized retention call clears request/report IP and
  location at age **at least 90 days**, and RESOLVED-report email at any age.
  Other emails and all rows remain. Disabling a job cannot recover cleared fields.

Partial preexisting model objects fail ordinary CREATE/ALTER statements. Apply
the file transactionally through the guarded lineage runner; a failed definition
must not leave a partial foundation. Never replay the baseline on an existing
database or select this directory through an ad hoc migration-file filter.

## Validation seam

`tests/preservation-foundation.test.mjs` installs the unchanged baseline and then
the actual new SQL into two separately provisioned empty local PostGIS databases.
One baseline is populated with synthetic duplicate places, unusual IP text and a
SPOT report before installation; the other is empty. It checks every original
field, old explicit-column imports and app writes, identity upsert replay,
constraints, source defaults, all uncovered page anchors and permission boundaries.
Unsafe preexisting retention attributes/membership/grants must reject installation
and leave no partial model.

The two resulting application schemas are compared, including owners, raw ACLs,
defaults, columns, constraints, indexes, function definitions and trigger states.
Only four information-schema database catalog labels are omitted because the two
test databases have different names. Function role/ACL checks and retention tests
also cover the exact 90-day boundary, young resolved emails and a zero-change
repeat invocation; retention effects are rolled back in the disposable fixture.

Privately configure `PRESERVATION_TEST_DATABASE_URL`,
`PRESERVATION_FRESH_TEST_DATABASE_URL` and `PRESERVATION_TEST_EXPECTED_HOST`.
Database names must be `preservation_foundation_test` and
`preservation_foundation_test_fresh`, with empty application schemas. Run
`node --test --test-concurrency=1 tests/preservation-foundation.test.mjs` from a
Node 24 container sharing the database VM clock. Without both URLs the regular
suite explicitly skips this integration test; a skip is not DB evidence.

This is local synthetic installation proof, not provider ACL parity,
production-derived preservation/locking proof, compatibility of every eligible
rollback deployment, a target adoption test, Preview verification of installed
schema or production verification. Final release gates and exact listed actions
remain required before any shared/production installation or retention execution.
