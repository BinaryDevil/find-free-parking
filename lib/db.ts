import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var _parkingDbPool: Pool | undefined;
}

// App traffic goes through Neon's pooled endpoint (PgBouncer), which suits
// serverless functions. DATABASE_URL (direct) is the fallback for local use.
const connectionString =
  process.env.DATABASE_URL_POOLED ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "Missing DB connection string. Set DATABASE_URL_POOLED (Neon pooled) or DATABASE_URL (Neon direct).",
  );
}

// TLS is configured by the connection string (sslmode=require).
const pool =
  global._parkingDbPool ??
  new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 10_000,
  });

if (process.env.NODE_ENV !== "production") {
  global._parkingDbPool = pool;
}

export async function query(sql: string, params: unknown[] = []) {
  const result = await pool.query(sql, params);
  return result;
}
