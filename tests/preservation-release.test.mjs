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
import { canonical, digest } from '../scripts/migration-lineage.mjs';
const baseline = { path: 'sql/migrations/1791676800000_baseline.sql', sha256: 'd'.repeat(64) };
const definition = { version: 1, baseline, legacy: [baseline], preservation: [{ path: `sql/preservation-v1/${file}`, sha256: 'e'.repeat(64) }], superseded: [] };
const metadata = { proof: 'reviewed-baseline' };
function execution() {
  const events = [];
  const state = { legacy: ['1791676800000_baseline'], preservation: [], adoption: null };
  const referenceHash = digest(canonical(metadata));
  const release = { number: 999, lineage: 'preservation-v1', manifestHash: digest(canonical(definition)), adoptionReference: referenceHash, migrations: [file] };
  const database = { query: async sql => {
    if (sql.startsWith('SELECT to_regclass')) return { rows: [{ protected: true, ledger: true, legacy: true, preservation: state.preservation.length ? true : null, adoption: state.adoption ? true : null }] };
    if (sql.includes('FROM migration_meta.pgmigrations')) return { rows: state.legacy.map(name => ({ name })) };
    if (sql.includes('FROM migration_meta.preservation_migrations')) return { rows: state.preservation.map(name => ({ name })) };
    if (sql.includes('FROM migration_meta.lineage_adoption')) return { rows: [state.adoption] };
    throw new Error('Unexpected query');
  } };
  const boundaries = { database, github: async () => '[]', readiness: async () => events.push('revision'),
    snapshot: async () => { events.push('snapshot'); return 'retained-snapshot'; },
    preflightAdoption: async () => events.push('comparison'),
    adopt: async ({ snapshotReference }) => { events.push(`adopt:${snapshotReference}`); state.adoption = { lineage: 'preservation-v1', manifest: definition, manifest_hash: release.manifestHash, baseline_hash: baseline.sha256, history_hash: digest(canonical(state.legacy)), reference: metadata }; },
    migrate: async ({ lineage }) => { assert.equal(lineage, 'preservation-v1'); events.push('migrate'); state.preservation = [file.slice(0, -4)]; }, smoke: async () => events.push('smoke') };
  return { events, state, release, boundaries, config: { sha, manifest: definition, plan: { lineage: release.lineage, manifestHash: release.manifestHash, adoptionReference: referenceHash, migrations: [file] } } };
}
test('preservation release separately compares, snapshots, adopts and applies only its selected lineage', async () => {
  const f = execution();
  const result = await runRelease(f.release, f.config, f.boundaries);
  assert.deepEqual(f.events, ['comparison', 'revision', 'snapshot', 'revision', 'adopt:retained-snapshot', 'revision', 'migrate', 'smoke']);
  assert.deepEqual(result.applied, [file]);
  assert.deepEqual(f.state.legacy, ['1791676800000_baseline']);
  f.events.length = 0;
  await runRelease(f.release, f.config, f.boundaries);
  assert.deepEqual(f.events, ['revision', 'snapshot', 'revision', 'migrate', 'smoke'], 'same authorized release retry verifies already recorded adoption without repeating it');
});
test('unauthorized adoption, changed manifests, later history and omitted pending files stop before snapshot', async () => {
  for (const change of ['reference', 'manifest', 'history', 'pending']) {
    const f = execution();
    if (change === 'reference') f.release.adoptionReference = null;
    if (change === 'manifest') f.release.manifestHash = 'a'.repeat(64);
    if (change === 'history') f.state.legacy.push('unknown');
    if (change === 'pending') f.release.migrations = [];
    await assert.rejects(runRelease(f.release, f.config, f.boundaries));
    assert.deepEqual(f.events, []);
  }
});

test('legacy authorization rejects an adopted preservation target before snapshot or migration', async () => {
  const f = execution();
  await f.boundaries.adopt({ snapshotReference: 'existing-snapshot' });
  f.events.length = 0;
  const legacyFile = '1791849600000_evidence_provenance.sql';
  const legacy = { path: `sql/migrations/${legacyFile}`, sha256: 'f'.repeat(64) };
  const manifest = { ...definition, legacy: [baseline, legacy] };
  await assert.rejects(runRelease({ number: 999, migrations: [legacyFile] },
    { sha, manifest, files: [baseline.path.split('/').at(-1), legacyFile], plan: [legacyFile] }, f.boundaries));
  assert.deepEqual(f.events, []);
});
