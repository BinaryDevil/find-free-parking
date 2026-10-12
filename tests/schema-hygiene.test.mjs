import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Client } from 'pg';
import { runner } from 'node-pg-migrate';

const connectionString = process.env.HYGIENE_TEST_DATABASE_URL;
test('schema hygiene preserves reports, checks dependencies and limits retention', { skip: !connectionString }, async () => {
  const url = new URL(connectionString);
  assert.match(decodeURIComponent(url.pathname.slice(1)), /^schema_hygiene_test(?:_\d+)?$/);
  assert.equal(url.hostname, process.env.HYGIENE_TEST_EXPECTED_HOST);
  assert.ok(!url.hostname.includes('-pooler'));
  const client = new Client({ connectionString });
  await client.connect();
  const migration = readFileSync('sql/migrations/1791853200000_schema_hygiene.sql', 'utf8');
  const apply = async () => {
    await client.query('BEGIN');
    try { await client.query(migration); await client.query('COMMIT'); }
    catch (error) { await client.query('ROLLBACK'); throw error; }
  };
  try {
    assert.deepEqual((await client.query("SELECT tablename FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema','migration_meta')")).rows, [], 'Use a newly provisioned empty disposable database');
    await runner({ dbClient: client, dir: 'sql/migrations', migrationsSchema: 'migration_meta', migrationsTable: 'pgmigrations', createMigrationsSchema: true, direction: 'up', count: 2, singleTransaction: true, log() {}, logger: { debug() {}, info() {}, warn() {}, error() {} } });
    await client.query('SET search_path = public, pg_catalog');
    // Synthetic addresses/coordinates only; no real driver data is read.
    await client.query(`INSERT INTO public.city_requests (city_name,user_ip,location,created_at) VALUES
      ('chain','192.0.2.1, 192.0.2.2',ST_SetSRID(ST_MakePoint(0,0),4326),now()),
      ('invalid','unknown',NULL,now()), ('cidr','192.0.2.0/24',NULL,now()),
      ('bad-first','bad, 192.0.2.1',NULL,now()), ('short','127.1',NULL,now()),
      ('ipv6','2001:db8::1',NULL,now()),
      ('old','192.0.2.1',ST_SetSRID(ST_MakePoint(0,0),4326),now()-interval '91 days')`);
    await client.query(`INSERT INTO public.reports (target_type,target_id,status,reporter_email,user_ip,user_location,created_at,reported_status,reason)
      SELECT 'STREET',gen_random_uuid(),status::public.report_status,'fixture@example.invalid','192.0.2.1',
        ST_SetSRID(ST_MakePoint(0,0),4326),now()-age,'NO_PARKING',age::text FROM
      (VALUES ('OPEN',interval '91 days'),('OPEN',interval '90 days'),('OPEN',interval '89 days'),
              ('RESOLVED',interval '1 day'),('DISMISSED',interval '1 day')) AS f(status,age)`);
    // Historical SPOT rows stop the entire migration without erasing PII.
    const spot = (await client.query("INSERT INTO public.reports (target_type,target_id,reported_status) VALUES ('SPOT',gen_random_uuid(),'NO_PARKING') RETURNING id")).rows[0].id;
    await assert.rejects(apply, /Historical SPOT/);
    assert.equal((await client.query("SELECT user_ip FROM public.city_requests WHERE city_name='chain'")).rows[0].user_ip, '192.0.2.1, 192.0.2.2');
    await client.query('DELETE FROM public.reports WHERE id=$1', [spot]); // Own disposable fixture only.
    // An actual extension default must block RESTRICT removal and roll back.
    await client.query('CREATE TABLE public.extension_fixture (id uuid DEFAULT extensions.uuid_generate_v4())');
    await assert.rejects(apply, error => error.code === '2BP01');
    await client.query('DROP TABLE public.extension_fixture');
    await client.query('CREATE TABLE public.extension_fixture (value bytea DEFAULT extensions.gen_random_bytes(4))');
    await assert.rejects(apply, error => error.code === '2BP01');
    await client.query('DROP TABLE public.extension_fixture');
    await apply();
    assert.deepEqual((await client.query('SELECT city_name,host(user_ip) AS ip FROM public.city_requests ORDER BY city_name')).rows,
      [{ city_name:'bad-first',ip:null },{ city_name:'chain',ip:'192.0.2.1' },{ city_name:'cidr',ip:null },{ city_name:'invalid',ip:null },{ city_name:'ipv6',ip:'2001:db8::1' },{ city_name:'old',ip:'192.0.2.1' },{ city_name:'short',ip:null }]);
    assert.deepEqual((await client.query("SELECT enumlabel FROM pg_enum WHERE enumtypid='public.target_type'::regtype ORDER BY enumsortorder")).rows.map(r => r.enumlabel), ['ZONE','METER','STREET']);
    assert.equal((await client.query("SELECT count(*)::int AS n FROM pg_extension WHERE extname IN ('uuid-ossp','pgcrypto')")).rows[0].n, 0);
    assert.ok((await client.query("INSERT INTO public.city_requests (city_name) VALUES ('uuid-still-works') RETURNING id")).rows[0].id);
    assert.equal((await client.query("SELECT has_function_privilege('app_rw','public.clear_expired_pii()','EXECUTE') AS allowed")).rows[0].allowed, false);
    await client.query('BEGIN');
    // Membership exists only in this transaction on the disposable branch.
    await client.query('GRANT pii_retention_executor TO CURRENT_USER');
    await client.query("UPDATE public.reports SET created_at=now()-interval '90 days' WHERE reason='90 days'");
    await client.query('SET LOCAL ROLE pii_retention_executor');
    await client.query('SELECT * FROM public.clear_expired_pii()');
    await client.query('RESET ROLE');
    const reports = (await client.query('SELECT status,reporter_email,user_ip,user_location FROM public.reports ORDER BY created_at')).rows;
    assert.equal(reports.length, 5);
    for (const r of reports.slice(0,2)) { assert.equal(r.user_ip,null); assert.equal(r.user_location,null); assert.equal(r.reporter_email,'fixture@example.invalid'); }
    assert.ok(reports[2].user_ip && reports[2].user_location);
    assert.equal(reports.find(r => r.status==='RESOLVED').reporter_email,null);
    assert.equal(reports.find(r => r.status==='DISMISSED').reporter_email,'fixture@example.invalid');
    assert.deepEqual((await client.query("SELECT user_ip,location FROM public.city_requests WHERE city_name='old'")).rows[0], { user_ip:null,location:null });
    assert.ok((await client.query("SELECT location FROM public.city_requests WHERE city_name='chain'")).rows[0].location);
    assert.deepEqual((await client.query('SELECT * FROM public.clear_expired_pii()')).rows[0], { reports_cleared:'0',requests_cleared:'0' });
    await client.query('ROLLBACK'); // Preserve existing branch role memberships.
  } finally { await client.end(); }
});
