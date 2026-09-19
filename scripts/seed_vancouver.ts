import { getDbPool } from "./seed_utils";
import {
  seedOsmParkingLots,
  seedOsmCityCoverage,
  seedOsmStreets,
} from "./seed_osm_utils";

const pool = getDbPool();

async function seedDataset(
  datasetName: string,
  tableName: string,
  mapper: (item: any) => any[] | null
) {
  const fs = await import("fs");
  const path = await import("path");

  // IDEMPOTENCY CHECK
  if (tableName === "parking_meters") {
    const check = await pool.query(
      "SELECT 1 FROM parking_meters WHERE raw_data->>'city' = 'Vancouver' LIMIT 1"
    );
    if ((check.rowCount || 0) > 0) {
      console.log("[Vancouver] Meters already exist. Skipping.");
      return;
    }
  } else if (tableName === "street_segments") {
    const check = await pool.query(
      "SELECT 1 FROM street_segments WHERE raw_data->>'hblock' IS NOT NULL LIMIT 1"
    );
    if ((check.rowCount || 0) > 0) {
      console.log("[Vancouver] Streets already exist. Skipping.");
      return;
    }
  }

  let data: any[] = [];
  const localFile = path.resolve(
    process.cwd(),
    `datasets/Canada/BC/Vancouver/vancouver_${datasetName.replace(
      "-",
      "_"
    )}.json`
  );

  if (fs.existsSync(localFile)) {
    console.log(`[Vancouver] Reading from local file: ${localFile}`);
    const content = fs.readFileSync(localFile, "utf-8");
    data = JSON.parse(content);
  } else {
    console.log(`[Vancouver] Local file not found. Fetching ${datasetName}...`);
    const url = `https://opendata.vancouver.ca/api/v2/catalog/datasets/${datasetName}/exports/json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    data = (await res.json()) as any[];
  }

  console.log(
    `[Vancouver] Loaded ${data.length} records. Inserting into ${tableName} (Batch Mode uses chunks of 500)...`
  );

  const CHUNK_SIZE = 500;
  let inserted = 0;

  for (let i = 0; i < data.length; i += CHUNK_SIZE) {
    const chunk = data.slice(i, i + CHUNK_SIZE);
    const values: any[] = [];
    const placeholders: string[] = [];
    let paramIndex = 1;

    for (const item of chunk) {
      try {
        const rowValues = mapper(item);
        if (!rowValues) continue;

        // Handle MultiLineString for streets
        if (tableName === "street_segments") {
          try {
            const rawGeom = JSON.parse(rowValues[2]);
            if (rawGeom.type === "MultiLineString") {
              if (rawGeom.coordinates && rawGeom.coordinates.length > 0) {
                rawGeom.type = "LineString";
                rawGeom.coordinates = rawGeom.coordinates[0];
                rowValues[2] = JSON.stringify(rawGeom);
              }
            }
          } catch (e) {
            // ignore parse error
          }
        }

        let rowPlaceholders = "";
        const s = paramIndex;
        paramIndex += 5;

        // Use explicit casts to avoid type errors
        if (tableName === "parking_meters") {
          // id, pay_station_id, meter_head, geom, raw_data, schedules
          rowPlaceholders = `(gen_random_uuid(), $${s}::text, $${
            s + 1
          }::text, ST_GeomFromGeoJSON($${s + 2}::json), $${s + 3}::jsonb, $${
            s + 4
          }::jsonb)`;
        } else if (tableName === "street_segments") {
          // id, block_id, street_use, geom, raw_data, schedules
          rowPlaceholders = `(gen_random_uuid(), $${s}::text, $${
            s + 1
          }::text, ST_GeomFromGeoJSON($${s + 2}::json), $${s + 3}::jsonb, $${
            s + 4
          }::jsonb)`;
        }

        values.push(...rowValues);
        placeholders.push(rowPlaceholders);
        inserted++;
      } catch (e: any) {
        // Skip individual errors
      }
    }

    if (placeholders.length > 0) {
      const query = `
        INSERT INTO ${tableName} 
        ${
          tableName === "parking_meters"
            ? "(id, pay_station_id, meter_head, geom, raw_data, schedules)"
            : "(id, block_id, street_use, geom, raw_data, schedules)"
        }
        VALUES ${placeholders.join(", ")}
      `;
      try {
        await pool.query(query, values);
        console.log(
          `[Vancouver] Inserted batch ${i / CHUNK_SIZE + 1} (${inserted} / ${
            data.length
          })`
        );
      } catch (e: any) {
        console.error(`[Vancouver] Batch Insert Failed: ${e.message}`);
      }
    }
  }

  console.log(
    `[Vancouver] Finished ${tableName}. Inserted ${inserted} records.`
  );
}

export async function seedVancouver() {
  console.log("Starting Vancouver Seeding...");
  try {
    // Seed Meters (Vancouver)
    await seedDataset("parking-meters", "parking_meters", (item) => {
      if (!item.geom || !item.geom.geometry) return null;
      const geometry = item.geom.geometry;

      // Parse Schedules
      const schedules = [];
      const blocks = [
        {
          days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
          start: "09:00",
          end: "18:00",
          rateKey: "r_mf_9a_6p",
          timeKey: "t_mf_9a_6p",
        },
        {
          days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
          start: "18:00",
          end: "22:00",
          rateKey: "r_mf_6p_10",
          timeKey: "t_mf_6p_10",
        },
        {
          days: ["Sat"],
          start: "09:00",
          end: "18:00",
          rateKey: "r_sa_9a_6p",
          timeKey: "t_sa_9a_6p",
        },
        {
          days: ["Sat"],
          start: "18:00",
          end: "22:00",
          rateKey: "r_sa_6p_10",
          timeKey: "t_sa_6p_10",
        },
        {
          days: ["Sun"],
          start: "09:00",
          end: "18:00",
          rateKey: "r_su_9a_6p",
          timeKey: "t_su_9a_6p",
        },
        {
          days: ["Sun"],
          start: "18:00",
          end: "22:00",
          rateKey: "r_su_6p_10",
          timeKey: "t_su_6p_10",
        },
      ];

      for (const b of blocks) {
        const rateStr = item[b.rateKey];
        if (rateStr) {
          const rate = parseFloat(rateStr.replace("$", ""));
          if (!isNaN(rate)) {
            const rule: any = {
              days: b.days,
              start: b.start,
              end: b.end,
              rate: rate,
            };
            schedules.push(rule);
          }
        }
      }

      return [
        item.pay_phone || "", // pay_station_id
        item.meterhead || "", // meter_head
        JSON.stringify(geometry),
        JSON.stringify({ ...item, city: "Vancouver" }),
        JSON.stringify(schedules),
      ];
    });

    // Seed Streets (Vancouver)
    await seedDataset("public-streets", "street_segments", (item) => {
      if (!item.geom || !item.geom.geometry) return null;
      const geometry = item.geom.geometry;

      const rawWithCity = {
        ...item,
        city: "Vancouver",
        source: "Vancouver Open Data",
      };

      return [
        item.hblock || "", // block_id
        item.streetuse || "Unknown", // street_use
        JSON.stringify(geometry),
        JSON.stringify(rawWithCity),
        "[]", // schedules
      ];
    });

    await seedOsmParkingLots("Vancouver");
    await seedOsmCityCoverage("Vancouver");

    console.log("Vancouver Seeding Complete.");
  } catch (e) {
    console.error("Vancouver Seeding Failed:", e);
  }
}

// Allow direct execution
if (require.main === module) {
  seedVancouver().finally(() => pool.end());
}
