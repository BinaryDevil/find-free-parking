import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { getDbPool } from "./seed_utils";
import { importLegacyBatch, geometryRecordId } from "./evidence-import";
import {
  seedOsmParkingLots,
  seedOsmCityCoverage,
  seedOsmStreets,
} from "./seed_osm_utils";

const pool = getDbPool();

export async function seedSurrey() {
  console.log("Starting Surrey Seeding...");

  {
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
          const projected = await pool.query(
            "SELECT ST_AsGeoJSON(ST_Transform(ST_SetSRID(ST_MakePoint($1, $2), 26910), 4326)) AS geom",
            [coords[0], coords[1]],
          );
          await importLegacyBatch(pool, "SURREY_METERS", "parking_meters", [
            payStationId, type, projected.rows[0].geom,
            JSON.stringify(normalizedProps), JSON.stringify([]),
          ], [geometryRecordId("pay-parking-stations", geom)]);
          inserted++;
        } catch {
          throw new Error("Surrey import failed; inspect privately");
        }
      }
      console.log(`[Surrey] Meters Inserted: ${inserted}.`);
    } else {
      console.log("[Surrey] JSON file not found despite download attempt.");
    }
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
