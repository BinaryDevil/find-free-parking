import { Pool } from "pg";

declare global {
  var _parkingDbPool: Pool | undefined;
}

const rawConnectionString =
  process.env.POSTGRES_PRISMA_URL ??
  process.env.POSTGRES_URL ??
  process.env.DATABASE_URL;

if (!rawConnectionString) {
  throw new Error(
    "Missing DB connection string. Set POSTGRES_PRISMA_URL or POSTGRES_URL (Supabase pooled) or DATABASE_URL.",
  );
}

// `pg` lets SSL options embedded in a connection URL override the Pool's ssl
// object. The existing hosted database uses a self-signed chain, so remove
// those URL options and set the compatibility behavior in exactly one place.
function normalizeConnectionString(connectionString: string) {
  try {
    const url = new URL(connectionString);
    for (const key of ["sslmode", "sslrootcert", "sslcert", "sslkey"]) {
      url.searchParams.delete(key);
    }
    return url.toString();
  } catch {
    // Let pg handle a non-URL connection format as it did before.
    return connectionString;
  }
}

const connectionString = normalizeConnectionString(rawConnectionString);

const pool =
  global._parkingDbPool ??
  new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 10_000,
    // TLS stays enabled. Certificate verification cannot currently succeed
    // against the configured provider's self-signed chain.
    ssl: { rejectUnauthorized: false },
  });

if (process.env.NODE_ENV !== "production") {
  global._parkingDbPool = pool;
}

export async function query(sql: string, params: unknown[] = []) {
  const result = await pool.query(sql, params);
  return result;
}
