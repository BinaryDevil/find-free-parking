import fs from "fs";
import path from "path";
import { query } from "../lib/db";

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
  console.log("Seeding ONLY zones...");
  await seedMapleRidgeZones("Off_Street_Parking_(Bylaw_4350-1990).geojson", "FREE_UNLIMITED");
  await seedMapleRidgeZones("Parking_Schedule_D_(Bylaw_7110-2014).geojson", "FREE_LIMITED");
  console.log("Zone seeding completed.");
}

main();
