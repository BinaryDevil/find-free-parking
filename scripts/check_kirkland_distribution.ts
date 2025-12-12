import { getDbPool } from "./seed_utils";

const pool = getDbPool();

async function verify() {
  const res = await pool.query(`
                SELECT street_use, count(*) 
                FROM street_segments 
                WHERE raw_data->>'city' = 'Kirkland'
                GROUP BY street_use
            `);
  console.table(res.rows);
  pool.end();
}

verify().catch(console.error);
