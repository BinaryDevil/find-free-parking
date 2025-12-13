import { getDbPool } from "./seed_utils";
import {
  seedOsmParkingLots,
  seedOsmCityCoverage,
  seedOsmStreets,
} from "./seed_osm_utils";

const pool = getDbPool();

export async function seedLangley() {
  console.log("Starting Langley Seeding...");
  try {
    // City of Langley (Try alternate name if "Langley City" failed)
    try {
      await seedOsmParkingLots("City of Langley");
      await seedOsmCityCoverage("City of Langley");
    } catch {
      console.log("City of Langley failed, trying Langley City");
      await seedOsmParkingLots("Langley City");
      await seedOsmCityCoverage("Langley City");
    }

    // Township of Langley
    await seedOsmParkingLots("Township of Langley");
    await seedOsmCityCoverage("Township of Langley");

    // Streets (Try both)
    await seedOsmStreets("City of Langley", "BC");
    await seedOsmStreets("Township of Langley", "BC");

    console.log("[Langley] Seeding Complete.");
  } catch (e) {
    console.error("Langley Seeding Failed:", e);
  }
}

if (require.main === module) {
  seedLangley().finally(() => pool.end());
}
