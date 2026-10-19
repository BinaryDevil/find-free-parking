import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { Pool } from 'pg';
import { runner } from 'node-pg-migrate';
import { classifiedPlaces } from '../lib/classified-places.ts';
import { parseParkingSelection } from '../lib/parking-selection.ts';

const connectionString = process.env.RULES_TEST_DATABASE_URL;
test('isolated replay and parking APIs preserve legacy context and classify approved fixtures', { skip: !connectionString }, async () => {
  const url = new URL(connectionString);
  assert.match(decodeURIComponent(url.pathname.slice(1)), /^parking_rules_test(?:_\d+)?$/);
  assert.equal(url.hostname, process.env.RULES_TEST_EXPECTED_HOST);
  assert.ok(!url.hostname.includes('-pooler'));
  const pool = new Pool({ connectionString, max: 2 });
  const client = await pool.connect();
  const migrate = count => runner({ dbClient: client, dir: 'sql/migrations', migrationsSchema: 'migration_meta', migrationsTable: 'pgmigrations', createMigrationsSchema: true, direction: 'up', ...(count ? { count } : {}), singleTransaction: true, log() {}, logger: { debug() {}, info() {}, warn() {}, error() {} } });
  let hooks;
  try {
    assert.deepEqual((await client.query("SELECT tablename FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema','migration_meta')")).rows, [], 'New empty database on a verified disposable branch only');
    await migrate(3);
    await client.query('SET search_path = public, pg_catalog');
    const source = (await client.query(`INSERT INTO public.evidence_sources (source_key,area,evidence_type,approval_state,approved_by,approved_at,publisher,endpoint,licence,reuse_terms,inventory_doc_path,freshness_limit)
      VALUES ('synthetic-test','Fixture','E1','approved','test',now(),'Official fixture','https://example.invalid','fixture','fixture','fixture',interval '7 days') RETURNING id`)).rows[0].id;
    await client.query(`INSERT INTO public.source_syncs (source_id,started_at,finished_at,status,format_check_passed) VALUES ($1,now()-interval '2 minutes',now()-interval '1 minute','succeeded',true)`, [source]);
    const meter = (await client.query(`INSERT INTO public.parking_meters (pay_station_id,geom,schedules,source_id,source_record_id)
      VALUES ('fixture',ST_SetSRID(ST_MakePoint(0,0),4326),'[{"days":["Mon"],"start":"09:00","end":"18:00","rate":3}]',$1,'legacy-meter') RETURNING *`, [source])).rows[0];
    const street = (await client.query(`INSERT INTO public.street_segments (block_id,street_use,geom,source_id,source_record_id)
      VALUES ('fixture','Residential',ST_GeomFromText('LINESTRING(0 0,0.1 0.1)',4326),$1,'legacy-street') RETURNING *`, [source])).rows[0];
    const zone = (await client.query(`INSERT INTO public.parking_zones (city,type,geom,source_id,source_record_id)
      VALUES ('Fixture','FREE_UNLIMITED',ST_GeomFromText('POLYGON((0 0,0 0.1,0.1 0.1,0 0))',4326),$1,'legacy-lot') RETURNING *`, [source])).rows[0];
    await migrate();
    await client.query('SET search_path = public, pg_catalog');
    for (const [table, row] of [['parking_meters',meter],['street_segments',street],['parking_zones',zone]]) {
      assert.deepEqual((await client.query(`SELECT * FROM public.${table} WHERE id=$1`, [row.id])).rows[0], row, 'Every legacy column is preserved');
    }
    const history = (await client.query('SELECT name,run_on FROM migration_meta.pgmigrations ORDER BY id')).rows;
    assert.equal(history.length, 5);
    await migrate();
    await client.query('SET search_path = public, pg_catalog');
    assert.deepEqual((await client.query('SELECT name,run_on FROM migration_meta.pgmigrations ORDER BY id')).rows, history);
    const place = (await client.query(`INSERT INTO public.places(kind,city,timezone,geom,source_id,source_record_id,fetched_at)
      VALUES ('curb','Fixture','America/Vancouver',ST_GeomFromText('LINESTRING(0 0,0.1 0.1)',4326),$1,'curb',now()-interval '1 minute') RETURNING id`, [source])).rows[0].id;
    await client.query(`INSERT INTO public.parking_rules(place_id,kind,days,start_minute,end_minute,source_id,source_record_id,fetched_at,parsed)
      VALUES ($1,'free',ARRAY[0,1,2,3,4,5,6],0,1440,$2,'permission',now()-interval '1 minute',true)`, [place,source]);
    const selection = parseParkingSelection(new URLSearchParams({ at: '2026-10-12T17:00:00Z', legacyTimeZone: 'America/Vancouver' }));
    const features = await classifiedPlaces(client.query.bind(client), [place], [-1,-1,1,1], selection, new Date());
    assert.equal(features[0].properties.evaluation.classification, 'VERIFIED_FREE', features[0].properties.evaluation.explanation);
    assert.equal(features[0].properties.evaluation.source.id, source);
    const unparsed = (await client.query(`INSERT INTO public.parking_rules(place_id,kind,source_id,source_record_id,fetched_at,raw_data)
      VALUES ($1,'no_parking',$2,'unparsed',now()-interval '1 minute','{"public_sign_text":"unrecognized"}') RETURNING id`, [place,source])).rows[0].id;
    assert.equal((await classifiedPlaces(client.query.bind(client), [place], [-1,-1,1,1], selection, new Date()))[0].properties.evaluation.classification, 'UNKNOWN');
    await client.query('DELETE FROM public.parking_rules WHERE id=$1', [unparsed]); // Only this test's synthetic row.
    await assert.rejects(client.query(`INSERT INTO public.parking_rules(place_id,kind,source_id,source_record_id,fetched_at,parsed)
      VALUES ($1,'free',$2,'missing-schedule',now(),true)`, [place,source]), error => error.code === '23514');
    await client.query('BEGIN');
    try {
      await client.query('GRANT app_rw TO CURRENT_USER');
      await client.query('SET LOCAL ROLE app_rw');
      assert.equal((await classifiedPlaces(client.query.bind(client), [place], [-1,-1,1,1], selection, new Date()))[0].properties.evaluation.classification, 'VERIFIED_FREE');
    } finally { await client.query('ROLLBACK'); }
    // New fixture data cannot open real Coverage. Exercise the actual GET handlers.
    process.env.DATABASE_URL = connectionString;
    delete process.env.DATABASE_URL_POOLED;
    hooks = registerHooks({ resolve(specifier, context, nextResolve) {
      if (specifier.startsWith('@/')) return nextResolve(pathToFileURL(path.resolve(specifier.slice(2) + '.ts')).href, context);
      if (specifier === '../../../lib/db') return nextResolve(pathToFileURL(path.resolve('lib/db.ts')).href, context);
      if (specifier === 'next/server') return nextResolve('next/server.js', context);
      return nextResolve(specifier, context);
    } });
    const { GET } = await import('../app/api/parking/route.ts');
    const { GET: zonesGET } = await import('../app/api/parking/zones/route.ts');
    const result = await GET(new Request(`http://localhost/api/parking?north=1&south=-1&east=1&west=-1&at=2026-10-12T17:00:00Z`));
    assert.equal(result.status, 200);
    const data = await result.json();
    assert.equal(data.meters[0].classification, 'PAID');
    assert.equal(data.streets[0].classification, 'UNKNOWN');
    assert.deepEqual(data.places, []);
    assert.deepEqual(data.coverage, { level:'none' });
    const lots = await zonesGET(new Request('http://localhost/api/parking/zones?bbox=-1,-1,1,1'));
    assert.equal(lots.status, 200);
    assert.equal((await lots.json()).features[0].properties.evaluation.classification, 'UNKNOWN');
    assert.equal((await GET(new Request('http://localhost/api/parking?north=1&south=-1&east=1&west=-1&at=bad'))).status, 400);
    assert.equal((await zonesGET(new Request('http://localhost/api/parking/zones?bbox=-1,-1,1,1&stayMinutes=-1'))).status, 400);
    await client.query(`INSERT INTO public.source_syncs(source_id,status,started_at,finished_at,format_check_passed) VALUES ($1,'failed',now()+interval '1 second',now()+interval '1 second',false)`, [source]);
    assert.equal((await classifiedPlaces(client.query.bind(client), [place], [-1,-1,1,1], selection, new Date()))[0].properties.evaluation.classification, 'UNKNOWN');
    const acl = (await client.query(`SELECT has_table_privilege('app_rw','public.parking_rules','SELECT') AS reads,
      has_table_privilege('app_rw','public.parking_rules','INSERT') AS writes,
      has_table_privilege('app_report_counts','public.places','UPDATE') AS reports_write`)).rows[0];
    assert.deepEqual(acl, { reads:true, writes:false, reports_write:false });
  } finally {
    hooks?.deregister();
    await global._parkingDbPool?.end();
    delete global._parkingDbPool;
    client.release();
    await pool.end();
  }
});
