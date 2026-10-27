import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import net from 'node:net';
import { executeMigration } from '../scripts/migration-command.mjs';

test('migration command rejects unsafe targets and unapproved baseline marking before connecting', () => {
  const base = { ...process.env, MIGRATION_DATABASE_URL: '', MIGRATION_EXPECTED_HOST: '', MIGRATION_EXPECTED_DATABASE: '', MIGRATION_BASELINE_APPROVED: '' };
  const run = (command, env = {}) => spawnSync(process.execPath, ['scripts/migrate.mjs', command], { encoding: 'utf8', env: { ...base, ...env } });
  assert.equal(run('down').status, 1);
  assert.equal(run('up').status, 1);
  const pooled = run('up', { MIGRATION_DATABASE_URL: 'postgres://operator:private@ep-test-pooler.invalid/test' });
  assert.equal(pooled.status, 1);
  assert.match(pooled.stderr, /direct PostgreSQL/);
  assert.ok(!pooled.stderr.includes('private'));
  const direct = { MIGRATION_DATABASE_URL: 'postgres://operator:private@ep-test.invalid/test', MIGRATION_EXPECTED_HOST: 'ep-test.invalid', MIGRATION_EXPECTED_DATABASE: 'test' };
  const mismatch = run('up', { ...direct, MIGRATION_EXPECTED_DATABASE: 'other' });
  assert.equal(mismatch.status, 1);
  assert.match(mismatch.stderr, /Confirm the provider branch/);
  const mark = run('mark-baseline', direct);
  assert.equal(mark.status, 1);
  assert.match(mark.stderr, /human approval/);
  assert.ok(!mark.stderr.includes('private'));
});

test('migration command rejects connection overrides before attempting a connection', () => {
  for (const query of ['host=other.invalid', 'hostaddr=127.0.0.1', 'port=5433', 'user=other',
    'password=override', 'dbname=other', 'database=other', 'options=-c%20role%3Dother',
    '%68ost=other.invalid', 'sslcert=unreviewed-file', 'sslmode=require&sslmode=disable']) {
    const result = spawnSync(process.execPath, ['scripts/migrate.mjs', 'up'], {
      encoding: 'utf8', env: { ...process.env,
        MIGRATION_DATABASE_URL: `postgres://operator:synthetic@expected.invalid/parking?${query}`,
        MIGRATION_EXPECTED_HOST: 'expected.invalid', MIGRATION_EXPECTED_DATABASE: 'parking' },
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Unsupported PostgreSQL connection options/);
    assert.ok(!result.stderr.includes('synthetic') && !result.stderr.includes('override'));
  }
});

const message = (type, body) => {
  const head = Buffer.alloc(5);
  head.write(type);
  head.writeInt32BE(4 + body.length, 1);
  return Buffer.concat([head, body]);
};

// Minimal PostgreSQL wire peer: trust auth, answers the owner-identity query, then drops the socket on the next statement.
async function identityThenDropPeer() {
  const sockets = new Set();
  const server = net.createServer(socket => {
    sockets.add(socket);
    let started = false;
    socket.on('error', () => {});
    socket.on('data', data => {
      if (!started) { started = true; socket.write(Buffer.from([0x52, 0, 0, 0, 8, 0, 0, 0, 0, 0x5a, 0, 0, 0, 5, 0x49])); return; }
      if (data[0] !== 0x51) { socket.destroy(); return; }
      const columns = ['database', 'role', 'owner'];
      const fields = columns.map(name => Buffer.concat([Buffer.from(`${name}\0`), Buffer.from([0, 0, 0, 0, 0, 0, 0, 0, 0, 25, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0, 0])]));
      const count = Buffer.alloc(2);
      count.writeInt16BE(columns.length);
      const values = ['parking', 'operator', 'operator'].map(value => {
        const length = Buffer.alloc(4);
        length.writeInt32BE(value.length);
        return Buffer.concat([length, Buffer.from(value)]);
      });
      socket.write(Buffer.concat([message('T', Buffer.concat([count, ...fields])), message('D', Buffer.concat([count, ...values])),
        message('C', Buffer.from('SELECT 1\0')), Buffer.from([0x5a, 0, 0, 0, 5, 0x49])]));
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { port: server.address().port, close: () => { sockets.forEach(socket => socket.destroy()); return new Promise(resolve => server.close(resolve)); } };
}

test('a dropped connection rejects the migration command instead of crashing the process', async () => {
  const peer = await identityThenDropPeer();
  try {
    await assert.rejects(executeMigration('up', {
      MIGRATION_DATABASE_URL: `postgres://operator:synthetic@127.0.0.1:${peer.port}/parking`,
      MIGRATION_EXPECTED_HOST: '127.0.0.1', MIGRATION_EXPECTED_DATABASE: 'parking',
    }), /Connection terminated unexpectedly/);
  } finally {
    await peer.close();
  }
});
