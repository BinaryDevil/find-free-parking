import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Client, Pool } from 'pg';
import { runner } from 'node-pg-migrate';
import { importPlaces } from '../scripts/evidence-import.ts';

const primaryUrl = process.env.PRESERVATION_TEST_DATABASE_URL;
const freshUrl = process.env.PRESERVATION_FRESH_TEST_DATABASE_URL;
const quiet = { log() {}, logger: { debug() {}, info() {}, warn() {}, error() {} } };
const foundation = 'sql/preservation-v1/1792627200000_foundation.sql';

async function baseline(client) {
  assert.deepEqual((await client.query("SELECT tablename FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema','migration_meta')")).rows, [], 'Fresh empty disposable database required');
  await runner({ dbClient: client, dir: 'sql/migrations', migrationsSchema: 'migration_meta', migrationsTable: 'pgmigrations', createMigrationsSchema: true, direction: 'up', count: 1, singleTransaction: true, ...quiet });
  await client.query('SET search_path = public, pg_catalog');
}

async function install(client) {
  const sql = readFileSync(foundation, 'utf8');
  await client.query('BEGIN');
  try { await client.query(sql); await client.query('COMMIT'); }
  catch (error) { await client.query('ROLLBACK'); throw error; }
}

async function schema(client) {
  return (await client.query(`SELECT jsonb_build_object(
    'columns', (SELECT jsonb_agg(to_jsonb(c)-'table_catalog'-'udt_catalog'-'domain_catalog'-'collation_catalog' ORDER BY c.table_name,c.ordinal_position) FROM information_schema.columns c WHERE table_schema='public'),
    'relations', (SELECT jsonb_agg(jsonb_build_array(c.relname,c.relkind,c.relacl,pg_get_userbyid(c.relowner)) ORDER BY c.relname) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'),
    'constraints', (SELECT jsonb_agg(jsonb_build_array(c.conrelid::regclass::text,c.conname,pg_get_constraintdef(c.oid)) ORDER BY c.conrelid::regclass::text,c.conname) FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname='public'),
    'indexes', (SELECT jsonb_agg(jsonb_build_array(indexname,indexdef) ORDER BY indexname) FROM pg_indexes WHERE schemaname='public'),
    'functions', (SELECT jsonb_agg(jsonb_build_array(p.proname,pg_get_functiondef(p.oid),p.proacl,pg_get_userbyid(p.proowner)) ORDER BY p.proname,p.oid::regprocedure::text) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND NOT EXISTS(SELECT FROM pg_depend d WHERE d.classid='pg_proc'::regclass AND d.objid=p.oid AND d.deptype='e')),
    'triggers', (SELECT jsonb_agg(jsonb_build_array(t.tgrelid::regclass::text,t.tgname,t.tgenabled,pg_get_triggerdef(t.oid)) ORDER BY t.tgrelid::regclass::text,t.tgname) FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal)
  ) AS value`)).rows[0].value;
}

