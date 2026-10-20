# Evidence Source sync runner (#15)

> **Approvals:** this runbook predates [ADR-0005](adr/0005-agent-verified-gates.md). Where it asks for human or separate approval, follow ADR-0005's *Reading older runbooks* section; its other steps are unchanged.

This is source implementation, not source approval, scheduler activation or
production verification. The registry in [source-adapters.ts](../scripts/source-adapters.ts)
is empty. No real source is loaded by this change.

## Adapter contract

[source-sync.ts](../scripts/source-sync.ts) exports `SourceAdapter`,
`SourceSnapshot`, `SyncPlace`, `SyncRule`, `validateSnapshot` and `syncSource`.
An adapter identifies `sourceKey`, `area`, `evidenceType` (E1–E6), and the
`endpoint` actually used for retrieval. These must
match an independently approved (ADR-0005 two-agent review) `evidence_sources` row. Registration
alone cannot approve a source. Signal and E7 sources cannot create typed rules.

Endpoint equivalence is exact string equality with the approved row: no URL
normalization, case folding, trailing-slash removal, query stripping, service/layer
substitution or redirect equivalence. Missing or mismatched endpoints fail before
retrieval, recording the existing safe failure history and retaining places/rules.
Pending sources still skip. The post-fetch approval/metadata recheck remains required.

Each concrete adapter declares the same endpoint constant used to construct all
of its requests. The endpoint names the exact ArcGIS layer or Vancouver dataset;
its existing metadata, `/query` or `/records` requests and pagination parameters
read that same item, never a sibling layer/dataset or publisher-supplied URL.
Every publisher request uses `redirect: 'error'`: redirects require separate
endpoint review rather than implicitly inheriting approval. This is a contract
for reviewed adapter code, not isolation of arbitrary untrusted JavaScript.
Synthetic adapters must declare their synthetic endpoint too; the registry stays
empty and this contract grants no source approval.

`fetchSnapshot(signal)` validates the publisher's metadata and required fields,
finishes pagination, checks publisher counts/truncation/error responses, and
returns a **complete** dataset, never a viewport, page or delta. It must honor
the abort signal and strip private fields before returning. Metadata drift must
throw; missing fields/rates/schedules must never get guessed defaults.
Each adapter has a 90-second fetch/parse deadline. Complete snapshots exceeding
that budget need an independently reviewed ingestion approach; never truncate.

The result has `complete: true`, `sourceEditedAt` (ISO instant with explicit
offset, or `null` when genuinely unknown), and `places`. Each place has a stable
`sourceRecordId`, `kind`, `city`, IANA `timezone`, WGS84 `geom`, public `rawData`,
and `rules`. Optional fields are `name` and `sourceEditedAt`. Each nested rule has
a source-wide stable `sourceRecordId`, typed `kind`, explicit `priority`,
`parsed`, `permissionComplete`, and public `rawData`. Parsed rules require
`days` (Sunday=0), `startMinute`, `endMinute` (0–1440 is all day), and a positive
`rate` for paid rules. Remaining fields match the server evaluator: time limits,
vehicle/permit conditions, visitor allowance, validity instants and source edit
time. Unparsed rules omit unknown schedule values and retain public raw evidence;
they make the place Unknown. An empty `rules` list also establishes no permission.

IDs must survive rate/schedule changes. Geometry identity is permitted where
publisher IDs do not exist; a geometry edit then tombstones the old place and
adds a new one. Rule IDs must be unique across this source, including across
places. Imports own their source's places/rules; cross-source overlay assignment
is outside this runner's contract. Adapter integration and human source review
remain separate from #15.

## Writes, drift and failure behavior

Apply the reviewed [forward migration](../sql/migrations/1792021500000_source_sync_runner.sql)
before enabling reads/imports of this model. It adds tombstones, a place content
hash, a source-wide rule identity index, and drift/alert delivery history. A
pre-existing duplicate rule identity stops migration; no cleanup is implicit.
Older code works against the additive schema. New tombstone-aware reads require
this migration when the new model is enabled; no-Coverage paths still skip it.

A session advisory lock covers fetch and write per source. Overlap skips without
creating a misleading sync row. A committed `running` row immediately makes that
source's existing rules Unknown, including if the process dies. The next runner
holding the lock marks abandoned runs failed. Fetch/format errors also fail
closed. Approval and source metadata are checked again under a row lock before
writing. Snapshot writes, removals and success history commit together; failure
rolls back data and leaves a failed sync row. Raw upstream/SQL errors never enter
routine logs or GitHub alerts.

