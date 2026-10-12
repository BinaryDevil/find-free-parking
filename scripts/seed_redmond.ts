import { getDbPool, getDefaultSegmentAttributes } from "./seed_utils";
import { importLegacyBatch, sourceRecordId } from "./evidence-import";

import { seedOsmParkingLots, seedOsmCityCoverage } from "./seed_osm_utils";
import fs from "fs";
import path from "path";

const pool = getDbPool();

async function getRedmondStreets() {
  const localFile = path.resolve(
    process.cwd(),
    "datasets/USA/WA/Redmond/redmond_streets.geojson"
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
    const recordIds: string[] = [];

    for (const item of chunk) {
      if (!item.geometry || item.geometry.type !== "LineString") continue;

      const p = item.properties;

      // Skip streets outside city limits or not active
      if (p.d_InsideCi !== "YES" || p.d_Status !== "ACT") continue;

      // Map ownership to category
      // Redmond has free time-limited parking downtown (2hr)
      // Without explicit parking data, we'll mark as "Unrestricted" using standard helper
      const defaults = getDefaultSegmentAttributes();
      let streetUse = defaults.street_use; // Default "Unknown"

      // Redmond Logic:
      // d_Ownershi: PVT (Private) => Unknown/Restricted
      // d_Ownershi: DOT (State) => No Parking
      // d_Classifi: 4.0 => Residential (Unrestricted)
      // d_Classifi: 1.0, 2.0, 3.0, 520.0 => Arterials/Highway (No Parking)

      const ownership = p.d_Ownershi;
      const classifi = parseFloat(p.d_Classifi);

      if (ownership === "DOT" || classifi === 520.0) {
        streetUse = "No Parking";
      } else if (ownership === "PVT") {
        streetUse = "Unknown";
      } else if (classifi === 4.0) {
        streetUse = "Unrestricted";
      } else if ([1.0, 2.0, 3.0].includes(classifi)) {
        streetUse = "No Parking";
      }

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

      recordIds.push(sourceRecordId(p.AssetID));
      inserted++;
    }

    if (recordIds.length > 0) {
      await importLegacyBatch(pool, "REDMOND_STREETS", "street_segments", values, recordIds);
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
