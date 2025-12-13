import { getDbPool } from "./seed_utils";
import {
  seedOsmParkingLots,
  seedOsmCityCoverage,
  seedOsmStreets,
} from "./seed_osm_utils";

const pool = getDbPool();

export async function seedWestVancouver() {
  console.log("Starting West Vancouver Seeding...");
  try {
    await seedOsmParkingLots("West Vancouver");
    await seedOsmCityCoverage("West Vancouver");
    await seedOsmStreets("West Vancouver", "BC");
    console.log("[West Vancouver] Seeding Complete.");
  } catch (e) {
    console.error("West Vancouver Seeding Failed:", e);
  }
}

if (require.main === module) {
  seedWestVancouver().finally(() => pool.end());
}
