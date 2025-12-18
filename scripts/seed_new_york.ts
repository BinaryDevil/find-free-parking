import {
  seedOsmCityCoverage,
  seedOsmStreets,
  seedOsmParkingLots,
} from "./seed_osm_utils";
import { getDbPool } from "./seed_utils";

const pool = getDbPool();

export async function seedNewYork() {
  console.log("Starting New York Seeding...");
  try {
    await seedOsmCityCoverage("New York", "United States", "New York");
    await seedOsmParkingLots("New York", "United States", "New York");
    await seedOsmStreets("New York", "New York", "United States");
    console.log("New York Seeding Complete.");
  } catch (e: any) {
    console.error("New York Seeding Failed:", e.message);
  }
}

if (require.main === module) {
  seedNewYork().finally(() => pool.end());
}
