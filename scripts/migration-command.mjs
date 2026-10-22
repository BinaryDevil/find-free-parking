import { runner } from 'node-pg-migrate';
import { Client } from 'pg';
import { resolve } from 'node:path';
import { directMigrationUrl, verifyMigrationIdentity } from './migration-connection.mjs';
import { baselineName, loadMigrationManifest, resolveMigrationLineage } from './migration-lineage.mjs';
import { adoptPreservation, captureSchema, readAdoptionInputs, readMigrationState, verifyAdoptionReference } from './preservation-adoption.mjs';

// node-pg-migrate 9's lock identity. The same session may lock reentrantly;
// runner releases its acquisition, and this command releases its own in finally.
const migrationLock = '7241865325823964';
const quiet = { debug() {}, info() {}, warn() {}, error() {} };
export function migrationTarget(command, env) {
  if (!['up', 'mark-baseline', 'bootstrap-preservation', 'adopt-preservation'].includes(command)) throw new Error('Unknown guarded migration command');
  const url = directMigrationUrl(env.MIGRATION_DATABASE_URL || '');
  if (!env.MIGRATION_EXPECTED_HOST || url.hostname !== env.MIGRATION_EXPECTED_HOST || !env.MIGRATION_EXPECTED_DATABASE || decodeURIComponent(url.pathname.slice(1)) !== env.MIGRATION_EXPECTED_DATABASE || !url.username || decodeURIComponent(url.username) === 'app_rw') throw new Error('Confirm the provider branch endpoint and database using MIGRATION_EXPECTED_HOST and MIGRATION_EXPECTED_DATABASE.');
  if (command === 'mark-baseline' && env.MIGRATION_BASELINE_APPROVED !== baselineName) throw new Error('Baseline marking needs human approval after schema comparison and snapshot; see docs/DATA.md.');
  return url;
}

/** Shared guarded command boundary for the operator CLI and release executor. */
export async function executeMigration(command, env = process.env) {
  const url = migrationTarget(command, env);
  const manifest = loadMigrationManifest();
  let adoption;
  if (command === 'adopt-preservation') {
    adoption = readAdoptionInputs(env);
    verifyAdoptionReference({ ...adoption, baseline: manifest.baseline, targetDump: adoption.referenceDump, pgDumpVersion: adoption.reference.pgDumpVersion });
    if (!adoption.snapshotReference) throw new Error('Snapshot reference required');
  }
  if (command === 'bootstrap-preservation' && env.MIGRATION_BOOTSTRAP_APPROVED !== manifest.baseline.sha256) throw new Error('Explicit baseline hash required for fresh bootstrap');
  const database = new Client({ connectionString: url.toString(), connectionTimeoutMillis: 15000, options: '-c statement_timeout=120000 -c lock_timeout=15000' });
  let locked = false;
  let transaction = false;
  try {
    await database.connect();
    await verifyMigrationIdentity(database, url);
    locked = (await database.query('SELECT pg_try_advisory_lock($1::bigint) AS locked', [migrationLock])).rows[0].locked;
    if (!locked) throw new Error('Another migration is running');
    const state = await readMigrationState(database);
    const hasExistingSchema = async () => (await database.query(`
      SELECT EXISTS (SELECT FROM pg_namespace WHERE nspname NOT IN ('public','pg_catalog','information_schema') AND nspname !~ '^pg_')
        OR EXISTS (SELECT FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_toast%')
        OR EXISTS (SELECT FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_toast%')
        OR EXISTS (SELECT FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_toast%') AS present`)).rows[0].present;
    if (command === 'up' && !state.legacy.length && !state.adoption && await hasExistingSchema()) throw new Error('Baseline adoption required before existing schema migration');
    const settings = { dbClient: database, migrationsSchema: 'migration_meta', createMigrationsSchema: true, direction: 'up', checkOrder: true, singleTransaction: true, log() {}, logger: quiet };
    if (command === 'adopt-preservation') {
      await database.query('BEGIN ISOLATION LEVEL REPEATABLE READ'); transaction = true;
      await database.query('LOCK TABLE public.city_requests, public.covered_cities, public.parking_meters, public.parking_zones, public.reports, public.street_segments IN SHARE MODE');
      const snapshot = (await database.query('SELECT pg_export_snapshot() AS snapshot')).rows[0].snapshot;
      await adoptPreservation(database, manifest, { ...adoption, capture: () => captureSchema(url.toString(), { snapshot }) });
      await database.query('COMMIT'); transaction = false;
      return 'Preservation lineage adopted; schema migrations were not applied.';
    }
    if (command === 'bootstrap-preservation') {
      if (state.legacy.length || state.preservation.length || state.adoption) throw new Error('Fresh empty database required');
      if (await hasExistingSchema()) throw new Error('Fresh empty database required');
      await runner({ ...settings, dir: resolve('sql/migrations'), migrationsTable: 'pgmigrations', count: 1 });
      return 'Unchanged baseline executed and recorded; explicit lineage adoption is still required.';
    }
    const selected = resolveMigrationLineage(manifest, state);
    if (command === 'mark-baseline') {
      if (state.adoption || state.legacy.length || state.preservation.length) throw new Error('Baseline history already exists');
      await runner({ ...settings, dir: resolve('sql/migrations'), migrationsTable: 'pgmigrations', fake: true, file: baselineName, count: 1 });
      return 'Baseline recorded after separate approved schema comparison; schema was not replayed.';
    }
    await runner({ ...settings, dir: resolve(selected.lineage === 'legacy' ? 'sql/migrations' : 'sql/preservation-v1'), migrationsTable: selected.lineage === 'legacy' ? 'pgmigrations' : 'preservation_migrations' });
    const after = await readMigrationState(database);
    if (resolveMigrationLineage(manifest, after).pending.length) throw new Error('Migration history incomplete');
    return `Pending ${selected.lineage} migrations applied.`;
  } finally {
    if (transaction) await database.query('ROLLBACK').catch(() => {});
    if (locked) await database.query('SELECT pg_advisory_unlock($1::bigint)', [migrationLock]).catch(() => {});
    await database.end();
  }
}
