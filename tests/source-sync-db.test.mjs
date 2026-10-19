import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { runner } from 'node-pg-migrate';
import { syncSource } from '../scripts/source-sync.ts';
import { runScheduledSyncs } from '../scripts/sync-sources.ts';
import { classifiedPlaces } from '../lib/classified-places.ts';
import { fixtureSnapshot } from './fixtures/source-sync.mjs';

const connectionString = process.env.SYNC_TEST_DATABASE_URL;
test('complete syncs are idempotent and failures immediately invalidate approved fixture rules', { skip: !connectionString }, async () => {
  const url = new URL(connectionString);
  assert.match(decodeURIComponent(url.pathname.slice(1)), /^source_sync_test_15(?:_\d+)?$/);
  assert.equal(url.hostname, process.env.SYNC_TEST_EXPECTED_HOST);
  assert.ok(!url.hostname.includes('-pooler'));
  const pool = new Pool({ connectionString, max: 3 });
  const client = await pool.connect();
  try {
    assert.deepEqual((await client.query("SELECT tablename FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema','migration_meta')")).rows, []);
    await runner({ dbClient: client, dir: 'sql/migrations', migrationsSchema: 'migration_meta', migrationsTable: 'pgmigrations', createMigrationsSchema: true,
      direction: 'up', singleTransaction: true, log() {}, logger: { debug() {}, info() {}, warn() {}, error() {} } });
    await client.query('SET search_path = public, pg_catalog');
    const source = (await client.query(`INSERT INTO public.evidence_sources (source_key,area,evidence_type,approval_state,approved_by,approved_at,publisher,endpoint,licence,reuse_terms,inventory_doc_path,freshness_limit)
      VALUES ('synthetic-sync','Fixture','E1','approved','test',now(),'Official fixture','https://example.invalid','fixture','fixture','fixture',interval '7 days') RETURNING *`)).rows[0];
    let snapshot = fixtureSnapshot();
    const adapter = { sourceKey: 'synthetic-sync', area: 'Fixture', evidenceType: 'E1', async fetchSnapshot() { return snapshot; } };
    const run = () => syncSource(pool, source, adapter);
    const first = await run();
    assert.equal(first.status, 'succeeded');
    assert.deepEqual(first.drift, { added: ['curb-a'], changed: [], removed: [], unchanged: 0, rules: { added: 1, updated: 0, removed: 0 } });
    const placeId = (await client.query('SELECT id FROM public.places WHERE source_id=$1', [source.id])).rows[0].id;
    const selection = { instant: new Date('2026-10-14T18:00:00Z'), context: {} };
    const features = () => classifiedPlaces(client.query.bind(client), [placeId], [-1,-1,1,1], selection, new Date());
    assert.equal((await features())[0].properties.evaluation.classification, 'VERIFIED_FREE');
    assert.deepEqual((await run()).drift, { added: [], changed: [], removed: [], unchanged: 1, rules: { added: 0, updated: 1, removed: 0 } });
    assert.equal((await client.query('SELECT id FROM public.places WHERE source_id=$1', [source.id])).rows[0].id, placeId);
    assert.equal((await client.query('SELECT count(*)::int AS n FROM public.parking_rules')).rows[0].n, 1);
    snapshot.places[0].rules[0].timeLimitMinutes = 120;
    assert.deepEqual((await run()).drift.changed, ['curb-a']);
    snapshot = { complete: false, places: [] };
    assert.equal((await run()).status, 'failed');
    assert.equal((await features())[0].properties.evaluation.classification, 'UNKNOWN');
    assert.equal((await client.query('SELECT count(*)::int AS n FROM public.places WHERE removed_at IS NULL')).rows[0].n, 1);
    snapshot = fixtureSnapshot();
    assert.equal((await run()).status, 'succeeded');
    assert.equal((await features())[0].properties.evaluation.classification, 'VERIFIED_FREE');
    snapshot.places = [];
    assert.deepEqual((await run()).drift.removed, ['curb-a']);
    assert.deepEqual(await features(), []);
    assert.equal((await client.query('SELECT count(*)::int AS n FROM public.places')).rows[0].n, 1, 'tombstone preserves history');
    assert.deepEqual((await run()).drift.removed, []);
    snapshot = fixtureSnapshot();
    assert.deepEqual((await run()).drift.added, ['curb-a']);
    assert.equal((await client.query('SELECT id FROM public.places WHERE source_id=$1', [source.id])).rows[0].id, placeId);
    // Remove a single rule without removing its place, then retain ambiguity.
    snapshot.places[0].rules = [];
    assert.equal((await run()).drift.rules.removed, 1);
    assert.equal((await features())[0].properties.evaluation.classification, 'UNKNOWN');
    snapshot = fixtureSnapshot();
    snapshot.places[0].rules[0] = { sourceRecordId: 'unparsed', kind: 'no_parking', parsed: false,
      permissionComplete: false, priority: 0, rawData: { publicSign: 'ambiguous' } };
    await run();
    assert.equal((await features())[0].properties.evaluation.classification, 'UNKNOWN');
    snapshot = fixtureSnapshot();
    await run();
    // SQL failure after a place upsert rolls the entire snapshot back.
    await client.query(`CREATE FUNCTION public.fixture_sync_failure() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN IF NEW.raw_data->>'fail' = 'yes' THEN RAISE EXCEPTION 'private fixture failure'; END IF; RETURN NEW; END $$`);
    await client.query('CREATE TRIGGER fixture_sync_failure BEFORE INSERT OR UPDATE ON public.parking_rules FOR EACH ROW EXECUTE FUNCTION public.fixture_sync_failure()');
    snapshot.places[0].name = 'Must roll back';
    snapshot.places[0].rules[0].rawData = { fail: 'yes' };
    const failed = await run();
    assert.equal(failed.status, 'failed');
    assert.equal((await features())[0].properties.name, null);
    assert.equal((await features())[0].properties.evaluation.classification, 'UNKNOWN');
    const logged = (await client.query('SELECT * FROM public.source_syncs WHERE id=$1', [failed.syncId])).rows[0];
    assert.equal(logged.error, 'Source sync failed; inspect privately');
    assert.equal(logged.records_updated, 0);
    assert.equal(logged.format_check_passed, true);
    assert.deepEqual(logged.drift_report, { applied: false });
    snapshot = fixtureSnapshot();
    await run();
    // Overlap neither fetches again nor writes a false failed/running row.
    let release;
    let entered;
    const fetching = new Promise(resolve => { entered = resolve; });
    const blocking = { ...adapter, async fetchSnapshot() { entered(); await new Promise(resolve => { release = resolve; }); return snapshot; } };
    const active = syncSource(pool, source, blocking);
    await fetching;
    assert.equal((await features())[0].properties.evaluation.classification, 'UNKNOWN', 'running sync invalidates old evidence');
    assert.equal((await run()).status, 'skipped');
    release();
    assert.equal((await active).status, 'succeeded');
    const alertRequests = [];
    const github = async (args, input) => { alertRequests.push({ args, input }); return args.includes('--paginate') ? '[[]]' : '{}'; };
    assert.deepEqual(await runScheduledSyncs(pool, [adapter], github), [], 'fresh daily source is not fetched again');
    await client.query("UPDATE public.source_syncs SET started_at=started_at-interval '2 days', finished_at=finished_at-interval '2 days' WHERE source_id=$1", [source.id]);
    const missing = await runScheduledSyncs(pool, [], github);
    assert.equal(missing[0].status, 'failed', 'approved source without a registered adapter fails closed');
    assert.equal((await features())[0].properties.evaluation.classification, 'UNKNOWN');
    assert.ok(alertRequests.some(r => r.args.includes('POST')));
    await run();
    await client.query("UPDATE public.evidence_sources SET approval_state='pending' WHERE id=$1", [source.id]);
    assert.equal((await run()).status, 'skipped');
    assert.deepEqual(await runScheduledSyncs(pool, [adapter], github), []);
    assert.equal((await features())[0].properties.evaluation.classification, 'UNKNOWN');
    // A temporary-restriction source is due on every half-hour invocation.
    await client.query("UPDATE public.evidence_sources SET approval_state='approved',evidence_type='E5' WHERE id=$1", [source.id]);
    snapshot = fixtureSnapshot();
    snapshot.places[0].rules[0].kind = 'temporary_no_parking';
    const temporaryAdapter = { ...adapter, evidenceType: 'E5' };
    const temp = await runScheduledSyncs(pool, [temporaryAdapter], github);
    assert.equal(temp[0].status, 'succeeded');
    assert.equal((await features())[0].properties.evaluation.classification, 'RESTRICTED');
    assert.equal((await runScheduledSyncs(pool, [temporaryAdapter], github))[0].status, 'succeeded');
    const brokenAdapter = { ...temporaryAdapter, async fetchSnapshot() { throw new Error('private upstream error'); } };
    await assert.rejects(runScheduledSyncs(pool, [brokenAdapter], async () => { throw new Error('GitHub unavailable'); }), /alert delivery/);
    assert.equal((await features())[0].properties.evaluation.classification, 'UNKNOWN');
    const pending = (await client.query("SELECT id FROM public.source_syncs WHERE source_id=$1 AND status='failed' AND alert_reported_at IS NULL", [source.id])).rows;
    assert.equal(pending.length, 1);
    assert.equal((await runScheduledSyncs(pool, [temporaryAdapter], github))[0].status, 'succeeded');
    assert.equal((await client.query('SELECT alert_reported_at IS NOT NULL AS delivered FROM public.source_syncs WHERE id=$1', [pending[0].id])).rows[0].delivered, true);
    // External clock/timer boundaries keep slow-source and batch-budget checks fast.
    const extraAdapters = [];
    for (let n = 0; n < 3; n++) {
      await client.query(`INSERT INTO public.evidence_sources(source_key,area,evidence_type,approval_state,approved_by,approved_at,publisher,endpoint,licence,reuse_terms,inventory_doc_path,freshness_limit)
        SELECT $2,area,'E5',approval_state,approved_by,approved_at,publisher,endpoint,licence,reuse_terms,inventory_doc_path,freshness_limit FROM public.evidence_sources WHERE id=$1`, [source.id,`slow-${n}`]);
      extraAdapters.push({ ...temporaryAdapter, sourceKey: `slow-${n}`, async fetchSnapshot() { return new Promise(() => {}); } });
    }
    const timeout = AbortSignal.timeout.bind(AbortSignal);
    const timerMock = mock.method(AbortSignal, 'timeout', () => timeout(5));
    try {
      const progressed = await runScheduledSyncs(pool, [...extraAdapters,temporaryAdapter], github);
      assert.equal(progressed.filter(r => r.status === 'failed').length, 3);
      assert.equal(progressed.filter(r => r.status === 'succeeded').length, 1);
      assert.equal((await client.query("SELECT count(*)::int AS n FROM public.source_syncs WHERE status='failed' AND alert_reported_at IS NULL")).rows[0].n, 0);
    } finally { timerMock.mock.restore(); }
    const order = [];
    const quickAdapters = [...extraAdapters,temporaryAdapter].map(a => ({ ...a, async fetchSnapshot() { order.push(a.sourceKey); return { complete:true, sourceEditedAt:null, places:[] }; } }));
    let clockCalls = 0;
    const budgetClock = () => clockCalls++ < 2 ? 0 : 19 * 60 * 1000;
    assert.equal((await runScheduledSyncs(pool, quickAdapters, github, budgetClock)).length, 1);
    const firstAttempt = order[0];
    order.length = 0;
    const remaining = await runScheduledSyncs(pool, quickAdapters, github);
    assert.equal(remaining.length, 4);
    assert.notEqual(order[0], firstAttempt, 'oldest untouched source progresses before the previously attempted source');
  } finally { client.release(); await pool.end(); }
});
