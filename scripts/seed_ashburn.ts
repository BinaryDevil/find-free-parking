import {
  seedOsmCityCoverage,
  seedOsmStreets,
  seedOsmParkingLots,
} from "./seed_osm_utils";
import { getDbPool } from "./seed_utils";

const pool = getDbPool();

export async function seedAshburn() {
  console.log("Starting Ashburn Seeding...");
  try {
    await seedOsmCityCoverage("Ashburn", "United States", "Virginia");
    await seedOsmParkingLots("Ashburn", "United States", "Virginia");
    await seedOsmStreets("Ashburn", "Virginia", "United States");
    console.log("Ashburn Seeding Complete.");
  } catch (e: any) {
    console.error("Ashburn Seeding Failed:", e.message);
  }
}

if (require.main === module) {
  seedAshburn().finally(() => pool.end());
}
