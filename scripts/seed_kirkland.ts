import {
  getDbPool,
  getDefaultSegmentAttributes,
  parseSignText,
} from "./seed_utils";
import { seedOsmParkingLots, seedOsmCityCoverage } from "./seed_osm_utils";
import fs from "fs";
import path from "path";

const pool = getDbPool();

async function getKirklandStreets() {
  const localFile = path.resolve(
    process.cwd(),
    "datasets/kirkland_streets.geojson"
  );

  if (fs.existsSync(localFile)) {
    console.log(`[Kirkland] Reading streets from: ${localFile}`);
    const content = fs.readFileSync(localFile, "utf-8");
    return JSON.parse(content);
  }

  console.log("[Kirkland] Street data file not found. Skipping streets.");
  return null;
}

async function seedKirklandStreets() {
  console.log("[Kirkland] Seeding Streets...");
  const data = await getKirklandStreets();

  if (!data || !data.features) {
    console.log("[Kirkland] No street data to seed.");
    return 0;
  }

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

      // Filter: Kirkland Centerline often has lifecycle status.
      // TRN_Street structure usually has "LIFECYCLE" or similar.
      // Let's assume standard checks or minimal checks given the file source.
      // If we don't know the status field, we might skip status check or log one.
      // The head output didn't show full properties for lines, but Signs had 'COMPKEY'.

      const defaults = getDefaultSegmentAttributes();
      const streetUse = defaults.street_use;

      // Ensure city tag
      const streetName =
        p.FULNAME || p.STNAME || p.STR_NAME || p.STREET_NAM || "Unknown";
      const blockId = p.COMPKEY ? `KIRK-${p.COMPKEY}` : `KIRK-${inserted}`;

      values.push(
        blockId,
        streetUse,
        JSON.stringify(item.geometry),
        JSON.stringify({
          ...p,
          ...defaults,
          city: "Kirkland",
          streetName,
        }),
        JSON.stringify([]) // No schedules
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
        `[Kirkland] Inserted streets batch ${
          Math.floor(i / CHUNK_SIZE) + 1
        } (${inserted})`
      );
    }
  }

  return inserted;
}

async function getKirklandSigns() {
  const localFile = path.resolve(
    process.cwd(),
    "datasets/kirkland_signs.geojson"
  );

  if (fs.existsSync(localFile)) {
    console.log(`[Kirkland] Reading signs from: ${localFile}`);
    const content = fs.readFileSync(localFile, "utf-8");
    return JSON.parse(content);
  }
  return null;
}

async function seedKirklandMeters() {
  console.log("[Kirkland] Seeding Meters from Signs...");
  const data = await getKirklandSigns();

  if (!data || !data.features) {
    console.log("[Kirkland] No sign data to seed meter proxy.");
    return 0;
  }

  let inserted = 0;
  const values: any[] = [];
  const placeholders: string[] = [];
  let paramIndex = 1;

  for (const item of data.features) {
    const p = item.properties;
    const text = (p.SIGNTEXT || "").toUpperCase();

    // Filter for Pay Parking signs
    // "PAY PARKING", "PAY HERE", "PAY STATION"
    if (!text.includes("PAY")) continue;
    if (text.includes("NO PARKING") && !text.includes("EXCEPT")) continue; // Skip "NO PARKING... PAY TICKET" if logic strict

    // Use shared helper for parsing
    const { rate, limit, schedule } = parseSignText(text);

    const payStationId = p.ASSET_ID || `KIRK-M-${inserted}`;

    // Construct Normalized Props
    const normalizedProps = {
      ...p,
      t_mf_9a_6p: limit || "2hr", // Fallback
      r_mf_9a_6p: rate || "$1.00/hr",
      schedule_summary: schedule || "Mon-Sat 9am-6pm",
      meter_head: "Pay Station Sign",
      city: "Kirkland",
    };

    values.push(
      payStationId,
      "Pay Station", // Type
      JSON.stringify(item.geometry),
      JSON.stringify(normalizedProps),
      JSON.stringify([]) // Empty schedules
    );

    placeholders.push(
      `(gen_random_uuid(), $${paramIndex++}, $${paramIndex++}, ST_GeomFromGeoJSON($${paramIndex++}), $${paramIndex++}, $${paramIndex++})`
    );
    inserted++;
  }

  if (placeholders.length > 0) {
    const query = `
      INSERT INTO parking_meters (id, pay_station_id, meter_head, geom, raw_data, schedules)
      VALUES ${placeholders.join(", ")}
      ON CONFLICT DO NOTHING
    `;
    await pool.query(query, values);
  }

  return inserted;
}

export async function seedKirkland() {
  console.log("Starting Kirkland Seeding...");
  try {
    // Seed streets
    const streetsInserted = await seedKirklandStreets();
    console.log(`[Kirkland] Streets: ${streetsInserted} inserted.`);

    // Seed meters from signs
    const metersInserted = await seedKirklandMeters();
    console.log(`[Kirkland] Meters: ${metersInserted} inserted.`);

    // Seed OSM Lots
    await seedOsmParkingLots("Kirkland", "United States");

    // Seed City Coverage
    await seedOsmCityCoverage("Kirkland", "United States");

    console.log(`[Kirkland] Seeding Complete.`);
  } catch (e) {
    console.error("Kirkland Seeding Failed:", e);
  }
}

if (require.main === module) {
  seedKirkland().finally(() => pool.end());
}
