import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Pool } from 'pg';
import { runner } from 'node-pg-migrate';
import { adaptVancouverPermitZones, vancouverPermitAdapter } from '../scripts/adapters/vancouver-permit.ts';
import { syncSource } from '../scripts/source-sync.ts';
import { classifiedPlaces } from '../lib/classified-places.ts';
const connectionString = process.env.PERMIT_TEST_DATABASE_URL;
test('fresh PostGIS imports E4 candidates idempotently and named West End probes remain Unknown', {skip:!connectionString}, async () => {
  const url = new URL(connectionString);
  assert.equal(url.hostname,process.env.PERMIT_TEST_EXPECTED_HOST);
  assert.equal(url.pathname,'/permit_adapter_test_29');
  const pool = new Pool({connectionString});
  const client = await pool.connect();
  try {
    assert.deepEqual((await client.query("SELECT tablename FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema','migration_meta')")).rows,[]);
    await runner({dbClient:client,dir:'sql/migrations',migrationsSchema:'migration_meta',migrationsTable:'pgmigrations',createMigrationsSchema:true,direction:'up',singleTransaction:true,log(){},logger:{debug(){},info(){},warn(){},error(){}}});
    await client.query('SET search_path = public, pg_catalog');
    const source = (await client.query(`INSERT INTO public.evidence_sources (source_key,area,evidence_type,approval_state,approved_by,approved_at,publisher,endpoint,licence,reuse_terms,inventory_doc_path,freshness_limit)
      VALUES ('vancouver-permit-zones','Vancouver','E4','approved','synthetic test',now(),'Synthetic fixture','https://example.invalid','fixture','fixture','fixture',interval '7 days') RETURNING *`)).rows[0];
    const layer = JSON.parse(readFileSync(new URL('./fixtures/vancouver-permit/layer.json',import.meta.url)));
    const records = JSON.parse(readFileSync(new URL('./fixtures/vancouver-permit/records.geojson',import.meta.url)));
    const adapter = {...vancouverPermitAdapter,async fetchSnapshot(){return {complete:true,...adaptVancouverPermitZones(layer,records)};}};
    assert.equal((await syncSource(pool,source,adapter)).status,'succeeded');
    assert.equal((await syncSource(pool,source,adapter)).drift.unchanged,records.features.length);
    const ids = (await client.query('SELECT id FROM public.places')).rows.map(r=>r.id);
    for (const [name,lon,lat] of [['1000 Bidwell representative',-123.13686855,49.28819891],['Comox/Bute',-123.13123262895633,49.28319052114935]]) {
      const features = await classifiedPlaces(client.query.bind(client),ids,[lon-0.000001,lat-0.000001,lon+0.000001,lat+0.000001],{instant:new Date(),context:{}},new Date());
      assert.ok(features.some(f=>f.properties.name==='RPP025 · West End Plateau'),name);
      assert.ok(features.every(f=>f.properties.evaluation.classification==='UNKNOWN'),name);
    }
    assert.deepEqual(await classifiedPlaces(client.query.bind(client),ids,[-123.2,49.2,-123.2,49.2],{instant:new Date(),context:{}},new Date()),[]);
  } finally {client.release();await pool.end();}
});
