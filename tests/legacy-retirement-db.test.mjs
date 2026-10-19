import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { Pool } from 'pg';
import { runner } from 'node-pg-migrate';
import { inspectRetirement, runLegacyRetirement, retirementTables } from '../scripts/legacy-retirement.ts';

const connectionString = process.env.LEGACY_RETIREMENT_TEST_DATABASE_URL;
test('disposable archival preserves historical bytes and public readers, fails closed, and reverses explicitly', { skip: !connectionString }, async () => {
  const url = new URL(connectionString);
  assert.equal(url.pathname, '/legacy_retirement_test');
  assert.equal(url.hostname, process.env.LEGACY_RETIREMENT_TEST_EXPECTED_HOST);
  assert.ok(!url.hostname.includes('-pooler'));
  const pool = new Pool({ connectionString, max: 2 });
  const client = await pool.connect();
  const q = client.query.bind(client);
  let hooks;
  try {
    assert.deepEqual((await q("SELECT tablename FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema')")).rows, [], 'Fresh empty disposable database required');
    await runner({ dbClient: client, dir:'sql/migrations', migrationsSchema:'migration_meta', migrationsTable:'pgmigrations', createMigrationsSchema:true, direction:'up', singleTransaction:true, log(){}, logger:{debug(){},info(){},warn(){},error(){}} });
    await q('SET search_path = public, pg_catalog');
    const area = (await q(`INSERT INTO coverage_areas(name,slug,timezone,geom,level,declared_subset,subset_geom)
      VALUES ('Fixture','retirement-fixture','America/Vancouver',ST_MakeEnvelope(0,0,10,10,4326),'partial','Synthetic exact subset',ST_MakeEnvelope(1,1,2,2,4326)) RETURNING id`)).rows[0].id;
    const source = (await q(`INSERT INTO evidence_sources(source_key,area,evidence_type,approval_state,approved_by,approved_at,publisher,endpoint,licence,reuse_terms,inventory_doc_path,freshness_limit)
      VALUES ('retirement-fixture','Fixture','E1','approved','synthetic fixture',now(),'Synthetic official fixture','https://example.invalid','fixture','fixture','fixture',interval '7 days') RETURNING id`)).rows[0].id;
    const sync = (await q(`INSERT INTO source_syncs(source_id,started_at,finished_at,status,format_check_passed,records_added)
      VALUES ($1,now()-interval '2 minutes',now()-interval '1 minute','succeeded',true,1) RETURNING id`,[source])).rows[0].id;
    await q(`UPDATE source_syncs SET drift_report = '{"added":["synthetic-curb"],"changed":[],"removed":[],"unchanged":0,"rules":{"added":1,"updated":0,"removed":0}}'::jsonb WHERE id=$1`,[sync]);
    await q('INSERT INTO coverage_area_sources(area_id,source_id,covers_entire_area) VALUES ($1,$2,true)',[area,source]);
    const place = (await q(`INSERT INTO places(kind,city,timezone,geom,source_id,source_record_id,fetched_at)
      VALUES ('curb','Fixture','America/Vancouver',ST_GeomFromText('LINESTRING(1.2 1.2,1.8 1.8)',4326),$1,'synthetic-curb',now()-interval '1 minute') RETURNING id`,[source])).rows[0].id;
    await q(`INSERT INTO parking_rules(place_id,kind,days,start_minute,end_minute,source_id,source_record_id,fetched_at,parsed,permission_complete)
      VALUES ($1,'free',ARRAY[0,1,2,3,4,5,6],0,1440,$2,'synthetic-rule',now()-interval '1 minute',true,true)`,[place,source]);
    // All three historical cohorts include duplicates and outside context. Crossings retire as a whole.
    await q(`INSERT INTO parking_meters(source_id,source_record_id,geom,raw_data,schedules) SELECT $1,gen_random_uuid()::text, ST_SetSRID(ST_Point(1.5,1.5),4326),'{"fixture":true}', '[{"unknown":true}]' FROM generate_series(1,1001)`,[source]);
    await q(`INSERT INTO parking_meters(source_id,source_record_id,geom) VALUES ($1,gen_random_uuid()::text,ST_SetSRID(ST_Point(3,3),4326))`,[source]);
    await q(`INSERT INTO street_segments(source_id,source_record_id,geom) SELECT $1,gen_random_uuid()::text,g FROM (VALUES (ST_GeomFromText('LINESTRING(1.1 1.1,1.9 1.9)',4326)),(ST_GeomFromText('LINESTRING(1.5 1.5,3 3)',4326)),(ST_GeomFromText('LINESTRING(3 3,4 4)',4326))) AS x(g)`,[source]);
    await q(`INSERT INTO parking_zones(source_id,source_record_id,city,type,geom) SELECT $1,gen_random_uuid()::text,'Fixture','FREE_UNLIMITED',ST_MakeEnvelope(1.1,1.1,1.9,1.9,4326) FROM generate_series(1,201)`,[source]);
    await q(`INSERT INTO parking_zones(source_id,source_record_id,city,type,geom) VALUES ($1,gen_random_uuid()::text,'Fixture','FREE_UNLIMITED',ST_MakeEnvelope(3,3,4,4,4326))`,[source]);
    const rows = async () => Object.fromEntries(await Promise.all(retirementTables.map(async table => [table,(await q(`SELECT id,to_jsonb(p)::text AS bytes FROM ${table} p ORDER BY id`)).rows])));
    let before = await rows();
    const reportTarget = before.parking_meters[0].id;
    await q(`INSERT INTO reports(target_type,target_id,reported_status) VALUES ('METER',$1,'BROKEN')`,[reportTarget]);
    before = await rows();
    const reportsBefore = (await q('SELECT to_jsonb(r)::text AS bytes FROM reports r ORDER BY id')).rows;
    process.env.DATABASE_URL = connectionString;
    delete process.env.DATABASE_URL_POOLED;
    hooks = registerHooks({resolve(specifier,context,nextResolve){
      if (/^next\/(server|navigation|link|headers|config)$/.test(specifier)) return nextResolve(specifier+'.js',context);
      if (specifier.startsWith('@/')) return nextResolve(pathToFileURL(path.resolve(specifier.slice(2)+'.ts')).href,context);
      if(specifier.startsWith('.')&&!path.extname(specifier)){const target=new URL(specifier+'.ts',context.parentURL);if(existsSync(target)) return nextResolve(target.href,context);}
      return nextResolve(specifier,context);
    }});
    const {GET:parking} = await import('../app/api/parking/route.ts');
    const {GET:zones} = await import('../app/api/parking/zones/route.ts');
    const parkingRead = async () => {const r=await parking(new Request('http://localhost/api/parking?west=0&south=0&east=5&north=5'));assert.equal(r.status,200);return r.json();};
    const zoneRead = async query => {const r=await zones(new Request('http://localhost/api/parking/zones?'+query));assert.equal(r.status,200);return r.json();};
    assert.equal((await parkingRead()).meters.length,1000);
    assert.equal((await zoneRead('bbox=0,0,5,5&limit=200')).features.length,200);
    const expected = await inspectRetirement(pool,[area]);
    assert.deepEqual(retirementTables.map(t=>expected[t].count),[1001,2,201]);
    const input={action:'retire',retirementId:randomUUID(),approvalRef:'disposable fixture test only',snapshotRef:process.env.LEGACY_RETIREMENT_TEST_SNAPSHOT || 'fixture retained pre-write restore point',expectedDatabase:'legacy_retirement_test',coverageIds:[area],expected,sourceChecks:[{sourceId:source,syncId:sync,fetched:1,accepted:1,quarantined:0,excluded:0}]};
    await assert.rejects(runLegacyRetirement(pool,{...input,snapshotRef:''}),/snapshot/);
    await assert.rejects(runLegacyRetirement(pool,{...input,expectedDatabase:'production'}),/identity/);
    await assert.rejects(runLegacyRetirement(pool,{...input,sourceChecks:[]}),/reconciliation/);
    await assert.rejects(runLegacyRetirement(pool,{...input,sourceChecks:[{...input.sourceChecks[0],fetched:2}]}),/totals/);
    await assert.rejects(runLegacyRetirement(pool,{...input,expected:{...expected,parking_meters:{...expected.parking_meters,count:1002}}}),/drift/);
    await q("UPDATE evidence_sources SET approval_state='pending' WHERE id=$1",[source]);
    await assert.rejects(runLegacyRetirement(pool,input),/approved and current/);
    await q("UPDATE evidence_sources SET approval_state='approved' WHERE id=$1",[source]);
    await runLegacyRetirement(pool,input);
    assert.deepEqual(await rows(),before,'Archive must retain every historical column byte-identically');
    assert.deepEqual((await q('SELECT to_jsonb(r)::text AS bytes FROM reports r ORDER BY id')).rows,reportsBefore);
    const retired = await parkingRead();
    assert.equal(retired.meters.length,1,'Archive exclusion precedes the meter cap');
    assert.equal(retired.streets.length,1);
    assert.deepEqual(retired.places.map(p=>p.properties.id),[place]);
    assert.equal((await zoneRead('bbox=0,0,5,5&limit=200&city=Fixture&type=FREE_UNLIMITED')).features.length,1,'Exclusion precedes zone cap and filters');
    assert.equal((await zoneRead('lat=1.5&lng=1.5&limit=200')).features.length,0,'Point mode excludes retired zones');
    // The previous deployment can keep reading historical columns after additive retirement.
    assert.equal((await q('SELECT id,pay_station_id,meter_head,schedules,raw_data,ST_AsGeoJSON(geom) FROM parking_meters')).rowCount,1002);
    await q("UPDATE evidence_sources SET approval_state='pending' WHERE id=$1",[source]);
    assert.equal((await parkingRead()).meters.length,1,'A failed freshness/approval gate never reopens archived context');
    assert.deepEqual((await parkingRead()).places,[]);
    await runLegacyRetirement(pool,{...input,action:'reverse',coverageIds:[],sourceChecks:[]});
    assert.deepEqual(await rows(),before);
    const reversed = await parkingRead();
    assert.equal(reversed.meters.length,1000);
    assert.ok(reversed.meters.every(m=>m.evaluation.classification==='UNKNOWN'));
    assert.equal((await zoneRead('lat=1.5&lng=1.5&limit=200')).features.length,200);
    await assert.rejects(runLegacyRetirement(pool,{...input,action:'reverse'}),/Active retirement/);
    const privileges=(await q("SELECT has_table_privilege('app_rw','public.legacy_retirements','UPDATE') AS writes,has_table_privilege('app_rw','public.legacy_retirement_members','SELECT') AS reads")).rows[0];
    assert.deepEqual(privileges,{writes:false,reads:true});
  } finally {
    hooks?.deregister();
    await global._parkingDbPool?.end();
    delete global._parkingDbPool;
    client.release();
    await pool.end();
  }
});
