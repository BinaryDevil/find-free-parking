import { getDbPool } from "./seed_utils";
import axios from "axios";

const pool = getDbPool();

// Overpass query helper
async function fetchParkingLots(
  cityName: string,
  country: string = "Canada",
  searchAreaName: string | null = null
) {
  // Determine search area (broad region/state/province) to disambiguate
  let areaName = searchAreaName;
  if (!areaName) {
    areaName =
      country === "United States"
        ? "Washington"
        : "Metro Vancouver Regional District";
  }

  const query = `
      [out:json][timeout:60];
      area["name"="${areaName}"]->.metro;
      relation["name"~"${cityName}",i]["admin_level"="8"](area.metro)->.cityRel;
      .cityRel map_to_area -> .searchArea;
      (
        way["amenity"="parking"](area.searchArea);
        relation["amenity"="parking"](area.searchArea);
      );
      out geom;
    `;

  // Use a public Overpass instance
  const url = "https://overpass-api.de/api/interpreter";
  try {
    const response = await axios.post(url, query, {
      headers: { "Content-Type": "text/plain" },
    });
    return response.data;
  } catch (error: any) {
    console.error(`[${cityName}] Overpass query failed:`, error.message);
    return null;
  }
}

function mapOsmToZoneType(tags: any): string | null {
  // Logic to determine type - BE CONSERVATIVE
  // Only mark as FREE if explicitly tagged as such
  const access = tags.access;
  const fee = tags.fee;
  const parking = tags.parking; // e.g. "surface", "multi-storey", "underground"

  // Filter out private/restricted access entirely
  if (
    access === "private" ||
    access === "customers" ||
    access === "no" ||
    access === "employees" ||
    access === "residents" ||
    access === "permissive" // Often means "allowed but not public"
  ) {
    return null; // Skip entirely - don't display
  }

  // Explicit fee=yes means PAID
  if (fee === "yes") {
    return "PAID";
  }

  // Only FREE if EXPLICITLY tagged as fee=no AND access is public/yes/unset
  if (fee === "no") {
    if (tags.maxstay) {
      return "FREE_LIMITED";
    }
    return "FREE_UNLIMITED";
  }

  // If no fee tag, check if it's a public facility (park, etc.)
  // Common OSM patterns for free public parking
  if (
    access === "yes" ||
    access === "public" ||
    tags.operator === "City of Vancouver" ||
    tags.operator === "City of Surrey" ||
    parking === "park_and_ride"
  ) {
    // Likely public, but still not confirmed free - mark as MIXED
    return "MIXED";
  }

  // DEFAULT: If we don't know, assume PAID (conservative)
  // This prevents false positives for "FREE" parking
  return "PAID";
}

function parseMaxStay(maxstay: string): number | null {
  if (!maxstay) return null;
  // Handle "2 hours", "120 min", etc.
  // Very basic parsing
  const lower = maxstay.toLowerCase().replace(/\s/g, "");
  if (lower.includes("hour") || lower.includes("h")) {
    const num = parseFloat(lower);
    if (!isNaN(num)) return num * 60;
  }
  if (lower.includes("min") || lower.includes("m")) {
    const num = parseFloat(lower);
    if (!isNaN(num)) return num;
  }
  return null;
}

/**
 * Seeds parking lots (zones) for a given city from OSM.
 * @param cityName The name of the city (e.g. "Vancouver", "Surrey")
 */
export async function seedOsmParkingLots(
  cityName: string,
  country: string = "Canada",
  searchAreaName: string | null = null
) {
  console.log(`[ParkingLots] Fetching data for ${cityName} from OSM...`);
  const data = await fetchParkingLots(cityName, country, searchAreaName);

  if (!data || !data.elements) {
    console.log(`[ParkingLots] No data found for ${cityName}`);
    return;
  }

  let inserted = 0;

  for (const el of data.elements) {
    // Skip nodes
    if (el.type === "node") continue;

    const tags = el.tags || {};

    // Determine Type (returns null if should skip)
    const zoneType = mapOsmToZoneType(tags);
    if (!zoneType) {
      continue; // Skip private/restricted lots
    }

    const name = tags.name || `${cityName} Parking Lot`;
    const timeLimit = parseMaxStay(tags.maxstay);

    // Build Geometry string (WKT)
    let coordinates: any[] = [];

    if (el.type === "way" && el.geometry) {
      coordinates = el.geometry.map((pt: any) => `${pt.lon} ${pt.lat}`);
      // Ensure closed loop for Polygon
      if (
        coordinates.length > 0 &&
        coordinates[0] !== coordinates[coordinates.length - 1]
      ) {
        coordinates.push(coordinates[0]);
      }
    } else {
      continue;
    }

    if (coordinates.length < 4) continue; // Not a valid polygon

    const wkt = `POLYGON((${coordinates.join(", ")}))`;

    try {
      await pool.query(
        `
                INSERT INTO parking_zones (
                    id, city, name, type, geom, time_limit_minutes, source, verified, metadata
                ) VALUES (
                    gen_random_uuid(), $1, $2, $3, ST_GeomFromText($4, 4326), $5, 'OSM', false, $6
                )
             `,
        [cityName, name, zoneType, wkt, timeLimit, JSON.stringify(tags)]
      );
      inserted++;
    } catch (e: any) {
      console.error(`[ParkingLots] Insert failed: ${e.message}`);
    }
  }
  console.log(`[ParkingLots] ${cityName}: Inserted ${inserted} lots.`);
}

