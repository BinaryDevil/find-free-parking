# Backup recovery and deployment rollback

This runbook documents recovery procedures; it executes no provider action.
Follow [data operations](DATA.md), [ADR-0005](adr/0005-agent-verified-gates.md)
and [release gates](agents/release-gates.md). Changing production snapshot
schedules/history retention, creating production snapshots or executing restores
requires a human-merged release PR listing those exact production actions.
Restoring over existing user data additionally needs explicit human authorization.
An agent may restore the previous compatible deployment when post-release checks
fail under ADR-0005; that does not authorize a database restore.

## Verified limits and remaining evidence

Read-only provider checks on **2026-10-20** confirmed the following for Neon project
`misty-breeze-47060812`, production branch `br-rough-base-aryz0z5a`, database
`find-free-parking-db`. Recheck them immediately before any authorized action.

| Mechanism | Observed evidence | Limit |
| --- | --- | --- |
| Continuous history | Project `history_retention_seconds = 21600` | Six hours; no seven-day or next-day continuous recovery established |
| Automatic production snapshots | `get_snapshot_schedule` returned `schedule: []` | No automatic daily snapshots established |
| Retained manual production snapshot | `list_snapshots` returned `snap-steep-river-ar9exiz9`, source exactly production, created `2026-10-06T03:50:19Z` | Older than 24 hours, but cannot recover changes made after its capture; list response omitted expiration; restore not exercised |

The retained snapshot establishes an old recovery point, not a recent backup or
a successful recovery rehearsal. Shared dev and modified validation branches are
not production backups. The release runner's `snapshot/<merge-sha>` resources are
retained **child branches**, distinct from provider snapshots with `snap-` IDs;
the snapshot procedure below cannot be used with a branch ID.

