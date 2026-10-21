import test from 'node:test';
import assert from 'node:assert/strict';
import { authorizeRelease } from '../scripts/release.mjs';
const sha = 'a'.repeat(40);
const manifest = 'b'.repeat(64);
const reference = 'c'.repeat(64);
const file = '1792627200000_foundation.sql';
const pr = { number: 999, merged: true, merge_commit_sha: sha, merged_by: { type: 'User' }, base: { ref: 'main', repo: { full_name: 'BinaryDevil/find-free-parking' } }, head: { ref: 'dev', repo: { full_name: 'BinaryDevil/find-free-parking' } } };
const body = `## Production actions\n- Migration lineage: \`preservation-v1\`\n- Migration manifest: \`${manifest}\`\n- Adoption reference: \`${reference}\`\n- Migration: \`sql/preservation-v1/${file}\`\n\n## Verification\nSnapshot first.`;
test('human release explicitly binds preservation lineage, manifest, adoption reference and exact SQL', () => {
  assert.deepEqual(authorizeRelease([{ ...pr, body }], sha), { number: 999, lineage: 'preservation-v1', manifestHash: manifest, adoptionReference: reference, migrations: [file] });
});

test('malformed, mixed and code-only preservation declarations cannot authorize a write', () => {
  for (const changed of [
    body.replace(`- Migration manifest: \`${manifest}\`\n`, ''),
    body.replace('preservation-v1`\n', 'third-lineage`\n'),
    body.replace('sql/preservation-v1/', 'sql/migrations/'),
    body.replace('## Verification', '- Migration: `sql/elsewhere/1792627200001_other.sql`\n\n## Verification'),
    body.replace('## Verification', 'No automated migrations.\n\n## Verification'),
  ]) assert.throws(() => authorizeRelease([{ ...pr, body: changed }], sha));
});

import { runRelease } from '../scripts/release.mjs';
test('incomplete preservation executor fails closed before target access or snapshot', async () => {
  const release = authorizeRelease([{ ...pr, body }], sha);
  let accessed = false;
  await assert.rejects(runRelease(release, { files: [], plan: [] }, {
    github: async () => '[]', database: { query: async () => { accessed = true; } }, snapshot: async () => { accessed = true; },
  }));
  assert.equal(accessed, false);
});
