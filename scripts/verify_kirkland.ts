import { getDbPool } from "./seed_utils";

const pool = getDbPool();

async function checkKirkland() {
  try {
    const streets = await pool.query(`
      SELECT street_use, raw_data->>'notes' as note, count(*) 
      FROM street_segments 
      WHERE raw_data->>'city' = 'Kirkland' 
      GROUP BY 1, 2
    `);

    console.log("\n--- Kirkland Streets ---");
    console.table(streets.rows);

    const lots = await pool.query(`
      SELECT count(*) 
      FROM parking_zones 
      WHERE city = 'Kirkland'
    `);
    console.log("\n--- Kirkland Parking Lots ---");
    console.log(`Total: ${lots.rows[0].count}`);

    const meters = await pool.query(`
      SELECT count(*) 
      FROM parking_meters 
      WHERE raw_data->>'city' = 'Kirkland'
    `);
    console.log("\n--- Kirkland Parking Meters (from Signs) ---");
    console.log(`Total: ${meters.rows[0].count}`);
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}

checkKirkland();
