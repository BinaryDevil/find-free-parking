import { getDbPool } from "./seed_utils";

async function check() {
  const pool = getDbPool();
  try {
    const res = await pool.query(`
      SELECT street_use, COUNT(*) 
      FROM street_segments 
      WHERE block_id LIKE 'SEA-%' 
      GROUP BY street_use
    `);
    console.log("Seattle Street Use Stats:");
    console.table(res.rows);
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}

check();
