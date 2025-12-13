import { getDbPool } from "./seed_utils";
import {
  seedOsmParkingLots,
  seedOsmCityCoverage,
  seedOsmStreets,
} from "./seed_osm_utils";

const pool = getDbPool();

export async function seedTriCities() {
  console.log("Starting Tri-Cities (Port Coquitlam, Port Moody) Seeding...");
  try {
    // Port Coquitlam
    await seedOsmParkingLots("Port Coquitlam");
    await seedOsmCityCoverage("Port Coquitlam");

    // Port Moody
    await seedOsmParkingLots("Port Moody");
    await seedOsmCityCoverage("Port Moody");

    // Anmore & Belcarra (Optional, but part of area)
    await seedOsmCityCoverage("Anmore");
    await seedOsmCityCoverage("Belcarra");

    // Streets
    await seedOsmStreets("Port Coquitlam", "BC");
    await seedOsmStreets("Port Moody", "BC");

    console.log("[Tri-Cities] Seeding Complete.");
  } catch (e) {
    console.error("Tri-Cities Seeding Failed:", e);
  }
}

if (require.main === module) {
  seedTriCities().finally(() => pool.end());
}