test('preservation foundation keeps original values and writers while adding the dark evidence model', { skip: !primaryUrl || !freshUrl }, async () => {
  for (const connectionString of [primaryUrl, freshUrl]) {
    const url = new URL(connectionString);
    assert.match(decodeURIComponent(url.pathname.slice(1)), /^preservation_foundation_test(?:_fresh)?$/);
    assert.equal(url.hostname, process.env.PRESERVATION_TEST_EXPECTED_HOST);
    assert.ok(!url.hostname.includes('-pooler'));
  }
  assert.notEqual(primaryUrl, freshUrl, 'Use two separately provisioned empty databases');
  const pool = new Pool({ connectionString: primaryUrl, max: 2 });
  const client = await pool.connect();
  const fresh = new Client({ connectionString: freshUrl });
  await fresh.connect();
  try {
    await baseline(client);
    // Synthetic fixture values only. Preserve even malformed/forwarded text and SPOT history.
    await client.query(`INSERT INTO public.city_requests(city_name,user_ip,location,created_at) VALUES
      ('chain','192.0.2.1, 192.0.2.2',ST_SetSRID(ST_MakePoint(0,0),4326),now()-interval '100 days'),
      ('invalid','unknown',NULL,now()), ('cidr','192.0.2.0/24',NULL,now())`);
    await client.query(`INSERT INTO public.street_segments(block_id,geom,raw_data,report_counts)
      SELECT 'duplicate',ST_GeomFromText('LINESTRING(0 0,1 1)',4326),'{}','{}' FROM generate_series(1,2)`);
    await client.query(`INSERT INTO public.parking_meters(pay_station_id,geom,raw_data)
      SELECT 'duplicate',ST_GeomFromText('POINT(0 0)',4326),'{}' FROM generate_series(1,2)`);
    await client.query(`INSERT INTO public.parking_zones(city,type,geom)
      SELECT 'Fixture','MIXED',ST_GeomFromText('POLYGON((0 0,0 1,1 1,0 0))',4326) FROM generate_series(1,2)`);
    await client.query(`INSERT INTO public.reports(target_type,target_id,status,reporter_email,user_ip,reported_status)
      VALUES ('SPOT',gen_random_uuid(),'RESOLVED','fixture@example.invalid','192.0.2.1','NO_PARKING')`);
    const tables = ['city_requests','reports','street_segments','parking_meters','parking_zones'];
    const before = {};
    for (const table of tables) before[table] = (await client.query(`SELECT * FROM public.${table} ORDER BY id`)).rows;
    const triggersBefore = (await client.query("SELECT tgenabled FROM pg_trigger WHERE tgrelid='public.parking_zones'::regclass AND tgname='set_timestamp_parking_zones'")).rows;
    await install(client);
    for (const table of tables) {
      const columns = Object.keys(before[table][0]);
      assert.deepEqual((await client.query(`SELECT ${columns.map(c => `"${c}"`).join(',')} FROM public.${table} ORDER BY id`)).rows, before[table], `${table}: every original field and duplicate unchanged`);
    }
    for (const table of ['street_segments','parking_meters','parking_zones']) {
      assert.equal((await client.query(`SELECT count(*)::int AS n FROM public.${table} WHERE source_id IS NOT NULL OR source_record_id IS NOT NULL OR fetched_at IS NOT NULL OR source_edited_at IS NOT NULL`)).rows[0].n, 0);
    }
    assert.deepEqual((await client.query("SELECT tgenabled FROM pg_trigger WHERE tgrelid='public.parking_zones'::regclass AND tgname='set_timestamp_parking_zones'")).rows, triggersBefore);
    assert.deepEqual((await client.query("SELECT enumlabel FROM pg_enum WHERE enumtypid='public.target_type'::regtype ORDER BY enumsortorder")).rows.map(r => r.enumlabel), ['ZONE','SPOT','METER','STREET']);
    assert.equal((await client.query("SELECT data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='city_requests' AND column_name='user_ip'")).rows[0].data_type, 'text');
    assert.equal((await client.query("SELECT count(*)::int AS n FROM pg_extension WHERE extname IN ('uuid-ossp','pgcrypto')")).rows[0].n, 2);
    assert.ok((await client.query('SELECT extensions.uuid_generate_v4() AS id, extensions.gen_random_bytes(4) AS bytes')).rows[0].id);
    assert.equal((await client.query('SELECT count(*)::int AS n FROM public.evidence_sources')).rows[0].n, 0);
    assert.equal((await client.query("SELECT count(*)::int AS n FROM public.coverage_areas WHERE level='none'")).rows[0].n, 24);
    assert.equal((await client.query('SELECT count(*)::int AS n FROM public.coverage_area_sources')).rows[0].n, 0);
    assert.equal((await client.query('SELECT count(*)::int AS n FROM public.legacy_retirements')).rows[0].n, 0);
    await baseline(fresh);
    // A conflicting preexisting capability role must roll back the entire install.
    for (const grant of [
      'ALTER ROLE pii_retention_executor LOGIN',
      'GRANT pii_retention_executor TO app_rw',
      'GRANT SELECT ON public.reports TO pii_retention_executor',
      'GRANT CREATE ON SCHEMA public TO pii_retention_executor',
      'ALTER SCHEMA public OWNER TO pii_retention_executor',
      'GRANT EXECUTE ON FUNCTION extensions.uuid_generate_v4() TO pii_retention_executor',
      "CREATE FUNCTION public.role_probe() RETURNS int LANGUAGE sql AS 'SELECT 1'; ALTER FUNCTION public.role_probe() OWNER TO pii_retention_executor",
      'GRANT CREATE ON DATABASE preservation_foundation_test_fresh TO pii_retention_executor',
      'GRANT TEMPORARY ON DATABASE preservation_foundation_test_fresh TO pii_retention_executor',
      'ALTER DATABASE preservation_foundation_test_fresh OWNER TO pii_retention_executor',
      'CREATE SCHEMA role_probe; CREATE TABLE role_probe.private_fixture(value int); GRANT SELECT ON role_probe.private_fixture TO pii_retention_executor',
    ]) {
      await fresh.query('BEGIN');
      try {
        await fresh.query(grant);
        await fresh.query('SAVEPOINT rejected_install');
        await assert.rejects(fresh.query(readFileSync(foundation, 'utf8')), /Existing retention role/, grant);
        await fresh.query('ROLLBACK TO SAVEPOINT rejected_install');
        assert.equal((await fresh.query("SELECT to_regclass('public.evidence_sources') AS relation")).rows[0].relation, null, 'Rejected role leaves no partial foundation');
      } finally { await fresh.query('ROLLBACK'); }
    }
    await install(fresh);
    assert.deepEqual(await schema(client), await schema(fresh), 'Fresh replay and baseline-populated installation produce the same application schema');
    await client.query('SET ROLE app_rw');
    try {
      await client.query("INSERT INTO public.city_requests(city_name,user_ip) VALUES ('old-writer','192.0.2.1, 192.0.2.2')");
      await client.query("INSERT INTO public.reports(target_type,target_id,reported_status) VALUES ('SPOT',gen_random_uuid(),'FREE')");
      await assert.rejects(client.query('SELECT * FROM public.clear_expired_pii()'), error => error.code === '42501');
      await assert.rejects(client.query("UPDATE public.evidence_sources SET approval_state='approved'"), error => error.code === '42501');
    } finally { await client.query('RESET ROLE'); }
    // Old explicit-column imports still succeed without invented provenance.
    await client.query("INSERT INTO public.parking_meters(pay_station_id,geom) VALUES ('old-import',ST_GeomFromText('POINT(0 0)',4326))");
    assert.equal((await client.query("SELECT source_id FROM public.parking_meters WHERE pay_station_id='old-import'")).rows[0].source_id, null);
    // Synthetic source approval only, in this disposable DB. Licence is optional metadata.
    const sourceId = (await client.query(`INSERT INTO public.evidence_sources
      (source_key,area,evidence_type,publisher,endpoint,approval_state,approved_by,approved_at,freshness_limit,inventory_doc_path)
      VALUES ('fixture','Fixture','E2','Fixture authority','https://example.invalid','approved','Fixture author + independent reviewer',now(),interval '7 days','tests/fixtures') RETURNING id`)).rows[0].id;
    const record = { sourceRecordId: 'meter-1', payStationId: 'new-import', geom: { type: 'Point', coordinates: [0,0] } };
    const input = { sourceId, table: 'parking_meters', records: [record] };
    const first = await importPlaces(pool, input);
    const second = await importPlaces(pool, input);
    assert.equal(first.added, 1);
    assert.equal(second.added, 0);
    assert.deepEqual(first.placeIds, second.placeIds);
    await assert.rejects(client.query("UPDATE public.parking_meters SET source_record_id='half-identity' WHERE pay_station_id='old-import'"), error => error.code === '23514');
    await assert.rejects(client.query("INSERT INTO public.evidence_sources(source_key,area,evidence_type,approval_state,freshness_limit) VALUES ('unreviewed','Fixture','E1','approved',interval '7 days')"), error => error.code === '23514');
    await assert.rejects(client.query("INSERT INTO public.parking_rules(place_id,kind,source_id,source_record_id,fetched_at,parsed) VALUES (gen_random_uuid(),'free',$1,'bad',now(),true)", [sourceId]), error => error.code === '23514');
    assert.deepEqual((await client.query(`SELECT has_function_privilege('app_rw','public.clear_expired_pii()','EXECUTE') AS app,
      has_table_privilege('pii_retention_executor','public.reports','SELECT') AS direct_read,
      has_function_privilege('pii_retention_executor','public.clear_expired_pii()','EXECUTE') AS executor`)).rows[0], { app: false, direct_read: false, executor: true });
    const capability = (await client.query("SELECT prosecdef,proconfig,pg_get_userbyid(proowner) AS owner FROM pg_proc WHERE oid='public.clear_expired_pii()'::regprocedure")).rows[0];
    assert.deepEqual(capability, { prosecdef: true, proconfig: ['search_path=pg_catalog'], owner: 'find-free-parking-db_owner' });
    // A frozen transaction clock checks inclusive 90-day and email-any-age policy.
    await client.query('BEGIN');
    try {
      await client.query(`INSERT INTO public.reports(target_type,target_id,status,reporter_email,user_ip,created_at,reason,reported_status)
        SELECT 'SPOT',gen_random_uuid(),state::public.report_status,'fixture@example.invalid','192.0.2.1',now()-age,label,'NO_PARKING'
        FROM (VALUES ('OPEN',interval '90 days','boundary'),('DISMISSED',interval '89 days','young'),('RESOLVED',interval '1 day','resolved')) f(state,age,label)`);
      await client.query('SET LOCAL ROLE pii_retention_executor');
      await client.query('SELECT * FROM public.clear_expired_pii()');
      await client.query('RESET ROLE');
      const retained = (await client.query("SELECT reason,user_ip IS NULL AS ip_cleared,reporter_email IS NULL AS email_cleared FROM public.reports WHERE reason IN ('boundary','young','resolved') ORDER BY reason")).rows;
      assert.deepEqual(retained, [{ reason: 'boundary', ip_cleared: true, email_cleared: false },{ reason: 'resolved', ip_cleared: false, email_cleared: true },{ reason: 'young', ip_cleared: false, email_cleared: false }]);
      assert.equal((await client.query("SELECT user_ip FROM public.city_requests WHERE city_name='chain'")).rows[0].user_ip, null);
      assert.deepEqual((await client.query('SELECT * FROM public.clear_expired_pii()')).rows[0], { reports_cleared: '0', requests_cleared: '0' });
    } finally { await client.query('ROLLBACK'); }
    assert.equal((await client.query("SELECT user_ip FROM public.city_requests WHERE city_name='chain'")).rows[0].user_ip, '192.0.2.1, 192.0.2.2', 'Only explicit disposable retention invocation changed values, rolled back for proof');
  } finally {
    await fresh.end();
    client.release();
    await pool.end();
  }
});
