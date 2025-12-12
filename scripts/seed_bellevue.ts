import { getDbPool } from "./seed_utils";
import {
  seedOsmCityCoverage,
  seedOsmParkingLots,
  seedOsmStreets,
} from "./seed_osm_utils";

export async function seedBellevue() {
  const pool = getDbPool();

  console.log("Seeding Bellevue, WA...");

  // 1. City Coverage (OSM)
  await seedOsmCityCoverage("Bellevue", "United States", "Washington");

  // 2. Parking Lots (OSM)
  await seedOsmParkingLots("Bellevue", "United States", "Washington");

  // 3. Street Centerlines (OSM Fallback)
  // Official data not publicly available (firewalled/token-gated).
  // Using OSM Lines as fallback for geometry.
  await seedOsmStreets("Bellevue", "WA", "United States");

  // 4. Meters (None)
  console.log(
    "⚠️ No official parking meter or sign data found for Bellevue. Skipping meters."
  );

  console.log("✅ Bellevue seeding complete.");
}

// Allow running directly
if (require.main === module) {
  seedBellevue()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
