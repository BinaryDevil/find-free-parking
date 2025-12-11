import { getDbPool } from "./seed_utils";

const pool = getDbPool();

async function run() {
  try {
    const res = await pool.query(`
      SELECT 
        raw_data->>'city' as city, 
        COUNT(*) as count 
      FROM parking_meters 
      GROUP BY city
      ORDER BY count DESC;
    `);

    console.log("=== Parking Meters Count by City ===");
    res.rows.forEach((row) => {
      console.log(`${row.city || "Unknown"}: ${row.count}`);
    });
  } catch (e) {
    console.error("Error:", e);
  } finally {
    await pool.end();
  }
}

run();
