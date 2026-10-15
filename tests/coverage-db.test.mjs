import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { Pool } from 'pg';
import { runner } from 'node-pg-migrate';
import { coverageAreas, coverageAt } from '../lib/coverage.ts';
import { approvedParkingPlaceIds } from '../lib/approved-parking-coverage.ts';
import { classifiedPlaces } from '../lib/classified-places.ts';
import { parseParkingSelection } from '../lib/parking-selection.ts';

const connectionString = process.env.COVERAGE_TEST_DATABASE_URL;
test('computed Coverage controls public APIs, publication and exact place membership on PostGIS', { skip: !connectionString }, async () => {
  const url = new URL(connectionString);
  assert.match(decodeURIComponent(url.pathname.slice(1)), /^coverage_test_12(?:_\d+)?$/);
  assert.equal(url.hostname, process.env.COVERAGE_TEST_EXPECTED_HOST);
  assert.ok(!url.hostname.includes('-pooler'));
  const pool = new Pool({ connectionString, max: 2 });
  const client = await pool.connect();
  const query = client.query.bind(client);
  let hooks;
  try {
    assert.deepEqual((await query("SELECT tablename FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema','migration_meta')")).rows, [], 'Use a new empty database on the dedicated disposable branch');
    const migrate = () => runner({ dbClient: client, dir: 'sql/migrations', migrationsSchema: 'migration_meta', migrationsTable: 'pgmigrations', createMigrationsSchema: true, direction: 'up', singleTransaction: true, log() {}, logger: { debug() {}, info() {}, warn() {}, error() {} } });
    await migrate();
    await query('SET search_path = public, pg_catalog');
    const history = (await query('SELECT name,run_on FROM migration_meta.pgmigrations ORDER BY id')).rows;
    assert.equal(history.length, 5);
    await migrate();
    await query('SET search_path = public, pg_catalog');
    assert.deepEqual((await query('SELECT name,run_on FROM migration_meta.pgmigrations ORDER BY id')).rows, history);
    const initial = await coverageAreas(query);
    assert.equal(initial.length, 24);
    assert.ok(initial.every(area => area.level === 'none'));
    await assert.rejects(query(`INSERT INTO public.coverage_areas(name,slug,timezone,geom) VALUES ('Bad','bad','not-a-zone',ST_MakeEnvelope(0,0,1,1,4326))`), /IANA/);
    const areaId = (await query(`INSERT INTO public.coverage_areas(name,slug,timezone,geom,level,declared_subset,subset_geom)
      VALUES ('Fixture','fixture','America/Vancouver',ST_MakeEnvelope(0,0,10,10,4326),'partial','Exact fixture curbs',ST_MakeEnvelope(1,1,2,2,4326)) RETURNING id`)).rows[0].id;
    const source = async type => {
      const id = (await query(`INSERT INTO public.evidence_sources(source_key,area,evidence_type,approval_state,approved_by,approved_at,publisher,endpoint,licence,reuse_terms,inventory_doc_path,freshness_limit)
        VALUES ($1,'Fixture',$1,'approved','synthetic test',now(),'Synthetic official fixture','https://example.invalid','fixture','fixture','fixture',interval '7 days') RETURNING id`, [type])).rows[0].id;
      await query(`INSERT INTO public.source_syncs(source_id,started_at,finished_at,status,format_check_passed) VALUES ($1,now()-interval '2 minutes',now()-interval '1 minute','succeeded',true)`, [id]);
      return id;
    };
    const e1 = await source('E1');
    await query('INSERT INTO public.coverage_area_sources(area_id,source_id,covers_entire_area) VALUES ($1,$2,true)', [areaId,e1]);
    const place = async (identity, geom, timezone = 'America/Vancouver', sourceId = e1) => {
      const id = (await query(`INSERT INTO public.places(kind,city,timezone,geom,source_id,source_record_id,fetched_at)
        VALUES ('curb','Fixture',$1,ST_GeomFromText($2,4326),$3,$4,now()-interval '1 minute') RETURNING id`, [timezone,geom,sourceId,identity])).rows[0].id;
      await query(`INSERT INTO public.parking_rules(place_id,kind,days,start_minute,end_minute,source_id,source_record_id,fetched_at,parsed)
        VALUES ($1,'free',ARRAY[0,1,2,3,4,5,6],0,1440,$2,$3,now()-interval '1 minute',true)`, [id,sourceId,identity]);
      return id;
    };
    const inside = await place('inside','LINESTRING(1.2 1.2,1.8 1.8)');
    await place('crosses','LINESTRING(1.2 1.2,3 3)');
    await place('outside','LINESTRING(4 4,5 5)');
    await place('wrong-zone','LINESTRING(1.3 1.3,1.7 1.7)','America/New_York');
    const unlinked = await source('E6');
    await place('unlinked','LINESTRING(1.3 1.3,1.7 1.7)','America/Vancouver',unlinked);
    const bounds = [0,0,10,10];
    assert.deepEqual(await approvedParkingPlaceIds(query,bounds), [inside]);
    assert.equal((await coverageAt(query,[4,4,5,5])).level, 'none');
    assert.equal((await coverageAt(query,[1.4,1.4,1.4,1.4])).areas[0].declaredSubset, 'Exact fixture curbs');
    const selection = parseParkingSelection(new URLSearchParams());
    assert.equal((await classifiedPlaces(query,[inside],bounds,selection,new Date()))[0].properties.evaluation.classification, 'VERIFIED_FREE');
    process.env.DATABASE_URL = connectionString;
    delete process.env.DATABASE_URL_POOLED;
    hooks = registerHooks({ resolve(specifier, context, nextResolve) {
      if (/^next\/(server|navigation|link|headers|config)$/.test(specifier)) return nextResolve(specifier + '.js', context);
      if (specifier.startsWith('@/')) return nextResolve(pathToFileURL(path.resolve(specifier.slice(2) + '.ts')).href, context);
      if (specifier.startsWith('.') && !path.extname(specifier)) {
        const target = new URL(specifier + '.ts', context.parentURL);
        if (existsSync(target)) return nextResolve(target.href, context);
      }
      return nextResolve(specifier, context);
    } });
    const { GET } = await import('../app/api/parking/route.ts');
    const { GET: sitemap } = await import('../app/sitemap.xml/route.ts');
    const { checkCoverage } = await import('../app/actions/coverage.ts');
    const { getCityBySlug } = await import('../lib/cities.ts');
    assert.equal((await getCityBySlug('vancouver')).level, 'none');
    assert.equal((await checkCoverage(4,4)).isCovered, false);
    assert.equal((await checkCoverage(1.5,1.5)).level, 'partial');
    assert.equal((await checkCoverage(NaN,1)).level, 'none');
    const response = await GET(new Request('http://localhost/api/parking?west=0&south=0&east=10&north=10'));
    assert.equal(response.status,200);
    const data = await response.json();
    assert.deepEqual(data.places.map(f => f.properties.id), [inside]);
    assert.equal(data.coverage.areas[0].level, 'partial');
    const xml = await (await sitemap()).text();
    assert.match(xml,/\/en\/fixture/);
    assert.doesNotMatch(xml,/\/vancouver/);
    assert.equal((await coverageAreas(query,new Date(Date.now()+8*86400000))).find(a=>a.id===areaId).level,'none');
    for (const type of ['E2','E4','E5']) {
      const id = await source(type);
      await query('INSERT INTO public.coverage_area_sources(area_id,source_id,covers_entire_area) VALUES ($1,$2,true)',[areaId,id]);
    }
    await query("UPDATE public.coverage_areas SET level='full' WHERE id=$1",[areaId]);
    assert.equal((await getCityBySlug('fixture')).level,'full');
    assert.equal((await checkCoverage(4,4)).level,'full');
    assert.equal((await approvedParkingPlaceIds(query,bounds)).length,3, 'Full area includes complete inside, crossing-subset and outside-subset curbs only');
    const signal = await source('signal');
    await query('INSERT INTO public.coverage_area_sources(area_id,source_id) VALUES ($1,$2)',[areaId,signal]);
    assert.equal((await getCityBySlug('fixture')).level,'none','Signals cannot contribute Coverage');
    await query('DELETE FROM public.coverage_area_sources WHERE area_id=$1 AND source_id=$2',[areaId,signal]); // Own synthetic fixture only.
    await query(`UPDATE public.evidence_sources SET approval_state='pending' WHERE id=$1`,[e1]);
    assert.deepEqual(await approvedParkingPlaceIds(query,bounds), []);
    assert.doesNotMatch(await (await sitemap()).text(),/\/fixture/);
    await query(`UPDATE public.evidence_sources SET approval_state='approved' WHERE id=$1`,[e1]);
    await query(`INSERT INTO public.source_syncs(source_id,started_at,finished_at,status,format_check_passed) VALUES ($1,now(),now(),'failed',false)`,[e1]);
    assert.equal((await coverageAreas(query)).find(a=>a.id===areaId).level,'none');
    assert.deepEqual(await approvedParkingPlaceIds(query,bounds), []);
    const fallback = await (await GET(new Request('http://localhost/api/parking?west=0&south=0&east=10&north=10'))).json();
    assert.deepEqual(fallback.places, []);
    assert.equal(fallback.coverage.level, 'none');
    const acl = (await query(`SELECT has_table_privilege('app_rw','public.coverage_areas','SELECT') AS reads,
      has_table_privilege('app_rw','public.coverage_areas','UPDATE') AS writes`)).rows[0];
    assert.deepEqual(acl,{reads:true,writes:false});
    await query('BEGIN');
    try {
      await query('GRANT app_rw TO CURRENT_USER');
      await query('SET LOCAL ROLE app_rw');
      assert.ok((await coverageAreas(query)).every(a=>a.level==='none'));
    } finally { await query('ROLLBACK'); }
  } finally {
    hooks?.deregister();
    await global._parkingDbPool?.end();
    delete global._parkingDbPool;
    client.release();
    await pool.end();
  }
});
