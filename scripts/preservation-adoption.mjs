import { readFileSync } from 'node:fs';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { normalizeSchema } from './schema-comparison.mjs';
import { baselineName, canonical, digest, resolveMigrationLineage } from './migration-lineage.mjs';

export const dumpOptions = ['--schema-only', '--exclude-schema=migration_meta'];
export function verifyAdoptionReference({ reference, approvedHash, baseline, referenceDump, targetDump, pgDumpVersion }) {
  if (!reference || reference.version !== 1 || reference.provenance !== 'baseline-replay' || !['strict', 'application'].includes(reference.projection) ||
      digest(canonical(reference)) !== approvedHash || reference.baselineHash !== baseline.sha256 ||
      canonical(reference.options) !== canonical(dumpOptions) || reference.pgDumpVersion !== pgDumpVersion ||
      !/^pg_dump \(PostgreSQL\) 17\.\d+(?: .*)?$/.test(pgDumpVersion) ||
      !/^https:\/\/github\.com\/BinaryDevil\/find-free-parking\/(?:pull|issues)\/\d+(?:#issuecomment-\d+)?$/.test(reference.review || '')) throw new Error('Untrusted baseline comparison reference');
  const expected = normalizeSchema(referenceDump, reference.projection);
  if (digest(expected) !== reference.schemaHash || normalizeSchema(targetDump, reference.projection) !== expected) throw new Error('Baseline application schema mismatch');
}

export async function captureSchema(connectionString, { snapshot } = {}) {
  const execute = promisify(execFile);
  const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith('PG')));
  env.PGDATABASE = connectionString;
  const { stdout: version } = await execute('pg_dump', ['--version'], { env });
  const { stdout: dump } = await execute('pg_dump', [...dumpOptions, ...(snapshot ? [`--snapshot=${snapshot}`] : [])], { env, maxBuffer: 16 * 1024 * 1024, timeout: 120000 });
  return { dump, version: version.trim() };
}

export async function readMigrationState(database) {
  const { rows: [tables] } = await database.query("SELECT to_regclass('migration_meta.pgmigrations') AS legacy, to_regclass('migration_meta.preservation_migrations') AS preservation, to_regclass('migration_meta.lineage_adoption') AS adoption");
  const legacy = tables.legacy ? (await database.query('SELECT name FROM migration_meta.pgmigrations ORDER BY id')).rows.map(row => row.name) : [];
  const preservation = tables.preservation ? (await database.query('SELECT name FROM migration_meta.preservation_migrations ORDER BY id')).rows.map(row => row.name) : [];
  const adoptions = tables.adoption ? (await database.query('SELECT * FROM migration_meta.lineage_adoption')).rows : [];
  if ((tables.adoption && adoptions.length !== 1) || adoptions.length > 1 || (tables.preservation && !tables.adoption)) throw new Error('Conflicting lineage metadata');
  return { legacy, preservation, adoption: adoptions[0] ?? null };
}

/** Caller holds the shared migration advisory lock; no migration is implicit here. */
export async function adoptPreservation(database, manifest, { reference, approvedHash, referenceDump, snapshotReference, capture, operationSql }) {
  if (!snapshotReference || typeof snapshotReference !== 'string') throw new Error('Snapshot reference required before adoption');
  const state = await readMigrationState(database);
  const plan = resolveMigrationLineage(manifest, state, { adopt: true });
  if (plan.requiresBaseline) throw new Error('Execute the unchanged baseline on a fresh database before adoption');
  const target = await capture();
  verifyAdoptionReference({ reference, approvedHash, baseline: manifest.baseline, referenceDump, targetDump: target.dump, pgDumpVersion: target.version });
  // Re-read history immediately before the separately authorized metadata write.
  const current = await readMigrationState(database);
  if (canonical(current) !== canonical(state)) throw new Error('History changed during baseline comparison');
  await database.query(operationSql);
  await database.query('INSERT INTO migration_meta.lineage_adoption (lineage, manifest, manifest_hash, baseline_hash, history_hash, reference, snapshot_reference) VALUES ($1,$2,$3,$4,$5,$6,$7)',
    ['preservation-v1', manifest, digest(canonical(manifest)), manifest.baseline.sha256, digest(canonical([baselineName])), reference, snapshotReference]);
}

export function readAdoptionInputs(env = process.env) {
  return {
    reference: JSON.parse(readFileSync(env.MIGRATION_REFERENCE_METADATA, 'utf8')),
    referenceDump: readFileSync(env.MIGRATION_REFERENCE_DUMP, 'utf8'),
    approvedHash: env.MIGRATION_ADOPTION_APPROVED,
    snapshotReference: env.MIGRATION_SNAPSHOT_REFERENCE,
    operationSql: readFileSync('sql/operations/adopt_preservation_v1.sql', 'utf8'),
  };
}
