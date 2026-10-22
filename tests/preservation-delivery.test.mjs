import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, statSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { canonical, digest } from '../scripts/migration-lineage.mjs';
import { materializeAdoptionReference } from '../scripts/preservation-reference.mjs';
const schema = 'CREATE TABLE public.synthetic (id int);';
const baseline = { sha256: 'a'.repeat(64) };
const metadata = { version: 1, provenance: 'baseline-replay', baselineHash: baseline.sha256, schemaHash: digest(schema), projection: 'strict', pgDumpVersion: 'pg_dump (PostgreSQL) 17.6', options: ['--schema-only', '--exclude-schema=migration_meta'], review: 'https://github.com/BinaryDevil/find-free-parking/pull/999' };
test('reviewed adoption secrets become private temporary files without shell interpolation and are cleaned', () => {
  const root = mkdtempSync(join(tmpdir(), 'preservation-delivery-test-'));
  const env = { RUNNER_TEMP: root, PRODUCTION_BASELINE_REFERENCE_METADATA: JSON.stringify(metadata), PRODUCTION_BASELINE_REFERENCE_SCHEMA: schema };
  try {
    const result = materializeAdoptionReference(env, { approvedHash: digest(canonical(metadata)), baseline });
    assert.equal(readFileSync(result.paths.MIGRATION_REFERENCE_DUMP, 'utf8'), schema);
    assert.equal(statSync(result.paths.MIGRATION_REFERENCE_DUMP).mode & 0o777, 0o600);
    assert.equal(statSync(result.paths.MIGRATION_REFERENCE_METADATA).mode & 0o777, 0o600);
    assert.equal(env.PRODUCTION_BASELINE_REFERENCE_SCHEMA, undefined);
    result.cleanup();
    assert.equal(existsSync(result.paths.MIGRATION_REFERENCE_DUMP), false);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
test('missing and mismatched reviewed secrets cannot create usable reference files', () => {
  for (const env of [{}, { PRODUCTION_BASELINE_REFERENCE_METADATA: JSON.stringify(metadata), PRODUCTION_BASELINE_REFERENCE_SCHEMA: schema + 'SELECT 1;' }]) {
    assert.throws(() => materializeAdoptionReference(env, { approvedHash: digest(canonical(metadata)), baseline }));
  }
});

import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
test('workflow preparation authorizes the exact release and requests pg_dump only for explicit adoption', () => {
  const sha = 'a'.repeat(40);
  for (const preservation of [false, true]) {
    const root = mkdtempSync(join(tmpdir(), 'preservation-prepare-test-'));
    const bin = join(root, 'bin'); mkdirSync(bin);
    const body = preservation ? `## Production actions\n- Migration lineage: \`preservation-v1\`\n- Migration manifest: \`${'b'.repeat(64)}\`\n- Adoption reference: \`${'c'.repeat(64)}\`\n- Migration: \`sql/preservation-v1/1792627200000_foundation.sql\`\n` : '## Production actions\nNo automated migrations.\n';
    const pr = { number: 999, merged: true, merge_commit_sha: sha, merged_by: { type: 'User' }, base: { ref: 'main', repo: { full_name: 'BinaryDevil/find-free-parking' } }, head: { ref: 'dev', repo: { full_name: 'BinaryDevil/find-free-parking' } }, body };
    writeFileSync(join(bin, 'gh'), `#!${process.execPath}\nconst args=process.argv.slice(2).join(' '); const pr=${JSON.stringify(pr)}; console.log(JSON.stringify(args.includes('/commits/') ? [[{number:999}]] : args.includes('/pulls/') ? pr : {object:{sha:${JSON.stringify(sha)}}}));`, { mode: 0o700 });
    const output = join(root, 'output');
    try {
      const result = spawnSync(process.execPath, [resolve('scripts/release.mjs'), '--prepare'], { encoding: 'utf8', env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, GITHUB_OUTPUT: output, GITHUB_EVENT_NAME: 'push', GITHUB_REF: 'refs/heads/main', GITHUB_REPOSITORY: 'BinaryDevil/find-free-parking', GITHUB_SHA: sha } });
      assert.equal(result.status, 0, result.stderr);
      assert.equal(readFileSync(output, 'utf8'), `needs_pg_dump=${preservation}\n`);
    } finally { rmSync(root, { recursive: true, force: true }); }
  }
});
