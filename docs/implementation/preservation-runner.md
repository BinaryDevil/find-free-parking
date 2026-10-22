# Guarded preservation migrations

Refs [#113](https://github.com/BinaryDevil/find-free-parking/issues/113), [accepted design](../plans/schema91-preservation-design.md), [foundation](../PRESERVATION_FOUNDATION.md).

The operator CLI and release executor share the fixed manifest/history resolver. Local disposable command and release tests exercise this implementation; they do not establish shared-dev or production schema compatibility, provider permissions, retention activation, source approval or rollback readiness. Keep the production plan `[]` until an independently reviewed release explicitly lists the intended actions.

## Fixed identities and target selection

`sql/migration-manifest.json` pins the unchanged baseline, eight historical legacy migrations, preservation files and the historical operations superseded only for preservation-v1. SQL hashes use exact file bytes. Manifest hashes use SHA256 of `canonical(manifest)` from `scripts/migration-lineage.mjs`, not the pretty-printed JSON file. CI checks directory coverage, file hashes, sealed SQL in both directories and immutable manifest prefixes.

`db:migrate` retains legacy replay for a genuinely empty target and continues existing legacy histories. It selects preservation-v1 only from the target's explicit adoption record; an environment flag cannot switch history. Existing schema without a ledger is rejected before migration writes. Baseline-only targets must explicitly adopt preservation before using its files. Never use legacy replay to bypass that adoption or to authorize the pending non-additive hygiene transition.

The connection guard accepts a direct PostgreSQL URL with a declared database/role, optional unique `sslmode`/`channel_binding`, and an explicit or default 5432 port. Other URI options are rejected. Commands verify the actual database, role and database owner; startup statement/lock timeouts are fixed rather than inherited from `PGOPTIONS`. Schema capture removes inherited `PG*` settings and supplies only the parsed target and declared TLS settings.

## Separate bootstrap and adoption commands

All commands require the ignored direct owner URL in `MIGRATION_DATABASE_URL` and explicit `MIGRATION_EXPECTED_HOST`/`MIGRATION_EXPECTED_DATABASE` confirmations. Keep real connection values out of commits, screenshots and logs.

| Command | Scope and prerequisite |
| --- | --- |
| `pnpm db:bootstrap-preservation` | Fresh empty disposable target only; `MIGRATION_BOOTSTRAP_APPROVED` must equal the sealed baseline SQL hash. Executes and records the unchanged baseline normally, but adopts nothing. |
| `pnpm db:baseline` | Existing separately reviewed baseline-marking procedure; requires its existing approval, exact schema comparison and snapshot gates. Never marks superseded migrations. |
| `pnpm db:adopt-preservation` | Exactly baseline-only history and a freshly matching baseline schema. Records metadata only; applies no preservation SQL. |
| `pnpm db:migrate` | Applies only the target's selected ordered lineage with the common advisory lock and transaction, then verifies history. |

Adoption also requires `MIGRATION_REFERENCE_METADATA`, `MIGRATION_REFERENCE_DUMP`, `MIGRATION_ADOPTION_APPROVED` and `MIGRATION_SNAPSHOT_REFERENCE`. The first two are private local file paths; the approval is the canonical metadata SHA256. The snapshot is an already verified restore-point reference; the CLI records it and does not claim to verify a provider snapshot. Shared dev and production require their actual snapshot gates.

Generate the reference by replaying the exact sealed baseline in a separately fresh isolated database and capturing its schema with the same PostgreSQL 17 `pg_dump` version and options as the target: `--schema-only --exclude-schema=migration_meta`. Preserve owners, application ACLs, functions, defaults, triggers, indexes, extensions and enum definitions. The optional explicit `application` projection excludes only the documented Neon cloud_admin default ACL blocks; it never proves provider parity.

The reviewed metadata has these fields:

- `version: 1`, `provenance: "baseline-replay"`, `baselineHash` from the sealed SQL, and `schemaHash` from SHA256 of `normalizeSchema(referenceDump, projection)`.
- `projection` (`strict` or `application`), exact `pgDumpVersion`, exact `options` array above, and `review` pointing to the repository PR or issue/comment reviewing this reference.

A provenance label or supplied hash alone does not prove baseline replay. Review the generation evidence, fingerprint and schema comparison before approving the metadata. Do not use a target dump as its own unverified reference.

Adoption verifies reference hashes/version/options before connecting, then holds the shared migration advisory lock and a repeatable-read transaction with SHARE locks on existing application tables. A fresh exported-snapshot dump must match the reviewed reference before metadata is written. Operator-owned history/schema and mutation ACLs are checked; unknown history, schema drift, partial objects, later legacy operations or conflicting adoption stop. All operator DDL must respect this maintenance/advisory-lock boundary; this is not a claim to exclude arbitrary concurrent owner activity.

## Exact production declarations

The existing array plan, including `[]`, remains the legacy/code-only format. A preservation release uses a committed object with exactly `lineage`, `manifestHash`, `adoptionReference` and `migrations`. `lineage` is `preservation-v1`; the reference is its approved canonical metadata hash when adoption is listed, otherwise `null`; migrations are exact preservation filenames.

The human-merged release's Production actions must match that object:

```text
- Migration lineage: `preservation-v1`
- Migration manifest: `<canonical manifest SHA256>`
- Adoption reference: `<canonical reviewed-reference metadata SHA256>`
- Migration: `sql/preservation-v1/<exact timestamped file>.sql`
```

Omit the adoption line only for a target already explicitly adopted. Every pending selected file must be listed. The executor checks the manifest and current history before snapshot, compares the baseline before adoption, takes the real retained snapshot, rechecks deployment/current-main proof, performs the separately listed adoption, rechecks readiness, and applies selected SQL. It verifies the resulting histories and smoke checks. Rerunning the same authorized release verifies matching already-recorded adoption without performing it again.

Protected GitHub `production` environment secrets `PRODUCTION_BASELINE_REFERENCE_METADATA` and `PRODUCTION_BASELINE_REFERENCE_SCHEMA` deliver the reviewed JSON and baseline schema text. The executor verifies them against the exact authorized hash, writes mode0600 files under `RUNNER_TEMP`, deletes raw values from its environment and removes the files afterward. No dump is interpolated into shell code, logged or uploaded. Missing/mismatched inputs fail before target writes. Code-only releases require neither secret and perform no adoption/migration/history write.

A read-only exact-release preparation step installs the PostgreSQL 17 client from the official [PGDG Ubuntu repository](https://www.postgresql.org/download/linux/ubuntu/) only when an adoption is explicitly listed. The exact installed client version must match reviewed metadata; a package patch update can require a regenerated/reviewed reference. Actual production reference generation/provisioning, hosted execution, production-derived preservation/provider/locking evidence, deployed rollback applications and installed-schema Preview verification remain release gates, not completed setup.

Retention invocation, scheduler provisioning, source activation, sync and legacy retirement are separate actions and are excluded from this implementation's production plan.
