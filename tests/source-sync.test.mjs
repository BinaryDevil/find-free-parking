import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSnapshot } from '../scripts/source-sync.ts';
import { reportSyncFailure, syncConnection } from '../scripts/sync-sources.ts';

import { fixtureSnapshot } from './fixtures/source-sync.mjs';

test('adapter snapshots must be complete, explicit and retain unparsed public records', () => {
  const snapshot = fixtureSnapshot();
  assert.deepEqual(validateSnapshot(snapshot), snapshot);
  for (const mutate of [s => { s.complete = false; }, s => { delete s.places; },
    s => { s.places.push(structuredClone(s.places[0])); },
    s => { delete s.places[0].rules[0].days; }, s => { s.places[0].geom.coordinates[0][0] = 181; },
    s => { s.places[0].timezone = 'invalid'; }, s => { s.sourceEditedAt = '2026-99-99'; },
    s => { delete s.places[0].rawData; }]) {
    const invalid = fixtureSnapshot(); mutate(invalid);
    assert.throws(() => validateSnapshot(invalid), /Invalid adapter snapshot/);
  }
  snapshot.places[0].rules[0] = { sourceRecordId: 'unparsed', kind: 'no_parking', parsed: false,
    permissionComplete: false, priority: 0, rawData: { sign: 'ambiguous public sign' } };
  assert.deepEqual(validateSnapshot(snapshot), snapshot);
});

test('failure alerts update the matching issue without exposing upstream errors', async () => {
  const requests = [];
  const github = async (args, body) => {
    requests.push({ args, body: body && JSON.parse(body) });
    return args.includes('--paginate') ? JSON.stringify([[{ number: 99, body: '<!-- source-sync:00000000-0000-0000-0000-000000000001 -->' }]]) : '{}';
  };
  await reportSyncFailure(github, { sourceId: '00000000-0000-0000-0000-000000000001', syncId: 'run', status: 'failed' });
  assert.ok(requests[1].args.includes('PATCH'));
  assert.ok(requests[1].args.includes('repos/BinaryDevil/find-free-parking/issues/99'));
  assert.match(requests[1].body.body, /Unknown/);
  requests.length = 0;
  await reportSyncFailure(async (args, body) => {
    requests.push({ args, body: body && JSON.parse(body) });
    return args.includes('--paginate') ? '[[]]' : '{}';
  }, { sourceId: '00000000-0000-0000-0000-000000000001', status: 'failed' });
  assert.ok(requests[1].args.includes('POST'));
  assert.deepEqual(requests[1].body.labels, ['needs-triage']);
});

test('sync credentials must name the separately selected direct owner target', () => {
  const env = { SOURCE_SYNC_APPROVED: 'sync-approved-sources', SOURCE_SYNC_DATABASE_URL: 'postgresql://owner:secret@fixture.invalid/source_sync_test',
    SOURCE_SYNC_EXPECTED_HOST: 'fixture.invalid', SOURCE_SYNC_EXPECTED_DATABASE: 'source_sync_test' };
  assert.equal(syncConnection(env).hostname, 'fixture.invalid');
  for (const patch of [{ SOURCE_SYNC_APPROVED: '' }, { SOURCE_SYNC_EXPECTED_HOST: '' }, { SOURCE_SYNC_EXPECTED_DATABASE: 'other' },
    { SOURCE_SYNC_DATABASE_URL: 'postgresql://owner:secret@fixture-pooler.invalid/source_sync_test' }]) {
    assert.throws(() => syncConnection({ ...env, ...patch }), /disabled|direct/);
  }
});
