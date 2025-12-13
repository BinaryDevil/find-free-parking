import { getDbPool } from "./seed_utils";

const pool = getDbPool();

async function run() {
  console.log("Inspecting streets with null city...");
  const res = await pool.query(`
    SELECT id, raw_data 
    FROM street_segments 
    WHERE raw_data->>'city' IS NULL 
    LIMIT 5
  `);

  for (const row of res.rows) {
    console.log(JSON.stringify(row, null, 2));
  }
}

run().finally(() => pool.end());
