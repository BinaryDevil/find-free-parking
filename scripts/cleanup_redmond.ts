import { getDbPool } from "./seed_utils";

const pool = getDbPool();

async function cleanup() {
  try {
    console.log("Cleaning up Redmond data...");

    // 1. Clean street segments using raw_data (correct column)
    const s = await pool.query(
      `DELETE FROM street_segments WHERE raw_data->>'city' = 'Redmond'`
    );
    console.log(`Deleted ${s.rowCount} street segments.`);

    // 2. Clean meters
    const m = await pool.query(
      `DELETE FROM parking_meters WHERE raw_data->>'city' = 'Redmond'`
    );
    console.log(`Deleted ${m.rowCount} parking meters.`);

    // 3. Clean zones
    const z = await pool.query(
      `DELETE FROM parking_zones WHERE city = 'Redmond'`
    );
    console.log(`Deleted ${z.rowCount} parking zones.`);

    // 4. Clean coverage
    const c = await pool.query(
      `DELETE FROM covered_cities WHERE city_name = 'Redmond'`
    );
    console.log(`Deleted ${c.rowCount} covered cities.`);
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}

cleanup();
