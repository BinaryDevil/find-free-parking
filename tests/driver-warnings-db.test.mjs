import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Client } from 'pg';
import { runner } from 'node-pg-migrate';
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { driverWarningsSql } from '../lib/driver-warnings.ts';
import { classifiedPlaces } from '../lib/classified-places.ts';
import { legacyParkingEvaluation } from '../lib/legacy-parking-evaluation.ts';
import { parseParkingSelection } from '../lib/parking-selection.ts';

const connectionString = process.env.WARNINGS_TEST_DATABASE_URL;
test('reports remain dated warnings without changing rules or writing parking rows', { skip: !connectionString }, async () => {
  const url = new URL(connectionString);
  assert.match(decodeURIComponent(url.pathname.slice(1)), /^driver_warnings_test(?:_\d+)?$/);
  assert.equal(url.hostname, process.env.WARNINGS_TEST_EXPECTED_HOST);
  assert.ok(!url.hostname.includes('-pooler'));
  const client = new Client({ connectionString });
  await client.connect();
  let hooks;
  try {
    assert.deepEqual((await client.query("SELECT tablename FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema','migration_meta')")).rows, [], 'New empty database on the verified disposable branch only');
    await runner({ dbClient: client, dir: 'sql/migrations', migrationsSchema: 'migration_meta', migrationsTable: 'pgmigrations', createMigrationsSchema: true, direction: 'up', singleTransaction: true, log() {}, logger: { debug() {}, info() {}, warn() {}, error() {} } });
    await client.query('SET search_path = public, pg_catalog');
    assert.equal((await client.query("SELECT count(*)::int AS n FROM pg_trigger WHERE tgname='trg_update_report_counts'")).rows[0].n, 1, 'Additive migration retains the old writer');
    await assert.rejects(client.query(readFileSync('sql/operations/retire_report_count_trigger.sql', 'utf8')), /Confirm target/);
    await client.query('ROLLBACK');
    await client.query("SET parking.retire_report_counts = 'approved'");
    await client.query(readFileSync('sql/operations/retire_report_count_trigger.sql', 'utf8'));
    const source = (await client.query(`INSERT INTO public.evidence_sources(source_key,area,evidence_type,publisher,endpoint,licence,reuse_terms,inventory_doc_path,freshness_limit)
      VALUES ('warnings-fixture','Fixture','E1','Synthetic fixture','https://example.invalid','fixture','fixture','fixture',interval '7 days') RETURNING id`)).rows[0].id;
    const place = (await client.query(`INSERT INTO public.places(kind,city,timezone,geom,source_id,source_record_id,fetched_at)
      VALUES ('curb','Fixture','America/Vancouver',ST_GeomFromText('LINESTRING(0 0,0.1 0.1)',4326),$1,'curb',now()) RETURNING id`, [source])).rows[0].id;
    const meter = (await client.query(`INSERT INTO public.parking_meters(pay_station_id,geom,schedules,source_id,source_record_id)
      VALUES ('fixture',ST_SetSRID(ST_MakePoint(0,0),4326),'[{"days":["Mon"],"start":"09:00","end":"18:00","rate":3}]',$1,'meter') RETURNING id`, [source])).rows[0].id;
    const street = (await client.query(`INSERT INTO public.street_segments(block_id,geom,source_id,source_record_id) VALUES ('fixture',ST_GeomFromText('LINESTRING(0 0,0.1 0.1)',4326),$1,'street') RETURNING id`, [source])).rows[0].id;
    const zone = (await client.query(`INSERT INTO public.parking_zones(city,type,geom,source_id,source_record_id) VALUES ('Fixture','MIXED',ST_GeomFromText('POLYGON((0 0,0 0.1,0.1 0.1,0 0))',4326),$1,'zone') RETURNING id`, [source])).rows[0].id;
    // A tripwire catches any report-trigger write, even if values would be unchanged.
    await client.query(`CREATE FUNCTION public.reject_fixture_parking_write() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Report wrote a parking row'; END $$`);
    for (const table of ['parking_meters','street_segments','parking_zones','places','parking_rules']) {
      await client.query(`CREATE TRIGGER reject_fixture_write BEFORE UPDATE OR DELETE ON public.${table} FOR EACH ROW EXECUTE FUNCTION public.reject_fixture_parking_write()`);
    }
    await client.query('BEGIN');
    await client.query('GRANT app_rw TO CURRENT_USER');
    await client.query('SET LOCAL ROLE app_rw');
    for (const [target, id] of [['STREET',place],['METER',meter],['STREET',street],['ZONE',zone]]) {
      for (let i = 0; i < 3; i++) await client.query(`INSERT INTO public.reports(target_type,target_id,reported_status) VALUES ($1,$2,'FREE')`, [target,id]);
    }
    await client.query('COMMIT');
    // Age/status/type isolation and exact cutoff use one transaction's stable now().
    await client.query('BEGIN');
    await client.query(`INSERT INTO public.reports(target_type,target_id,reported_status,created_at) VALUES
      ('STREET',$1,'FREE',now()-interval '90 days'), ('STREET',$1,'FREE',now()-interval '91 days'),
      ('STREET',$1,NULL,now()), ('STREET',$1,'invalid',now()), ('METER',$1,'PAID',now()),
      ('STREET',$1,'PAID',now()-interval '1 day')`, [place]);
    await client.query('SET LOCAL ROLE app_rw');
    const selection = parseParkingSelection(new URLSearchParams({ at:'2026-10-12T17:00:00Z', legacyTimeZone:'America/Vancouver' }));
    const result = (await classifiedPlaces(client.query.bind(client), [place], [-1,-1,1,1], selection, new Date()))[0].properties.evaluation;
    assert.equal(result.classification, 'UNKNOWN');
    assert.deepEqual(result.driverWarnings.map(w => [w.status,w.count]), [['FREE',3],['PAID',1]]);
    assert.ok(Number.isFinite(Date.parse(result.driverWarnings[0].latest_at)));
    for (const [kind, table, alias, id, expected] of [['METER','parking_meters','parking_meters',meter,'PAID'],['STREET','street_segments','s',street,'UNKNOWN'],['ZONE','parking_zones','parking_zones',zone,'UNKNOWN']]) {
      const row = (await client.query(`SELECT ${alias}.*, ${driverWarningsSql(kind)} FROM public.${table} ${alias} WHERE ${alias}.id=$1`, [id])).rows[0];
      const evaluation = legacyParkingEvaluation(kind, row, selection).evaluation;
      assert.equal(evaluation.classification, expected);
      assert.equal(evaluation.driverWarnings[0].count, 3);
    }
    await client.query('COMMIT');
    assert.equal((await client.query(`SELECT count(*)::int AS n FROM public.reports`)).rows[0].n,18);
    const acl = (await client.query(`SELECT has_table_privilege('app_rw','public.driver_warnings','SELECT') AS reads,
      has_table_privilege('app_rw','public.driver_warnings','UPDATE') AS writes,
      has_column_privilege('app_rw','public.reports','reporter_email','SELECT') AS email,
      has_column_privilege('app_rw','public.reports','user_location','SELECT') AS location`)).rows[0];
    assert.deepEqual(acl, { reads:true,writes:false,email:false,location:false });
    await client.query('SELECT * FROM public.clear_expired_pii()');
    assert.equal((await client.query('SELECT count(*)::int AS n FROM public.reports')).rows[0].n,18);
    // Real handlers use app_rw and the same report validation/deduplication path.
    process.env.DATABASE_URL = connectionString;
    delete process.env.DATABASE_URL_POOLED;
    hooks = registerHooks({ resolve(specifier, context, nextResolve) {
      if (specifier.startsWith('@/')) return nextResolve(pathToFileURL(path.resolve(specifier.slice(2) + '.ts')).href, context);
      if (specifier.startsWith('../../../lib/')) return nextResolve(pathToFileURL(path.resolve('lib', specifier.split('/').at(-1) + '.ts')).href, context);
      if (specifier === 'next/server') return nextResolve('next/server.js', context);
      return nextResolve(specifier, context);
    } });
    const { Pool } = await import('pg');
    global._parkingDbPool = new Pool({ connectionString, options: '-c role=app_rw', max: 1 });
    const { GET } = await import('../app/api/parking/route.ts');
    const { GET: zonesGET } = await import('../app/api/parking/zones/route.ts');
    const { POST } = await import('../app/api/report/route.ts');
    const post = (id, status) => POST(new Request('http://localhost/api/report', { method:'POST', headers:{ 'content-type':'application/json' }, body:JSON.stringify({ target_id:id,target_type:'METER',reported_status:status }) }));
    assert.equal((await post('invalid','FREE')).status,400);
    for (let i=0;i<3;i++) assert.equal((await post(meter,'NO_PARKING')).status,200);
    const response = await GET(new Request('http://localhost/api/parking?north=1&south=-1&east=1&west=-1&at=2026-10-12T17:00:00Z&legacyTimeZone=America/Vancouver'));
    assert.equal(response.status,200);
    const data = await response.json();
    assert.equal(data.meters[0].classification,'PAID');
    assert.deepEqual(data.meters[0].evaluation.driverWarnings.map(w=>[w.status,w.count]).sort(),[['FREE',3],['NO_PARKING',3]]);
    assert.equal(data.streets[0].classification,'UNKNOWN');
    const zones = await zonesGET(new Request('http://localhost/api/parking/zones?bbox=-1,-1,1,1'));
    assert.equal(zones.status,200);
    assert.equal((await zones.json()).features[0].properties.evaluation.driverWarnings[0].count,3);
    await assert.rejects(client.query(readFileSync('sql/operations/drop_report_count_columns.sql', 'utf8')), /Confirm no column readers/);
    await client.query('ROLLBACK');
    await client.query("SET parking.drop_report_count_columns = 'approved'");
    await client.query(readFileSync('sql/operations/drop_report_count_columns.sql', 'utf8'));
    assert.deepEqual((await client.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND column_name='report_counts'")).rows, []);
    assert.equal((await classifiedPlaces(client.query.bind(client), [place], [-1,-1,1,1], selection, new Date()))[0].properties.evaluation.driverWarnings[0].count, 3);
  } finally {
    hooks?.deregister();
    await global._parkingDbPool?.end();
    delete global._parkingDbPool;
    await client.end();
  }
});
