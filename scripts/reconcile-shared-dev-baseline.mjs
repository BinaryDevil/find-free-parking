import { readFileSync } from 'node:fs';
import { executeReconciliation } from './shared-dev-baseline-command.mjs';

try {
  if (process.argv.length !== 2) throw new Error('No command arguments accepted');
  const approval = JSON.parse(readFileSync(process.env.DEV_BASELINE_APPROVAL, 'utf8'));
  const reference = JSON.parse(readFileSync(process.env.MIGRATION_REFERENCE_METADATA, 'utf8'));
  const referenceDump = readFileSync(process.env.MIGRATION_REFERENCE_DUMP, 'utf8');
  console.log(await executeReconciliation(process.env, { approval, reference, referenceDump }));
} catch (error) {
  // Provider errors and private input paths may contain secrets. Never log them.
  console.error(error?.code === 'DEV_BASELINE_COMMITTED'
    ? 'Dev prerequisite committed, but final comparison failed. Stop; do not run baseline marking, adoption or replay.'
    : 'Dev baseline prerequisite failed. Inspect private evidence; do not run adoption or replay.');
  process.exitCode = 1;
}