/**
 * Fetches the city boundary relation from OSM and seeds it into the covered_cities table.
 */
export async function seedOsmCityCoverage(
  cityName: string,
  country: string = "Canada",
  searchAreaName: string | null = null
) {
  console.log(`[Coverage] Seeding coverage for ${cityName}...`);

  // Check if exists
  const check = await pool.query(
    "SELECT id FROM covered_cities WHERE city_name = $1",
    [cityName]
  );
  if (check.rows.length > 0) {
    console.log(`[Coverage] ${cityName} already covered. Skipping.`);
    return;
  }

  let areaName = searchAreaName;
  if (!areaName) {
    areaName =
      country === "United States"
        ? "Washington"
        : "Metro Vancouver Regional District";
  }

  const query = `
      [out:json][timeout:60];
      area["name"="${areaName}"]->.searchArea;
      relation["name"~"${cityName}",i]["admin_level"="8"](area.searchArea);
      out geom;
    `;

  try {
    const url = "https://overpass-api.de/api/interpreter";
    const response = await axios.post(url, query, {
      headers: { "Content-Type": "text/plain" },
    });
    const data = response.data;

    if (!data || !data.elements || data.elements.length === 0) {
      console.log(`[Coverage] No boundary found for ${cityName}`);
      return;
    }

    const relation = data.elements[0];
    // For a relation, Overpass `out geom` returns members.
    // We need the geometry of the relation itself.
    // Overpass `out geom` on relation returns the geometry of the ways, but constructing a polygon from relation in client side is hard.
    // Better to use `convert` or just take the bounding box?
    // Actually, for `covered_cities` `bounds`, a simplified polygon or just the BBOX is often enough for "is point inside?".
    // But let's try to get a proper polygon if possible.
    // Or simpler: Use the `bounds` provided by Overpass if we use `out bb;`?
    // The table expects `geometry(Polygon)`.

    // Let's use the members to construct a convex hull or just use the bounding box as a simple fallback?
    // Or better: Use `ST_GeomFromGeoJSON` if we can converting OSM to GeoJSON.
    // Since we don't have osmtogeojson, let's use the bounds (minlat, minlon, maxlat, maxlon) and make a rectangle.

    let polygonWkt = "";

    // Use bounds from the relation if available
    if (relation.bounds) {
      const { minlat, minlon, maxlat, maxlon } = relation.bounds;
      polygonWkt = `POLYGON((${minlon} ${minlat}, ${minlon} ${maxlat}, ${maxlon} ${maxlat}, ${maxlon} ${minlat}, ${minlon} ${minlat}))`;
    } else {
      // If no bounds on relation (rare with `out geom`?), fallback
      console.log(`[Coverage] Relation has no bounds. Skipping ${cityName}.`);
      return;
    }

    // Center
    const centerIon = (relation.bounds.minlon + relation.bounds.maxlon) / 2;
    const centerLat = (relation.bounds.minlat + relation.bounds.maxlat) / 2;

    await pool.query(
      `
            INSERT INTO covered_cities (
                id, city_name, country, bounds, center, is_active
            ) VALUES (
                gen_random_uuid(), $1, $2, ST_GeomFromText($3, 4326), ST_SetSRID(ST_MakePoint($4, $5), 4326), true
            )
        `,
      [cityName, country, polygonWkt, centerIon, centerLat]
    );

    console.log(`[Coverage] Inserted ${cityName} into covered_cities.`);
  } catch (e: any) {
    console.error(`[Coverage] Failed for ${cityName}:`, e.message);
  }
}
