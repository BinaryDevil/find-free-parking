import { getDbPool } from "./seed_utils";
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
    const checkMeters = await pool.query(
      "SELECT 1 FROM parking_meters WHERE raw_data->>'city' = 'Coquitlam' LIMIT 1"
    );

    if (checkMeters.rowCount === 0) {
      const data = await getCoquitlamData();
      console.log(`[Coquitlam] Fetched ${data.features.length} records.`);

      let inserted = 0;
      // Batch Insert Logic
      const CHUNK_SIZE = 500;
      for (let i = 0; i < data.features.length; i += CHUNK_SIZE) {
        const chunk = data.features.slice(i, i + CHUNK_SIZE);
        const values: any[] = [];
        const placeholders: string[] = [];
        let paramIndex = 1;

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

          const pi = () => `$${paramIndex++}`;
          const p1 = pi(); // payStationId
          const p2 = pi(); // type
          const p3 = pi(); // geom
          const p4 = pi(); // raw_data
          const p5 = pi(); // schedules

          // If it's a point, use it. If polygon (rare for meters?), centroid.
          const geomExpr = `ST_Centroid(ST_GeomFromGeoJSON(${p3}))`;

          placeholders.push(
            `(gen_random_uuid(), ${p1}, ${p2}, ${geomExpr}, ${p4}, ${p5})`
          );
          inserted++;
        }

        if (placeholders.length > 0) {
          const query = `
                    INSERT INTO parking_meters (id, pay_station_id, meter_head, geom, raw_data, schedules)
                    VALUES ${placeholders.join(", ")}
                `;
          await pool.query(query, values);
          console.log(
            `[Coquitlam] Inserted batch ${i / CHUNK_SIZE + 1} (${inserted} / ${
              data.features.length
            })`
          );
        }
      }
      console.log(`[Coquitlam] Meters Inserted: ${inserted}.`);
    } else {
      console.log("[Coquitlam] Meters already exist. Skipping meter insert.");
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
