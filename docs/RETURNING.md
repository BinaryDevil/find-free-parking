# Returning to Find Free Parking

Read the [verified-rules spec](https://github.com/BinaryDevil/find-free-parking/issues/2) and its open sub-issues first. The current code includes post-rollback map/API fixes and Neon connection changes; do not assume it is still the old rollback baseline.

## Local setup

Use Node.js 24.11.1 (24.x) and pnpm 10.25.0, pinned in `package.json`, with the committed lockfile (`pnpm install --frozen-lockfile`). Configure an ignored `.env.local`; no sample environment file is tracked.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL_POOLED` | Neon pooled endpoint preferred by app traffic |
| `DATABASE_URL` | Direct endpoint preferred by script helpers; app fallback |
| `NEXT_PUBLIC_MAPTILER_KEY` | Optional MapTiler style key |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Legacy fallback key passed to the MapTiler style URL; inspect compatibility before relying on it |
| `NEXT_PUBLIC_GA_ID` | Optional analytics configuration |
| `NEXT_PUBLIC_SITE_URL` | Sitemap URL override; other metadata has a hardcoded site URL |

Use PostgreSQL with PostGIS and a non-production database for behavior or data changes. Connection strings configure TLS; keep credentials out of docs, logs, and commits. Script helpers load environment variables independently of Next.js; inspect the selected script before use. Without a map style key, the map uses OpenStreetMap raster tiles. Search/reverse search uses Nominatim.

## Database roles

The prepared [role rollout](DB_ROLES.md) separates `app_rw` app traffic from
the direct migration/owner connection. It is not yet evidence of applied roles
or production credentials. The restricted app role reads map/coverage tables
and inserts reports and city requests; a non-login trigger role updates report
counts. Keep owner credentials in a separate operator environment, never in
Vercel runtime or a pulled app env. Follow the rollout preflight and verification
before switching either Preview or Production.

## Validation

`pnpm lint`, `pnpm typecheck`, and `pnpm test` run the same checks as GitHub Actions on every push and pull request. `pnpm build` checks the application build separately. Tests need no environment variables or database. Node's built-in test runner and native TypeScript stripping avoid adding a test dependency; tests live in `tests/*.test.mjs` and can import small TypeScript modules directly. Run a single file with `node --test tests/schedule.test.mjs`. This runner does not typecheck; the separate typecheck gate does.

The existing diagnostic debt is recorded in [the lint baseline](../config/diagnostics-lint.json) and [the typecheck baseline](../config/diagnostics-typecheck.json). At `0a0cded` (#8 integrated, #7 still open), raw lint had 76 errors and 20 warnings; typecheck had zero diagnostics. Extracting the schedule helper removes two `any` errors, leaving 74 errors and 20 warnings. The gates compare each file, rule/code, complete message and source text, with an allowance per identical occurrence. Line-number shifts are allowed, but new files, changed diagnostics and extra occurrences fail, including warnings. Fatal lint/configuration errors fail immediately. `pnpm lint:raw` and `pnpm typecheck:raw` expose the underlying tools without allowances.

When fixing debt, remove the resolved entries in the same PR. Only deliberately refresh a baseline with `node scripts/check-diagnostics.mjs lint --record` (or `typecheck --record`), then review every changed entry against the previous base; never refresh to make an unrelated new failure pass.

PR #40's conflict resolution combines #7's Next 16.4.0/React 19.3.0 upgrades and fetch transport with `dev` at `10086ab` (MapLibre 6.13.0, fail-safe map, request automation and diagnostic CI). `pnpm test` includes the four HTTP fixture tests; `pnpm test:overpass` runs them alone without database writes. The exact lint baseline at that `dev` revision has 78 entries. The combined baseline has 80 entries (65 errors, 15 warnings), with only these changes:

- Add `react-hooks/set-state-in-effect` at unchanged `MainMap` help-dialog initialization (`setIsHelpOpen(true)`), newly diagnosed by eslint-config-next 16.4.0.
- Add the same rule at unchanged `ReportModal` default-status initialization (`setStatus(defaultStatus)`).
- Add the same rule at unchanged `ReportModal` reason reset (`setSelectedReasonOption("")`).
- Remove the unused Overpass `url` warning eliminated by #7's fetch migration.

The gate still compares individual diagnostics and fails on any additional failure; no rules are disabled. Typecheck remains at zero diagnostics. The combined production dependency audit has two residual advisories: high `braces` 3.0.3 through next-intl / @parcel/watcher / micromatch (no patched version reported), and low `@babel/core` 7.28.5 through Next / styled-jsx (patch >=7.29.6 available). There are no advisories in Next, axios, uuid or MapLibre. Audit evidence is local and time-specific; run it again before release.

The legacy schedule tests characterize the interim listed-payment helper, including selected-weekday overnight matching and equal endpoints. The map now consumes server classifications. The separate [server Parking Rule evaluator](PARKING_RULES.md) uses city timezones, DST transitions, starting-weekday overnight ownership and explicit all-day schedules. Its Coverage seam now uses the [computed Coverage resolver](COVERAGE.md); this implementation approves no real sources and does not establish live verified rules.

For docs-only edits, verify local links, consistency, the symlink, and the diff; application builds are not required. `CLAUDE.md` must remain Git mode `120000` pointing to relative `AGENTS.md`. In the Windows #19 worktree, `core.symlinks=false` produced a plain pointer file; keep the Git symlink unchanged and verify the actual link on a symlink-capable checkout.

For map changes, verify the selected city/time, free and paid views, unknown data, reports, rapid viewport changes, and mobile controls. Record which environment and data were used.

The #18 interim map shows legacy street/lot geometry and meters outside listed
payment hours as Unknown. No current legacy row establishes Verified Free
permission. Active, well-formed positive-rate meter schedules are listed payment
information only, evaluated on the server with the viewer's timezone and legacy
schedule semantics; they
do not establish permission or current rates. Unknown context stays visible in
both views and is counted separately. All city pages say not covered until
approved Evidence Sources and computed Coverage arrive in #12.

Dated Driver Warnings require one additional app-role column permission; see
[17.driver_warning_read.sql](../sql/archived/17.driver_warning_read.sql). It is prepared,
not applied by this code change. Obtain separate human approval and apply it to
each target environment before serving these endpoints; without it the warning
queries fail. It grants only `reported_status` SELECT, retaining existing report
validation and private-field restrictions. No schema objects or rows change.

## Database and release operations

Follow [data operations](DATA.md) before seeding, migrations, cleanup, or database rollback. Extra evidence columns left by earlier work are not a reason to remove data.

The recorded public URL is https://findfreeparking.info/. Pushes to `main` were historically expected to deploy; confirm the current integration rather than assuming a push proves deployment. After application releases, check the deployment revision, public map, and parking API responses. Source parity alone cannot prove behavioral parity: database rows, environment, current time, external services, and browser storage also affect results.
