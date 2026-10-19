# Duplicate rows and legacy retirement decision (#16)

> **Approvals:** this runbook predates [ADR-0005](adr/0005-agent-verified-gates.md). Where it asks for human or separate approval, follow ADR-0005's *Reading older runbooks* section; its other steps are unchanged.

Prepared 2026-10-13 for [#16](https://github.com/BinaryDevil/find-free-parking/issues/16).
**Status: approach chosen in #16 (approved-source re-import, then archive legacy reads; no deletes). Execution happens only as release-PR *Production actions* under ADR-0005.**
This preparation changes documentation only. Ticket PRs target `dev` under the
user's current all-milestones development authorization and require user approval
for merge. Production remains separately gated by [release gates](agents/release-gates.md).

## Recommendation and alternatives

Choose **approved-source re-import, reconcile, then retire legacy reads**, retaining
historical rows. Do not deduplicate legacy rows in place as the default first step.
This follows [#2](https://github.com/BinaryDevil/find-free-parking/issues/2)'s
requirement to preserve existing rows and keep OSM as context, with
[ADR-0001](adr/0001-verified-rules-only.md) and
[ADR-0002](adr/0002-evidence-source-policy.md).

| Approach | Benefit | Cost / unresolved risk |
| --- | --- | --- |
| Re-import approved sources, reconcile, switch reads | Current publisher identity and evidence; repeat imports add no duplicate identities; old rows retained for audit and code rollback | Needs approved sources, adapters, place/rule contract and explicit read switch; re-import alone leaves old rows visible today |
| Deduplicate legacy rows in place first | Could relieve row-limit pressure earlier | Cannot establish current permission or provenance; geometry/old ID matching can merge distinct curbs; reports reference old UUIDs; still needs later re-import and separately approved data writes |

The issue's phrase “new provenance-keyed tables” needs qualification: integrated
[#10](https://github.com/BinaryDevil/find-free-parking/issues/10) adds provenance
columns and unique identities to the **existing three place tables**, plus
`evidence_sources` and `source_syncs`. It does not replace place tables.
See [Evidence provenance](EVIDENCE_PROVENANCE.md) and
[the migration](../sql/migrations/1791849600000_evidence_provenance.sql).
Legacy UUID-based identities deliberately preserve historical duplicates.
[The importer](../scripts/evidence-import.ts) updates only the matching
`(source_id, source_record_id)` within one table; approved-source rows will not
replace rejected legacy identities automatically. No obsolete records are removed.
Do not drop or archive entire mixed tables containing both cohorts.

## Verified source state and limits of this preparation

Repository inspected at `dev` commit `b7c641943583ba640fabc0121e2452d8dd1b8333`.
The [parking endpoint](../app/api/parking/route.ts) reads legacy-compatible meter
and street tables without provenance filtering, with **separate 1,000-row limits**.
The [zone endpoint](../app/api/parking/zones/route.ts) reads the same zone table,
with a maximum 200-row limit, in both bounding-box and point modes. Neither
endpoint establishes that legacy rows are absent from responses. This PR changes
neither endpoint. #11 is ongoing elsewhere; its unmerged implementation is not
assumed here. The eventual place/rule schema and read contract must be reconciled
with its integrated result before preparing executable cutover SQL.

The 2026-10-06 issue reports 40,224 street, 5,227 meter and 3,067 zone duplicate
rows (48,518 total). These are historical estimates with no duplicate definition
recorded in the issue; they are **not fresh counts or a deletion budget**. The
#10 comment's copied-branch totals are also dated validation evidence, not current
production inventory. No live database, source feed or backup was inspected in
this preparation, so no current duplicate count or snapshot is claimed.

[Seattle](sources/seattle.md) and [Vancouver](sources/vancouver.md) remain draft
inventories. [#24 approval preparation](sources/approval-seattle-vancouver.md)
records unresolved reuse and safety criteria; integration of that document is
not approval. No adapters, Coverage or production acceptance are established
by this proposal. #4 being closed does not prove a fresh pre-write restore point.
#10 source integration does not prove its migration is applied in any target.

## Identity, conflict and evidence rules for the execution plan

- An import identity is the source UUID plus publisher record ID **per table**.
  Use documented stable asset IDs, curb side/extent and rule components in the
  future normalized contract. A single curb may legitimately have multiple
  signs, payment periods, restrictions and sources; do not collapse those into
  one rule or equate equipment with a parking place.
- Same identity and identical normalized record in one batch: collapse it.
  Conflicting payloads for the same identity in a batch: stop and investigate;
  no arbitrary first/last/newest winner. The current importer compares complete
  JSON serialization, so adapters must produce deterministic normalized records.
  An update across batches can be legitimate but must appear in the drift report.
- Equal geometry, labels, old `block_id` or `pay_station_id` alone are candidate
  matches, never approved merge keys. Coincident signs, opposite curb sides and
  overlapping zone/temporary rules may be different entities. Differing safety
  fields, schedules, vehicle conditions, extents or authority remain unresolved
  and must not produce Verified Free Parking Rules.
- Legacy `source_record_id = legacy:<table>:<uuid>` is historical row identity,
  not publisher identity. Do not relabel those rows as approved evidence. Preserve
  raw records, schedules, geometry, UUIDs and unknown timestamps. Signal-only
  data cannot establish permission or Coverage; `updated_at` is not freshness.
- Geometry-based identities allowed by policy need explicit adapter handling for
  geometry edits: a new digest creates a new identity and does not retire the
  old row. Removed publisher IDs require a complete successful source fetch and
  reviewed reconciliation (#15), never absence from a truncated page or failure.
- Preserve original Driver Reports and `(target_type, target_id)` references.
  Existing reports and warning queries are UUID-based. Do not sum cached
  `report_counts`, silently retarget reports to new places, or use reports as
  verification. If a reviewed correspondence is needed, propose an explicit
  mapping with ambiguous matches excluded, preserve original targets and verify
  dated warning counts/retention with #13. This PR supplies no mapping or migration.

## Count report and isolated rehearsal required before writes

Prepare a target-specific report in one consistent **read-only** transaction,
using bounded statement/lock timeouts and an explicitly verified branch/database.
Do not use `seed_utils` environment loading to choose an inspection target.
Keep row-level exports, source IDs, geometry and private backup details local;
publish aggregate counts and definitions only. No inspection SQL is supplied here:
first reconcile the integrated #11 schema and select the target explicitly.

Report per table and stored city/unknown area:

1. Total rows, rejected legacy cohort, approved/pending/rejected source cohorts,
   missing identities, and duplicate provenance groups. If #10 is unapplied,
   report this explicitly and use the pre-provenance schema; do not apply it to
   make inspection possible. Do not attribute missing city metadata by ID prefix.
2. Candidate repeated publisher IDs and exact geometry/payload groups, with
   **separate** group counts and excess rows (`sum(group_size - 1)`). Define the
   compared fields, null treatment, geometry comparison and ignored timestamps.
   Report geometry-only groups separately from exact rule-payload groups; neither
   is a removal authorization. Count conflicting schedules/conditions separately.
3. Reports per original target and unmatched targets, using aggregates only.
   Take private deterministic hashes of all original place columns and permitted
   report fields for later invariant checks; never publish row material or PII.
4. Fresh complete source record totals and unique stable IDs, pagination completion,
   fetch/edit dates, parse failures, exclusions with reasons, and one-to-many rule
   expansion. Reconcile accepted + quarantined + excluded **source records** to
   the fetched total. Place/rule counts need not equal publisher record counts.
5. Intended read cohorts and old/new response counts for reviewed representative
   bounds, both zone modes, city/type filters and edge cases above each API cap.
   Count before limiting; deduplication after `LIMIT` cannot recover omitted places.
   Overlapping evidence must not duplicate a rendered place or erase its rules.

After source and isolated-load approval, use a new disposable Neon branch and
synthetic fixtures/approved scoped copies under [DATA](DATA.md)'s branch-first
procedure. Preserve shared dev and production. Test exact duplicates, conflicting
IDs, opposite sides, coincident signs, geometry edits, missing IDs/city, stale and
unparsed sources, truncated fetches, overlapping temporary/permit/payment rules,
and reports on historical UUIDs. Import the same validated batch twice: second
run adds zero identities and preserves UUIDs/reports; changed records are updated
and removed records are only proposed. Confirm original legacy hashes/counts
remain unchanged and archive restore is possible. Record tests actually run;
this document's checklist is not isolated execution evidence.

## Staged authorization, backup and rollback

1. **Approach decision:** human selects the recommendation or in-place alternative
   on #16, naming this reviewed commit. This authorizes planning only. If choosing
   in-place dedupe, prepare a separate exact cohort/survivor/report-mapping plan;
   do not treat the historical 48,518 as the affected scope.
2. **Evidence and implementation:** resolve named #24 source approvals and remaining
   inventory criteria; integrate and validate #10/#11/#12/#13/#15 and relevant
   adapters (#25–#29/#37) as applicable to the selected subset. No blanket all-city
   import; no assumption of full Seattle Coverage. Prepare required forward SQL
   under `sql/migrations/` before execution, keeping integrated migrations immutable.
3. **Isolated load/rehearsal:** obtain explicit scope naming disposable branch,
   database, sources, reviewed adapter/migration commits and permitted operations.
   Verify endpoint/database privately against provider metadata and baseline ledger.
   Create fresh retained snapshot/restore point, verify retention and rehearse restore
   into a separate isolated resource. Record resource/time privately, no credentials.
4. **Shared import and read cutover:** separate approval per named environment,
   source/row cohort, artifact commit, expected counts, backup, maintenance window,
   lock/runtime impact, stop thresholds and rollback owner. Preview uses dev data;
   production requires its own current snapshot and explicit approval. Import adds
   approved rows while preserving legacy rows. Switch all relevant readers only
   after reconciliation, warning mapping and safety regressions pass. Preserve
   explicitly reviewed context geometry as Unknown outside Coverage; prevent
   duplicate legacy renderings inside the replacement subset. Verify no retired
   cohort is served there, without claiming all context geometry must disappear.
5. **Archive before any removal:** prefer retained, access-restricted legacy rows
   excluded from active reads. Record a cohort manifest, schema/ACL/trigger versions,
   hashes/counts, retention/expiry and tested restore path. If later moving rows to
   an archive, prepare separate SQL and report-target compatibility checks; no
   table rename/drop by default. Include private report data only under its existing
   retention policy ([PII retention](PII_RETENTION.md)); retirement does not authorize
   extending PII retention. Archive placement/permissions are separately reviewed.
6. **Optional deletion:** only after observed cutover, verified archive/restore and
   explicit exact-row authorization with a new pre-write snapshot. This is a later
   operation, not implied by approach approval or PR merge. Do not run historical
   `clear_db.ts`, `cleanup_*.ts`, master seed cleanup or database reset commands.

Stop on target/schema drift, missing approval/backup, source incompleteness,
identity conflicts, unexpected counts/hash changes, report loss, or any unsafe
classification. Roll back reads/application to the last validated fail-safe
revision against the retained additive schema. That rollback can re-expose legacy
context/duplicates and must be recorded; it must never restore inferred free
classification. Do not restore a whole old snapshot over new Driver Reports or
requests: inspect/recover to a separate branch, then prepare an approved selective
recovery. Code rollback is not permission to remove provenance/history.

## Review record and acceptance

Record on #16: chosen approach, approver/date and commit; named source subset;
current aggregate report and definitions; dependency integration versus target
application; exact environment and permitted operations; current backup/restore
evidence; isolated repeat-import and read-cutover results; archive retention;
then dated live checks after the separately approved release.

Preparation is complete when this decision is reviewable and doc checks pass.
#16 stays `ready-for-human` and open: its done criterion requires production
serving no duplicate places and approved legacy archival/removal. Approving this
PR into dev or the recommended approach does not meet that criterion and does
not authorize source approval, shared writes, deletion, deployment or release.
