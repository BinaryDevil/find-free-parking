# Computed Coverage

> **Approvals:** this runbook predates [ADR-0005](adr/0005-agent-verified-gates.md). Where it asks for human or separate approval, follow ADR-0005's *Reading older runbooks* section; its other steps are unchanged.

`lib/coverage.ts` is the shared runtime resolver for the coverage action, parking
APIs, city pages, metadata, sitemap and JSON-LD. `coverage_areas` contains the
area definitions; `coverage_area_sources` links every Evidence Source required
for each declared promise. A link is not approval. Only the two-agent Evidence Source review in
[ADR-0005](adr/0005-agent-verified-gates.md) can approve a source.

The stored `level` is the reviewed maximum promise, not a live assertion.
The resolver recomputes the returned level and `computedAt` on every read from
current approvals and each source's latest sync (including running or failed
syncs). It never serves the stored level or optional `computed_at` as current
Coverage. The policy's seven-day limit caps E1–E4/E6, and the one-day limit caps
E5, even with longer configured limits; E7 uses its configured freshness limit.
A failed, pending, stale or signal-only
required source closes the entire promise rather than silently changing its
declared subset. Source syncs and approvals cannot be written by the app role.

Full requires citywide E1 (or complete E3 plus E7), separate E2 unless the reviewed
E1/sign rules include meters, E4 and daily E5. Every link must explicitly cover
the whole area. Otherwise Partial requires an exact `subset_geom`, a nonempty
`declared_subset`, and current approved E1–E4/E6 evidence. E7 alone and signals
cannot establish Coverage. A failed Full promise can fall back only to an
explicitly reviewed partial subset, never to the whole city polygon.

`approvedParkingPlaceIds` opens the #11 evaluator only for a place whose whole
geometry is covered by the computed full area or exact partial subset, whose
geometry and rule sources are all linked to that area, and whose timezone matches.
An unlinked rule closes the whole place gate; dropping it could hide a restriction.
`ST_Intersects` alone
is insufficient for membership. Applicable rules must still pass the evaluator;
Coverage does not establish free permission or vacancy. The legacy #18 Unknown
context remains available outside that gate. Viewport responses are labelled
partial whenever any covered area intersects; the returned per-area levels and
subsets describe the actual promise, not the whole viewport.

## Additive rollout

Migration `1791979200012_coverage_areas.sql` preserves the 24 former city-page
URLs as point anchors with `level = none` and **no source links**. These are not
coverage boundaries. Activating any reviewed promise requires replacing its
point with reviewed polygon geometry, an exact subset if partial, and separately
approved evidence links. Unknown cities return 404. Existing uncovered pages
say not covered, are noindex, and are omitted from sitemap and JSON-LD. Partial
pages state the subset; full pages state full Coverage. All eight locales have
the matching keys. HTML is rendered per request and sitemap responses use
no-store so long-lived caches cannot outlast evidence.

Before this migration exists, the resolver returns no Coverage and no classified
places. City definitions become available only after the additive migration.
Database failures other than an absent migration still fail visibly. No migration
runs during build or deployment. Follow [DATA.md](DATA.md) for separate reviewed
environment application; this implementation authorizes no production writes,
source approvals or deployment.

`SUPPORTED_CITIES` is removed. `covered_cities` remains for old deployments and
legacy scripts (`seed_osm_utils`, `seed_all`, counts/cleanup tooling), and its data
is preserved. It has no application Coverage readers. Drop it only in a separately
reviewed migration after those consumers and rollback dependencies are retired.

## Validation

Run `node --test tests/coverage.test.mjs tests/parking-api.test.mjs` without a DB.
For integration, create a **new empty database** named `coverage_test_12` or
`coverage_test_12_<number>` on an explicitly disposable Neon branch. Privately set
`COVERAGE_TEST_DATABASE_URL` to its direct owner URL and
`COVERAGE_TEST_EXPECTED_HOST` to the provider-confirmed endpoint, then run
`node --test tests/coverage-db.test.mjs`. Never point it at shared dev/production.
It replays all migrations twice, checks no-source defaults, Full/Partial/None,
freshness/failure/approval/signal behavior, exact place membership, app-role
access, city lookup, coverage action, parking GET and sitemap. Only synthetic
fixture approvals are created. Regular tests skip DB integration without its
explicit variables.
