import { getDbPool } from "./seed_utils";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import util from "util";

const execPromise = util.promisify(exec);

const REQUEST_THRESHOLD = 10;

async function automateSeeding() {
  const pool = getDbPool();
  try {
    console.log("--- Starting Automation Job ---");
    console.log(`Checking for cities with > ${REQUEST_THRESHOLD} requests...`);

    // 1. Find high-demand cities not yet active
    // We normalize city names for comparison (lowercase)
    const query = `
      SELECT lower(city_name) as city_key, MAX(city_name) as display_name, COUNT(*) as count
      FROM city_requests
      GROUP BY lower(city_name)
      HAVING COUNT(*) > $1
    `;

    const { rows: requestedCities } = await pool.query(query, [
      REQUEST_THRESHOLD,
    ]);

    if (requestedCities.length === 0) {
      console.log("No cities meet the threshold.");
      return;
    }

    // 2. Filter out already covered cities
    const coveredRes = await pool.query(
      "SELECT lower(city_name) as city_key FROM covered_cities WHERE is_active = true"
    );
    const coveredSet = new Set(coveredRes.rows.map((r) => r.city_key));

    const citiesToSeed = requestedCities.filter(
      (r) => !coveredSet.has(r.city_key)
    );

    if (citiesToSeed.length === 0) {
      console.log("All high-demand cities are already covered.");
      return;
    }

    console.log(
      `Found ${citiesToSeed.length} candidates:`,
      citiesToSeed.map((c) => `${c.display_name} (${c.count})`).join(", ")
    );

    // 3. Attempt to seed each
    for (const city of citiesToSeed) {
      const normalizedName = city.city_key.replace(/\s+/g, "_"); // e.g., "maple ridge" -> "maple_ridge"
      const scriptName = `seed_${normalizedName}.ts`;
      const scriptPath = path.join(process.cwd(), "scripts", scriptName);

      if (fs.existsSync(scriptPath)) {
        console.log(
          `[${city.display_name}] Seeding script found (${scriptName}). Executing...`
        );
        try {
          const { stdout, stderr } = await execPromise(
            `npx tsx scripts/${scriptName}`
          );
          console.log(`[${city.display_name}] Output:\n`, stdout);
          if (stderr) console.error(`[${city.display_name}] Errors:\n`, stderr);
          console.log(`[${city.display_name}] ✅ Seeding completed.`);
        } catch (err: any) {
          console.error(
            `[${city.display_name}] ❌ Execution failed:`,
            err.message
          );
        }
      } else {
        console.log(
          `[${city.display_name}] ⚠️ No seeding script found (expected ${scriptName}). Skipping.`
        );
        // Optional: Send alert/notification to admin
      }
    }
  } catch (err) {
    console.error("Automation job failed:", err);
  } finally {
    await pool.end();
    console.log("--- Job Finished ---");
  }
}

automateSeeding();
