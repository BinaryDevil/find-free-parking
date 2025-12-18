import {
  seedOsmCityCoverage,
  seedOsmStreets,
  seedOsmParkingLots,
} from "./seed_osm_utils";
import { getDbPool } from "./seed_utils";

const pool = getDbPool();

export async function seedBoardman() {
  console.log("Starting Boardman Seeding...");
  try {
    // Boardman, Oregon
    await seedOsmCityCoverage("Boardman", "United States", "Oregon");
    await seedOsmParkingLots("Boardman", "United States", "Oregon");
    await seedOsmStreets("Boardman", "Oregon", "United States");
    console.log("Boardman Seeding Complete.");
  } catch (e: any) {
    console.error("Boardman Seeding Failed:", e.message);
  }
}

if (require.main === module) {
  seedBoardman().finally(() => pool.end());
}
