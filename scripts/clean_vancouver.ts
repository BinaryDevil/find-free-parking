import { getDbPool } from "./seed_utils";

const pool = getDbPool();

async function run() {
  console.log("Cleaning Vancouver data...");

  // Meters
  // Identify by raw_data->>'city' = 'Vancouver' (set in seed_vancouver.ts meters)
  await pool.query(
    "DELETE FROM parking_meters WHERE raw_data->>'city' = 'Vancouver'"
  );
  console.log("Deleted Vancouver meters.");

  // Streets
  // Identify by? seed_vancouver.ts streets put `JSON.stringify(item)` into raw_data.
  // Does item have city?
  // If not, we might check by source? Or getting all streets count?
  // seed_vancouver.ts is the ONLY source of streets currently (except OSM fallback I just added).
  // The failed batch insert might have left some streets.
  // Let's delete ALL streets for now since we are re-seeding everything.
  // But wait, Seattle streets?
  // Seattle streets come from `seed_seattle.ts`.
  // I should try to be specific.
  // Vancouver streets usually have "hblock" property.
  await pool.query(
    "DELETE FROM street_segments WHERE raw_data->>'hblock' IS NOT NULL"
  );
  console.log("Deleted Vancouver streets (by hblock).");

  // Also clean anything that looks like it came from OSM for Vancouver, just in case
  // But OSM streets might not be saved as Vancouver if the script failed.
  // `seedOsmStreets` has raw_data->city.
  await pool.query(
    "DELETE FROM street_segments WHERE raw_data->>'city' = 'Vancouver'"
  );

  console.log("Cleanup Done.");
}

run().finally(() => pool.end());
