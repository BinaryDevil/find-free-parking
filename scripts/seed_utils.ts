import fs from "fs";
import path from "path";
import { Pool } from "pg";

// 1. Load Environment Variables
export function loadEnv() {
  const envFiles = [".env", ".env.local"];
  envFiles.forEach((file) => {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      console.log(`Loading env from ${file}`);
      const envConfig = fs.readFileSync(filePath, "utf8");
      envConfig.split("\n").forEach((line) => {
        if (!line.trim() || line.trim().startsWith("#")) return;
        const [key, ...rest] = line.split("=");
        let val = rest.join("=");
        if (key && val) {
          val = val.trim();
          if (
            (val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'"))
          ) {
            val = val.slice(1, -1);
          }
          process.env[key.trim()] = val;
        }
      });
    }
  });

  // Bypass SSL for some setups
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

// 2. Get DB Connection
export function getDbPool() {
  loadEnv();

  const connectionString =
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL;

  if (!connectionString) {
    console.error("No connection string found!");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 30000,
  });

  pool.on("error", (err) => {
    console.error("Unexpected error on idle client", err);
  });

  return pool;
}
