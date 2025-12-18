import {
  seedOsmCityCoverage,
  seedOsmStreets,
  seedOsmParkingLots,
} from "./seed_osm_utils";
import { getDbPool } from "./seed_utils";

const pool = getDbPool();

export async function seedCouncilBluffs() {
  console.log("Starting Council Bluffs Seeding...");
  try {
    await seedOsmCityCoverage("Council Bluffs", "United States", "Iowa");
    await seedOsmParkingLots("Council Bluffs", "United States", "Iowa");
    await seedOsmStreets("Council Bluffs", "Iowa", "United States");
    console.log("Council Bluffs Seeding Complete.");
  } catch (e: any) {
    console.error("Council Bluffs Seeding Failed:", e.message);
  }
}

if (require.main === module) {
  seedCouncilBluffs().finally(() => pool.end());
}
