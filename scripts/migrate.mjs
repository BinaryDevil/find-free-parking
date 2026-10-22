import { runner } from 'node-pg-migrate';
import { Client } from 'pg';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { directMigrationUrl, verifyMigrationIdentity } from './migration-connection.mjs';

const baseline = '1791676800000_baseline';
const command = process.argv[2];
let client;
try {
  if (!['up', 'mark-baseline'].includes(command) || process.argv.length !== 3) {
    throw new Error('Use pnpm db:migrate or pnpm db:baseline. No down/reset command is provided.');
  }
  const url = directMigrationUrl(process.env.MIGRATION_DATABASE_URL || '');
  if (!process.env.MIGRATION_EXPECTED_HOST || url.hostname !== process.env.MIGRATION_EXPECTED_HOST ||
      !process.env.MIGRATION_EXPECTED_DATABASE || decodeURIComponent(url.pathname.slice(1)) !== process.env.MIGRATION_EXPECTED_DATABASE) {
    throw new Error('Confirm the provider branch endpoint and database using MIGRATION_EXPECTED_HOST and MIGRATION_EXPECTED_DATABASE.');
  }
  if (command === 'mark-baseline' && process.env.MIGRATION_BASELINE_APPROVED !== baseline) {
    throw new Error('Baseline marking needs human approval after schema comparison and snapshot; see docs/DATA.md.');
  }
  const files = readdirSync('sql/migrations');
  if (files.some(file => !/^\d{13}_[a-z0-9_]+\.sql$/.test(file))) {
    throw new Error('Use unique timestamped SQL migrations only.');
  }
  client = new Client({ connectionString: url.toString() });
  await client.connect();
  await verifyMigrationIdentity(client, url);
  await runner({
    dbClient: client,
    dir: resolve('sql/migrations'),
    migrationsSchema: 'migration_meta',
    createMigrationsSchema: true,
    migrationsTable: 'pgmigrations',
    direction: 'up',
    checkOrder: true,
    singleTransaction: true,
    ...(command === 'mark-baseline' ? { fake: true, file: baseline, count: 1 } : {}),
    log: () => {},
    logger: { debug() {}, info() {}, warn() {}, error() {} },
  });
  console.log(command === 'mark-baseline' ? 'Baseline recorded; schema was not replayed.' : 'Pending migrations applied.');
} catch (error) {
  // Driver errors can contain connection details or SQL; do not print them.
  console.error(error instanceof Error && !client ? error.message : 'Migration failed. Inspect the target privately; do not replay historical SQL.');
  process.exitCode = 1;
} finally {
  await client?.end();
}
