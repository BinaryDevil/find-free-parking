import https from "https";
import fs from "fs";
import path from "path";
import { Pool } from "pg";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// Env loading
[".env", ".env.local"].forEach((file) => {
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

async function seedDataset(
  datasetId: string,
  tableName: string,
  mapper: (item: any) => any[] | null
) {
  console.log(`Fetching ${datasetId}...`);
  const url = `https://opendata.vancouver.ca/api/v2/catalog/datasets/${datasetId}/exports/json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Status ${res.status}`);

  const data = (await res.json()) as any[];
  console.log(`Fetched ${data.length} records. Inserting into ${tableName}...`);

  let inserted = 0;
  // Sequential One-by-One to isolate errors (slower but safer for debugging)
  // Or small batch? Let's do one-by-one to find the invalid GeoJSON

  for (const item of data) {
    try {
      const values = mapper(item);
      if (!values) continue;

      if (tableName === "parking_meters") {
        await pool.query(
          `
                    INSERT INTO parking_meters (id, pay_station_id, meter_head, time_in_effect, credit_card, geom, raw_data)
                    VALUES (gen_random_uuid(), $1, $2, $3, $4, ST_GeomFromGeoJSON($5), $6)
                `,
          values
        );
      } else if (tableName === "street_segments") {
        await pool.query(
          `
                    INSERT INTO street_segments (id, block_id, street_use, geom, raw_data)
                    VALUES (gen_random_uuid(), $1, $2, ST_GeomFromGeoJSON($3), $4)
                `,
          values
        );
      }
      inserted++;
      if (inserted % 500 === 0)
        console.log(`Inserted ${inserted} / ${data.length}`);
    } catch (e: any) {
      if (e.message.includes("invalid GeoJson")) {
        console.warn(
          `Skipping invalid GeoJSON item: ${JSON.stringify(item.geom)}`
        );
      } else {
        console.error("Insert error:", e.message);
      }
    }
  }
  console.log(`Finished ${tableName}. Inserted ${inserted} records.`);
}

async function run() {
  try {
    await pool.query("DELETE FROM parking_meters"); // clear old data
    await pool.query("DELETE FROM street_segments");

    // Seed Meters
    await seedDataset("parking-meters", "parking_meters", (item) => {
      if (!item.geom || !item.geom.geometry) return null;
      const geometry = item.geom.geometry;

      return [
        item.pay_phone,
        item.meterhead,
        item.timeineffe,
        item.creditcard === "Yes",
        JSON.stringify(geometry), // Pass geometry object
        JSON.stringify(item),
      ];
    });

    // Seed Streets
    await seedDataset("public-streets", "street_segments", (item) => {
      // Debug logging for first item
      if (!(global as any).debugged) {
        console.log("DEBUG Streets Item Keys:", Object.keys(item));
        if (item.geom)
          console.log(
            "DEBUG Streets Item Geom:",
            typeof item.geom,
            JSON.stringify(item.geom).substring(0, 100)
          );
        else console.log("DEBUG Streets Item Geom is MISSING");
        (global as any).debugged = true;
      }

      if (!item.geom || !item.geom.geometry) return null;
      const geometry = item.geom.geometry;

      return [
        item.hblock,
        item.streetuse,
        JSON.stringify(geometry),
        JSON.stringify(item),
      ];
    });

    console.log("Seeding complete.");
  } catch (e) {
    console.error("Seeding failed in run():", e);
  } finally {
    await pool.end();
  }
}

run();
