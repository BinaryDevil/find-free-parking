import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { verifyAdoptionReference } from './preservation-adoption.mjs';

/** Protected environment values are data, never shell code or public artifacts. */
export function materializeAdoptionReference(env, { approvedHash, baseline }) {
  const metadata = env.PRODUCTION_BASELINE_REFERENCE_METADATA;
  const schema = env.PRODUCTION_BASELINE_REFERENCE_SCHEMA;
  delete env.PRODUCTION_BASELINE_REFERENCE_METADATA;
  delete env.PRODUCTION_BASELINE_REFERENCE_SCHEMA;
  if (!metadata || !schema || !env.RUNNER_TEMP) throw new Error('Reviewed production baseline reference is not provisioned');
  const reference = JSON.parse(metadata);
  verifyAdoptionReference({ reference, approvedHash, baseline, referenceDump: schema, targetDump: schema, pgDumpVersion: reference.pgDumpVersion });
  const directory = mkdtempSync(join(env.RUNNER_TEMP, 'preservation-reference-'));
  const cleanup = () => rmSync(directory, { recursive: true, force: true });
  try {
    const paths = { MIGRATION_REFERENCE_METADATA: join(directory, 'reference.json'), MIGRATION_REFERENCE_DUMP: join(directory, 'baseline.sql') };
    writeFileSync(paths.MIGRATION_REFERENCE_METADATA, metadata, { mode: 0o600, flag: 'wx' });
    writeFileSync(paths.MIGRATION_REFERENCE_DUMP, schema, { mode: 0o600, flag: 'wx' });
    return { paths, cleanup };
  } catch (error) { cleanup(); throw error; }
}