Upserts preserve place/rule UUIDs. Missing records receive `removed_at`, retaining
raw evidence/history; removed places and rules are excluded from classified
features. Reappearance restores the original UUID. Legacy map tables are untouched.
`source_syncs.records_added/updated/removed` count publisher places; updated means
content changed, not merely re-fetched. Each successful `drift_report` lists place
IDs added/changed/removed, unchanged count, and rule upsert/removal counts. Rule
`updated` includes unchanged refreshes. Hashing sorts object keys and rule IDs;
source payload array order is otherwise retained. Failure reports state
`applied:false` and counts remain zero. Publisher IDs/raw evidence stay in the
database; command logs contain aggregate counts only.

After attempts, the command opens or updates an internal GitHub issue per source
with an undelivered failure, using `gh` and JSON stdin. Successful delivery is
recorded separately. GitHub outages fail the job, keep the pending alert durable,
and do not prevent later runs from retrying or recovering source data. Alerts
remain open for maintainer review after recovery. This is internal issue tracking,
not external outreach.

## Scheduling and target configuration

[source-sync.yml](../.github/workflows/source-sync.yml) proposes runs twice hourly.
E5 sources run on every invocation; other rules become due after 23 hours so the
half-hour scheduler normally refreshes them daily despite small timing shifts.
Failed/unfinished sources retry on the next invocation. GitHub schedules run from
the default branch and can be delayed by GitHub. Sources are attempted oldest
first within an 18-minute batch budget (below the 25-minute workflow limit), and
pending failure alerts are delivered before imports and after each attempt.
Slow batches rotate to untouched sources on the next invocation. Monitor queue
capacity before adding sources; if a complete queue cannot meet the required
cadence, increase reviewed execution capacity before approving more sources.
Dev-only integration does not
activate this scheduler or guarantee a maximum wall-clock delay. Runtime
freshness limits continue to fail closed independently of scheduler delivery.

The job remains disabled unless `SOURCE_SYNC_ENABLED=true`. After integration,
migration review and target verification, a separately authorized operator must
configure the `evidence-source-sync` GitHub environment with:

| Setting | Value/purpose |
| --- | --- |
| Variable `SOURCE_SYNC_APPROVED` | `sync-approved-sources` |
| Secret `SOURCE_SYNC_DATABASE_URL` | Direct migration/import owner connection, separate from app/runtime credentials |
| Secret `SOURCE_SYNC_EXPECTED_HOST` | Direct hostname from the selected branch's provider record |
| Secret `SOURCE_SYNC_EXPECTED_DATABASE` | Selected database name |
| `GH_TOKEN` | Workflow token with issues write permission; local runs use authenticated `gh` |

The command validates endpoint/database and live owner identity and rejects
pooler/app credentials. It never loads app `.env.local`, runs migrations, grants
roles or approves sources. After independent target review, run `pnpm sync-sources`
with these variables privately injected. The workflow serializes jobs; the
database advisory lock also protects manual overlaps. No HTTP cron endpoint or
public cron secret is added.

## Validation

`node --test tests/source-sync.test.mjs` validates the adapter contract, alert
create/update behavior at the GitHub boundary, and direct target safeguards.
`tests/source-sync-db.test.mjs` replays migrations into a **new empty database**
named `source_sync_test_15` or `source_sync_test_15_<digits>` on a verified
disposable branch. Privately inject `SYNC_TEST_DATABASE_URL` and
`SYNC_TEST_EXPECTED_HOST`; it refuses a pooled or unexpected target and existing
application tables. It uses synthetic approved fixture sources only and performs
no external fetch or real GitHub issue writes. It verifies public classifications,
repeat imports, drift, tombstones/reappearance, rollback, overlap, pending sources
and failure alerts. Provision a new empty database for each replay; never clear a
shared database to rerun it.

## Vancouver meter adapter verification

`node --test tests/vancouver-meters.test.mjs` checks the recorded portal format,
recorded ambiguity and explicitly synthetic reviewed-permission cases. A stable
metadata count of zero is a complete empty snapshot only when the edit timestamp
and count agree on both metadata reads. It lets the runner retire the final meter
without deleting its history; a failed or changing retrieval never does.

`node --test tests/vancouver-meters-db.test.mjs` additionally exercises the actual
adapter, sync runner and classified-place reader against a **fresh empty local
PostGIS database**. Set `METER_TEST_DATABASE_URL` privately to that task-owned
localhost database, named `vancouver_meter_test_28` (an optional numeric suffix is
allowed). Supply the `find-free-parking-db_owner` role required by the migrations
in the disposable cluster before running. The test refuses pre-existing tables;
run serially in a Node container sharing the database clock under ADR-0005.
It is skipped without configuration. Its approval row, identities and reviewed
permissions are synthetic; passing it approves no City source or curb rule.

The test verifies rates/limits and rush/after-hours classifications, idempotency,
explicit Removed and missing-record retirement with retained history, format
failure becoming Unknown, and final-meter retirement. Real meter rush days,
precise curb assignment, override semantics, after-hours permission and source
approval remain evidence gates on #28/#24. This does not register or activate
an adapter or authorize shared/production writes.
