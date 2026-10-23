import { readFileSync } from 'node:fs';
import { executeReconciliation } from './shared-dev-baseline-command.mjs';

try {
  if (process.argv.length !== 2) throw new Error('No command arguments accepted');
  const approval = JSON.parse(readFileSync(process.env.DEV_BASELINE_APPROVAL, 'utf8'));
  const reference = JSON.parse(readFileSync(process.env.MIGRATION_REFERENCE_METADATA, 'utf8'));
  const referenceDump = readFileSync(process.env.MIGRATION_REFERENCE_DUMP, 'utf8');
  console.log(await executeReconciliation(process.env, { approval, reference, referenceDump }));
} catch {
  // Provider errors and private input paths may contain secrets. Never log them.
  console.error('Dev baseline prerequisite failed. Inspect private evidence; do not run adoption or replay.');
  process.exitCode = 1;
}
