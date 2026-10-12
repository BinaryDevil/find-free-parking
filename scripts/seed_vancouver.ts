import { getDbPool } from "./seed_utils";
import { importLegacyBatch, sourceRecordId, geometryRecordId } from "./evidence-import";
import {
  seedOsmParkingLots,
  seedOsmCityCoverage,
  seedOsmStreets,
} from "./seed_osm_utils";

const pool = getDbPool();

async function seedDataset(
  datasetName: string,
  tableName: "parking_meters" | "street_segments",
  mapper: (item: any) => any[] | null
) {
  const fs = await import("fs");
  const path = await import("path");

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
    const recordIds: string[] = [];

    for (const item of chunk) {
      const rowValues = mapper(item);
      if (!rowValues) continue;
      const geometry = JSON.parse(rowValues[2]);
      recordIds.push(tableName === "parking_meters"
        ? sourceRecordId(item.meterid)
        : geometryRecordId(item.hblock, geometry));
      // Preserve the existing first-line projection of MultiLineString exports.
      if (tableName === "street_segments" && geometry.type === "MultiLineString") {
        geometry.type = "LineString";
        geometry.coordinates = geometry.coordinates[0];
        rowValues[2] = JSON.stringify(geometry);
      }
      values.push(...rowValues);
      inserted++;
    }

    if (recordIds.length > 0) {
      await importLegacyBatch(pool, tableName === "parking_meters" ? "VANCOUVER_METERS" : "VANCOUVER_STREETS", tableName, values, recordIds);
      console.log(`[Vancouver] Imported batch ${i / CHUNK_SIZE + 1} (${inserted} / ${data.length})`);
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
