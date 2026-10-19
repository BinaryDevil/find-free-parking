# Legacy serving retirement (#16)

[Ticket #16](https://github.com/BinaryDevil/find-free-parking/issues/16) selects
approved-source re-import into `places` / `parking_rules`, followed by retained
legacy archival. Never deduplicate in place or delete historical rows. This
runbook and its scripts authorize no production writes: list the exact actions
in the R4 release PR under [ADR-0005](adr/0005-agent-verified-gates.md).

## Archive and reader contract

The additive [migration](../sql/migrations/1792368000000_legacy_retirement.sql)
creates `legacy_retirements` and `legacy_retirement_members`. These record an
immutable cohort of table names, UUIDs and SHA-256 row hashes. Original rows stay
in `parking_meters`, `street_segments` and `parking_zones`, preserving UUIDs,
Driver Reports, indexes, ACLs and compatibility with the previous deployment.
No expiry or later deletion is authorized. Report private fields remain subject
to [PII retention](PII_RETENTION.md); this manifest copies no report payload.

Current parking readers omit active archive members before their row limits,
including both bounding-box and point zone reads. Old deployments ignore the
manifest and can still read the retained tables. Without the additive migration,
readers preserve the existing legacy context behavior. Source failure, expired
freshness or changed Coverage never implicitly re-enable retired rows; approved
rules independently degrade through the existing fail-closed Coverage gate.

Retirement includes every legacy geometry intersecting the selected computed
Coverage (the exact subset for partial Coverage). A crossing geometry is hidden
in full, including its outside portion, to prevent duplicate context inside the
replacement area. Legacy rows wholly outside the subset remain context. This
operation does not claim Coverage outside the approved subset.

## Preflight and plan

1. Follow [DATA](DATA.md) and [release gates](agents/release-gates.md). Verify the
   target branch, direct endpoint, database and owner against provider metadata.
   Shared dev cannot retire existing rows; fixtures belong only in an agent-owned
   disposable target. Prefer an unused suitable target; production-parent
   compatibility and snapshot requirements still apply.
2. Integrate provenance, places/rules, Coverage and source-sync migrations and
   the named approved adapters. No real source is approved by #16. Reconcile
   publisher identities `(source_id, source_record_id)`, complete source fetches,
   accepted/quarantined/excluded records, active places and rules. Geometry,
   labels and legacy IDs alone are never permission or merge keys. Historical
   duplicate estimates (48,518 in the 2026-10-06 review) are not current counts.
3. Take a fresh retained snapshot before writes and verify its restore path in a
   separate isolated target. Record its provider identity, time and retention
   privately, with an aggregate verification reference on the release PR.
4. Prepare a private JSON plan using the exported `RetirementInput` contract in
   [the operator command](../scripts/legacy-retirement.ts). Set `action` to
   `retire`, a fresh UUID `retirementId`, release action `approvalRef`, retained
   `snapshotRef`, `expectedDatabase`, exact `coverageIds`, source reconciliation
   checks, and per-table expected counts and hashes. Obtain cohort aggregates
   using `inspectRetirement(pool, coverageIds)` in a read-only consistent snapshot.
   Review these independently of the write command. Keep plans outside tracked
   context: they contain operational identifiers.
5. Privately set `RETIREMENT_DATABASE_URL` to the selected direct owner URL,
   `RETIREMENT_EXPECTED_HOST` and `RETIREMENT_EXPECTED_DATABASE` from verified
   provider metadata, and `RETIREMENT_ACTION_APPROVED=retire:<retirementId>`.
   The command never loads `.env.local`, never accepts pooled fallback and never
   puts owner credentials into runtime. Run:

   ```sh
   node scripts/legacy-retirement.ts /absolute/private/retirement-plan.json
   ```

The command currently accepts complete one-place-per-record source snapshots
with zero quarantined or excluded records. It reconciles the latest stored drift
counts, active places and active rules, and requires current parsed replacement
rules. Rules-only sources and adapters that expand or exclude publisher records
need a richer persisted reconciliation contract before this command can retire
their subset; it refuses them. The command verifies target owner/database,
current approved Coverage and exact cohort counts/hashes inside one transaction.
It locks the affected tables against concurrent mutation, with a five-second
lock timeout and thirty-second statement timeout. Stop on any drift or guard
failure; do not adjust expected values merely to force execution. Success emits
aggregate counts/hashes only. Unset the approval variable afterwards.

## Verification and reverse

Compare archive membership counts and hashes to the preflight cohort and verify
that original legacy rows are byte-identical under the PostgreSQL `to_jsonb(row)`
representation. Check all parking readers, including zone point mode, at the
approved subset and its boundary; confirm outside context still works. Compare
served approved identities/counts against the latest complete source syncs,
accounting for viewport limits without treating a capped response as a full
inventory. Repeat-import identity preservation is covered by the provenance
and source-sync tests; retirement does not merge identities or remap reports.

To reverse, take a new snapshot and prepare an explicitly approved plan with
`action: "reverse"`, the original retirement UUID and original cohort counts /
hashes, plus the new approval/snapshot references. Set
`RETIREMENT_ACTION_APPROVED=reverse:<retirementId>` and run the same command.
It verifies archive membership and original row hashes before setting
`reversed_at`; historical rows and the archive remain retained. Reversal does
not require current Coverage, so stale sources cannot prevent restoring context.
A changed retained row stops reversal for investigation. Multiple active archive
manifests can overlap; every active manifest containing a row must be reversed
before it serves again. Confirm APIs re-enable legacy context with the existing
fail-safe classification; reversal never restores an inferred free rule.

For application rollback, redeploy the previous compatible revision against the
additive schema. It can re-expose legacy duplicates; record that limitation.
Never restore a whole old snapshot over newer reports or requests. Recover to
a separate branch and prepare any selective data recovery independently.

## R4 release actions and checks

Copy the following into the R4 release PR, naming the reviewed commit, exact
source/area subset, private plan reference and current snapshot:

1. Apply `sql/migrations/1792368000000_legacy_retirement.sql` after its prerequisite
   evidence/model/Coverage/sync migrations. Verify ACLs and old production code
   compatibility. Rollback: retain additive tables and redeploy previous code.
2. After approved-source load and complete reconciliation, take the fresh
   pre-retirement snapshot, run the reviewed retirement plan and verify its exact
   aggregate output. Rollback: the separately listed reverse plan above, with
   fresh snapshot and original hashes; investigate drift before reversal.

After the human merges R4, record these release checks with dated evidence:

- Snapshot existed before the first production step and restore was rehearsed.
- Served identities/counts match each approved source's latest complete
  `source_syncs` reconciliation, with no duplicate places.
- No archived legacy rows serve inside approved Coverage; archive membership
  counts equal the pre-release cohort counts and retained legacy hashes match.
- Desktop/mobile map and both parking APIs pass; no real source approval or
  Coverage claim is inferred from synthetic test fixtures.

#16 closes only after its implementation, isolated production-parent rehearsal,
independent review, CI and current-branch merge criteria pass into `dev`.
Production execution and these release checks remain explicitly pending R4.
