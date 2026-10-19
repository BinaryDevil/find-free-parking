import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { Pool } from 'pg';
import { runner } from 'node-pg-migrate';
import { adaptSeattleBlockface, seattleBlockfaceAdapter } from '../scripts/adapters/seattle-blockface.ts';
import { classifiedPlaces } from '../lib/classified-places.ts';
import { parseParkingSelection } from '../lib/parking-selection.ts';

const connectionString = process.env.BLOCKFACE_TEST_DATABASE_URL;
test('Blockface snapshot upserts preserve identities and public APIs keep unapproved Coverage closed', { skip:!connectionString }, async () => {
  const url = new URL(connectionString);
  assert.match(decodeURIComponent(url.pathname.slice(1)), /^seattle_blockface_test_25(?:_\d+)?$/);
  assert.equal(url.hostname, process.env.BLOCKFACE_TEST_EXPECTED_HOST);
  assert.ok(!url.hostname.includes('-pooler'));
  // During the five-ticket batch, #15 can be validated from its separate checkout.
  // Once integrated the default is this checkout. Never copy its runner here.
  const syncRoot = path.resolve(process.env.BLOCKFACE_TEST_SYNC_ROOT || '.');
  const { syncSource } = await import(pathToFileURL(path.join(syncRoot, 'scripts/source-sync.ts')));
  const layer = JSON.parse(readFileSync(new URL('./fixtures/seattle-blockface/layer.json', import.meta.url)));
  const records = JSON.parse(readFileSync(new URL('./fixtures/seattle-blockface/records.geojson', import.meta.url)));
  const snapshot = { complete:true, ...adaptSeattleBlockface(layer, records) };
  const pool = new Pool({ connectionString, max:2 });
  const client = await pool.connect();
  let hooks;
  try {
    assert.deepEqual((await client.query("SELECT tablename FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema','migration_meta')")).rows, [], 'Only a new empty database on the verified disposable branch');
    await runner({ dbClient:client, dir:path.join(syncRoot,'sql/migrations'), migrationsSchema:'migration_meta', migrationsTable:'pgmigrations', createMigrationsSchema:true, direction:'up', singleTransaction:true, log() {}, logger:{ debug() {}, info() {}, warn() {}, error() {} } });
    await client.query('SET search_path=public,pg_catalog');
    const source = (await client.query(`INSERT INTO public.evidence_sources(source_key,area,evidence_type,approval_state,approved_by,approved_at,publisher,endpoint,licence,reuse_terms,inventory_doc_path,freshness_limit)
      VALUES ('synthetic-blockface-25','Fixture','E1','approved','test',now(),'Synthetic Blockface','https://example.invalid','fixture','fixture','fixture',interval '7 days') RETURNING *`)).rows[0];
    const adapter = { ...seattleBlockfaceAdapter, sourceKey:source.source_key, area:source.area, fetchSnapshot:async () => snapshot };
    const first = await syncSource(pool, source, adapter);
    assert.equal(first.status, 'succeeded');
    assert.equal(first.drift.added.length, 28);
    const ids = (await client.query('SELECT id,source_record_id FROM public.places WHERE source_id=$1 ORDER BY source_record_id', [source.id])).rows;
    const ruleIds = (await client.query('SELECT id,source_record_id FROM public.parking_rules WHERE source_id=$1 ORDER BY source_record_id', [source.id])).rows;
    const second = await syncSource(pool, source, adapter);
    assert.equal(second.status, 'succeeded');
    assert.equal(second.drift.unchanged, 28);
    assert.deepEqual((await client.query('SELECT id,source_record_id FROM public.places WHERE source_id=$1 ORDER BY source_record_id', [source.id])).rows, ids);
    assert.deepEqual((await client.query('SELECT id,source_record_id FROM public.parking_rules WHERE source_id=$1 ORDER BY source_record_id', [source.id])).rows, ruleIds);
    const selection = parseParkingSelection(new URLSearchParams({ at:'2026-10-15T17:00:00Z', stayMinutes:'60' }));
    const features = await classifiedPlaces(client.query.bind(client), ids.map(p => p.id), [-123,47,-122,48], selection, new Date());
    assert.equal(features.length, 28);
    assert.ok(features.every(f => f.properties.evaluation.classification === 'UNKNOWN'));
    const stored = (await client.query('SELECT fetched_at,source_edited_at,raw_data FROM public.places WHERE id=$1', [ids[0].id])).rows[0];
    assert.ok(stored.fetched_at instanceof Date);
    assert.equal(stored.source_edited_at.toISOString(), snapshot.sourceEditedAt);
    assert.ok(stored.raw_data.ELMNTKEY);
    const badLayer = structuredClone(layer);
    badLayer.fields = badLayer.fields.filter(f => f.name !== 'WKD_RATE1');
    const failed = await syncSource(pool, source, { ...adapter, fetchSnapshot:async () => ({ complete:true, ...adaptSeattleBlockface(badLayer, records) }) });
    assert.equal(failed.status, 'failed');
    assert.equal((await client.query('SELECT format_check_passed FROM public.source_syncs WHERE id=$1', [failed.syncId])).rows[0].format_check_passed, false);
    assert.deepEqual((await client.query('SELECT id,source_record_id FROM public.places WHERE source_id=$1 ORDER BY source_record_id', [source.id])).rows, ids);
    process.env.DATABASE_URL = connectionString;
    delete process.env.DATABASE_URL_POOLED;
    hooks = registerHooks({ resolve(specifier, context, nextResolve) {
      if (specifier.startsWith('@/')) return nextResolve(pathToFileURL(path.resolve(specifier.slice(2) + '.ts')).href, context);
      if (specifier === '../../../lib/db') return nextResolve(pathToFileURL(path.resolve('lib/db.ts')).href, context);
      if (specifier === 'next/server') return nextResolve('next/server.js', context);
      return nextResolve(specifier, context);
    } });
    const { GET } = await import('../app/api/parking/route.ts');
    const result = await GET(new Request('http://localhost/api/parking?north=48&south=47&east=-122&west=-123&at=2026-10-15T17:00:00Z'));
    assert.equal(result.status, 200);
    const data = await result.json();
    assert.deepEqual(data.places, []);
    assert.deepEqual(data.coverage, { level:'none' });
  } finally {
    hooks?.deregister();
    client.release();
    await pool.end();
    await global._parkingDbPool?.end();
  }
});
