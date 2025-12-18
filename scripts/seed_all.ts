import { seedVancouver } from "./seed_vancouver";
import { seedCoquitlam } from "./seed_coquitlam";
import { seedSurrey } from "./seed_surrey";
import { seedBurnaby } from "./seed_burnaby";
import { seedRichmond } from "./seed_richmond";
import { seedNewWestminster } from "./seed_new_westminster";
import { seedNorthVancouver } from "./seed_north_vancouver";
import { seedDelta } from "./seed_delta";
import { seedLangley } from "./seed_langley";
import { seedTriCities } from "./seed_tri_cities";
import { seedWestVancouver } from "./seed_west_vancouver";
import { seedRemoteMetro } from "./seed_remote_metro";
import { seedRedmond } from "./seed_redmond";
import { seedKirkland } from "./seed_kirkland";
import { seedBellevue } from "./seed_bellevue";
import { seedSeattle } from "./seed_seattle";
import { seedMapleRidge } from "./seed_maple_ridge";
import { seedCouncilBluffs } from "./seed_council_bluffs";
import { seedAshburn } from "./seed_ashburn";
import { seedBoardman } from "./seed_boardman";
import { seedNewYork } from "./seed_new_york";
import { seedAspen } from "./seed_aspen";
import { seedWarsaw } from "./seed_warsaw";
import { seedAmsterdam } from "./seed_amsterdam";

import { getDbPool } from "./seed_utils";
import { clearDatabase } from "./clear_db";

const pool = getDbPool();

async function runAll() {
  const args = process.argv.slice(2);
  const shouldClean = args.includes("--clean");

  console.log("=== STARTING MASTER SEED ===");
  if (shouldClean) {
    // 0. Clear Database
    await clearDatabase();
  } else {
    console.log("Skipping DB Clear (Use --clean to wipe DB)");
  }

  try {
    // Helper to check if we should skip a city based on meters or coverage
    const shouldSkip = async (cityName: string) => {
      if (shouldClean) return false;

      let hasMeters = false;
      let hasStreets = false;
      let hasCoverage = false;

      // Check for meters
      const meterCount = await pool.query(
        "SELECT 1 FROM parking_meters WHERE raw_data->>'city' = $1 LIMIT 1",
        [cityName]
      );
      hasMeters = (meterCount.rowCount || 0) > 0;

      // Check for streets
      const streetCount = await pool.query(
        "SELECT 1 FROM street_segments WHERE raw_data->>'city' = $1 LIMIT 1",
        [cityName]
      );
      hasStreets = (streetCount.rowCount || 0) > 0;

      // Check for coverage
      const coverageCount = await pool.query(
        "SELECT 1 FROM covered_cities WHERE city_name = $1 LIMIT 1",
        [cityName]
      );
      hasCoverage = (coverageCount.rowCount || 0) > 0;

      // Skip if we have minimal data.
      // If we have meters (or coverage) AND streets, we are good.
      // Vancouver has meters + streets.
      // Burnaby has coverage + streets (no meters).
      // So: (hasMeters || hasCoverage) && hasStreets

      if ((hasMeters || hasCoverage) && hasStreets) {
        console.log(
          `[${cityName}] Data exists (Meters:${hasMeters}, Streets:${hasStreets}). Skipping seed.`
        );
        return true;
      }

      console.log(
        `[${cityName}] Missing data (Meters:${hasMeters}, Streets:${hasStreets}, Coverage:${hasCoverage}). Running seed...`
      );
      return false;
    };

    const seedIfMissing = async (name: string, fn: () => Promise<void>) => {
      if (await shouldSkip(name)) {
        console.log(`[${name}] Data exists. Skipping seed.`);
      } else {
        await fn();
      }
    };

    // 1. Core Metro Vancouver (with potential Meter Data)
    await seedIfMissing("Vancouver", seedVancouver);
    await seedIfMissing("Coquitlam", seedCoquitlam);
    await seedIfMissing("Surrey", seedSurrey);

    // 2. Metro Vancouver (OSM/Fallback mainly)
    await seedIfMissing("Burnaby", seedBurnaby);
    await seedIfMissing("Richmond", seedRichmond);
    await seedIfMissing("New Westminster", seedNewWestminster);
    await seedIfMissing("North Vancouver", seedNorthVancouver); // Checks "North Vancouver"
    await seedIfMissing("Delta", seedDelta);
    await seedIfMissing("Langley City", seedLangley); // Check Langley City, script handles Township too
    await seedIfMissing("Port Coquitlam", seedTriCities); // Check PoCo, script handles PoMo/Anmore
    await seedIfMissing("West Vancouver", seedWestVancouver);
    await seedIfMissing("White Rock", seedRemoteMetro); // Check White Rock, script handles MR/PM

    // 3. US Cities
    await seedIfMissing("Seattle", seedSeattle);
    // Redmond, Kirkland, Bellevue
    console.log("Seeding US Cities...");
    await seedRedmond();
    await seedKirkland();
    await seedBellevue();

    // 4. Analytics Top 10 Cities
    console.log("Seeding Analytics Top Cities...");
    await seedIfMissing("Maple Ridge", seedMapleRidge);
    await seedIfMissing("Council Bluffs", seedCouncilBluffs);
    await seedIfMissing("Ashburn", seedAshburn);
    await seedIfMissing("Boardman", seedBoardman);
    await seedIfMissing("New York", seedNewYork);
    await seedIfMissing("Aspen", seedAspen);
    await seedIfMissing("Warsaw", seedWarsaw);
    await seedIfMissing("Amsterdam", seedAmsterdam);

    // 4. Note on zones
    const zonesCount = await pool.query("SELECT count(*) FROM parking_zones");
    if (parseInt(zonesCount.rows[0].count) > 0) {
      console.log(
        `[ParkingLots] Zones exist (${zonesCount.rows[0].count} items).`
      );
    }

    console.log("=== ALL SEEDING COMPLETE ===");
  } catch (e) {
    console.error("Master Seeding Failed:", e);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runAll();
