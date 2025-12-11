import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { getDbPool } from "./seed_utils";

const pool = getDbPool();

export async function seedSurrey() {
  const url =
    "https://cosmos.surrey.ca/geo_ref/Images/OpenDataArchives/pay_parking_stations_JSON.zip";
  const zipPath = "surrey_pk.zip";
  const extractDir = "surrey_data_temp";

  console.log("[Surrey] Downloading...");
  execSync(`curl -L -s -o ${zipPath} "${url}"`);

  console.log("[Surrey] Unzipping...");
  execSync(`unzip -o -q ${zipPath} -d ${extractDir}`);

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
                INSERT INTO parking_meters (id, pay_station_id, meter_head, time_in_effect, credit_card, geom, raw_data)
                VALUES (
                    gen_random_uuid(), 
                    $1, 
                    $2, 
                    $3, 
                    $4, 
                    ST_Transform(ST_SetSRID(ST_MakePoint($5, $6), 26910), 4326), 
                    $7
                )
            `,
        [
          payStationId,
          type,
          timeInEffect,
          false, // Assume false/unknown for CC
          coords[0],
          coords[1],
          JSON.stringify(normalizedProps),
        ]
      );
      inserted++;
    } catch (e) {
      console.error(`[Surrey] Insert failed for ${payStationId}:`, e);
    }
  }

  console.log(`[Surrey] Seeding Complete. Inserted ${inserted}.`);

  // Cleanup
  fs.rmSync(zipPath);
  fs.rmSync(extractDir, { recursive: true, force: true });
}

// Allow standalone run
if (require.main === module) {
  seedSurrey();
}
