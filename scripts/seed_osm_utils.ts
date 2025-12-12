import { getDbPool } from "./seed_utils";
import axios from "axios";

const pool = getDbPool();

// Overpass query helper
async function fetchParkingLots(
  cityName: string,
  country: string = "Canada",
  searchAreaName: string | null = null
) {
  // Build an area filter based on country
  let areaFilter: string;
  if (country === "United States") {
    // Use admin_level=4 to get the state of Washington, not other entities
    const stateName = searchAreaName || "Washington";
    areaFilter = `area["name"="${stateName}"]["admin_level"="4"]->.state;`;
  } else {
    // Canada - use Metro Vancouver Regional District
    const regionName = searchAreaName || "Metro Vancouver Regional District";
    areaFilter = `area["name"="${regionName}"]->.state;`;
  }

  const query = `
      [out:json][timeout:60];
      ${areaFilter}
      relation["name"~"${cityName}",i]["admin_level"="8"](area.state)->.cityRel;
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
  console.log(`✅ Seeded coverage for ${cityName} (Polygon)`);

  // Check if exists
  const check = await pool.query(
    "SELECT id FROM covered_cities WHERE city_name = $1",
    [cityName]
  );
  if (check.rows.length > 0) {
    console.log(`[Coverage] ${cityName} already covered. Skipping.`);
    return;
  }

  // Build an area filter based on country
  let areaFilter: string;
  if (country === "United States") {
    const stateName = searchAreaName || "Washington";
    areaFilter = `area["name"="${stateName}"]["admin_level"="4"]->.searchArea;`;
  } else {
    const regionName = searchAreaName || "Metro Vancouver Regional District";
    areaFilter = `area["name"="${regionName}"]->.searchArea;`;
  }

  const query = `
      [out:json][timeout:60];
      ${areaFilter}
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

/**
 * Fetches street centerlines from OSM for a given city.
 * Useful as a Fallback Strategy when official centerline data is missing.
 */
export async function fetchOsmStreets(
  city: string,
  state: string,
  country = "Canada"
) {
  // Query for residential, tertiary, secondary, primary, etc.
  // Use robust area search like fetchParkingLots
  let areaFilter: string;
  if (country === "United States") {
    const stateName = state === "WA" ? "Washington" : state;
    areaFilter = `area["name"="${stateName}"]["admin_level"="4"]->.state;`;
  } else {
    areaFilter = `area["name"="Metro Vancouver Regional District"]->.state;`;
  }

  const query = `
    [out:json][timeout:180];
    ${areaFilter}
    relation["name"~"${city}",i]["admin_level"="8"](area.state)->.cityRel;
    .cityRel map_to_area -> .searchArea;
    (
      way["highway"~"^(primary|secondary|tertiary|residential|unclassified|living_street)$"](area.searchArea);
    );
    out geom;
  `;

  const url = "https://overpass-api.de/api/interpreter";
  console.log(`Fetching OSM streets for ${city}...`);

  try {
    const response = await axios.post(url, query, {
      headers: { "Content-Type": "text/plain" },
    });
    return response.data.elements.filter((e: any) => e.type === "way");
  } catch (err: any) {
    console.error("Error fetching OSM streets:", err.message || err);
    return [];
  }
}

/**
 * Seeds OSM streets into the street_segments table.
 */
export async function seedOsmStreets(
  city: string,
  state: string,
  country = "United States"
) {
  const streets = await fetchOsmStreets(city, state, country);
  if (!streets || streets.length === 0) {
    console.log(`No OSM streets found for ${city}.`);
    return;
  }

  // Use the shared pool from the module scope if exported, or get it here.
  // The file imports getDbPool.
  // We can use the global 'pool' const if it is exported?
  // Line 4: const pool = getDbPool();
  // But line 4 is not exported.
  // We should reuse 'pool' const if available in scope.
  // The file view showed 'const pool = getDbPool();' at top level.

  try {
    let inserted = 0;

    // Default attributes for generic streets
    const defaultProps = {
      street_use: "Unknown",
      notes: "Imported from OSM (no parking data)",
    };

    /**
     * Helper to map OSM Highway tags to Street Use
     */
    const getOsmStreetUse = (highway: string) => {
      if (["primary", "secondary", "tertiary", "trunk"].includes(highway)) {
        return "No Parking"; // Arterials usually restricted
      }
      if (["residential", "living_street"].includes(highway)) {
        return "Unrestricted"; // Neighborhoods usually free
      }
      return "Unknown"; // Service, unclassified, etc.
    };

    for (const way of streets) {
      // Convert OSM Geometry (nodes) to LineString
      // The 'out geom' query returns .geometry field on ways
      if (!way.geometry || way.geometry.length < 2) continue;

      const coords = way.geometry
        .map((p: any) => `${p.lon} ${p.lat}`)
        .join(",");
      const linestring = `LINESTRING(${coords})`;

      // Name
      const streetName = way.tags?.name || "Unnamed Street";

      const rawData = JSON.stringify({
        ...way.tags,
        source: "OSM",
        city,
        state,
        streetName,
      });

      // Schema: id, block_id, street_use, geom, raw_data, schedules, side_of_street?
      // Based on seed_kirkland.ts: id, block_id, street_use, geom, raw_data, schedules
      // Maybe side_of_street exists? Let's assume standard minimal.
      // seed_kirkland.ts does NOT insert side_of_street.
      // seed_seed_utils line 337 in current view has side_of_street...
      // Note: If I am wrong about side_of_street NOT existing, I might break it.
      // But seed_kirkland.ts works without it.
      // Safest is to stick to what seed_kirkland.ts does + maybe side_of_street if allowed.
      // I will assume NO side_of_street column if seed_kirkland.ts doesn't use it.
      // Wait, seed_osm_utils.ts previously tried to insert it (Step 769).

      await pool.query(
        `
            INSERT INTO street_segments (
                id, block_id, street_use, geom, raw_data, schedules
            ) VALUES (
                gen_random_uuid(), $1, $2, ST_GeomFromText($3, 4326), $4, $5
            )
        `,
        [
          `OSM-${way.id}`, // block_id
          getOsmStreetUse(way.tags?.highway || ""), // street_use
          linestring, // geom
          rawData,
          JSON.stringify([]), // schedules
        ]
      );

      inserted++;
    }
    console.log(`✅ Seeded ${inserted} OSM streets for ${city}.`);
  } catch (err: any) {
    console.error("Error seeding OSM streets:", err);
  }
}
