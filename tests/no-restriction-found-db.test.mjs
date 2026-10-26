import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Client } from 'pg';
import { runner } from 'node-pg-migrate';

const connectionString = process.env.NRF_TEST_DATABASE_URL;
const quiet = { log() {}, logger: { debug() {}, info() {}, warn() {}, error() {} } };

test('No Restriction Found schema is additive, empty, read-only to the app and enforces two-agent approval', { skip: !connectionString }, async () => {
  assert.equal(new URL(connectionString).pathname, '/nrf_schema_test', 'Use a dedicated empty disposable database');
  const client = new Client({ connectionString });
  await client.connect();
  try {
    assert.deepEqual((await client.query("SELECT tablename FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema','migration_meta')")).rows, [], 'Fresh empty disposable database required');
    await runner({ dbClient: client, dir: 'sql/migrations', migrationsSchema: 'migration_meta', migrationsTable: 'pgmigrations', createMigrationsSchema: true, direction: 'up', count: 1, singleTransaction: true, ...quiet });
    await client.query('SET search_path = public, pg_catalog');
    for (const file of ['1792627200000_foundation', '1792972800000_no_restriction_found']) {
      await client.query('BEGIN');
      await client.query(readFileSync(`sql/preservation-v1/${file}.sql`, 'utf8'));
      await client.query('COMMIT');
    }
    for (const table of ['evidence_source_roles', 'restriction_registers', 'restriction_register_sources']) {
      assert.equal((await client.query(`SELECT count(*)::int AS n FROM public.${table}`)).rows[0].n, 0, `${table} starts empty`);
      const privileges = await client.query(`SELECT privilege_type FROM information_schema.role_table_grants WHERE table_schema='public' AND table_name=$1 AND grantee='app_rw'`, [table]);
      assert.deepEqual(privileges.rows.map(row => row.privilege_type), ['SELECT'], `${table} is read-only to app_rw`);
    }
    const source = (await client.query(`INSERT INTO public.evidence_sources(source_key, area, evidence_type, freshness_limit)
      VALUES ('synthetic-layer', 'Synthetic', 'E1', interval '7 days') RETURNING id`)).rows[0].id;
    const area = (await client.query(`INSERT INTO public.coverage_areas(name, slug, timezone, geom)
      VALUES ('Synthetic', 'synthetic-nrf', 'America/Los_Angeles', ST_GeomFromText('POLYGON((0 0,0 1,1 1,1 0,0 0))', 4326)) RETURNING id`)).rows[0].id;
    const rejects = async (sql, params, pattern) => {
      await client.query('SAVEPOINT attempt');
      await assert.rejects(client.query(sql, params), pattern);
      await client.query('ROLLBACK TO SAVEPOINT attempt');
    };
    await client.query('BEGIN');
    const approved = "approval_state, approved_by, approval_refs, approved_at, inventory_doc_path";
    await rejects(`INSERT INTO public.evidence_source_roles(source_id, role, place_type, ${approved}) VALUES ($1,'parking_layer','street','approved',ARRAY['a'],ARRAY['r1','r2'],now(),'docs/x.md')`, [source], /check constraint/);
    await rejects(`INSERT INTO public.evidence_source_roles(source_id, role, place_type) VALUES ($1,'meter_feed','street')`, [source], /check constraint/);
    await client.query(`INSERT INTO public.evidence_source_roles(source_id, role, place_type, ${approved}) VALUES ($1,'parking_layer','street','approved',ARRAY['a','b'],ARRAY['r1','r2'],now(),'docs/x.md')`, [source]);
    await rejects(`INSERT INTO public.restriction_registers(area_id, version, measurement_ref, measured_at) VALUES ($1, 1, 'm', now())`, [area], /check constraint/);
    await rejects(`INSERT INTO public.restriction_registers(area_id, version, ${approved}) VALUES ($1, 1, 'approved', ARRAY['a','b'], ARRAY['r1'], now(), 'docs/x.md')`, [area], /check constraint/);
    const register = (await client.query(`INSERT INTO public.restriction_registers(area_id, version, ${approved}) VALUES ($1, 1, 'approved', ARRAY['a','b'], ARRAY['r1','r2'], now(), 'docs/x.md') RETURNING id`, [area])).rows[0].id;
    await rejects(`UPDATE public.restriction_registers SET measurement_ref = 'm' WHERE id = $1`, [register], /check constraint/);
    await client.query(`UPDATE public.restriction_registers SET measurement_ref = 'm', measured_at = now() WHERE id = $1`, [register]);
    await rejects(`INSERT INTO public.restriction_register_sources VALUES ($1, 'valet', 'street', $2)`, [register, source], /check constraint/);
    await client.query(`INSERT INTO public.restriction_register_sources VALUES ($1, 'bus_transit', 'street', $2)`, [register, source]);
    await client.query('ROLLBACK');
  } finally {
    await client.end();
  }
});
