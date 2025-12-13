import { getDbPool } from "./seed_utils";
import {
  seedOsmParkingLots,
  seedOsmCityCoverage,
  seedOsmStreets,
} from "./seed_osm_utils";

const pool = getDbPool();

export async function seedRemoteMetro() {
  console.log("Starting Remote Metro Seeding...");
  try {
    // White Rock
    await seedOsmParkingLots("White Rock");
    await seedOsmCityCoverage("White Rock");

    // Maple Ridge
    await seedOsmParkingLots("Maple Ridge");
    await seedOsmCityCoverage("Maple Ridge");

    // Pitt Meadows
    await seedOsmParkingLots("Pitt Meadows");
    await seedOsmCityCoverage("Pitt Meadows");

    // Streets
    await seedOsmStreets("White Rock", "BC");
    await seedOsmStreets("Maple Ridge", "BC");
    await seedOsmStreets("Pitt Meadows", "BC");

    console.log("[Remote Metro] Seeding Complete.");
  } catch (e) {
    console.error("Remote Metro Seeding Failed:", e);
  }
}

if (require.main === module) {
  seedRemoteMetro().finally(() => pool.end());
}