[Release #94 evidence](https://github.com/BinaryDevil/find-free-parking/pull/94#issuecomment-6297791198)
records the initial gap: closed [#4](https://github.com/BinaryDevil/find-free-parking/issues/4)
had no acceptance comment, and DATA.md had no concrete restore procedure.
This runbook addresses the documentation gap. It does not claim #4's suggested
daily/7+ snapshot schedule or longer recovery target was implemented, and does not
change that issue's state. Release #94 must reconcile those distinctions.

## Recover a provider snapshot into a separate branch

Provider references inspected on 2026-10-20:
[Neon snapshot CLI](https://neon.com/docs/cli/snapshots) and
[history window](https://neon.com/docs/postgres/backup-restore/history-window).
Also inspect the connected MCP tool schema at execution time: its defaults differ
from the CLI. Do not execute these examples without the authorization above.

1. Record the merged release/action authorization, source project/branch/database,
   snapshot ID/capture time, expiration if exposed, and a unique recovery branch
   name. Read current provider metadata to confirm the snapshot still exists and
   belongs to production. State the potential loss of all later changes. Stop if
   retention, ownership or source identity cannot be confirmed. Preserve the live
   branch, current user data and all existing restore points.
2. Restore into a **new** branch without finalization. For Neon MCP
   `restore_snapshot`, use an explicit `finalize: false` and omit `target_branch_id`:

   ```json
   {
     "project_id": "misty-breeze-47060812",
     "snapshot_id": "<reverified-snapshot-id>",
     "name": "recovery/<unique-incident-id>",
     "finalize": false
   }
   ```

   This is a template, not an executed call. MCP defaults `finalize` to **true**
   when restoring as a new branch, so omitting it is unsafe. Do not provide the
   production `target_branch_id`, invoke `finalize_branch_restore`, or redirect
   application traffic during inspection.
3. CLI alternative, only after inspecting the installed CLI help:

   ```sh
   neon snapshots restore <reverified-snapshot-id> --project-id misty-breeze-47060812 --name recovery/<unique-incident-id>
   ```

   The documented CLI defaults to an **un-finalized** restore; deliberately omit
   `--finalize` and `--target-branch`. Its reference defines no `--no-finalize`
   option. The provider associates an omitted target with the snapshot's source,
   so never finalize this preview as a continuation of inspection. If installed
   help has different defaults/options, stop and revise the procedure first.
4. Capture the returned new branch ID and readiness; verify it differs from
   production. Resolve its endpoint privately and inspect that branch/database
   read-only. Check schema, migration ledger, roles/ACLs and relevant row counts
   against the incident's recovery criteria. Confirm expected snapshot-time data
   and required code compatibility. Do not copy production credentials into app
   runtime, print connection strings or log private driver/report/request rows.
5. Record the result and limitations on the authorizing release/incident, including
   capture time, branch ID, checks and unrecovered later changes. Retain both the
   live branch and recovered branch. A ready branch alone is not successful
   application recovery. Any replacement needs a separately reviewed plan to
   preserve/reconcile current user data and explicit human authorization.

Finalization moves computes and swaps the recovered branch into the target;
it can restart computes and replace the served data state. It is outside this
inspection procedure. Do not infer permission from a successful restore preview,
and do not delete the replaced branch or replay down/reset migrations.

## Recover shared dev from a retained restore-point branch

Neon refuses snapshots of non-root branches, and shared dev
(`br-rough-lake-arrxiape`) is non-root. Before a shared-dev write such as the
[#120 baseline prerequisite](implementation/shared-dev-baseline.md), dev's
retained restore point is therefore a **child branch** created from dev just
before the run, with no compute. It is not a `snap-` snapshot, and the snapshot
procedure above does not apply to it. Production is never a source or target here.

Recovery from this write is ordered as follows:

1. **Primary rollback: the reviewed inverse SQL.** The #120 operation changes
   catalog state only and touches no rows, so its exact inverse restores the
   complete pre-run state. Use the exact SQL, preconditions, postconditions and
   authorization in the runbook's
   [Rollback](implementation/shared-dev-baseline.md#rollback) section: an owner
   session on dev's direct host under migration advisory lock
   `7241865325823964`, a live schema hash equal to the run's after hash,
   `DROP EXTENSION pg_stat_statements RESTRICT` and the owner-issued
   `GRANT SELECT (reported_status) ON public.reports TO app_rw` in one
   transaction, never `CASCADE`. An independent second agent reviews the exact
   SQL before an operator runs it manually, and both are recorded on
   [#120](https://github.com/BinaryDevil/find-free-parking/issues/120).
2. **Data backup: the retained restore-point branch**, inspected read-only as in
   steps 1 and 2 below.
3. **Last resort: restore dev from the restore-point branch**, steps 3 to 5
   below, after the provider caveats that precede them. It needs explicit human authorization and may be refused by the
   provider.

### Inspect the restore point, or restore dev from it as a last resort

Provider reference inspected read-only on 2026-10-23:
[Neon instant restore](https://neon.com/docs/postgres/backup-restore/branch-restore)
and [Manage branches](https://neon.com/docs/manage/branches). They document
`neon branches restore <target> <source>` and
`POST /projects/{project_id}/branches/{branch_id}/restore` with
`source_branch_id` and `preserve_under_name`. The docs contradict each other on
non-root targets. The instant-restore page states that instant restore is
supported only for root branches and that child branches do not support it, yet
the same page shows head restores ("latest data from another branch") into a
child branch and limits only the point-in-time case to root sources, and Manage
branches lists restoring a branch to the head of another branch without a root
qualifier. None of the examples restores a non-root branch from **its own
child**, which is what this procedure needs, and `preserve_under_name` moves the
target's children, including this restore point, to the backup branch. The docs
also disagree on whether a backup branch is created automatically. The provider
may therefore refuse dev as a target. Inspect current provider docs and the
installed CLI help or connected tool schema at execution time. If the provider
does not accept restoring dev from this branch, stop: any other recovery path
needs its own reviewed plan.

1. Record the restore-point branch ID, its parent (dev's branch ID), the parent
   LSN or timestamp it was created at, its creation time and its intended
   retention. Read current provider metadata to confirm the branch still exists,
   its parent is exactly dev at that LSN, and it is not production. Stop if any
   of these cannot be confirmed.
2. Inspect the restore point **read-only** first. It has no compute, so to see its
   data either add a compute to it temporarily or create a further child branch of
   it and inspect that. Do not write to either. The free plan allows 10 branches per
   project: count existing branches before creating one, and create branches only
   through the coordinator. Check schema, roles/ACLs, migration ledger and the
   relevant row counts or fingerprints against the run's recorded `before` evidence.
   Remove the temporary compute or extra child when inspection ends.
3. Inspection needs no further approval. Restoring dev's served state from the
   restore point overwrites existing dev rows and any user data written since, so
   under [ADR-0005](adr/0005-agent-verified-gates.md) it needs **explicit human
   authorization** naming dev, the restore-point branch and the accepted loss of
   later changes. Record that authorization on the incident or ticket.
4. With that authorization, restore dev from the restore-point branch, keeping
   dev's current state as a backup. In the documented API this is a branch restore
   with `source_branch_id` set to the restore-point branch and a
   `preserve_under_name` (required when the target has children, as dev does);
   the CLI form is `neon branches restore <dev> <restore-point-branch>`. These are
   templates, not executed calls: check the current names, defaults and backup
   behavior first. Connections to dev are interrupted during the restore.
5. Afterwards re-verify dev's identity (branch ID, direct host, database and
   owner), its schema hash and row fingerprints against the recorded `before`
   evidence, and the `app_rw` behavior the release depends on. Record the result,
   branch IDs and unrecovered later changes on the ticket.

Never delete the restore-point branch until the write's post-checks pass and are
recorded. After a restore, also keep it and any backup branch the restore creates
until step 5 passes. Deletion goes through the coordinator.

## Roll back code separately

[Vercel Instant Rollback](https://vercel.com/docs/instant-rollback) restores an
eligible previous deployment; it does not recover the external database.
Before a release, record the current production deployment ID, immutable URL,
commit SHA, domain aliases and compatible schema as its rollback candidate.
Verify its retained availability and eligibility live, including the project's
[deployment retention](https://vercel.com/docs/deployment-retention) policy.
Historical GitHub success alone is insufficient.

On 2026-10-20, initial Vercel requests with explicit team
`binarydevils-projects` returned **403**, including deployment detail/list and
non-decrypted env metadata; no CLI executable was available on PATH. After the
owner confirmed reconnecting Vercel, deployment reads without the optional team
selector succeeded. Exact-ID detail and a production list scoped to project
`prj_NOfTpzIAOrI6L1WCHamTXtUZ8Rfr` verified retained deployment
`dpl_3ehJEpH1DvTqvu7geJ6n4gdoWFSU`: READY, production, repository
`BinaryDevil/find-free-parking`, main SHA
`aa0e060acb031df3e43d0f61c6efa05f72971bc8`, with both custom-domain aliases and
`isRollbackCandidate: true`. The older `f3db697` deployment was also listed as a
rollback candidate. Explicit-team reads still failed; do not treat that historical
failure as blanket unavailability of the now-verified deployment.

This establishes retained availability and provider rollback eligibility at the
inspection time, not an executed rollback or its end-to-end success. Reverify
eligibility and configuration before action; current env scoping/compatibility
and the project's retention policy are not established by these deployment reads.

For an authorized failed-release rollback:

1. Reverify the candidate in the correct project/team, including READY state,
   production eligibility, SHA, aliases and runtime configuration. Confirm its
   code still works with the live schema and services; old environment values
   may be stale. For #94's code-only stage, preserve the text IP schema. The old
   coverage-request writer is incompatible with a later inet conversion; follow
   [production release staging](PRODUCTION_RELEASE.md) before that later action.
2. Use the verified provider rollback operation. The [documented CLI](https://vercel.com/docs/cli/rollback) form is
   `vercel rollback <verified-deployment-id-or-url> --scope binarydevils-projects`;
   recheck installed help and project identity first. Stop for unavailable access
   or eligibility; do not substitute an unverified deployment. This runbook does
   not execute rollback or claim the account can perform it.
3. Verify the custom domain serves the intended revision (provider metadata plus
   `/api/revision` when available), health, Seattle/Vancouver parking APIs and
   desktop/mobile behavior. Record evidence and unresolved failures on the release
   and incident. Preserve database rows, schema and migration ledger.

Rollback can disable automatic production-domain assignment. Follow Vercel's
documented recovery from rollback before the next authorized release; verify the
chosen deployment and production domain afterward. Do not assume a new push
replaces the rolled-back deployment.
