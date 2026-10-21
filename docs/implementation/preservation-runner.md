# Preservation runner implementation status

Refs [#113](https://github.com/BinaryDevil/find-free-parking/issues/113), [approved design](../plans/schema91-preservation-design.md).

This branch is an **incomplete implementation**. The new resolver and adoption-preflight modules are not wired into the operator CLI or production release executor. Existing `db:migrate`, baseline marking and code-only release behavior remain unchanged. No preservation lineage is enabled, no adoption or SQL has run, and no database readiness is established.

Implemented public boundaries:

- `loadMigrationManifest` validates the fixed two-lineage manifest, paths, complete directory coverage and SQL hashes. `resolveMigrationLineage` checks exact ordered history and explicit adoption; it never records excluded legacy operations. The committed real manifest awaits the final foundation SQL/hash from #114.
- `verifyAdoptionReference` binds a reviewed baseline-replay reference to the unchanged baseline hash, normalized schema hash, exact pg_dump 17 version/options and explicit strict/application projection. Application projection excludes only the existing documented cloud_admin default ACL blocks. Owners, application ACLs, functions, defaults and other schema objects remain compared.
- `adoptPreservation` requires a snapshot reference, baseline-only history and a fresh read-only target capture matching that reference; it rechecks history before the metadata write. The future command must hold the shared migration advisory lock and execute this operation inside its transaction. The helper alone does not create those protections and must not be called as an operator workflow.

Before an adoption workflow is usable, an operator must replay the exact sealed baseline in an isolated database, capture the private schema-only reference using the stated same-version/options, and obtain review of its normalized fingerprint and provenance. A supplied hash or `provenance` string alone does not prove baseline replay. Production authorization must pin that reviewed metadata hash and reference the review. The target schema must be freshly captured, excluding only migration_meta. Do not retain raw schema captures or connection details in routine logs.

Remaining merge gates: finish append-only manifest CI; integrate #114's reviewed immutable foundation; wire guarded baseline bootstrap, explicit adoption and selected-lineage migration; wire exact release adoption/lineage/hash authorization without changing committed `[]`; test command/release fail-before-write paths and actual isolated database transactions, locking, adoption and replays; independent Standards/Spec review and final CI. Shared dev and production remain untouched.
