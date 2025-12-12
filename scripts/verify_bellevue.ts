import { getDbPool } from "./seed_utils";

async function verifyBellevue() {
  const pool = getDbPool();

  const streets = await pool.query(
    "SELECT COUNT(*) FROM street_segments WHERE raw_data->>'city' = 'Bellevue'"
  );
  const zones = await pool.query(
    "SELECT COUNT(*) FROM parking_zones WHERE city = 'Bellevue'"
  );
  const meters = await pool.query(
    "SELECT COUNT(*) FROM parking_meters WHERE raw_data->>'city' = 'Bellevue'"
  );
  const coverage = await pool.query(
    "SELECT COUNT(*) FROM covered_cities WHERE city_name = 'Bellevue'"
  );

  console.log("Bellevue Verification:");
  console.log(`Streets: ${streets.rows[0].count} (Expected > 0)`);
  console.log(`Zones: ${zones.rows[0].count} (Expected > 0)`);
  console.log(`Meters: ${meters.rows[0].count} (Expected 0)`);
  console.log(`Coverage: ${coverage.rows[0].count} (Expected 1)`);
}

if (require.main === module) {
  verifyBellevue()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
