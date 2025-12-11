---
trigger: always_on
---

# SQL usage guide

Whenever you need to alter a table or create table, alter any database setting or structure. Remember to put the SQL into ./sql/ directory before or after executing. So that we can track changes made to the database.

## Naming Convention

- Use `N.description.sql` (e.g., `6.city_coverage.sql`). Increment N for each new migration.

## Usage

- **Schema Changes**: MUST be in SQL files.
- **Data Inserts**: Large seeds can be in SQL files.
- **Idempotency**: Try to use `IF NOT EXISTS` / `DROP IF EXISTS` or efficient conflict handling where possible.

## Execution

- **Migrations**: To execute a SQL file:
  1. Create a temporary script (e.g., `scripts/run_migration_N.ts`).
  2. Import `getDbPool` from `scripts/seed_utils.ts` to properly handle environment variables and connection pooling.
  3. Read and execute the SQL file content.
  4. Run with `npx tsx scripts/run_migration_N.ts`.
  5. Delete the temporary script after verification.

## Exemption

If a change is made to insert/update data via a script (dynamic data), don't need to do this.
