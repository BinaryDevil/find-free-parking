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
          // Cols: id, pay_station_id, meter_head, time_in_effect, credit_card, geom, raw_data
          // Values returned by mapper: [pay_station_id, meter_head, time_in_effect, credit_card, geomStr, rawData]
          // ID is gen_random_uuid(), but pg expects params or functions.
          // We can use DEFAULT if col has default, OR use gen_random_uuid() in Values list.
          // Original: VALUES (gen_random_uuid(), $1, $2, $3, $4, ST_GeomFromGeoJSON($5), $6)

          // So for each row, we push 6 params.
          values.push(...rowValues);
          const p = (inc: number) => `$${paramIndex++}`;
          rowPlaceholders = `(gen_random_uuid(), ${p(0)}, ${p(0)}, ${p(0)}, ${p(
            0
          )}, ST_GeomFromGeoJSON(${p(0)}), ${p(0)})`;
        } else if (tableName === "street_segments") {
          // Cols: id, block_id, street_use, geom, raw_data
          // Mapper returns: [block_id, street_use, geomStr, rawData]
          // Original: VALUES (gen_random_uuid(), $1, $2, ST_GeomFromGeoJSON($3), $4)
          values.push(...rowValues);
          const p = (inc: number) => `$${paramIndex++}`;
          rowPlaceholders = `(gen_random_uuid(), ${p(0)}, ${p(
            0
          )}, ST_GeomFromGeoJSON(${p(0)}), ${p(0)})`;
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
            ? "(id, pay_station_id, meter_head, time_in_effect, credit_card, geom, raw_data)"
            : "(id, block_id, street_use, geom, raw_data)"
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

      return [
        item.pay_phone,
        item.meterhead,
        item.timeineffe,
        item.creditcard === "Yes",
        JSON.stringify(geometry),
        JSON.stringify({ ...item, city: "Vancouver" }),
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
