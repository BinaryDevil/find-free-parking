import { setDefaultResultOrder } from "dns";
import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var _parkingDbPool: Pool | undefined;
}

// Official Supabase guidance: prefer the pooled URL (pgbouncer) when available.
const connectionString =
  process.env.POSTGRES_PRISMA_URL ??
  process.env.POSTGRES_URL ??
  process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "Missing DB connection string. Set POSTGRES_PRISMA_URL or POSTGRES_URL (Supabase pooled) or DATABASE_URL.",
  );
}

// Prefer IPv4 to avoid IPv6 EHOSTUNREACH on some networks.
setDefaultResultOrder("ipv4first");

const pool =
  global._parkingDbPool ??
  new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 10_000,
    ssl: { rejectUnauthorized: false }, // Supabase requires TLS
  });

if (process.env.NODE_ENV !== "production") {
  global._parkingDbPool = pool;
}

export async function query<T>(sql: string, params: unknown[] = []) {
  const result = await pool.query<T>(sql, params);
  return result;
}
