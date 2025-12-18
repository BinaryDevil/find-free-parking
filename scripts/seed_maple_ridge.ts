import {
  seedOsmCityCoverage,
  seedOsmStreets,
  seedOsmParkingLots,
} from "./seed_osm_utils";
import { getDbPool } from "./seed_utils";

const pool = getDbPool();

export async function seedMapleRidge() {
  console.log("Starting Maple Ridge Seeding...");
  try {
    await seedOsmCityCoverage("Maple Ridge", "Canada");
    await seedOsmParkingLots("Maple Ridge", "Canada");
    await seedOsmStreets("Maple Ridge", "BC", "Canada");
    console.log("Maple Ridge Seeding Complete.");
  } catch (e: any) {
    console.error("Maple Ridge Seeding Failed:", e.message);
  }
}

if (require.main === module) {
  seedMapleRidge().finally(() => pool.end());
}
