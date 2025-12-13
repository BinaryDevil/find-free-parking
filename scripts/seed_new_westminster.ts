import { getDbPool } from "./seed_utils";
import {
  seedOsmParkingLots,
  seedOsmCityCoverage,
  seedOsmStreets,
} from "./seed_osm_utils";
import fs from "fs";
import path from "path";

const pool = getDbPool();

export async function seedNewWestminster() {
  console.log("Starting New Westminster Seeding...");
  try {
    const localFile = path.resolve(
      process.cwd(),
      "datasets/Canada/BC/NewWestminster/new_west_meters.geojson"
    );
    if (fs.existsSync(localFile)) {
      console.log(
        "[New Westminster] Found local file, processing (TODO: Implement logic if file exists)"
      );
    }

    await seedOsmParkingLots("New Westminster");
    await seedOsmCityCoverage("New Westminster");
    await seedOsmStreets("New Westminster", "BC");

    console.log("[New Westminster] Seeding Complete.");
  } catch (e) {
    console.error("New Westminster Seeding Failed:", e);
  }
}

if (require.main === module) {
  seedNewWestminster().finally(() => pool.end());
}
