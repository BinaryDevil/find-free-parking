import { getDbPool } from "./seed_utils";

const pool = getDbPool();

async function run() {
  console.log("Counting Street Segments by City...");
  const res = await pool.query(`
    SELECT raw_data->>'city' as city, count(*) as count 
    FROM street_segments 
    GROUP BY raw_data->>'city'
    ORDER BY count DESC
  `);
  console.table(res.rows);
}

run().finally(() => pool.end());
