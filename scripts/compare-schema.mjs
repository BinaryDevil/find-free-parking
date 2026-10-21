import { readFileSync } from 'node:fs';

import { normalizeSchema } from './schema-comparison.mjs';

function normalize(file) {
  return normalizeSchema(readFileSync(file, 'utf8'), process.argv[4] === '--application' ? 'application' : 'strict');
}

try {
  if (process.argv.length !== 4 && !(process.argv.length === 5 && process.argv[4] === '--application')) throw new Error('Two schema-only dumps required; optional --application excludes Neon cloud_admin default ACLs.');
  if (normalize(process.argv[2]) !== normalize(process.argv[3])) {
    throw new Error('Schema differs. Review the private dumps with a diff tool; do not mark the baseline.');
  }
  console.log(process.argv[4] === '--application'
    ? 'Application schema matches; Neon cloud_admin default ACLs excluded explicitly. Full database parity is not established.'
    : 'Schema-only dumps match (including ownership, ACLs, functions and defaults).');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
