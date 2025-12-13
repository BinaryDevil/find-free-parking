import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { getDbPool } from "./seed_utils";
import {
  seedOsmParkingLots,
  seedOsmCityCoverage,
  seedOsmStreets,
} from "./seed_osm_utils";

const pool = getDbPool();

export async function seedSurrey() {
  console.log("Starting Surrey Seeding...");

  // Check if meters exist
  const checkMeters = await pool.query(
    "SELECT 1 FROM parking_meters WHERE raw_data->>'city' = 'Surrey' LIMIT 1"
  );

  if (checkMeters.rowCount === 0) {
    const extractDir = path.resolve(
      process.cwd(),
      "datasets/Canada/BC/Surrey/surrey_data"
    );

    if (!fs.existsSync(extractDir)) {
      console.log("[Surrey] Sample data not found. Downloading...");
      const zipPath = "surrey_pk.zip"; // Temp
      const url =
        "https://cosmos.surrey.ca/geo_ref/Images/OpenDataArchives/pay_parking_stations_JSON.zip";
      try {
        execSync(`curl -L -s -o ${zipPath} "${url}"`);
        execSync(`unzip -o -q ${zipPath} -d ${extractDir}`);
        fs.rmSync(zipPath);
      } catch (e) {
        console.error("[Surrey] Failed to download/unzip data:", e);
      }
    } else {
      console.log("[Surrey] Using existing data in datasets/surrey_data");
    }

    const files = fs.existsSync(extractDir) ? fs.readdirSync(extractDir) : [];
    const jsonFile = files.find((f) => f.endsWith(".json"));

    if (jsonFile) {
      const content = fs.readFileSync(path.join(extractDir, jsonFile), "utf-8");
      const data = JSON.parse(content);

      console.log(
        `[Surrey] Found ${data.features.length} records. Inserting...`
      );
      let inserted = 0;

      for (const item of data.features) {
        const p = item.properties;
        const geom = item.geometry;
        if (!geom || geom.type !== "Point") continue;

        const coords = geom.coordinates; // [x, y] in UTM 10N

        const payStationId =
          p.METER_ID || p.METER_STATION || `Surrey-${inserted}`;
        const type = p.METER_TYPE;

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
      console.log(`[Surrey] Meters Inserted: ${inserted}.`);
    } else {
      console.log("[Surrey] JSON file not found despite download attempt.");
    }
  } else {
    console.log("[Surrey] Meters already exist. Skipping meter insert.");
  }

  // Seed lots from OSM
  await seedOsmParkingLots("Surrey");

  // Seed City Coverage
  await seedOsmCityCoverage("Surrey");

  // Seed Streets
  await seedOsmStreets("Surrey", "BC");

  console.log(`[Surrey] Seeding Complete.`);
}

// Allow standalone run
if (require.main === module) {
  seedSurrey().finally(() => pool.end());
}
