import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { getDbPool } from "./seed_utils";
import { seedOsmParkingLots, seedOsmCityCoverage } from "./seed_osm_utils";

const pool = getDbPool();

export async function seedSurrey() {
  const extractDir = path.resolve(
    process.cwd(),
    "datasets/Canada/BC/Surrey/surrey_data"
  );

  if (!fs.existsSync(extractDir)) {
    console.log("[Surrey] Sample data not found. Downloading...");
    // Fallback download logic (simplified or kept as original but redirecting to sample_data?)
    // Since we manually downloaded, we expect it to be there.
    // If missing, we can error or download. Let's keep download for robustness but point to sample_data.
    // Actually, better to just error or try to find it.
    // For now, I will assume it's there or download if not.

    const zipPath = "surrey_pk.zip"; // Temp
    const url =
      "https://cosmos.surrey.ca/geo_ref/Images/OpenDataArchives/pay_parking_stations_JSON.zip";
    execSync(`curl -L -s -o ${zipPath} "${url}"`);
    execSync(`unzip -o -q ${zipPath} -d ${extractDir}`);
    fs.rmSync(zipPath);
  } else {
    console.log("[Surrey] Using existing data in datasets/surrey_data");
  }

  const files = fs.readdirSync(extractDir);
  const jsonFile = files.find((f) => f.endsWith(".json"));
  if (!jsonFile) return;

  const content = fs.readFileSync(path.join(extractDir, jsonFile), "utf-8");
  const data = JSON.parse(content);

  console.log(`[Surrey] Found ${data.features.length} records. Inserting...`);
  let inserted = 0;

  for (const item of data.features) {
    const p = item.properties;
    const geom = item.geometry;
    if (!geom || geom.type !== "Point") continue;

    const coords = geom.coordinates; // [x, y] in UTM 10N

    const payStationId = p.METER_ID || p.METER_STATION || `Surrey-${inserted}`;
    const type = p.METER_TYPE;
    const timeInEffect = p.OPERATION_HOURS || "See Sign";

    // Normalize
    const normalizedProps = {
      ...p,
      city: "Surrey",
      t_mf_9a_6p: p.OPERATION_HOURS,
      r_mf_9a_6p: p.HOURLY_RATE || "See Sign",
    };

    try {
      await pool.query(
        `
                INSERT INTO parking_meters (id, pay_station_id, meter_head, geom, raw_data, schedules)
                VALUES (
                    gen_random_uuid(), 
                    $1, 
                    $2, 
                    ST_Transform(ST_SetSRID(ST_MakePoint($3, $4), 26910), 4326), 
                    $5,
                    $6
                )
            `,
        [
          payStationId,
          type,
          coords[0],
          coords[1],
          JSON.stringify(normalizedProps),
          JSON.stringify([]), // Empty schedules for now
        ]
      );
      inserted++;
    } catch (e) {
      console.error(`[Surrey] Insert failed for ${payStationId}:`, e);
    }
  }

  // Seed lots from OSM
  await seedOsmParkingLots("Surrey");

  // Seed City Coverage
  await seedOsmCityCoverage("Surrey");

  console.log(`[Surrey] Seeding Complete. Inserted ${inserted}.`);

  // Cleanup - do not delete sample_data
  // fs.rmSync(zipPath); // zipPath was handled in block
  // fs.rmSync(extractDir, { recursive: true, force: true });
}

// Allow standalone run
if (require.main === module) {
  seedSurrey();
}
