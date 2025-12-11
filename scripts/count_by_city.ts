import { getDbPool } from "./seed_utils";

const pool = getDbPool();

async function run() {
  try {
    const resMeters = await pool.query(`
      SELECT 
        raw_data->>'city' as city, 
        COUNT(*) as count 
      FROM parking_meters 
      GROUP BY city
      ORDER BY count DESC;
    `);

    const resStreets = await pool.query(`
      SELECT COUNT(*) as count FROM street_segments;
    `);

    console.log("=== Database Counts ===");
    console.log("--- Parking Meters ---");
    resMeters.rows.forEach((row) => {
      console.log(`${row.city || "Unknown/Vancouver"}: ${row.count}`);
    });

    console.log("--- Street Segments ---");
    console.log(`Total: ${resStreets.rows[0].count}`);
  } catch (e) {
    console.error("Error:", e);
  } finally {
    await pool.end();
  }
}

run();
