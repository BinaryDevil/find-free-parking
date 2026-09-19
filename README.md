# Find Free Parking

Find Free Parking is a multilingual map for finding free and paid on-street parking, meters, and parking lots. It uses Next.js, MapLibre, PostgreSQL, and PostGIS.

## Features

- Street segments, parking meters, and parking zones on an interactive map.
- Localized city landing pages under `/{locale}/{city}`.
- Eight languages through `next-intl`.
- Anonymous reports for incorrect parking data and requests for new coverage.
- Municipal and OpenStreetMap import scripts.

## Local setup

Requirements: Node.js 20+, pnpm 9+, and a PostgreSQL database with PostGIS.

1. Run `pnpm install`.
2. Copy `.env.example` to `.env.local` and set `DATABASE_URL`.
3. Apply the database schema described below.
4. Run `pnpm dev`, then open <http://localhost:3000>.

Without a map key, local development uses OpenStreetMap raster tiles. Set `NEXT_PUBLIC_MAPTILER_KEY` for the MapTiler streets style in production.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL/PostGIS connection string. `POSTGRES_URL` and `POSTGRES_PRISMA_URL` are also accepted. |
| `POSTGRES_SSL_REJECT_UNAUTHORIZED` | No | Set to `false` only for a trusted local/self-signed development database. Certificates are verified by default. |
| `NEXT_PUBLIC_MAPTILER_KEY` | No | MapTiler client key; `NEXT_PUBLIC_MAPBOX_TOKEN` is retained for compatibility. |
| `NEXT_PUBLIC_SITE_URL` | No | Public canonical URL for sitemap and robots. |
| `NEXT_PUBLIC_GA_ID` | No | Google Analytics measurement ID. |

Never commit `.env.local` or credentials.

## Database and data imports

There is not yet a migration runner. Files in `sql/` are historical migrations, not independent schema snapshots. For a new database, apply them once in this order:

`1.initial.sql`, `2.sample_data.sql`, `3.add_metadata.sql`, `4.parking_tables.sql`, `5.global_schema.sql`, `5.optimization_indices.sql`, `6.city_coverage.sql`, `7.seed_cities.sql`, `8.alter_reports.sql`, `9.aggregation_strategy.sql`, `10.drop_parking_spots.sql`, `11.zone_reports.sql`, `12.coverage_requests.sql`, `12.consolidate_requests.sql`, `13.fix_coquitlam_bounds.sql`, `14.drop_unused_tables.sql`, and `15.parking_evidence.sql`.

Some files intentionally remove obsolete tables. Back up an existing database before applying any SQL, and do not rerun this sequence against a partially migrated database.

The master importer skips cities that appear to have existing data:

```bash
npx tsx scripts/seed_all.ts
```

Adding `--clean` clears the database before importing and is destructive. Individual `seed_<city>.ts` scripts can refresh one city. Review any incoming municipal or OSM source data before a production import.

## Quality checks

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm verify
```

`verify` runs all three release checks. Framework and correctness lint rules remain enabled; `no-explicit-any` is intentionally disabled while legacy ingestion code handles untyped third-party GIS JSON. New code should use explicit types at those boundaries.

## Project layout

| Path | Responsibility |
| --- | --- |
| `app/` | Pages, API routes, locale layout, SEO routes, and server actions. |
| `components/MainMap.tsx` | Map rendering, status filtering, search, and interactions. |
| `lib/cities.ts` | City URL slugs and initial map positions. |
| `sql/` | Historical PostGIS migrations. |
| `scripts/` | City imports, OSM helpers, cleanup, and diagnostics. |
| `datasets/` | Downloaded municipal source data. |
| `messages/` | UI translations. |

## Before deploying

- Run `pnpm verify`.
- Confirm the schema is current and `/api/health` responds successfully.
- Set `NEXT_PUBLIC_SITE_URL` to the public URL.
- Validate `/sitemap.xml` and `/robots.txt`.
- Spot-check changed cities and parking-status labels after every data import.
