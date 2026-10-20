import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { Client } from 'pg';

const connectionString = process.env.PARKING_COMPAT_TEST_DATABASE_URL;
test('public parking APIs and city navigation preserve the pre-migration trust boundary', { skip: !connectionString, timeout: 180000 }, async () => {
  const url = new URL(connectionString);
  assert.equal(url.hostname, '127.0.0.1', 'Only agent-owned local disposable PostGIS');
  assert.match(url.pathname, /^\/parking_compat_test(?:_\d+)?$/);
  const client = new Client({ connectionString });
  await client.connect();
  let server;
  let serverExit;
  try {
    assert.deepEqual((await client.query("SELECT tablename FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema')")).rows, [], 'Fresh empty database required');
    await client.query(readFileSync('sql/migrations/1791676800000_baseline.sql', 'utf8'));
    await client.query('SET search_path = public, pg_catalog');
    const meter = (await client.query(`INSERT INTO parking_meters(pay_station_id,geom,schedules)
      VALUES ('fixture',ST_SetSRID(ST_MakePoint(0,0),4326),'[{"days":["Mon"],"start":"09:00","end":"18:00","rate":3}]') RETURNING id`)).rows[0].id;
    await client.query(`INSERT INTO street_segments(block_id,geom) VALUES ('fixture',ST_GeomFromText('LINESTRING(-0.1 0,0.1 0)',4326))`);
    await client.query(`INSERT INTO parking_zones(city,type,geom) VALUES ('Fixture','FREE_UNLIMITED',ST_GeomFromText('POLYGON((-0.1 -0.1,0.1 -0.1,0.1 0.1,-0.1 0.1,-0.1 -0.1))',4326))`);
    await client.query(`INSERT INTO reports(target_type,target_id,reported_status,reporter_email,reporter_note,user_ip)
      VALUES ('METER',$1,'FREE','privacy-tripwire@example.invalid','private-report-tripwire','192.0.2.19')`, [meter]);
    const snapshot = async () => {
      const rows = {};
      for (const table of ['parking_meters','street_segments','parking_zones','reports','city_requests','covered_cities']) {
        rows[table] = (await client.query(`SELECT to_jsonb(t) AS row FROM public.${table} t ORDER BY id`)).rows;
      }
      return rows;
    };
    const before = await snapshot();
    const port = process.env.PARKING_COMPAT_TEST_PORT ?? '3179';
    server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--webpack', '--hostname', '127.0.0.1', '--port', port], {
      env: { ...process.env, DATABASE_URL: connectionString, DATABASE_URL_POOLED: connectionString, NEXT_TELEMETRY_DISABLED: '1' }, stdio: 'ignore',
    });
    // Register immediately so cleanup also observes an exit during startup.
    serverExit = new Promise(resolve => server.once('exit', resolve));
    const base = `http://127.0.0.1:${port}`;
    let ready = false;
    for (let i = 0; i < 120; i++) {
      if (server.exitCode !== null) throw new Error('Next server exited before readiness');
      try { if ((await fetch(`${base}/api/health`)).ok) { ready = true; break; } } catch { /* Startup only. */ }
      await delay(500);
    }
    assert.ok(ready, 'Local Next health endpoint must become ready');
    for (const [path, label] of [
      ['/en/vancouver', 'Vancouver: not covered'],
      ['/fr/seattle', 'Seattle : non couverte'],
    ]) {
      const response = await fetch(base + path);
      assert.equal(response.status, 200, path);
      const html = await response.text();
      assert.ok(html.includes(label), path);
      assert.match(html, /name="robots" content="noindex"/);
    }
    assert.equal((await fetch(base + '/en/not-a-known-city')).status, 404);
    const selected = '&at=2026-10-12T17:00:00Z&legacyTimeZone=America%2FVancouver';
    const paths = ['/api/parking?north=1&south=-1&east=1&west=-1', '/api/parking/zones?bbox=-1,-1,1,1', '/api/parking/zones?lat=0&lng=0'];
    const read = async (path) => {
      const response = await fetch(base + path + selected);
      assert.equal(response.status, 200, path);
      const body = await response.json();
      assert.deepEqual(body.coverage, { level: 'none', areas: [] });
      const text = JSON.stringify(body);
      for (const secret of ['privacy-tripwire','private-report-tripwire','192.0.2.19','report_counts']) assert.ok(!text.includes(secret), secret);
      return body;
    };
    for (let pass = 0; pass < 2; pass++) {
      const parking = await read(paths[0]);
      assert.deepEqual(parking.places, []);
      assert.equal(parking.meters[0].classification, 'PAID');
      assert.equal(parking.streets[0].classification, 'UNKNOWN');
      assert.deepEqual(parking.meters[0].evaluation.driverWarnings, []);
      for (const path of paths.slice(1)) {
        const zones = await read(path);
        assert.equal(zones.features[0].properties.classification, 'UNKNOWN');
        assert.deepEqual(zones.features[0].properties.evaluation.driverWarnings, []);
      }
    }
    const outsidePayment = await fetch(base + paths[0] + '&at=2026-10-12T08:00:00Z');
    assert.equal(outsidePayment.status, 200);
    assert.equal((await outsidePayment.json()).meters[0].classification, 'UNKNOWN');
    assert.deepEqual(await snapshot(), before, 'Repeated public reads preserve every baseline row');
    assert.equal((await client.query("SELECT to_regclass('migration_meta.pgmigrations') AS ledger")).rows[0].ledger, null);
    // Installing only the additive aggregate reader must be picked up without a process restart.
    await client.query(readFileSync('sql/migrations/1792021300000_driver_warnings.sql', 'utf8'));
    const migrated = await read(paths[0]);
    assert.deepEqual(migrated.meters[0].evaluation.driverWarnings.map(w => [w.status,w.count]), [['FREE',1]]);
    assert.equal(migrated.meters[0].classification, 'PAID');
    for (const path of paths.slice(1)) await read(path);
    assert.deepEqual(await snapshot(), before);
    // A present but broken reader must fail, rather than silently hiding warnings.
    await client.query('ALTER VIEW public.driver_warnings RENAME COLUMN count TO unavailable_count');
    for (const path of paths) assert.equal((await fetch(base + path + selected)).status, 500);
  } finally {
    if (server) { server.kill('SIGTERM'); await serverExit; }
    await client.end();
  }
});
