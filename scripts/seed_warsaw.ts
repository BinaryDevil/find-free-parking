import {
  seedOsmCityCoverage,
  seedOsmStreets,
  seedOsmParkingLots,
} from "./seed_osm_utils";
import { getDbPool } from "./seed_utils";

const pool = getDbPool();

export async function seedWarsaw() {
  console.log("Starting Warsaw Seeding...");
  try {
    // "Poland" works as both country and search area for simplified seeding
    await seedOsmCityCoverage("Warsaw", "Poland", "Mazowieckie", "Warszawa");
    await seedOsmParkingLots("Warsaw", "Poland", "Mazowieckie", "Warszawa");
    await seedOsmStreets("Warsaw", "Mazowieckie", "Poland", "Warszawa");
    console.log("Warsaw Seeding Complete.");
  } catch (e: any) {
    console.error("Warsaw Seeding Failed:", e.message);
  }
}

if (require.main === module) {
  seedWarsaw().finally(() => pool.end());
}
