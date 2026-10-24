# Shared-dev baseline prerequisite (#120)

Source implementation includes target/schema/restore-point guards, the separate operator command and fixed SQL catalog checks. The disposable dev-derived rehearsal under the actual app role is done and [recorded on #120](https://github.com/BinaryDevil/find-free-parking/issues/120#issuecomment-6377560078). It found the pg_dump trailing-space fix (`80a9950`) and led to reverting the Neon-snapshot attestation. Independent review, merge, then the shared-dev run with a fresh restore-point branch and approval remain. This document authorizes no shared execution.

The fixed operation will install only baseline-compatible `pg_stat_statements` and its comment, and revoke only the obsolete direct `app_rw` SELECT on `reports.reported_status`. INSERT, the report-count definer and every original row/field remain intact. It is separate from baseline marking, preservation adoption and foundation replay. Neither migration lineage nor the manifest changes.

A privately reviewed approval binds provider branch identity, direct host SHA256, database/owner, before-schema hash, independent baseline replay reference and verified retained restore-point branch evidence. The only shared target is `br-rough-lake-arrxiape` / `dev`. Before any connection, the production branch `br-rough-base-aryz0z5a` is refused when the approval names it as target, parent or restore-point branch, rehearsal included. That refusal reads only the approval's branch identifiers: nothing maps the direct host to a provider branch, so the host-to-branch binding rests on the reviewed attestation. After connecting and verifying database/owner identity, a read-only catalog check refuses, before the advisory lock or any table lock, a target that already has `pg_stat_statements` installed (as production and an already reconciled branch do) or has migration history or foundation objects. An explicitly reviewed disposable rehearsal may target an owned `validation/issue-120-*` branch whose provider parent is that exact dev branch, with its own host binding. A caller's unreviewed branch flag is insufficient. Keep provider records, private dumps and credentials out of commits and logs.

The exact pre-schema comparison removes precisely the baseline pg_stat_statements extension/comment blocks from the independently replayed reference and substitutes precisely its direct app status INSERT grant with the recorded SELECT+INSERT grant. It rejects all other application drift, including extra grants and changed definer permissions. This comparison does not rewrite a dump or alter the independent reference. The existing application projection excludes only documented cloud_admin default ACLs; retain strict provider comparison separately.

Before shared execution: integrate independently reviewed source; rehearse on an isolated dev-derived clone under the actual app role; revalidate eligible rollback consumers; verify original-field fingerprints/catalogs; verify a fresh retained dev restore-point branch, its [restore procedure](../RECOVERY.md#recover-shared-dev-from-a-retained-restore-point-branch) and current provider binding. The reviewed inverse SQL under [Rollback](#rollback) is the primary rollback; the restore-point branch is the data backup. Stop for unknown drift, unavailable/preload-disabled statistics, wrong owner/target or any migration/adoption/foundation object. All operator DDL must respect the existing migration advisory lock and maintenance boundary.


## Private reviewed inputs and command

Run `node scripts/reconcile-shared-dev-baseline.mjs` without arguments from the reviewed checkout. It never loads application environment files. Privately provide `MIGRATION_DATABASE_URL` (direct owner URL), `DEV_BASELINE_APPROVAL` (private JSON file path), `DEV_BASELINE_APPROVED` (SHA256 of canonical approval JSON), `MIGRATION_REFERENCE_METADATA` and `MIGRATION_REFERENCE_DUMP` (existing independently reviewed baseline-replay reference files), and `DEV_BASELINE_EVIDENCE_DIR` (absolute path of a new directory outside the checkout; the command creates it with mode 0700).

Approval JSON fields are `version: 1`, `branchId`, `branchName`, `hostHash` (SHA256 of exact direct hostname), `database: "find-free-parking-db"`, `owner: "find-free-parking-db_owner"`, `beforeSchemaHash` (normalized under the reference projection), `referenceHash` (canonical reference metadata hash), `operationHash` (exact SQL bytes), `track` (`top` or `all`), and `snapshot`. For a rehearsal only, include `parentBranchId: "br-rough-lake-arrxiape"` and the exact provider-confirmed owned validation branch identity. Port is fixed to 5432. URLs cannot override host/database/role through query parameters.

The `snapshot` object describes dev's restore point, a child branch created from the target just before the run (Neon refuses snapshots of non-root branches). It has `branchId`, `parentBranchId` equal to the selected target, `providerRecordHash`, `createdAt`, `verifiedAt`, `retainedUntil` (ISO dates), and `restoreProcedure`, which must be exactly `docs/RECOVERY.md#recover-shared-dev-from-a-retained-restore-point-branch` ([procedure](../RECOVERY.md#recover-shared-dev-from-a-retained-restore-point-branch)). Inspection must be within one hour; the restore point must be retained beyond execution. These are reviewed provider attestations, **not automatic provider API verification**. The operator and independent reviewer must freshly fetch provider branch/endpoint and restore-point branch records, verify parent/ownership/purpose, retention and restore procedure, and compare their private record hashes before approving this exact metadata. A self-generated hash or a caller-supplied branch name alone establishes no authority. Keep provider records private. Re-fetch and regenerate/review inputs if anything changes or the restore-point inspection expires.

Before connecting, the command checks the sealed baseline reference, its pg_dump 17 version/options/projection, the operation hash, the restore-point attestation and that the local `pg_dump --version` equals the reference version. After connecting it runs the read-only pre-lock check above, then takes the common migration advisory lock, repeatable-read transaction and SHARE locks on the six baseline application tables. All DDL operators must respect this maintenance boundary. Any migration_meta namespace (including empty metadata), foundation evidence_sources table, extra schema/ACL drift or unexpected tracking configuration stops before operation SQL. The SQL checks extension absence, provider version 1.11 availability, preload, owner and direct non-grantable owner-issued status column ACLs before changing anything.

All original row/field fingerprints are compared inside the transaction. SQL verifies extension/version/comment and retained INSERT/definer SELECT while rejecting effective app status SELECT before commit. Since another session's pg_dump cannot see uncommitted DDL, full independent application schema comparison runs **after commit**, with the advisory lock retained. If that last capture or comparison fails, the prerequisite is committed: the command reports `DEV_BASELINE_COMMITTED`; stop and report the state. If COMMIT itself loses its connection, it reports `DEV_BASELINE_COMMIT_UNKNOWN`; verify catalog state before anything else. A connection lost before COMMIT reports `DEV_BASELINE_FAILED` (the server rolls the transaction back); one lost after COMMIT, which also releases the advisory lock, reports `DEV_BASELINE_COMMITTED` with `AFTER_CAPTURE_FAILED`. If `evidence.json` cannot be written after a verified commit, the command still reports `DEV_BASELINE_COMMITTED`.

The evidence directory receives `before.sql` (the pre-write dump at the exported snapshot), `after.sql` (when captured) and `evidence.json` (reason code, whether the connection was lost, normalized before/after schema hashes and per-table row fingerprints), each mode 0600. It holds no connection URL or credential, but schema dumps remain private: never commit or log them. Every refusal prints one fixed reason code from `guardMessages` in `scripts/shared-dev-baseline.mjs`, for example `DEV_BASELINE_SNAPSHOT_STALE` (regenerate the attestation) versus `DEV_BASELINE_SCHEMA_DRIFT` (stop); driver, file and pg_dump errors print only `DEV_BASELINE_FAILED`. Never automatically reverse SQL or continue baseline marking/adoption/foundation. No application DML, fixture writes or arbitrary SQL paths are provided.

## Rollback

The primary rollback for this operation is its exact inverse, run manually by an operator. The operation changes only catalog state (one extension with its comment and one column grant) and touches no rows; the rehearsal showed every original row and field identical before and after. Inverse DDL therefore restores the complete pre-run state, and only the collected statement statistics are lost. The retained restore-point branch is the data backup, and a [branch restore](../RECOVERY.md#inspect-the-restore-point-or-restore-dev-from-it-as-a-last-resort) is a last resort that needs explicit human authorization and may be refused by the provider.

Use the inverse only after the command reported `DEV_BASELINE_COMMITTED_VERIFIED` or `DEV_BASELINE_COMMITTED` with an `afterSchemaHash` in `evidence.json`. After `DEV_BASELINE_COMMIT_UNKNOWN`, or a `DEV_BASELINE_COMMITTED` without an after hash, inspect the catalog read-only first: the operation is one transaction, so either both deltas exist or neither does. If neither exists, there is nothing to roll back. If the after hash cannot be established, stop.

Authorization: shared dev falls under [ADR-0005](../adr/0005-agent-verified-gates.md)'s shared-dev rules, and the inverse restores the exact pre-approval state without rewriting or deleting rows. It runs only after an independent second agent has reviewed this exact SQL text against the run's `evidence.json`. Record on [#120](https://github.com/BinaryDevil/find-free-parking/issues/120) who reviewed it, who ran it, when, and the postcondition results. Never run it automatically, never add `CASCADE`, and never substitute other SQL.

Run it in an owner session (`find-free-parking-db_owner`) on dev's direct (non-pooler) host, port 5432:

```sql
-- Session identity: expect find-free-parking-db_owner / find-free-parking-db.
SELECT current_user, current_database();

-- Hold the common migration advisory lock for the whole procedure.
SELECT pg_advisory_lock(7241865325823964);

-- PRECONDITION, checked outside this session while the lock is held: capture a
-- pg_dump 17 schema of dev and normalize it under the reference projection, as
-- the command does. Its hash must equal evidence.json afterSchemaHash.
-- If it differs, run the unlock below and stop.

BEGIN;
DROP EXTENSION pg_stat_statements RESTRICT;
GRANT SELECT (reported_status) ON public.reports TO app_rw;
COMMIT;

-- POSTCONDITIONS, checked while the lock is still held (see below).

SELECT pg_advisory_unlock(7241865325823964);
```

`RESTRICT` makes `DROP EXTENSION` fail if anything now depends on the extension; if it fails, the transaction rolls back and the operator unlocks and stops. The `GRANT` is issued by the owner, so the restored column ACL is the original owner-issued, non-grantable grant.

Postconditions, all required before unlocking and recording the result:

1. A fresh pg_dump 17 capture, normalized the same way, hashes to the run's `beforeSchemaHash` in `evidence.json`.
2. The six baseline application table fingerprints, computed with the command's fingerprint query (`fingerprintSql` in `scripts/shared-dev-baseline-command.mjs`), equal the `fingerprints` recorded in the run's `evidence.json`.
3. The `app_rw` probe behaves as it did before the run: a direct SELECT of `reports.reported_status` succeeds again, and the report INSERT and report-count definer still work, with any probe writes inside `BEGIN … ROLLBACK`.

If any postcondition fails, unlock, record the observed state on #120 and stop. Do not attempt further SQL, and do not attempt a branch restore without the authorization in [RECOVERY](../RECOVERY.md#recover-shared-dev-from-a-retained-restore-point-branch).

## Validation still required before merge

The focused synthetic tests exercise command rejection at external database/dump boundaries; they do not prove provider SQL execution or app-role compatibility. The disposable dev-derived rehearsal at `17a7854` is done and [recorded on #120](https://github.com/BinaryDevil/find-free-parking/issues/120#issuecomment-6377560078): the command applied only the two approved deltas, preserved original rows, kept current and rollback `app_rw` writers working, and refused drift and wrong targets. It found the trailing space pg_dump prints after `Owner:` in COMMENT headers (fixed in `80a9950`) and the Neon refusal to snapshot non-root branches (attestation reverted to a restore-point branch). The record states that production and shared dev were untouched.

What remains: independent Standards and Spec reviews at a fixed commit with zero findings, then merge into `dev`. Only after that may the coordinator run the command on shared dev, with a fresh restore-point branch created just before the run and a newly reviewed approval. Baseline marking/adoption/foundation and installed-schema Preview remain separately recorded later actions.
