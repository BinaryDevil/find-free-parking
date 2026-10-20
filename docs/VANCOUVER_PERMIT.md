# Vancouver permit-zone adapter (#29)

The E4 candidate adapter in `scripts/adapters/vancouver-permit.ts` reads a full
ID-paged polygon snapshot, validates field types and WGS84 closed rings, checks
complete unique page membership and publisher edit time before/after retrieval.
A metadata or record format change rejects the snapshot. It retains only public
program fields and emits typed `permit_only` candidates with the program ID and
name. Stable identities combine MAPID and polygon geometry because MAPID repeats
and OBJECTID is an export identifier. Geometry edits tombstone the previous part
through the existing sync runner.

This adapter is deliberately absent from the sync registry. Coverage remains none.
The source review is #24; registration and source approval are separate work.
The polygon contains no enforcement schedule, exact signed curb allocation,
visitor duration or vehicle exemptions. All emitted rules remain unparsed with
null schedules. Even a synthetic approved source leaves these candidates Unknown.
Unmetered blocks outside polygons remain Unknown; polygon absence grants nothing.

The named 1000 Bidwell representative and official Comox/Bute intersection match
RPP025, West End Plateau in the disposable DB regression. Their classification is
Unknown under the ticket's dark alternative, not a verified Restricted claim.
Actual Restricted serving requires independently confirmed current signed curb,
schedule and vehicle semantics as well as all source approval criteria.

## Verification and release checks

Unit tests: `node --test tests/vancouver-permit.test.mjs`.
Fresh DB test: privately set `PERMIT_TEST_DATABASE_URL` and
`PERMIT_TEST_EXPECTED_HOST`, then run
`node --test tests/vancouver-permit-db.test.mjs`. It requires a fresh empty database
named `permit_adapter_test_29`, applies all migrations, uses synthetic approval
only, verifies idempotent syncs and public classified-place results. Never run
this test against shared dev or production. Local PostGIS requires the migration
owner role and a database created from template0 (the image's default database
already contains extension tables).

Before release: verify the adapter remains unregistered, Vancouver Coverage stays
none for permit zones, and West End/unmetered outside-zone features stay Unknown
on desktop/mobile and parking APIs. This code authorizes no migration, source
approval, sync, shared-data write or production action. Serving Restricted from
these polygons remains gated by the missing evidence above.
