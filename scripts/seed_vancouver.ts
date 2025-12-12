import { getDbPool } from "./seed_utils";
import { seedOsmParkingLots, seedOsmCityCoverage } from "./seed_osm_utils";

const pool = getDbPool();

async function seedDataset(
  datasetName: string,
  tableName: string,
  mapper: (item: any) => any[] | null
) {
  const fs = await import("fs");
  const path = await import("path");

  let data: any[] = [];
  const localFile = path.resolve(
    process.cwd(),
    `datasets/vancouver_${datasetName.replace("-", "_")}.json`
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

        // Construct ($1, $2, ...)
        // rowValues corresponds to params passed to INSERT
        // But parameters differ by table.
        // We know the columns and order from the mapper/original code.

        let rowPlaceholders = "";

        if (tableName === "parking_meters") {
          // Cols: id, pay_station_id, meter_head, geom, raw_data, schedules
          values.push(...rowValues);
          // 5 params passed: pay_station_id, meter_head, geomStr, rawData, schedules
          const p = (inc: number) => `$${paramIndex++}`;
          rowPlaceholders = `(gen_random_uuid(), ${p(0)}, ${p(
            0
          )}, ST_GeomFromGeoJSON(${p(0)}), ${p(0)}, ${p(0)})`;
        } else if (tableName === "street_segments") {
          // Cols: id, block_id, street_use, geom, raw_data, schedules
          values.push(...rowValues);
          // 4 params passed + 1 computed schedules? No, mapper should return 5.
          // array: [block_id, street_use, geom, raw, schedules]
          const p = (inc: number) => `$${paramIndex++}`;
          rowPlaceholders = `(gen_random_uuid(), ${p(0)}, ${p(
            0
          )}, ST_GeomFromGeoJSON(${p(0)}), ${p(0)}, ${p(0)})`;
        }
        placeholders.push(rowPlaceholders);
        inserted++;
      } catch (e: any) {
        // Skip individual errors in mapper?
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
        const timeStr = item[b.timeKey];
        // Rate typically "$1.00" or "$3.50"
        if (rateStr) {
          const rate = parseFloat(rateStr.replace("$", ""));
          // simple check if rate is valid
          if (!isNaN(rate)) {
            const rule: any = {
              days: b.days,
              start: b.start,
              end: b.end,
              rate: rate,
            };
            if (timeStr) {
              // Parse time formatting "2 Hr", "30 min" etc?
              // For now just store string or simplified logical max stay logic if available
              // or just generic max_stay
            }
            schedules.push(rule);
          }
        }
      }

      return [
        item.pay_phone,
        item.meterhead,
        JSON.stringify(geometry),
        JSON.stringify({ ...item, city: "Vancouver" }),
        JSON.stringify(schedules),
      ];
    });

    // Seed Streets (Vancouver)
    await seedDataset("public-streets", "street_segments", (item) => {
      if (!item.geom || !item.geom.geometry) return null;
      const geometry = item.geom.geometry;

      return [
        item.hblock,
        item.streetuse,
        JSON.stringify(geometry),
        JSON.stringify(item),
        "[]", // empty schedules for now
      ];
    });

    // Seed Lots (Parking Zones) from OSM (and later Official if found)
    await seedOsmParkingLots("Vancouver");

    // Seed City Coverage
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
