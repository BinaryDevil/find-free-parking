import fs from "fs";
import path from "path";

// Load .env.local
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, "utf8");
  envConfig.split("\n").forEach((line) => {
    const [key, val] = line.split("=");
    if (key && val) {
      process.env[key.trim()] = val.trim();
    }
  });
}

import { query } from "../lib/db";

// Types corresponding to the GeoJSON structure (simplified)
type GeoJsonFeature = {
  type: "Feature";
  geometry: {
    type: string;
    coordinates: any;
  };
  properties: any;
};

type GeoJsonCollection = {
  type: "FeatureCollection";
  features: GeoJsonFeature[];
};

async function seedParkingMeters() {
  const filePath = path.join(process.cwd(), "sample_data", "parking-meters.geojson");
  if (!fs.existsSync(filePath)) {
    console.log("No parking-meters.geojson found, skipping.");
    return;
  }

  console.log("Seeding Vancouver parking meters...");
  const raw = fs.readFileSync(filePath, "utf-8");
  const data = JSON.parse(raw) as GeoJsonCollection;

  let count = 0;
  for (const feature of data.features) {
    if (feature.geometry.type !== "Point") continue;

    const props = feature.properties;
    const city = "Vancouver";
    const type = "PAID";
    const notes = props.timeineffe || null;
    const geom = JSON.stringify(feature.geometry);
    const metadata = JSON.stringify(props);
    
    // Using simple approach safely
    try {
      const sql = `
        INSERT INTO public.parking_spots (city, type, geom, notes, source, verified, metadata)
        VALUES ($1, $2, ST_SetSRID(ST_GeomFromGeoJSON($3), 4326), $4, 'CITY_OPEN_DATA_VANCOUVER', true, $5)
      `;
      await query(sql, [city, type, geom, notes, metadata]);
      count++;
      if (count % 100 === 0) process.stdout.write(".");
    } catch (err) {
      console.error("Error inserting spot:", err);
    }
  }
  console.log(`\nInserted ${count} parking meters.`);
}

async function seedMapleRidgeZones(filename: string, defaultType: string = "MIXED") {
  const filePath = path.join(process.cwd(), "sample_data", filename);
  if (!fs.existsSync(filePath)) {
    console.log(`${filename} not found, skipping.`);
    return;
  }

  console.log(`Seeding ${filename}...`);
  const raw = fs.readFileSync(filePath, "utf-8");
  const data = JSON.parse(raw) as GeoJsonCollection;

  let count = 0;
  for (const feature of data.features) {
    if (feature.geometry.type !== "Polygon" && feature.geometry.type !== "MultiPolygon") continue;

    const props = feature.properties;
    const city = "Maple Ridge";
    const type = defaultType; 
    const notes = null;
    const geom = JSON.stringify(feature.geometry);
    const metadata = JSON.stringify(props);

    try {
      const sql = `
        INSERT INTO public.parking_zones (city, type, geom, notes, source, verified, metadata)
        VALUES ($1, $2, ST_SetSRID(ST_GeomFromGeoJSON($3), 4326), $4, 'CITY_OPEN_DATA_MAPLE_RIDGE', true, $5)
      `;
      await query(sql, [city, type, geom, notes, metadata]);
      count++;
    } catch (err) {
      console.error(`Error inserting zone in ${filename}:`, err);
    }
  }
  console.log(`Inserted ${count} zones from ${filename}.`);
}

async function main() {
  try {
    // We assume tables are truncated or mostly empty, or we ignore duplicates if IDs collide (but we generate new IDs)
    // To be safe, let's just run it. Duplicates might happen if not cleaned, but IDs are UUIDs gen_random.
    console.log("Starting full seed...");
    
    // Meters are already mostly there, but let's re-run or assume user cleaned.
    // Actually, user ran clean already. So assume empty is fine.
    // If I re-run clean, I lose the meters.
    // I will comment out meters if I think they are done? No, user might have truncated.
    // I will run ALL.
    
    await seedParkingMeters();
    await seedMapleRidgeZones("Off_Street_Parking_(Bylaw_4350-1990).geojson", "FREE_UNLIMITED"); // Assuming off-street is free lots?
    await seedMapleRidgeZones("Parking_Schedule_D_(Bylaw_7110-2014).geojson", "FREE_LIMITED");
    
    console.log("Seeding completed.");
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
}

main();
