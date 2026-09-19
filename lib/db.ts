import { Pool } from "pg";

declare global {
  var _parkingDbPool: Pool | undefined;
}

const connectionString =
  process.env.POSTGRES_PRISMA_URL ??
  process.env.POSTGRES_URL ??
  process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "Missing DB connection string. Set POSTGRES_PRISMA_URL or POSTGRES_URL (Supabase pooled) or DATABASE_URL.",
  );
}

// The existing hosted database presents a self-signed chain. Keep TLS enabled
// but preserve the application's established compatibility behavior until a
// trusted provider CA is configured. Set this to "true" to enforce CA checks.
const rejectUnauthorized =
  process.env.POSTGRES_SSL_REJECT_UNAUTHORIZED === "true";

const pool =
  global._parkingDbPool ??
  new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 10_000,
    ssl: { rejectUnauthorized },
  });

if (process.env.NODE_ENV !== "production") {
  global._parkingDbPool = pool;
}

export async function query(sql: string, params: unknown[] = []) {
  const result = await pool.query(sql, params);
  return result;
}
