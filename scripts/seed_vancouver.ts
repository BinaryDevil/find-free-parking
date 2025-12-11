import { getDbPool } from "./seed_utils";
import { seedOsmParkingLots, seedOsmCityCoverage } from "./seed_osm_utils";

const pool = getDbPool();

async function seedDataset(
  datasetId: string,
  tableName: string,
  mapper: (item: any) => any[] | null
) {
  console.log(`[Vancouver] Fetching ${datasetId}...`);
  const url = `https://opendata.vancouver.ca/api/v2/catalog/datasets/${datasetId}/exports/json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Status ${res.status}`);

  const data = (await res.json()) as any[];
  console.log(
    `[Vancouver] Fetched ${data.length} records. Inserting into ${tableName}...`
  );

  let inserted = 0;
  for (const item of data) {
    try {
      const values = mapper(item);
      if (!values) continue;

      if (tableName === "parking_meters") {
        await pool.query(
          `
                    INSERT INTO parking_meters (id, pay_station_id, meter_head, time_in_effect, credit_card, geom, raw_data)
                    VALUES (gen_random_uuid(), $1, $2, $3, $4, ST_GeomFromGeoJSON($5), $6)
                `,
          values
        );
      } else if (tableName === "street_segments") {
        await pool.query(
          `
                    INSERT INTO street_segments (id, block_id, street_use, geom, raw_data)
                    VALUES (gen_random_uuid(), $1, $2, ST_GeomFromGeoJSON($3), $4)
                `,
          values
        );
      }
      inserted++;
      if (inserted % 500 === 0)
        console.log(`[Vancouver] Inserted ${inserted} / ${data.length}`);
    } catch (e: any) {
      if (e.message.includes("invalid GeoJson")) {
        // console.warn(`Skipping invalid GeoJSON`);
      } else {
        console.error("Insert error:", e.message);
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
