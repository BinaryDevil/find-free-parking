import { getDbPool } from "./seed_utils";
import { seedOsmParkingLots, seedOsmCityCoverage } from "./seed_osm_utils";

const pool = getDbPool();

async function getSeattleData() {
  const fs = await import("fs");
  const path = await import("path");
  const localFile = path.resolve(
    process.cwd(),
    "datasets/USA/WA/Seattle/seattle_parking_meters.geojson"
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
        // Seattle Pay Station Data Mapping
        const payStationId = p.ELMNTKEY || p.UNITID || `SEA-${inserted}`;
        const type = "Pay Station";

        // Parse Schedules
        const schedules: any[] = [];
        const daysMap: Record<string, string[]> = {
          WKD: ["Mon", "Tue", "Wed", "Thu", "Fri"],
          SAT: ["Sat"],
          SUN: ["Sun"],
        };

        const parseTime = (val: any) => {
          if (val === null || val === undefined) return null;
          const totalMins = Number(val);
          if (isNaN(totalMins)) return null;

          const hours = Math.floor(totalMins / 60);
          const mins = totalMins % 60;
          return `${String(hours).padStart(2, "0")}:${String(mins).padStart(
            2,
            "0"
          )}`;
        };

        for (const [prefix, days] of Object.entries(daysMap)) {
          for (let i = 1; i <= 3; i++) {
            const rate = p[`${prefix}_RATE${i}`];
            const start = p[`${prefix}_START${i}`];
            const end = p[`${prefix}_END${i}`];

            // Sometimes rate is 0 but it's a valid block? Or invalid?
            // Assuming if start/end exist, it's a valid block.
            if (start && end) {
              schedules.push({
                days,
                start: parseTime(start),
                end: parseTime(end),
                rate: rate ? parseFloat(rate) : 0,
              });
            }
          }
        }

        const normalizedProps = {
          ...p,
          city: "Seattle",
        };

        values.push(
          payStationId,
          type,
          JSON.stringify(item.geometry),
          JSON.stringify(normalizedProps),
          JSON.stringify(schedules)
        );

        const pi = () => `$${paramIndex++}`;
        const p1 = pi(); // pay_station_id
        const p2 = pi(); // meter_head
        // skipping time_in_effect, credit_card (dropped)
        const p3 = pi(); // geom
        const p4 = pi(); // raw_data
        const p5 = pi(); // schedules

        placeholders.push(
          `(gen_random_uuid(), ${p1}, ${p2}, ST_GeomFromGeoJSON(${p3}), ${p4}, ${p5})`
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

        // Normalize categories to match Global Schema / Frontend expectations
        const categoryMap: Record<string, string> = {
          "Paid Parking": "Paid",
          "Restricted Parking Zone": "Permit",
          "Unrestricted Parking": "Unrestricted",
          "Time Limited Parking": "Time Limited",
          "No Parking Allowed": "No Parking",
          "Car Pool Parking": "Permit", // Treat carpool as permit/restricted
        };

        if (categoryMap[category]) {
          streetUse = categoryMap[category];
        }

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
          JSON.stringify(p),
          JSON.stringify([]) // schedules
        );

        placeholders.push(
          `(gen_random_uuid(), $${paramIndex++}, $${paramIndex++}, ST_GeomFromGeoJSON($${paramIndex++}), $${paramIndex++}, $${paramIndex++})`
        );
        inserted++;
      }

      if (placeholders.length > 0) {
        const query = `
                    INSERT INTO street_segments (id, block_id, street_use, geom, raw_data, schedules)
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
