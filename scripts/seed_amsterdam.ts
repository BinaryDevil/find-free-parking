import {
  seedOsmCityCoverage,
  seedOsmStreets,
  seedOsmParkingLots,
} from "./seed_osm_utils";
import { getDbPool } from "./seed_utils";

const pool = getDbPool();

export async function seedAmsterdam() {
  console.log("Starting Amsterdam Seeding...");
  try {
    // "Netherlands" as search area
    await seedOsmCityCoverage("Amsterdam", "Netherlands", "Noord-Holland");
    await seedOsmParkingLots("Amsterdam", "Netherlands", "Noord-Holland");
    await seedOsmStreets("Amsterdam", "Noord-Holland", "Netherlands");
    console.log("Amsterdam Seeding Complete.");
  } catch (e: any) {
    console.error("Amsterdam Seeding Failed:", e.message);
  }
}

if (require.main === module) {
  seedAmsterdam().finally(() => pool.end());
}
