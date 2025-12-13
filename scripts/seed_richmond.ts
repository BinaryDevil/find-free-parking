import { getDbPool } from "./seed_utils";
import {
  seedOsmParkingLots,
  seedOsmCityCoverage,
  seedOsmStreets,
} from "./seed_osm_utils";
import fs from "fs";
import path from "path";

const pool = getDbPool();

export async function seedRichmond() {
  console.log("Starting Richmond Seeding...");
  try {
    const localFile = path.resolve(
      process.cwd(),
      "datasets/Canada/BC/Richmond/richmond_signs.geojson"
    );
    if (fs.existsSync(localFile)) {
      console.log(
        "[Richmond] Found local signs file, processing (TODO: Implement logic if file exists)"
      );
    }

    await seedOsmParkingLots("Richmond");
    await seedOsmCityCoverage("Richmond");
    await seedOsmStreets("Richmond", "BC");

    console.log("[Richmond] Seeding Complete.");
  } catch (e) {
    console.error("Richmond Seeding Failed:", e);
  }
}

if (require.main === module) {
  seedRichmond().finally(() => pool.end());
}
