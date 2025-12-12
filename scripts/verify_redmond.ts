import { getDbPool } from "./seed_utils";

const pool = getDbPool();

async function checkRedmond() {
  try {
    const streets = await pool.query(`
      SELECT street_use, raw_data->>'notes' as note, count(*) 
      FROM street_segments 
      WHERE raw_data->>'city' = 'Redmond' 
      GROUP BY 1, 2
    `);

    console.log("\n--- Redmond Streets ---");
    console.table(streets.rows);

    const lots = await pool.query(`
      SELECT count(*) 
      FROM parking_zones 
      WHERE city = 'Redmond'
    `);
    console.log("\n--- Redmond Parking Lots ---");
    console.log(`Total: ${lots.rows[0].count}`);
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}

checkRedmond();
