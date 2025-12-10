import { NextResponse } from "next/server";

import { query } from "@/lib/db";

export const runtime = "nodejs";

const DEFAULT_RADIUS_METERS = 500;
const MAX_RADIUS_METERS = 5_000;
const MAX_LIMIT = 200;
const spotTypes = new Set([
  "FREE_UNLIMITED",
  "FREE_LIMITED",
  "EV_FREE",
  "PAID",
  "PERMIT_ONLY",
]);

type SpotRow = {
  id: string;
  city: string;
  zone_id: string | null;
  type: string;
  time_limit_minutes: number | null;
  free_start_time: string | null;
  free_end_time: string | null;
  days_applicable: number[] | null;
  notes: string | null;
  source: string | null;
  verified: boolean;
  created_at: string;
  updated_at: string;
  geom_geojson: string;
  distance_m?: number;
};

type Bbox = {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
};

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function parseNumber(value: string | null) {
  if (!value) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function parseBBox(raw: string | null): Bbox | null {
  if (!raw) return null;
  const parts = raw.split(",").map((p) => Number(p.trim()));
  if (parts.length !== 4 || parts.some((p) => !Number.isFinite(p))) {
    return null;
  }
  const [minLat, minLng, maxLat, maxLng] = parts;
  if (minLat >= maxLat || minLng >= maxLng) return null;
  return { minLat, minLng, maxLat, maxLng };
}

function mapRowToFeature(row: SpotRow) {
  return {
    type: "Feature",
    geometry: JSON.parse(row.geom_geojson),
    properties: {
      id: row.id,
      city: row.city,
      zoneId: row.zone_id,
      type: row.type,
      timeLimitMinutes: row.time_limit_minutes,
      freeStartTime: row.free_start_time,
      freeEndTime: row.free_end_time,
      daysApplicable: row.days_applicable,
      notes: row.notes,
      source: row.source,
      verified: row.verified,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      distanceMeters: row.distance_m,
    },
  };
}


function parseTimeStr(timeStr: string): number {
  // "9:00 AM" -> minutes from midnight
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return -1;
  let [_, h, m, p] = match;
  let hours = parseInt(h, 10);
  const minutes = parseInt(m, 10);
  const period = p.toUpperCase();

  if (period === "PM" && hours < 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

function isPaidInEffect(notes: string | null, targetDate: Date): boolean {
  if (!notes) return true; // Default to paid if no notes to say otherwise? Or assume always valid?
  // Sample format: "METER IN EFFECT: 9:00 AM TO 10:00 PM"
  const regex = /METER IN EFFECT:\s*(\d{1,2}:\d{2}\s*[AP]M)\s*TO\s*(\d{1,2}:\d{2}\s*[AP]M)/i;
  const match = notes.match(regex);
  
  if (!match) return true; // If we can't parse limits, assume it's paid/in-effect.

  const startMinutes = parseTimeStr(match[1]);
  const endMinutes = parseTimeStr(match[2]);

  if (startMinutes === -1 || endMinutes === -1) return true;

  const currentMinutes = targetDate.getHours() * 60 + targetDate.getMinutes();

  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const { searchParams } = url;

  const bbox = parseBBox(searchParams.get("bbox"));
  const lat = parseNumber(searchParams.get("lat"));
  const lng = parseNumber(searchParams.get("lng"));
  const filterType = searchParams.get("type"); // "FREE" or "PAID"
  const limitParam = parseNumber(searchParams.get("limit"));
  const city = searchParams.get("city");
  
  // New: target time (iso string), default to now
  const datetimeParam = searchParams.get("datetime");
  const targetDate = datetimeParam ? new Date(datetimeParam) : new Date();

  if (!bbox && (lat === null || lng === null)) {
    return badRequest("Provide either lat/lng or bbox query parameters.");
  }

  const limit =
    limitParam && limitParam > 0 && limitParam <= MAX_LIMIT
      ? Math.floor(limitParam)
      : 100;

  try {
    let rows: SpotRow[] = [];

    // We fetch simplified columns primarily, but we need 'notes' and 'type' to decide status.
    // We intentionally DO NOT filter by type in SQL if the user wants FREE, 
    // because a PAID spot might be free at this time.
    // If user wants PAID, we could filter by type=PAID, but let's keep it simple: 
    // fetch all candidates, then filter in JS.
    
    // Construct SQL
    let sql = `
      select
        id,
        city,
        zone_id,
        type,
        time_limit_minutes,
        free_start_time,
        free_end_time,
        days_applicable,
        notes,
        source,
        verified,
        created_at,
        updated_at,
        st_asgeojson(geom) as geom_geojson
    `;
    const params: unknown[] = [];
    
    if (bbox) {
      const { minLat, minLng, maxLat, maxLng } = bbox;
      // Using makeenvelope for bbox search
      sql += `
        from public.parking_spots
        where geom && st_makeenvelope($1, $2, $3, $4, 4326)
      `;
      params.push(minLng, minLat, maxLng, maxLat);
    } else {
      // Nearby search
      const radiusParam = parseNumber(searchParams.get("radius"));
      const radiusMeters =
        radiusParam && radiusParam > 0
          ? Math.min(radiusParam, MAX_RADIUS_METERS)
          : DEFAULT_RADIUS_METERS;
          
      sql += `,
        st_distance(
          geom::geography,
          st_setsrid(st_makepoint($1, $2), 4326)::geography
        ) as distance_m
        from public.parking_spots
        where st_dwithin(
          geom::geography,
          st_setsrid(st_makepoint($1, $2), 4326)::geography,
          $3
        )
      `;
      params.push(lng, lat, radiusMeters);
    }

    let paramIndex = params.length;
    
    if (city) {
      sql += ` and city = $${++paramIndex}`;
      params.push(city);
    }

    // Add ordering and limit
    if (bbox) {
       sql += ` order by created_at desc limit $${++paramIndex}`;
    } else {
       sql += ` order by geom <-> st_setsrid(st_makepoint($1, $2), 4326) limit $${++paramIndex}`;
       // Note: reusing $1 and $2 for distance sorting which are lng, lat
    }
    params.push(limit);

    const result = await query(sql, params);
    rows = result.rows;

    // --- Post-Processing / Filtering ---
    const features = [];
    
    for (const row of rows) {
      // Determine effective status
      let isEffectiveFree = false;

      if (["FREE_UNLIMITED", "FREE_LIMITED", "EV_FREE"].includes(row.type)) {
        isEffectiveFree = true;
      } else if (row.type === "PAID") {
        // Check schedule
        const paidActive = isPaidInEffect(row.notes, targetDate);
        isEffectiveFree = !paidActive;
      } else {
        // PERMIT_ONLY, etc. - assume not free, not paid? 
        // For our binary "Free vs Paid" filter:
        // Free = isEffectiveFree
        // Paid = !isEffectiveFree (assuming it's accessible)
        isEffectiveFree = false; 
      }

      // Filter based on user request
      if (filterType === "FREE" && !isEffectiveFree) continue;
      if (filterType === "PAID" && isEffectiveFree) continue;
      
      features.push(mapRowToFeature(row));
    }

    if (bbox) {
       const { minLat, minLng, maxLat, maxLng } = bbox!;
       return NextResponse.json({
        mode: "bbox",
        bbox: { minLat, minLng, maxLat, maxLng },
        count: features.length,
        features,
      });
    } else {
       return NextResponse.json({
        mode: "nearby",
        center: { lat, lng },
        // radiusMeters, // simplified, not passing radius back if not calculated easily or needed
        count: features.length,
        features,
      });
    }

  } catch (error) {
    console.error("Error fetching parking spots", error);
    return NextResponse.json(
      { error: "Failed to fetch parking spots" },
      { status: 500 },
    );
  }
}
