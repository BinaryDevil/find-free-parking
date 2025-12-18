import {
  seedOsmCityCoverage,
  seedOsmStreets,
  seedOsmParkingLots,
} from "./seed_osm_utils";
import { getDbPool } from "./seed_utils";

const pool = getDbPool();

export async function seedAspen() {
  console.log("Starting Aspen Seeding...");
  try {
    await seedOsmCityCoverage("Aspen", "United States", "Colorado");
    await seedOsmParkingLots("Aspen", "United States", "Colorado");
    await seedOsmStreets("Aspen", "Colorado", "United States");
    console.log("Aspen Seeding Complete.");
  } catch (e: any) {
    console.error("Aspen Seeding Failed:", e.message);
  }
}

if (require.main === module) {
  seedAspen().finally(() => pool.end());
}
