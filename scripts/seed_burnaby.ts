import { getDbPool } from "./seed_utils";
import {
  seedOsmParkingLots,
  seedOsmCityCoverage,
  seedOsmStreets,
} from "./seed_osm_utils";
import fs from "fs";
import path from "path";

const pool = getDbPool();

export async function seedBurnaby() {
  console.log("Starting Burnaby Seeding...");
  try {
    // 1. Check for local "Signs" or meter data
    const localFile = path.resolve(
      process.cwd(),
      "datasets/Canada/BC/Burnaby/burnaby_signs.geojson"
    );
    if (fs.existsSync(localFile)) {
      console.log(
        "[Burnaby] Found local signs file, processing (TODO: Implement logic if file exists)"
      );
      // TODO: specific logic if we actually get a file
    }

    // 2. OSM Lots
    await seedOsmParkingLots("Burnaby");

    // 3. Coverage
    await seedOsmCityCoverage("Burnaby");

    // 4. Streets (Fallback)
    await seedOsmStreets("Burnaby", "BC");

    console.log("[Burnaby] Seeding Complete.");
  } catch (e) {
    console.error("Burnaby Seeding Failed:", e);
  }
}

if (require.main === module) {
  seedBurnaby().finally(() => pool.end());
}
