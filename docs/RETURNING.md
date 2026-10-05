# Returning to Find Free Parking

Read [status](STATUS.md) and [unfinished work](../TODO.md) first. The current code includes post-rollback map/API fixes and Neon connection changes; do not assume it is still the old rollback baseline.

## Local setup

Use pnpm and the committed lockfile. Configure an ignored `.env.local`; no sample environment file is tracked.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL_POOLED` | Neon pooled endpoint preferred by app traffic |
| `DATABASE_URL` | Direct endpoint preferred by script helpers; app fallback |
| `NEXT_PUBLIC_MAPTILER_KEY` | Optional MapTiler style key |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Legacy fallback key passed to the MapTiler style URL; inspect compatibility before relying on it |
| `NEXT_PUBLIC_GA_ID` | Optional analytics configuration |
| `NEXT_PUBLIC_SITE_URL` | Sitemap URL override; other metadata has a hardcoded site URL |

Use PostgreSQL with PostGIS and a non-production database for behavior or data changes. Connection strings configure TLS; keep credentials out of docs, logs, and commits. Script helpers load environment variables independently of Next.js; inspect the selected script before use. Without a map style key, the map uses OpenStreetMap raster tiles. Search/reverse search uses Nominatim.

## Validation

`pnpm lint` and `pnpm exec tsc --noEmit` are available checks; `pnpm build` checks the application build. There is no configured automated test command. Establish the baseline before code changes and report existing diagnostics separately. For docs-only edits, verify local links, consistency, the symlink, and the diff; application builds are not required.

For map changes, verify the selected city/time, free and paid views, unknown data, reports, rapid viewport changes, and mobile controls. Record which environment and data were used.

## Database and release operations

Follow [data operations](DATA.md) before seeding, migrations, cleanup, or database rollback. Extra evidence columns left by earlier work are not a reason to remove data.

The recorded public URL is https://findfreeparking.info/. Pushes to `main` were historically expected to deploy; confirm the current integration rather than assuming a push proves deployment. After application releases, check the deployment revision, public map, and parking API responses. Source parity alone cannot prove behavioral parity: database rows, environment, current time, external services, and browser storage also affect results.
