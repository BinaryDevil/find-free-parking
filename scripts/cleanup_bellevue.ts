import { getDbPool } from "./seed_utils";

async function cleanupBellevue() {
  const pool = getDbPool();
  console.log("Cleaning up Bellevue data...");

  // 1. Clean Parking Meters
  const meters = await pool.query(
    "DELETE FROM parking_meters WHERE raw_data->>'city' = 'Bellevue'"
  );
  console.log(`Deleted ${meters.rowCount} meters.`);

  // 2. Clean Street Segments
  const streets = await pool.query(
    "DELETE FROM street_segments WHERE raw_data->>'city' = 'Bellevue'"
  );
  console.log(`Deleted ${streets.rowCount} street segments.`);

  // 3. Clean Parking Zones
  const zones = await pool.query(
    "DELETE FROM parking_zones WHERE city = 'Bellevue'"
  );
  console.log(`Deleted ${zones.rowCount} parking zones.`);

  // 4. Clean Covered Cities
  const city = await pool.query(
    "DELETE FROM covered_cities WHERE city_name = 'Bellevue'"
  );
  console.log(`Deleted ${city.rowCount} covered cities entries.`);
}

if (require.main === module) {
  cleanupBellevue()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
