import { Pool } from "pg";
import fs from "fs";
import path from "path";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

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
    const lat = 49.28465;
    const lng = -123.1188;
    const radius = 50; // meters

    // Check Meters
    const metersRes = await pool.query(
      `
      SELECT id, pay_station_id, time_in_effect, raw_data,
             ST_Distance(geom::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) as dist
      FROM parking_meters
      WHERE ST_DWithin(geom::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)
      ORDER BY dist ASC
      LIMIT 1
    `,
      [lng, lat, radius]
    );

    console.log(`\n--- METER DATA (611 Hornby) ---`);
    for (const row of metersRes.rows) {
      console.log(`ID: ${row.id}`);
      console.log(`Time In Effect: ${row.time_in_effect}`);
      console.log(JSON.stringify(row.raw_data, null, 2));
    }

    // Check Street Segments
    const streetsRes = await pool.query(
      `
      SELECT id, block_id, street_use, raw_data,
             ST_Distance(geom::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) as dist
      FROM street_segments
      WHERE ST_DWithin(geom::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)
      ORDER BY dist ASC
      LIMIT 1
    `,
      [lng, lat, radius]
    );

    console.log(`\n--- STREET SEGMENT DATA (611 Hornby) ---`);
    for (const row of streetsRes.rows) {
      console.log(`ID: ${row.id}`);
      console.log(`Block ID: ${row.block_id}`);
      console.log(`Street Use: ${row.street_use}`);
      console.log(JSON.stringify(row.raw_data, null, 2));
    }
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}

run();
