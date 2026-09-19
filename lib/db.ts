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

const pool =
  global._parkingDbPool ??
  new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 10_000,
    // Hosted Postgres providers commonly require TLS. Keep certificate
    // validation enabled unless an operator explicitly opts out for a local
    // development database with a self-signed certificate.
    ssl:
      process.env.POSTGRES_SSL_REJECT_UNAUTHORIZED === "false"
        ? { rejectUnauthorized: false }
        : { rejectUnauthorized: true },
  });

if (process.env.NODE_ENV !== "production") {
  global._parkingDbPool = pool;
}

export async function query(sql: string, params: unknown[] = []) {
  const result = await pool.query(sql, params);
  return result;
}
