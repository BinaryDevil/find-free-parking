import { getDbPool } from "./seed_utils";
import {
  seedOsmParkingLots,
  seedOsmCityCoverage,
  seedOsmStreets,
} from "./seed_osm_utils";

const pool = getDbPool();

export async function seedDelta() {
  console.log("Starting Delta Seeding...");
  try {
    await seedOsmParkingLots("Delta");
    await seedOsmCityCoverage("Delta");
    await seedOsmStreets("Delta", "BC");
    console.log("[Delta] Seeding Complete.");
  } catch (e) {
    console.error("Delta Seeding Failed:", e);
  }
}

if (require.main === module) {
  seedDelta().finally(() => pool.end());
}
