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

async function debugZones() {
  const filename = "Off_Street_Parking_(Bylaw_4350-1990).geojson";
  const filePath = path.join(process.cwd(), "sample_data", filename);
  
  console.log(`Checking file: ${filePath}`);
  if (!fs.existsSync(filePath)) {
    console.error("File NOT found!");
    return;
  }
  console.log("File found.");

  const raw = fs.readFileSync(filePath, "utf-8");
  const data = JSON.parse(raw);
  console.log(`Feature count: ${data.features.length}`);

  let attempted = 0;
  for (const feature of data.features) {
    attempted++;
    const gType = feature.geometry.type;
    console.log(`Feature ${attempted}: Geometry Type = ${gType}`);
    
    if (gType !== "Polygon" && gType !== "MultiPolygon") {
      console.log("Skipping non-polygon");
      continue;
    }

    try {
      const city = "Maple Ridge";
      const type = "FREE_UNLIMITED"; // Force FREE for valid zones to test
      const notes = "Debug Insert";
      const geom = JSON.stringify(feature.geometry);
      const metadata = JSON.stringify(feature.properties);

      console.log("Inserting zone...");
      const sql = `
        INSERT INTO public.parking_zones (city, type, geom, notes, source, verified, metadata)
        VALUES ($1, $2, ST_SetSRID(ST_GeomFromGeoJSON($3), 4326), $4, 'DEBUG', true, $5)
        RETURNING id
      `;
      const res = await query(sql, [city, type, geom, notes, metadata]);
      console.log(`Inserted zone: ${res.rows[0].id}`);
    } catch (e) {
      console.error("Insert failed:", e);
    }
    
    // Just try 5 to verify
    if (attempted >= 5) break; 
  }
}

debugZones();
