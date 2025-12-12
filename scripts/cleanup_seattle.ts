import { getDbPool } from "./seed_utils";

async function run() {
  const pool = getDbPool();
  console.log("Deleting Seattle data...");
  await pool.query(
    "DELETE FROM parking_meters WHERE raw_data->>'city' = 'Seattle'"
  );
  await pool.query(
    "DELETE FROM street_segments WHERE raw_data->>'city' = 'Seattle' OR block_id LIKE 'SEA-%'"
  );
  await pool.query("DELETE FROM parking_zones WHERE city = 'Seattle'");
  await pool.query("DELETE FROM covered_cities WHERE city_name = 'Seattle'");
  console.log("Done.");
  await pool.end();
}

run();
