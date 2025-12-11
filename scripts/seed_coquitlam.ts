import { getDbPool } from "./seed_utils";
import { seedOsmParkingLots, seedOsmCityCoverage } from "./seed_osm_utils";

const pool = getDbPool();

async function getCoquitlamData() {
  const fs = await import("fs");
  const path = await import("path");
  const localFile = path.resolve(
    process.cwd(),
    "datasets/coquitlam_parking_meters.geojson"
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
    // URL: https://maps.coquitlam.ca/arcgis/rest/services/DynamicServices/Transportation/MapServer/8

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
        const payStationId = p.STATION_ID || p.PAY_STATION_ID || "Coq-Station";

        const normalizedProps = {
          ...p,
          t_mf_9a_6p: limit,
          r_mf_9a_6p: rate,
          city: "Coquitlam",
        };

        const isPoint = item.geometry.type === "Point";
        // Params: payStationId, type, timeInEffect ("Check Sign"), creditCard (false), geometryStr, rawData

        values.push(
          payStationId,
          type,
          "Check Sign",
          false,
          JSON.stringify(item.geometry),
          JSON.stringify(normalizedProps)
        );

        const pi = () => `$${paramIndex++}`;
        const p1 = pi(); // payStationId
        const p2 = pi(); // type
        const p3 = pi(); // time
        const p4 = pi(); // credit_card
        const p5 = pi(); // geom
        const p6 = pi(); // raw_data

        const geomExpr = `ST_Centroid(ST_GeomFromGeoJSON(${p5}))`;

        placeholders.push(
          `(gen_random_uuid(), ${p1}, ${p2}, ${p3}, ${p4}, ${geomExpr}, ${p6})`
        );
        inserted++;
      }

      if (placeholders.length > 0) {
        const query = `
                INSERT INTO parking_meters (id, pay_station_id, meter_head, time_in_effect, credit_card, geom, raw_data)
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
    await seedOsmParkingLots("Coquitlam");
    await seedOsmCityCoverage("Coquitlam");

    console.log(`[Coquitlam] Seeding Complete. Inserted ${inserted}.`);
  } catch (e) {
    console.error("Coquitlam Seeding Failed:", e);
  }
}

// Allow direct execution
if (require.main === module) {
  seedCoquitlam().finally(() => pool.end());
}
