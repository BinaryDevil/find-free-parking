import { getDbPool } from "./seed_utils";
import { seedOsmParkingLots, seedOsmCityCoverage } from "./seed_osm_utils";
import fs from "fs";
import path from "path";

const pool = getDbPool();

async function getBellevueData() {
  const localFile = path.resolve(
    process.cwd(),
    "datasets/bellevue_meters.geojson"
  );

  if (fs.existsSync(localFile)) {
    console.log(`[Bellevue] Reading from local file: ${localFile}`);
    const content = fs.readFileSync(localFile, "utf-8");
    return JSON.parse(content);
  }

  console.log(
    "[Bellevue] Local file not found and no verified API. Skipping meters."
  );
  return null;
}

export async function seedBellevue() {
  console.log("Starting Bellevue Seeding...");
  try {
    const data = await getBellevueData();

    if (data && data.features) {
      console.log(`[Bellevue] Found ${data.features.length} features.`);
      // Placeholder for meter insertion logic
    }

    await seedOsmParkingLots("Bellevue", "United States");
    await seedOsmCityCoverage("Bellevue", "United States");

    console.log(`[Bellevue] Seeding Complete.`);
  } catch (e) {
    console.error("Bellevue Seeding Failed:", e);
  }
}

if (require.main === module) {
  seedBellevue().finally(() => pool.end());
}
