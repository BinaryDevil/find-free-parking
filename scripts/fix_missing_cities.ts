import { getDbPool } from "./seed_utils";
import { seedBurnaby } from "./seed_burnaby";
import { seedNewWestminster } from "./seed_new_westminster";
import { seedNorthVancouver } from "./seed_north_vancouver";
import { seedDelta } from "./seed_delta";
import { seedWestVancouver } from "./seed_west_vancouver";
import { seedRemoteMetro } from "./seed_remote_metro";
import { seedTriCities } from "./seed_tri_cities";

const pool = getDbPool();

async function cleanAndSeed(cityName: string, seedFn: () => Promise<void>) {
  console.log(`\n=== Fixing ${cityName} ===`);
  // Clean
  const res = await pool.query(
    "DELETE FROM street_segments WHERE raw_data->>'city' = $1",
    [cityName]
  );
  console.log(
    `[Clean] Deleted ${res.rowCount} existing street segments for ${cityName}.`
  );

  // Seed
  await seedFn();
}

async function run() {
  await cleanAndSeed("Burnaby", seedBurnaby);
  await cleanAndSeed("New Westminster", seedNewWestminster);

  // North Van (Check both City and District)
  console.log("\n=== Fixing North Vancouver ===");
  await pool.query(
    "DELETE FROM street_segments WHERE raw_data->>'city' = 'North Vancouver'"
  );
  await pool.query(
    "DELETE FROM street_segments WHERE raw_data->>'city' = 'City of North Vancouver'"
  );
  await pool.query(
    "DELETE FROM street_segments WHERE raw_data->>'city' = 'District of North Vancouver'"
  );
  await seedNorthVancouver();

  await cleanAndSeed("Delta", seedDelta);

  console.log("\n=== Fixing West Vancouver ===");
  await pool.query(
    "DELETE FROM street_segments WHERE raw_data->>'city' = 'West Vancouver'"
  );
  await seedWestVancouver();

  // Remote (Maple Ridge, White Rock, Pitt Meadows)
  console.log("\n=== Fixing Remote Metro ===");
  await pool.query(
    "DELETE FROM street_segments WHERE raw_data->>'city' IN ('Maple Ridge', 'White Rock', 'Pitt Meadows')"
  );
  await seedRemoteMetro();

  // Tri-Cities (Port Moody, Port Coquitlam)
  console.log("\n=== Fixing Tri-Cities ===");
  await pool.query(
    "DELETE FROM street_segments WHERE raw_data->>'city' IN ('Port Moody', 'Port Coquitlam', 'Anmore', 'Belcarra')"
  );
  await seedTriCities();

  console.log("\nALL FIXES COMPLETE.");
}

run().finally(() => pool.end());
