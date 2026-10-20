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
  await assert.rejects(runRelease({ number: 80, migrations: [file] }, { sha, files: [file, '1791853200000_schema_hygiene.sql'], plan: [file] }, deps));
  assert.ok(reports.some(r => r.input?.includes('Production release failed')));
});

import { smokeProduction, snapshotProduction } from '../scripts/release.mjs';
function smokeBody(url) {
  const request = new URL(url);
  if (request.pathname === '/api/health') return { ok: true, db: 'up' };
  if (request.pathname === '/api/parking') return { meters: [], streets: [], places: [], coverage: { level: 'none', areas: [] } };
  const [minLat, minLng, maxLat, maxLng] = request.searchParams.get('bbox').split(',').map(Number);
  return { mode: 'bbox', bbox: { minLat, minLng, maxLat, maxLng }, count: 0, features: [], coverage: { level: 'none', areas: [] } };
}
test('smoke checks require JSON health and public bbox zone envelopes for both cities', async () => {
  const paths = [];
  await smokeProduction(async (url, options) => {
    const request = new URL(url);
    paths.push(request);
    assert.equal(options.redirect, 'error');
    assert.equal(options.cache, 'no-store');
    assert.ok(options.signal instanceof AbortSignal);
    return { ok: true, json: async () => smokeBody(url) };
  });
  assert.deepEqual(paths.map(path => path.pathname + path.search), [
    '/api/health',
    '/api/parking?north=47.62&south=47.60&east=-122.32&west=-122.35',
    '/api/parking/zones?bbox=47.60,-122.35,47.62,-122.32',
    '/api/parking?north=49.29&south=49.27&east=-123.10&west=-123.14',
    '/api/parking/zones?bbox=49.27,-123.14,49.29,-123.10',
  ]);
  assert.ok(paths.every(path => path.origin === 'https://findfreeparking.info'));
  for (const p of paths.filter(p => p.pathname === '/api/parking')) {
    for (const key of ['north', 'south', 'east', 'west']) assert.ok(p.searchParams.has(key));
  }
  assert.equal(paths.filter(p => p.pathname === '/api/parking/zones').length, 2);
  await assert.rejects(smokeProduction(async () => ({ ok: true, json: async () => ({ ok: false }) })));
});
test('smoke rejects malformed bbox envelopes and HTTP or JSON failures', async () => {
  for (const change of [
    () => ({ type: 'FeatureCollection', features: [] }),
    body => ({ ...body, error: 'Failed to fetch parking zones', mode: undefined }),
    body => ({ ...body, mode: 'point' }),
    body => ({ ...body, features: {} }),
    body => ({ ...body, count: undefined }),
    body => ({ ...body, count: 0.5 }),
    body => ({ ...body, count: 1 }),
    body => ({ ...body, bbox: null }),
    body => ({ ...body, bbox: { ...body.bbox, minLat: '47.6' } }),
    body => ({ ...body, bbox: { ...body.bbox, maxLng: Infinity } }),
    body => ({ ...body, bbox: { ...body.bbox, minLng: 0 } }),
    body => ({ ...body, coverage: null }),
    body => ({ ...body, coverage: { level: 'unknown', areas: [] } }),
    body => ({ ...body, coverage: { level: 'none' } }),
  ]) {
    await assert.rejects(smokeProduction(async url => ({ ok: true, json: async () =>
      new URL(url).pathname === '/api/parking/zones' ? change(smokeBody(url)) : smokeBody(url) })));
  }
  for (let failedRequest = 0; failedRequest < 5; failedRequest++) {
    let request = 0;
    await assert.rejects(smokeProduction(async url => ({ ok: request++ !== failedRequest, json: async () => smokeBody(url) })), /Smoke HTTP failure/);
  }
  await assert.rejects(smokeProduction(async () => ({ ok: true, json: async () => { throw new SyntaxError('Invalid JSON'); } })), /Invalid JSON/);
  await assert.rejects(smokeProduction(async url => ({ ok: true, json: async () =>
    new URL(url).pathname === '/api/parking' ? { meters: [], streets: [], coverage: {} } : smokeBody(url) })), /Smoke response failure/);
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

import { verifyProductionRevision } from '../scripts/release.mjs';
test('migration waits for matching ready deployment and public production revision', async () => {
  const events = [];
  const github = async (args) => {
    if (args[1].includes('/git/ref/')) { events.push('main'); return JSON.stringify({ object: { sha } }); }
    events.push('deployment');
    assert.equal(args[1], `repos/BinaryDevil/find-free-parking/commits/${sha}/status`);
    return JSON.stringify({ sha, statuses: [{ context: 'Vercel', state: 'success' }] });
  };
  const fetcher = async (url, options) => {
    events.push('runtime');
    assert.equal(url, 'https://findfreeparking.info/api/revision');
    assert.equal(options.redirect, 'error');
    assert.equal(options.cache, 'no-store');
    return { ok: true, json: async () => ({ revision: sha, environment: 'production' }) };
  };
  let applied = false;
  await runRelease({ number: 80, migrations: [file] }, { sha, files: [file], plan: [file] }, {
    github: async () => '[]',
    database: { query: async sql => ({ rows: sql.includes('to_regclass') ? [{ ledger: 'present' }] : applied ? [{ name: file.slice(0, -4) }] : [] }) },
    readiness: () => verifyProductionRevision(github, sha, fetcher),
    snapshot: async () => { events.push('snapshot'); return 'br-test'; },
    migrate: async () => { events.push('migrate'); applied = true; }, smoke: async () => {},
  });
  assert.deepEqual(events, ['deployment', 'runtime', 'main', 'snapshot', 'deployment', 'runtime', 'main', 'migrate']);
});

test('absent, pending, failed and stale readiness evidence blocks every migration write', async () => {
  const goodStatus = { sha, statuses: [{ context: 'Vercel', state: 'success' }] };
  const goodRuntime = { revision: sha, environment: 'production' };
  const cases = [
    { status: { sha, statuses: [] } },
    { status: { sha, statuses: [{ context: 'Vercel', state: 'pending' }] } },
    { status: { sha, statuses: [{ context: 'Vercel', state: 'failure' }] } },
    { status: { ...goodStatus, sha: 'b'.repeat(40) } },
    { runtime: { ...goodRuntime, revision: 'b'.repeat(40) } },
    { runtime: { environment: 'production' } },
    { runtime: { ...goodRuntime, environment: 'preview' } },
    { httpOK: false },
    { unavailable: true },
    { missingVerifier: true },
  ];
  for (const fixture of cases) {
    const reports = [];
    let writes = 0;
    const readiness = () => verifyProductionRevision(async () => JSON.stringify(fixture.status ?? goodStatus), sha, async () => {
      if (fixture.unavailable) throw new Error('secret-runtime-error');
      return { ok: fixture.httpOK ?? true, json: async () => fixture.runtime ?? goodRuntime };
    });
    await assert.rejects(runRelease({ number: 80, migrations: [file] }, { sha, files: [file], plan: [file] }, {
      github: async (args, body) => { if (body) reports.push(body); return '[]'; },
      database: { query: async sql => ({ rows: sql.includes('to_regclass') ? [{ ledger: 'present' }] : [] }) },
      ...(fixture.missingVerifier ? {} : { readiness }),
      snapshot: async () => { writes++; return 'br-test'; }, migrate: async () => { writes++; }, smoke: async () => {},
    }));
    assert.equal(writes, 0, JSON.stringify(fixture));
    assert.ok(reports.some(body => body.includes('Production release failed')));
    assert.ok(!reports.join('').includes('secret-runtime-error'));
  }
});

test('revision drift during snapshot readiness prevents migration and reports a redacted failure', async () => {
  const reports = [];
  let liveRevision = sha;
  let migrated = false;
  const github = async args => JSON.stringify(args[1].includes('/git/ref/') ? { object: { sha: liveRevision } } : { sha, statuses: [{ context: 'Vercel', state: 'success' }] });
  await assert.rejects(runRelease({ number: 80, migrations: [file] }, { sha, files: [file], plan: [file] }, {
    github: async (args, body) => { if (body) reports.push(body); return '[]'; },
    database: { query: async sql => ({ rows: sql.includes('to_regclass') ? [{ ledger: 'present' }] : [] }) },
    readiness: () => verifyProductionRevision(github, sha, async () => ({ ok: true, json: async () => ({ revision: liveRevision, environment: 'production' }) })),
    snapshot: async () => { liveRevision = 'b'.repeat(40); return 'br-test'; },
    migrate: async () => { migrated = true; }, smoke: async () => {},
  }));
  assert.equal(migrated, false);
  assert.ok(reports.some(body => body.includes('Production release failed')));
});

test('main moving while the public runtime is checked invalidates write readiness', async () => {
  let currentMain = sha;
  await assert.rejects(verifyProductionRevision(async args => JSON.stringify(
    args[1].includes('/git/ref/') ? { object: { sha: currentMain } } : { sha, statuses: [{ context: 'Vercel', state: 'success' }] }
  ), sha, async () => {
    currentMain = 'b'.repeat(40);
    return { ok: true, json: async () => ({ revision: sha, environment: 'production' }) };
  }));
});


test('code-only release preserves target, snapshot and runtime gates while leaving pending migrations alone', async () => {
  for (const ledger of [null, 'present']) {
    const events = [];
    let migrationCalls = 0;
    const release = authorizeRelease([{ ...pr, body: '## Production actions\nNo automated migrations.' }], sha);
    const result = await runRelease(release, { sha, files: ['1791676800000_baseline.sql', file], plan: [] }, {
      github: async () => '[]',
      database: { query: async sql => { assert.ok(sql.includes('to_regclass')); events.push('target'); return { rows: [{ ledger }] }; } },
      readiness: async () => { events.push('readiness'); },
      snapshot: async () => { events.push('snapshot'); return 'br-code-only'; },
      migrate: async () => { migrationCalls++; },
      smoke: async () => { events.push('smoke'); },
    });
    assert.deepEqual(result, { snapshot: 'br-code-only', applied: [] });
    assert.equal(migrationCalls, 0);
    assert.deepEqual(events, ['target', 'snapshot', 'readiness', 'smoke']);
  }
});


test('code-only runtime or target failures remain redacted and cannot complete the release', async () => {
  for (const failure of ['target', 'readiness', 'smoke']) {
    const reports = [];
    const deps = {
      github: async (args, body) => { if (body) reports.push(body); return '[]'; },
      database: { query: async () => { if (failure === 'target') throw new Error('secret-target'); return { rows: [{ ledger: null }] }; } },
      snapshot: async () => 'br-test',
      readiness: async () => { if (failure === 'readiness') throw new Error('secret-revision'); },
      smoke: async () => { if (failure === 'smoke') throw new Error('secret-smoke'); },
      migrate: async () => assert.fail('Code-only migration forbidden'),
    };
    await assert.rejects(runRelease({ number: 80, migrations: [] }, { sha, files: [file], plan: [] }, deps));
    assert.ok(reports.some(body => body.includes('Production release failed')));
    assert.ok(!reports.join('').includes('secret-'));
  }
});

test('nonempty migration plans retain baseline and unknown-history rejection', async () => {
  for (const fixture of [
    { files: ['1791676800000_baseline.sql', file], plan: ['1791676800000_baseline.sql', file], ledger: null, history: [] },
    { files: [file], plan: [file], ledger: 'present', history: [{ name: '1791676800000_unknown' }] },
  ]) {
    let snapshots = 0;
    let migrations = 0;
    await assert.rejects(runRelease({ number: 80, migrations: fixture.plan }, { sha, files: fixture.files, plan: fixture.plan }, {
      github: async () => '[]',
      database: { query: async sql => ({ rows: sql.includes('to_regclass') ? [{ ledger: fixture.ledger }] : fixture.history }) },
      readiness: async () => {}, snapshot: async () => { snapshots++; },
      migrate: async () => { migrations++; }, smoke: async () => {},
    }));
    assert.equal(snapshots, 0);
    assert.equal(migrations, 0);
  }
});
