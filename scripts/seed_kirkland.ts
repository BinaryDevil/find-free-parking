import { getDbPool } from "./seed_utils";
import { seedOsmParkingLots, seedOsmCityCoverage } from "./seed_osm_utils";
import fs from "fs";
import path from "path";

const pool = getDbPool();

async function getKirklandData() {
  const localFile = path.resolve(
    process.cwd(),
    "datasets/kirkland_meters.geojson"
  );

  if (fs.existsSync(localFile)) {
    console.log(`[Kirkland] Reading from local file: ${localFile}`);
    const content = fs.readFileSync(localFile, "utf-8");
    return JSON.parse(content);
  }

  console.log(
    "[Kirkland] Local file not found and no verified API. Skipping meters."
  );
  return null;
}

export async function seedKirkland() {
  console.log("Starting Kirkland Seeding...");
  try {
    const data = await getKirklandData();

    if (data && data.features) {
      console.log(`[Kirkland] Found ${data.features.length} features.`);
      // Placeholder for meter insertion logic
    }

    await seedOsmParkingLots("Kirkland", "United States");
    await seedOsmCityCoverage("Kirkland", "United States");

    console.log(`[Kirkland] Seeding Complete.`);
  } catch (e) {
    console.error("Kirkland Seeding Failed:", e);
  }
}

if (require.main === module) {
  seedKirkland().finally(() => pool.end());
}
