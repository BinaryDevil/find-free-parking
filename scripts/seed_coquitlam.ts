import { getDbPool } from "./seed_utils";
import { importLegacyBatch, sourceRecordId } from "./evidence-import";
import {
  seedOsmParkingLots,
  seedOsmCityCoverage,
  seedOsmStreets,
} from "./seed_osm_utils";

const pool = getDbPool();

async function getCoquitlamData() {
  const fs = await import("fs");
  const path = await import("path");
  const localFile = path.resolve(
    process.cwd(),
    "datasets/Canada/BC/Coquitlam/coquitlam_parking_meters.geojson"
  );

  if (fs.existsSync(localFile)) {
    console.log(`[Coquitlam] Reading from local file: ${localFile}`);
    const content = fs.readFileSync(localFile, "utf-8");
    return JSON.parse(content);
  }

  const url =
    "https://services2.arcgis.com/Q6Lq3evZUGfPrN7o/arcgis/rest/services/Transportation/FeatureServer/6/query?where=1=1&outFields=*&f=geojson";
  console.log(`[Coquitlam] Local file not found. Fetching ${url}...`);
  const res = await fetch(url);
  if (!res.ok)
    throw new Error(`Failed to fetch Coquitlam data: ${res.statusText}`);
  return (await res.json()) as any; // FeatureCollection
}

export async function seedCoquitlam() {
  console.log("Starting Coquitlam Seeding...");
  try {
    // Coquitlam "On Street Pay Parking"
    {
      const data = await getCoquitlamData();
      console.log(`[Coquitlam] Fetched ${data.features.length} records.`);

      let inserted = 0;
      // Batch Insert Logic
      const CHUNK_SIZE = 500;
      for (let i = 0; i < data.features.length; i += CHUNK_SIZE) {
        const chunk = data.features.slice(i, i + CHUNK_SIZE);
        const values: any[] = [];
        const recordIds: string[] = [];

        for (const item of chunk) {
          if (!item.geometry) continue;

          // Mapping logic copy-paste
          const p = item.properties;
          const rate = p.RATE_HOUR ? `$${p.RATE_HOUR}/hr` : null;
          const limit = p.TIME_LIMITS;
          const type = p.TYPE;
          const payStationId =
            p.STATION_ID || p.PAY_STATION_ID || "Coq-Station";

          const normalizedProps = {
            ...p,
            t_mf_9a_6p: limit,
            r_mf_9a_6p: rate,
            city: "Coquitlam",
          };

          const isPoint = item.geometry.type === "Point";
          // Params: payStationId, type, geometryStr, rawData, schedules
          values.push(
            payStationId,
            type,
            JSON.stringify(item.geometry),
            JSON.stringify(normalizedProps),
            JSON.stringify([]) // Empty schedules for now
          );

          recordIds.push(sourceRecordId(item.id ?? p.OBJECTID));
          inserted++;
        }

        if (recordIds.length > 0) {
          await importLegacyBatch(pool, "COQUITLAM_METERS", "parking_meters", values, recordIds);
          console.log(
            `[Coquitlam] Inserted batch ${i / CHUNK_SIZE + 1} (${inserted} / ${
              data.features.length
            })`
          );
        }
      }
      console.log(`[Coquitlam] Meters Inserted: ${inserted}.`);
    }

    // Parking Lots (OSM)
    await seedOsmParkingLots("Coquitlam");

    // City Coverage (OSM)
    await seedOsmCityCoverage("Coquitlam");

    // Streets (OSM Fallback)
    await seedOsmStreets("Coquitlam", "BC");

    console.log(`[Coquitlam] Seeding Complete.`);
  } catch (e) {
    console.error("Coquitlam Seeding Failed:", e);
  }
}

// Allow direct execution
if (require.main === module) {
  seedCoquitlam().finally(() => pool.end());
}
