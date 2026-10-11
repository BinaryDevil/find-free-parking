import { readFileSync } from 'node:fs';

// Use the same pg_dump version/options for both schema-only inputs. Exclude
// migration_meta at capture time; never filter application objects here.
function normalize(file) {
  let sql = readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
  if (process.argv[4] === '--application') {
    // Explicit provider-only projection. Report this exclusion; do not label
    // this result full database parity. Application default ACLs remain checked.
    sql = sql.replace(/--\n-- Name: DEFAULT PRIVILEGES FOR (?:SEQUENCES|TABLES); Type: DEFAULT ACL; Schema: public; Owner: cloud_admin\n--\n\nALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT [^;]+;\n\n\n/g, '');
  }
  return sql
    .replace(/^\\(?:un)?restrict .*\n/gm, '')
    .replace(/^-- Dumped (?:from database|by pg_dump) version .*\n/gm, '')
    .trim();
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
