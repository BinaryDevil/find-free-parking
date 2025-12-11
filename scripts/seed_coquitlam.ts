import { getDbPool } from "./seed_utils";

const pool = getDbPool();

async function fetchArcGisGeoJson(url: string) {
  // Append query params for GeoJSON
  // ArcGIS REST API: query?where=1=1&outFields=*&f=geojson
  const fetchUrl = `${url}/query?where=1=1&outFields=*&f=geojson`;
  console.log(`[Coquitlam] Fetching ${fetchUrl}...`);
  const res = await fetch(fetchUrl);
  if (!res.ok) throw new Error(`Status ${res.status}`);
  return (await res.json()) as any; // FeatureCollection
}

export async function seedCoquitlam() {
  console.log("Starting Coquitlam Seeding...");
  try {
    // Coquitlam "On Street Pay Parking"
    // URL: https://gisservices.coquitlam.ca/arcgis/rest/services/DynamicServices/Transportation/MapServer/8
    const url =
      "https://gisservices.coquitlam.ca/arcgis/rest/services/DynamicServices/Transportation/MapServer/8";

    const data = await fetchArcGisGeoJson(url);
    console.log(`[Coquitlam] Fetched ${data.features.length} records.`);

    let inserted = 0;
    for (const item of data.features) {
      if (!item.geometry) continue;

      // Mapping Coquitlam -> ParkingMeters
      // Properties: RATE_HOUR, RATE_DAY, TIME_LIMITS, TYPE, PAY_STATION_ID (maybe?)
      // Let's inspect known fields:
      // RATE_HOUR -> r_mf_9a_6p (Generalize)
      // TIME_LIMITS -> time_in_effect / limit (e.g. "2 HR")
      // TYPE -> meter_head

      const p = item.properties;
      const rate = p.RATE_HOUR ? `$${p.RATE_HOUR}/hr` : null;
      const limit = p.TIME_LIMITS; // e.g. "2 hr"
      const type = p.TYPE; // e.g. "Pay Station"

      // Coquitlam uses Pay Stations mostly.
      const payStationId = p.STATION_ID || p.PAY_STATION_ID || "Coq-Station"; // Guessing ID field or generating one

      // We need to insert into parking_meters
      // Mapped fields:
      // pay_station_id ->
      // meter_head -> p.TYPE
      // time_in_effect -> "See Sign" or p.TIME_LIMITS ?
      // rates -> p.RATE_HOUR

      // Construct raw_data carefully to preserve all Coquitlam fields for popup
      const rawData = JSON.stringify(p);

      // Values for DB
      const values = [
        payStationId,
        type, // meter_head
        limit, // time_in_effect (using limit as proxy for valid time text for now, or null)
        false, // credit_card (Unknown, assume no or null)
        JSON.stringify(item.geometry),
        rawData,
      ];

      // Special logic: The schema expects rate columns in raw_data to be present for the popup to work?
      // Our popup uses props.t_mf_9a_6p etc.
      // We should inject these standardized keys into raw_data or properties.
      // But wait, `raw_data` is JSONB. The frontend uses `properties` flattened from `raw_data`?
      // No, frontend uses properties from API which comes from DB `raw_data`.
      // So if we want the popup to show "Limit: 2 HR", we need `t_mf_9a_6p` in `raw_data`.
      // Or we update Frontend to look for `RATE_HOUR` too?
      // Better to Normalize in Seeding:
      // Add `t_mf_9a_6p` = p.TIME_LIMITS
      // Add `r_mf_9a_6p` = p.RATE_HOUR

      const normalizedProps = {
        ...p,
        t_mf_9a_6p: limit, // Normalize for Frontend
        r_mf_9a_6p: rate, // Normalize for Frontend
        city: "Coquitlam",
      };

      await pool.query(
        `
          INSERT INTO parking_meters (id, pay_station_id, meter_head, time_in_effect, credit_card, geom, raw_data)
          VALUES (gen_random_uuid(), $1, $2, $3, $4, ST_GeomFromGeoJSON($5), $6)
        `,
        [
          payStationId,
          type,
          "Check Sign", // Time in effect generic text
          false,
          JSON.stringify(item.geometry),
          JSON.stringify(normalizedProps),
        ]
      );
      inserted++;
    }
    console.log(`[Coquitlam] Seeding Complete. Inserted ${inserted}.`);
  } catch (e) {
    console.error("Coquitlam Seeding Failed:", e);
  }
}
