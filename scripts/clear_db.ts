// ... (env loading same as before or imported from utils? utils is better but keeping as is for now to avoid breaking changes if utils differs)
// Actually clear_db duplicates env loading.
// I will use getDbPool from utils to simplify clear_db too!

import { getDbPool } from "./seed_utils";

const pool = getDbPool();

export async function clearDatabase() {
  try {
    console.log("Clearing database...");
    await pool.query(
      "TRUNCATE parking_meters, street_segments RESTART IDENTITY CASCADE;"
    );
    console.log("Database cleared successfully.");
  } catch (e) {
    console.error("Failed to clear DB:", e);
    throw e;
  }
}

if (require.main === module) {
  clearDatabase().finally(() => pool.end());
}
