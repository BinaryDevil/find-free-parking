/** Direct owner URLs must not let pg query options replace the inspected target. */
export function directMigrationUrl(connectionString) {
  let url;
  try { url = new URL(connectionString); } catch { throw new Error('Invalid PostgreSQL connection URL.'); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || url.hostname.includes('-pooler') ||
      !url.username || !url.pathname.slice(1) || url.hash) {
    throw new Error('Use a direct PostgreSQL owner connection with an explicit database and role.');
  }
  const seen = new Set();
  for (const key of url.searchParams.keys()) {
    if (!['sslmode', 'channel_binding'].includes(key) || seen.has(key)) {
      throw new Error('Unsupported PostgreSQL connection options.');
    }
    seen.add(key);
  }
  // pg otherwise falls back to PGPORT even for an explicit URI host.
  if (!url.port) url.port = '5432';
  return url;
}

export async function verifyMigrationIdentity(client, url) {
  const identity = (await client.query(`SELECT current_database() AS database, current_user AS role,
    pg_get_userbyid(datdba) AS owner FROM pg_database WHERE datname = current_database()`)).rows[0];
  if (!identity || identity.database !== decodeURIComponent(url.pathname.slice(1)) ||
      identity.role !== decodeURIComponent(url.username) || identity.role === 'app_rw' || identity.owner !== identity.role) {
    throw new Error('Database identity mismatch. Use the separate database owner connection.');
  }
}
