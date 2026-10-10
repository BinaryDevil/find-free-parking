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

When fixing debt, remove the resolved entries in the same PR. Only deliberately refresh a baseline with `node scripts/check-diagnostics.mjs lint --record` (or `typecheck --record`), then review every changed entry against the previous base; never refresh to make a new failure pass. #7's open dependency PR also edits package/lockfile/this document: reconcile its versions and regenerate only justified diagnostic changes after integration. This ticket adds no dependency upgrades or lockfile changes.

The schedule tests characterize the current browser-local helper used by the map, including overnight ranges and weekday matching. They are a seed for #11, not evidence of the future server evaluator or verified parking rules. Current behavior checks the selected day's name even after midnight (a Monday-only 18:00–02:00 rule is inactive Tuesday at 01:00), and equal endpoints act as all-day. City timezones, DST, overnight day ownership and classification remain #11 work.

For docs-only edits, verify local links, consistency, the symlink, and the diff; application builds are not required. `CLAUDE.md` must remain Git mode `120000` pointing to relative `AGENTS.md`. In the Windows #19 worktree, `core.symlinks=false` produced a plain pointer file; keep the Git symlink unchanged and verify the actual link on a symlink-capable checkout.

For map changes, verify the selected city/time, free and paid views, unknown data, reports, rapid viewport changes, and mobile controls. Record which environment and data were used.

## Database and release operations

Follow [data operations](DATA.md) before seeding, migrations, cleanup, or database rollback. Extra evidence columns left by earlier work are not a reason to remove data.

The recorded public URL is https://findfreeparking.info/. Pushes to `main` were historically expected to deploy; confirm the current integration rather than assuming a push proves deployment. After application releases, check the deployment revision, public map, and parking API responses. Source parity alone cannot prove behavioral parity: database rows, environment, current time, external services, and browser storage also affect results.
