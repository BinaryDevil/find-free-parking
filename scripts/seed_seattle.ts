import { getDbPool } from "./seed_utils";
import { seedOsmParkingLots, seedOsmCityCoverage } from "./seed_osm_utils";

const pool = getDbPool();

async function getSeattleData() {
  const fs = await import("fs");
  const path = await import("path");
  const localFile = path.resolve(
    process.cwd(),
    "datasets/seattle_parking_meters.geojson"
  );

  if (fs.existsSync(localFile)) {
    console.log(`[Seattle] Reading from local file: ${localFile}`);
    const content = fs.readFileSync(localFile, "utf-8");
    return JSON.parse(content);
  }

  // Fallback API URL (ArcGIS FeatureServer Query for WGS84)
  const url =
    "https://services.arcgis.com/ZOyb2t4B0UYuYNYH/arcgis/rest/services/SDOT_Pay_Stations/FeatureServer/0/query?where=1%3D1&outFields=*&outSR=4326&f=geojson";
  console.log(
    `[Seattle] Local file not found. Fetching from FeatureService...`
  );
  const res = await fetch(url);
  if (!res.ok)
    throw new Error(`Failed to fetch Seattle data: ${res.statusText}`);
  return (await res.json()) as any;
}

export async function seedSeattle() {
  console.log("Starting Seattle Seeding...");
  try {
    const data = await getSeattleData();
    console.log(`[Seattle] Fetched ${data.features.length} records.`);

    let inserted = 0;
    // Batch Insert Logic
    const CHUNK_SIZE = 500;
    for (let i = 0; i < data.features.length; i += CHUNK_SIZE) {
      const chunk = data.features.slice(i, i + CHUNK_SIZE);
      const values: any[] = [];
      const placeholders: string[] = [];
      let paramIndex = 1;

      for (const item of chunk) {
        if (!item.geometry || item.geometry.type !== "Point") continue;

        const p = item.properties;
        // Seattle Pay Station Data Mapping based on typical fields:
        // UNITDESC -> pay_station_id (e.g., "ELP-112")
        // No obvious "type" field like "Single Head", assuming Pay Station kiosk.
        // CURRENT_RATE -> Rate info (if available, mostly dynamic)
        // PAID_AREA -> Restricted zone name?

        // Actually, let's inspect the data first (via raw_data) but we guess:
        const payStationId = p.ELMNTKEY || p.UNITID || `SEA-${inserted}`;
        const type = "Pay Station"; // Seattle uses kiosks
        const timeInEffect = "See Sign"; // Check signage
        const creditCard = true; // Seattle is modernized

        const normalizedProps = {
          ...p,
          city: "Seattle",
          // Standardized fields if we can map them
          // t_mf_9a_6p etc. require parsing complex schedules usually found in other tables.
          // For now, we store raw properties.
        };

        values.push(
          payStationId,
          type,
          timeInEffect,
          creditCard,
          JSON.stringify(item.geometry),
          JSON.stringify(normalizedProps)
        );

        const pi = () => `$${paramIndex++}`;
        const p1 = pi();
        const p2 = pi();
        const p3 = pi();
        const p4 = pi();
        const p5 = pi();
        const p6 = pi();

        placeholders.push(
          `(gen_random_uuid(), ${p1}, ${p2}, ${p3}, ${p4}, ST_GeomFromGeoJSON(${p5}), ${p6})`
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
          `[Seattle] Inserted batch ${i / CHUNK_SIZE + 1} (${inserted})`
        );
      }
    }

    // Seed Streets
    await seedSeattleStreets();

    // Seed Parking Lots (OSM)
    await seedOsmParkingLots("Seattle", "United States");

    // Seed Coverage (OSM)
    await seedOsmCityCoverage("Seattle", "United States");

    console.log(`[Seattle] Seeding Complete. Inserted ${inserted} meters.`);
  } catch (e) {
    console.error("Seattle Seeding Failed:", e);
  }
}

async function seedSeattleStreets() {
  console.log("[Seattle] Seeding Streets (Blockfaces)...");
  const url =
    "https://services.arcgis.com/ZOyb2t4B0UYuYNYH/arcgis/rest/services/Blockface/FeatureServer/1/query?where=1%3D1&outFields=*&outSR=4326&f=geojson";

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch streets");
    const data = (await res.json()) as any;
    console.log(`[Seattle] Fetched ${data.features?.length} street segments.`);

    if (!data.features) return;

    let inserted = 0;
    const CHUNK_SIZE = 500;
    for (let i = 0; i < data.features.length; i += CHUNK_SIZE) {
      const chunk = data.features.slice(i, i + CHUNK_SIZE);
      const values: any[] = [];
      const placeholders: string[] = [];
      let paramIndex = 1;

      for (const item of chunk) {
        if (!item.geometry || item.geometry.type !== "LineString") continue;
        const p = item.properties;

        // Map Seattle categories to our schema
        // PARKING_CATEGORY: 'Paid', 'Time Limited', 'No Parking', 'Restricted Parking Zone', 'Unrestricted'
        // STREET_USE: mapped from PARKING_CATEGORY or similar

        const category = p.PARKING_CATEGORY || "Unknown";
        let streetUse = category;
        // Simple mapping logic:
        // "Paid" -> "Paid"
        // "Restricted Parking Zone" -> "Permit"
        // "Unrestricted" -> "Free"

        const blockId = p.ELMNTKEY
          ? `SEA-${p.ELMNTKEY}`
          : `SEA-BLK-${inserted}`;

        // Meter Infos / Rules
        // We can put PEAK_HOUR info in meter_infos or just notes?
        // For now, let's just store the raw data and basic mapping.

        values.push(
          blockId,
          streetUse,
          JSON.stringify(item.geometry),
          JSON.stringify(p)
        );

        placeholders.push(
          `(gen_random_uuid(), $${paramIndex++}, $${paramIndex++}, ST_GeomFromGeoJSON($${paramIndex++}), $${paramIndex++})`
        );
        inserted++;
      }

      if (placeholders.length > 0) {
        const query = `
                    INSERT INTO street_segments (id, block_id, street_use, geom, raw_data)
                    VALUES ${placeholders.join(", ")}
                 `;
        await pool.query(query, values);
        console.log(
          `[Seattle] Inserted streets batch ${i / CHUNK_SIZE + 1} (${inserted})`
        );
      }
    }
  } catch (e: any) {
    console.error(`[Seattle] Streets seeding failed: ${e.message}`);
  }
}

// Allow direct execution
if (require.main === module) {
  seedSeattle().finally(() => pool.end());
}
