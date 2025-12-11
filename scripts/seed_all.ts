import { seedVancouver } from "./seed_vancouver";
import { seedCoquitlam } from "./seed_coquitlam";
import { getDbPool } from "./seed_utils";

const pool = getDbPool();

async function runAll() {
  console.log("=== STARTING MASTER SEED ===");
  try {
    // 1. Vancouver
    await seedVancouver();

    // 2. Coquitlam (Placeholder until URL verified)
    await seedCoquitlam();

    // 3. Others...

    console.log("=== ALL SEEDING COMPLETE ===");
  } catch (e) {
    console.error("Master Seeding Failed:", e);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runAll();
