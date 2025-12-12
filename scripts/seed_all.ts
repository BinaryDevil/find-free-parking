import { seedVancouver } from "./seed_vancouver";
import { seedCoquitlam } from "./seed_coquitlam";
import { seedSurrey } from "./seed_surrey";
import { seedSeattle } from "./seed_seattle";
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
    // 1. Vancouver
    let skipVancouver = false;
    if (!shouldClean) {
      const vanCount = await pool.query(
        "SELECT count(*) FROM parking_meters WHERE raw_data->>'city' = 'Vancouver'"
      );
      if (parseInt(vanCount.rows[0].count) > 0) {
        console.log(
          `[Vancouver] Data exists (${vanCount.rows[0].count} items). Skipping seed.`
        );
        skipVancouver = true;
      }
    }
    if (!skipVancouver) {
      await seedVancouver();
    }

    // 2. Coquitlam
    let skipCoquitlam = false;
    if (!shouldClean) {
      const coqCount = await pool.query(
        "SELECT count(*) FROM parking_meters WHERE raw_data->>'city' = 'Coquitlam'"
      );
      if (parseInt(coqCount.rows[0].count) > 0) {
        console.log(
          `[Coquitlam] Data exists (${coqCount.rows[0].count} items). Skipping seed.`
        );
        skipCoquitlam = true;
      }
    }
    if (!skipCoquitlam) {
      await seedCoquitlam();
    }

    // 3. Surrey
    let skipSurrey = false;
    if (!shouldClean) {
      const surreyCount = await pool.query(
        "SELECT count(*) FROM parking_meters WHERE raw_data->>'city' = 'Surrey'"
      );
      if (parseInt(surreyCount.rows[0].count) > 0) {
        console.log(
          `[Surrey] Data exists (${surreyCount.rows[0].count} items). Skipping seed.`
        );
        skipSurrey = true;
      }
    }
    if (!skipSurrey) {
      await seedSurrey();
    }

    // 4. Seattle
    let skipSeattle = false;
    if (!shouldClean) {
      const seattleCount = await pool.query(
        "SELECT count(*) FROM parking_meters WHERE raw_data->>'city' = 'Seattle'"
      );
      if (parseInt(seattleCount.rows[0].count) > 0) {
        console.log(
          `[Seattle] Data exists (${seattleCount.rows[0].count} items). Skipping seed.`
        );
        skipSeattle = true;
      }
    }
    if (!skipSeattle) {
      await seedSeattle();
    }

    // 5. New York

    // 5. Note on zones
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
