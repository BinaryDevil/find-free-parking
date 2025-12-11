import { Pool } from "pg";
import fs from "fs";
import path from "path";

// Env loading
[".env", ".env.local"].forEach((file) => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
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

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

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
});

async function run() {
  try {
    console.log("Clearing database...");
    await pool.query(
      "TRUNCATE parking_meters, street_segments RESTART IDENTITY CASCADE;"
    );
    console.log("Database cleared successfully.");
  } catch (e) {
    console.error("Failed to clear DB:", e);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
