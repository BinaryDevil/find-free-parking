import { Pool } from "pg";
import path from "path";
import fs from "fs";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// Env loading (same as before)
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

const connectionString =
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL;
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

async function run() {
  try {
    const meters = await pool.query("SELECT count(*) FROM parking_meters");
    const streets = await pool.query("SELECT count(*) FROM street_segments");

    console.log("Parking Meters Count:", meters.rows[0].count);
    console.log("Street Segments Count:", streets.rows[0].count);

    if (
      parseInt(meters.rows[0].count) > 0 &&
      parseInt(streets.rows[0].count) > 0
    ) {
      console.log("VERIFICATION: Data exists.");
    } else {
      console.error("VERIFICATION FAILED: Data missing.");
      process.exit(1);
    }
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await pool.end();
  }
}
run();
