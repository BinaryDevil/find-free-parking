import { getDbPool, getDefaultSegmentAttributes } from "./seed_utils";

import { seedOsmParkingLots, seedOsmCityCoverage } from "./seed_osm_utils";
import fs from "fs";
import path from "path";

const pool = getDbPool();

async function getRedmondStreets() {
  const localFile = path.resolve(
    process.cwd(),
    "datasets/redmond_streets.geojson"
  );

  if (fs.existsSync(localFile)) {
    console.log(`[Redmond] Reading streets from: ${localFile}`);
    const content = fs.readFileSync(localFile, "utf-8");
    return JSON.parse(content);
  }

  console.log("[Redmond] Street data file not found. Skipping streets.");
  return null;
}

async function seedRedmondStreets() {
  console.log("[Redmond] Seeding Streets...");
  const data = await getRedmondStreets();

  if (!data || !data.features) {
    console.log("[Redmond] No street data to seed.");
    return 0;
  }

  let inserted = 0;
  const CHUNK_SIZE = 500;

  for (let i = 0; i < data.features.length; i += CHUNK_SIZE) {
    const chunk = data.features.slice(i, i + CHUNK_SIZE);
    const values: any[] = [];
    const placeholders: string[] = [];
    let paramIndex = 1;

    for (const item of chunk) {
      if (!item.geometry || item.geometry.type !== "LineString") continue;

      const p = item.properties;

      // Skip streets outside city limits or not active
      if (p.d_InsideCi !== "YES" || p.d_Status !== "ACT") continue;

      // Map ownership to category
      // Redmond has free time-limited parking downtown (2hr)
      // Without explicit parking data, we'll mark as "Unrestricted" using standard helper
      const defaults = getDefaultSegmentAttributes();
      const streetUse = defaults.street_use;

      const blockId = p.AssetID || `RED-${inserted}`;
      const streetName = p.StreetName || "Unknown";

      values.push(
        blockId,
        streetUse,
        JSON.stringify(item.geometry),
        JSON.stringify({
          ...p,
          ...defaults,
          city: "Redmond",
          streetName,
        }),
        JSON.stringify([]) // No schedules - just geometry
      );

      placeholders.push(
        `(gen_random_uuid(), $${paramIndex++}, $${paramIndex++}, ST_GeomFromGeoJSON($${paramIndex++}), $${paramIndex++}, $${paramIndex++})`
      );
      inserted++;
    }

    if (placeholders.length > 0) {
      const query = `
        INSERT INTO street_segments (id, block_id, street_use, geom, raw_data, schedules)
        VALUES ${placeholders.join(", ")}
      `;
      await pool.query(query, values);
      console.log(
        `[Redmond] Inserted streets batch ${
          Math.floor(i / CHUNK_SIZE) + 1
        } (${inserted})`
      );
    }
  }

  return inserted;
}

export async function seedRedmond() {
  console.log("Starting Redmond Seeding...");
  try {
    // Seed street segments from local GeoJSON
    const streetsInserted = await seedRedmondStreets();
    console.log(`[Redmond] Streets: ${streetsInserted} inserted.`);

    // Seed parking lots from OSM
    await seedOsmParkingLots("Redmond", "United States");

    // Seed city coverage from OSM
    await seedOsmCityCoverage("Redmond", "United States");

    console.log(`[Redmond] Seeding Complete.`);
  } catch (e) {
    console.error("Redmond Seeding Failed:", e);
  }
}

if (require.main === module) {
  seedRedmond().finally(() => pool.end());
}
