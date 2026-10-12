import { Client } from 'pg';

let client;
try {
  if (process.env.RETENTION_APPROVED !== 'clear-expired-pii') throw new Error('Retention is disabled until target-specific approval.');
  const url = new URL(process.env.RETENTION_DATABASE_URL || '');
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || url.hostname.includes('-pooler') ||
      !process.env.RETENTION_EXPECTED_HOST || url.hostname !== process.env.RETENTION_EXPECTED_HOST ||
      !process.env.RETENTION_EXPECTED_DATABASE || decodeURIComponent(url.pathname.slice(1)) !== process.env.RETENTION_EXPECTED_DATABASE) {
    throw new Error('Confirm the direct retention endpoint and database.');
  }
  client = new Client({ connectionString: url.toString() });
  await client.connect();
  const identity = (await client.query('SELECT current_database() AS database, current_user AS role')).rows[0];
  if (identity.database !== process.env.RETENTION_EXPECTED_DATABASE || identity.role !== 'pii_retention_login') {
    throw new Error('Use the dedicated retention login, never the app or owner credential.');
  }
  await client.query('SET ROLE pii_retention_executor');
  const result = await client.query('SELECT * FROM public.clear_expired_pii()');
  console.log(JSON.stringify(result.rows[0])); // Aggregate counts only.
} catch {
  console.error('Retention failed or is disabled. Inspect configuration privately.');
  process.exitCode = 1;
} finally {
  await client?.end();
}
