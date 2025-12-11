import { seedVancouver } from "./seed_vancouver";
import { seedCoquitlam } from "./seed_coquitlam";
import { seedSurrey } from "./seed_surrey";
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
    const vanCount = await pool.query(
      "SELECT count(*) FROM parking_meters WHERE raw_data->>'city' = 'Vancouver'"
    );
    if (parseInt(vanCount.rows[0].count) > 0) {
      console.log(
        `[Vancouver] Data exists (${vanCount.rows[0].count} items). Skipping seed.`
      );
    } else {
      await seedVancouver();
    }

    // 2. Coquitlam
    const coqCount = await pool.query(
      "SELECT count(*) FROM parking_meters WHERE raw_data->>'city' = 'Coquitlam'"
    );
    if (parseInt(coqCount.rows[0].count) > 0) {
      console.log(
        `[Coquitlam] Data exists (${coqCount.rows[0].count} items). Skipping seed.`
      );
    } else {
      await seedCoquitlam();
    }

    // 3. Surrey
    const surreyCount = await pool.query(
      "SELECT count(*) FROM parking_meters WHERE raw_data->>'city' = 'Surrey'"
    );
    if (parseInt(surreyCount.rows[0].count) > 0) {
      console.log(
        `[Surrey] Data exists (${surreyCount.rows[0].count} items). Skipping seed.`
      );
    } else {
      await seedSurrey();
    }

    // 4. Others...

    console.log("=== ALL SEEDING COMPLETE ===");
  } catch (e) {
    console.error("Master Seeding Failed:", e);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runAll();
