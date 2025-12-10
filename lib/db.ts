import { setDefaultResultOrder } from "dns";
import { Pool } from "pg";

// When Supabase TLS uses a self-signed cert, this prevents rejection in dev.
if(process.env.NODE_ENV !== "production"){
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

// setDefaultResultOrder("ipv4first");

declare global {
  // eslint-disable-next-line no-var
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
    // ssl: { rejectUnauthorized: false },
  });

if (process.env.NODE_ENV !== "production") {
  global._parkingDbPool = pool;
}

export async function query(sql: string, params: unknown[] = []) {
  const result = await pool.query(sql, params);
  return result;
}
