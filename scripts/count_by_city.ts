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

    const resZones = await pool.query(`
      SELECT city, COUNT(*) as count FROM parking_zones GROUP BY city;
    `);

    const resCovered = await pool.query(`
      SELECT city_name FROM covered_cities;
    `);

    console.log("=== Database Counts ===");
    console.log("--- Parking Meters ---");
    resMeters.rows.forEach((row) => {
      console.log(`${row.city || "Unknown"}: ${row.count}`);
    });

    console.log("\n--- Parking Zones (Lots) ---");
    if (resZones.rows.length === 0) console.log("No zones found.");
    resZones.rows.forEach((row) => {
      console.log(`${row.city}: ${row.count}`);
    });

    console.log("\n--- Covered Cities ---");
    if (resCovered.rows.length === 0) console.log("No cities covered.");
    resCovered.rows.forEach((row) => {
      console.log(`- ${row.city_name}`);
    });

    console.log("\n--- Street Segments ---");
    console.log(`Total: ${resStreets.rows[0].count}`);
  } catch (e) {
    console.error("Error:", e);
  } finally {
    await pool.end();
  }
}

run();
