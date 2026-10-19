import test from 'node:test';
import assert from 'node:assert/strict';
import { authorizeRelease } from '../scripts/release.mjs';

const sha = 'a'.repeat(40);
const file = '1791849600000_evidence_provenance.sql';
const pr = { number: 80, merged: true, merge_commit_sha: sha, merged_by: { type: 'User' }, base: { ref: 'main', repo: { full_name: 'BinaryDevil/find-free-parking' } }, head: { ref: 'dev', repo: { full_name: 'BinaryDevil/find-free-parking' } }, body: `## Production actions\n- Migration: \`sql/migrations/${file}\`\n\n## Rollback\nRedeploy previous deployment.` };
test('only a human-merged dev release authorizes its exact listed migrations', () => {
  assert.deepEqual(authorizeRelease([pr], sha), { number: 80, migrations: [file] });
  for (const change of [{ merged: false }, { merge_commit_sha: 'b'.repeat(40) }, { merged_by: { type: 'Bot' } }, { head: { ...pr.head, ref: 'feature' } }, { body: '## Production actions\nAll migrations' }]) {
    assert.throws(() => authorizeRelease([{ ...pr, ...change }], sha));
  }
  assert.throws(() => authorizeRelease([], sha));
});

import { runRelease } from '../scripts/release.mjs';
test('unlisted pending migrations fail before a snapshot or write and report a redacted failure', async () => {
  const reports = [];
  const deps = {
    github: async (args, input) => { reports.push({ args, input }); return '[]'; },
    database: { query: async sql => ({ rows: sql.includes('pgmigrations') ? [] : [] }) },
    snapshot: async () => { throw new Error('snapshot must not run'); },
    migrate: async () => { throw new Error('migration must not run'); },
    smoke: async () => {},
  };
  await assert.rejects(runRelease({ number: 80, migrations: [] }, { sha, files: [file], plan: [] }, deps));
  assert.ok(reports.some(r => r.input?.includes('Production release failed')));
});

import { smokeProduction, snapshotProduction } from '../scripts/release.mjs';
test('smoke checks require JSON health and feature collections for both cities', async () => {
  const paths = [];
  await smokeProduction(async url => {
    paths.push(new URL(url));
    return { ok: true, json: async () => url.includes('/api/health') ? { ok: true, db: 'up' } : new URL(url).pathname === '/api/parking' ? { meters: [], streets: [], places: [], coverage: {} } : { type: 'FeatureCollection', features: [] } };
  });
  assert.equal(paths.length, 5);
  for (const p of paths.filter(p => p.pathname === '/api/parking')) {
    for (const key of ['north', 'south', 'east', 'west']) assert.ok(p.searchParams.has(key));
  }
  assert.equal(paths.filter(p => p.pathname === '/api/parking/zones').length, 2);
  await assert.rejects(smokeProduction(async () => ({ ok: true, json: async () => ({ ok: false }) })));
});
test('snapshot has the explicit production parent, no compute, and reruns reuse the restore point', async () => {
  let branches = [];
  let writes = 0;
  const neon = async (path, body) => {
    if (body) { writes++; branches = [{ id: 'br-snapshot', name: `snapshot/${sha}`, parent_id: 'br-production', current_state: 'ready' }]; assert.deepEqual(body, { branch: { name: `snapshot/${sha}`, parent_id: 'br-production' } }); return { branch: branches[0] }; }
    if (path.endsWith('br-snapshot')) return { branch: branches[0] };
    return { branches };
  };
  const config = { sha, project: 'test-project', parent: 'br-production' };
  assert.equal(await snapshotProduction(neon, config), 'br-snapshot');
  assert.equal(await snapshotProduction(neon, config), 'br-snapshot');
  assert.equal(writes, 1);
});

test('a post-merge PR edit cannot expand the committed migration plan', async () => {
  const input = [];
  const github = async (args, body) => { if (body) input.push(body); return '[]'; };
  const database = { query: async () => { throw new Error('Must reject before database access'); } };
  await assert.rejects(runRelease({ number: 80, migrations: [file] }, { sha, files: [file], plan: [] }, { github, database }));
  assert.ok(input.some(body => body.includes('Production release failed')));
});
test('snapshot failure prevents migration and does not leak the provider error', async () => {
  const reports = [];
  const database = { query: async () => ({ rows: [{ ledger: null }] }) };
  const github = async (args, body) => { if (body) reports.push(body); return '[]'; };
  let migrated = false;
  await assert.rejects(runRelease({ number: 80, migrations: [] }, { sha, files: [], plan: [] }, {
    github, database, snapshot: async () => { throw new Error('secret-provider-payload'); },
    migrate: async () => { migrated = true; }, smoke: async () => {},
  }));
  assert.equal(migrated, false);
  assert.ok(!reports.join('').includes('secret-provider-payload'));
});

import { releaseForCommit } from '../scripts/release.mjs';
test('commit-associated PR summaries are hydrated before checking the human merger', async () => {
  const github = async args => {
    if (args[1].includes('/commits/')) return JSON.stringify([[{ number: 80, merged_at: '2026-10-19T00:00:00Z', merge_commit_sha: sha }]]);
    assert.equal(args[1], 'repos/BinaryDevil/find-free-parking/pulls/80');
    return JSON.stringify(pr);
  };
  assert.deepEqual(await releaseForCommit(github, sha), { number: 80, migrations: [file] });
});
