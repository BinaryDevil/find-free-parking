# Evidence Sources and import provenance (#10)

> **Approvals:** this runbook predates [ADR-0005](adr/0005-agent-verified-gates.md). Where it asks for human or separate approval, follow ADR-0005's *Reading older runbooks* section; its other steps are unchanged.

The forward migration `1791849600000_evidence_provenance` adds Evidence Sources,
sync history and provenance to `parking_meters`, `street_segments` and
`parking_zones`. It does not compute Coverage, approve sources, evaluate rules,
or change what drivers see. See [ADR-0002](adr/0002-evidence-source-policy.md)
and [data operations](DATA.md) for the approval (ADR-0005) and execution gates.

## Legacy backfill

Every existing place receives a rejected `signal` source named
`legacy-import-2025-12` for its stored city. Missing or blank city metadata uses
`Unknown legacy area`; neither a spatial boundary nor a guessed ID prefix
establishes the original city or publisher. In particular, the Seattle street
rows missing city metadata are not silently attributed to Seattle. No raw
metadata, schedules, geometry, report counts, IDs or historical timestamps are
changed, and no rows are removed.

Legacy `source_record_id` values contain the table and stored row UUID. These
are distinct identities for historical rows, including duplicates; they do not
claim to be publisher record IDs. `fetched_at` and `source_edited_at` stay NULL:
the old `updated_at` is not evidence of retrieval or publisher edits. The zone
timestamp trigger is disabled only inside the migration transaction for this
backfill and restored to its exact prior state.

Source identity is mandatory and unique per place table. New imports cannot
silently create unattributed rows. The current application only reads place
tables and writes reports/requests, so its existing queries remain compatible.
The report trigger retains its column-level grants. The application may read
Evidence Sources and syncs but cannot approve sources or write sync history.

## Imports

`scripts/evidence-import.ts` exports `importPlaces(pool, input)`. Input specifies
an existing approved `sourceId` (ADR-0005), one of the three place tables, and
normalized records with stable `sourceRecordId` and GeoJSON geometry. Optional
source and record edit timestamps must come from the publisher. Retrieval time
is recorded by the importer. Missing edit dates remain NULL.

The importer serializes batches for a source, rechecks approval under a row
lock, and commits place upserts and successful sync counts together. Conflicts
update mapped fields and retrieval/edit times, preserving the stored place UUID,
report counts and evidence JSON. Identical duplicate records within a batch are
collapsed; conflicting records with the same identity stop the import. Failed
database writes roll back the whole batch and leave a failed sync with a generic
error that contains no source record, coordinates or credentials. Identity
validation fails before any database write. Counts are per batch: an existing
record is counted as updated even when its payload is unchanged because its
retrieval timestamp changes. No record removal is performed (`records_removed`
is zero). Scheduling, adapter format validation, drift and removal are #15 work.

The historical seed parsers still contain unreviewed guesses and defaults.
Their place writes now call the same upsert helper, but require an approved
**signal** source selected explicitly through the following environment keys:

| Import path | Source selection | Record identity |
| --- | --- | --- |
| Vancouver meters | `IMPORT_SOURCE_VANCOUVER_METERS` | `meterid` |
| Vancouver streets | `IMPORT_SOURCE_VANCOUVER_STREETS` | `hblock` plus geometry digest |
| Seattle meters / streets | `IMPORT_SOURCE_SEATTLE_METERS`, `IMPORT_SOURCE_SEATTLE_STREETS` | Feature ID or `OBJECTID` |
| Kirkland streets / signs | `IMPORT_SOURCE_KIRKLAND_STREETS`, `IMPORT_SOURCE_KIRKLAND_SIGNS` | `GlobalID` / `ASSET_ID` |
| Redmond streets | `IMPORT_SOURCE_REDMOND_STREETS` | `AssetID` |
| Coquitlam meters | `IMPORT_SOURCE_COQUITLAM_METERS` | Feature ID or `OBJECTID` |
| Surrey meters | `IMPORT_SOURCE_SURREY_METERS` | Original geometry digest |
| OSM streets / lots | `IMPORT_SOURCE_OSM_STREETS`, `IMPORT_SOURCE_OSM_LOTS` | `way/<id>` / `<type>/<id>` |

These values are source UUIDs from a reviewed inventory, not automatic source
registration or approval. No sources are approved by this implementation.
Use an isolated, explicitly verified database and separately authorized import
scope. Removing the old city-wide skip guards allows individual import paths
to update existing records. The master seed's historical city skip and cleanup
options are unchanged; it is not a scheduled sync runner.

The old Vancouver export has no unique row ID (`hblock` repeats), and Surrey
has missing/repeated meter IDs. ADR-0002 permits stable geometry identity. The
digest includes the original geometry and excludes mutable rates/schedules.
It is calculated before Vancouver's existing first-line geometry projection or
Surrey's coordinate transformation. A geometry edit creates a new identity;
it cannot automatically retire the old one. That limitation must be handled by
a future reviewed adapter/reconciliation workflow, not by deleting legacy rows.

## Validation and production procedure

The integration test `tests/evidence-provenance.test.mjs` refuses a database
unless its name is `evidence_provenance_test` (optionally a numeric suffix),
its direct endpoint matches `EVIDENCE_TEST_EXPECTED_HOST`, and no application
tables exist. Privately set `EVIDENCE_TEST_DATABASE_URL` from a newly provisioned
empty database on the disposable validation branch; it never reads `.env.local`.
Run `node --test tests/evidence-provenance.test.mjs`. It applies the sealed
baseline, inserts synthetic duplicate/missing-city fixtures, applies the forward
migration, checks all old columns, replay, all three twice-import paths, report
preservation, rejected sources, signal-only legacy imports, rollback/sync logs,
and application/report-role permissions. Synthetic fixture approval is limited
to this disposable database and does not approve any real Evidence Source.

Before shared or production application:

1. Integrate the reviewed SQL into `dev`; keep the baseline immutable. Review
   the isolated replay and copied-data invariant evidence on #10.
2. Follow [DATA.md](DATA.md) to verify the direct owner connection, branch ID,
   database, current restore point and baseline ledger. Confirm schema parity
   immediately before execution; stop for drift. A missing baseline ledger must
   be adopted through its separate approved procedure, never replayed.
3. Review backfill counts by table and stored city, including unknown-area
   records. Review lock/runtime impact: this transactional migration scans and
   updates every place row and creates unique indexes; schedule appropriately.
4. Obtain separate human approval for this migration and target, naming the
   reviewed commit and snapshot. Approval for #9 is not approval for #10.
5. Privately set `MIGRATION_DATABASE_URL`, `MIGRATION_EXPECTED_HOST`, and
   `MIGRATION_EXPECTED_DATABASE`; run `pnpm db:migrate`. Do not run any seed,
   cleanup or source-approval operation as part of this migration.
6. Verify unchanged place counts and hashes of all pre-existing columns, zero
   missing provenance, distinct identities for duplicates, rejected legacy
   sources, NULL historical fetch/edit timestamps, original role grants and
   trigger state, and the single new ledger entry. Repeat `pnpm db:migrate`:
   schema/history must remain unchanged. Verify existing app-role queries and
   report writes before the human-approved R2 release.

Production application and live verification remain separately gated. Rollback
means redeploying prior application code against this additive schema; it does
not authorize removing columns, deleting history, or restoring over user data.
