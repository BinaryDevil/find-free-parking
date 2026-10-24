import { readFileSync } from 'node:fs';
import { executeReconciliation } from './shared-dev-baseline-command.mjs';
import { guardMessages } from './shared-dev-baseline.mjs';

try {
  if (process.argv.length !== 2) throw new Error('No command arguments accepted');
  const approval = JSON.parse(readFileSync(process.env.DEV_BASELINE_APPROVAL, 'utf8'));
  const reference = JSON.parse(readFileSync(process.env.MIGRATION_REFERENCE_METADATA, 'utf8'));
  const referenceDump = readFileSync(process.env.MIGRATION_REFERENCE_DUMP, 'utf8');
  console.log(await executeReconciliation(process.env, { approval, reference, referenceDump }));
} catch (error) {
  // Provider errors and private input paths may contain secrets. Print only fixed guard messages.
  console.error(guardMessages[error?.code]
    ? `${error.code}: ${guardMessages[error.code]}`
    : 'DEV_BASELINE_FAILED: Dev baseline prerequisite failed. Inspect DEV_BASELINE_EVIDENCE_DIR privately if it was created; do not run adoption or replay.');
  process.exitCode = 1;
}
