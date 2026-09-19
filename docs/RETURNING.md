# Returning to Find Free Parking

## Current baseline

- The application code was returned to the state before the September 2026 changes.
- The September-only `parking_evidence` migration is no longer in this repository. If it was previously applied, its three JSON columns remain in the database intentionally; they are additive, unused by this baseline, and preserve all data.
- Do not run a rollback migration or a seed script merely to align the database with the checked-out code. The deployed application works with the extra columns present.

## Local setup

- Use pnpm and start the application with `pnpm dev`.
- A database connection is required at startup. Configure one of `POSTGRES_PRISMA_URL`, `POSTGRES_URL`, or `DATABASE_URL` in a local environment file. Environment files are ignored and no sample file is currently tracked.
- The database uses PostgreSQL with PostGIS. The SQL files in `sql/` are ordered historical setup/migration scripts; apply only the specific, understood script to a backup or non-production database first.

## Data and seeding

- Parking data is stored in the database, not rebuilt automatically from the repository.
- `scripts/seed_all.ts` and the city-specific seed scripts can add or change data. Review the target city and script behavior before running them against a shared or production database.
- `scripts/clear_db.ts` and cleanup scripts are potentially destructive. Never run them against production without a verified backup and an explicit scope.

## Product model

- A Parking Rule describes whether parking is permitted and under what conditions. It is not evidence that a space is vacant.
- A Free Parking Rule is free for the relevant time and vehicle context; a Driver Report is advisory and does not replace an authoritative rule.
- The canonical domain terminology lives in `CONTEXT.md`; keep that file as a glossary. Record implementation and operational decisions in `docs/` instead.

## Validation and deployment

- The public site is `https://findfreeparking.info/`; pushes to `main` are expected to deploy there.
- At the rollback baseline, `pnpm lint` fails on existing TypeScript/ESLint violations (primarily explicit `any` usages). Treat a clean lint run as separate maintenance work rather than assuming a new change caused every reported issue.
- Before production changes: test locally with a non-production database, inspect the generated migration or seed scope, push a branch or `main` only after review, then confirm the public site and its parking API responses after deployment.
