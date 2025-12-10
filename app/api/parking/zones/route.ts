import { NextResponse } from "next/server";

import { query } from "@/lib/db";

export const runtime = "nodejs";

const MAX_LIMIT = 200;
const zoneTypes = new Set([
  "FREE_UNLIMITED",
  "FREE_LIMITED",
  "EV_FREE",
  "PAID",
  "PERMIT_ONLY",
  "MIXED",
]);

type ZoneRow = {
  id: string;
  city: string;
  name: string | null;
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

function mapRowToFeature(row: ZoneRow) {
  return {
    type: "Feature",
    geometry: JSON.parse(row.geom_geojson),
    properties: {
      id: row.id,
      city: row.city,
      name: row.name,
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
    },
  };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const { searchParams } = url;

  const bbox = parseBBox(searchParams.get("bbox"));
  const lat = parseNumber(searchParams.get("lat"));
  const lng = parseNumber(searchParams.get("lng"));
  const type = searchParams.get("type");
  const limitParam = parseNumber(searchParams.get("limit"));
  const city = searchParams.get("city");

  if (!bbox && (lat === null || lng === null)) {
    return badRequest("Provide either lat/lng or bbox query parameters.");
  }

  const limit =
    limitParam && limitParam > 0 && limitParam <= MAX_LIMIT
      ? Math.floor(limitParam)
      : 100;

  if (type && !zoneTypes.has(type)) {
    return badRequest("Invalid type parameter.");
  }

  try {
    if (bbox) {
      const { minLat, minLng, maxLat, maxLng } = bbox;
      const params: unknown[] = [minLng, minLat, maxLng, maxLat];
      let paramIndex = params.length;

      let sql = `
        select
          id,
          city,
          name,
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
        from public.parking_zones
        where geom && st_makeenvelope($1, $2, $3, $4, 4326)
      `;

      if (type) {
        sql += ` and type = $${++paramIndex}`;
        params.push(type);
      }

      if (city) {
        sql += ` and city = $${++paramIndex}`;
        params.push(city);
      }

      sql += ` order by created_at desc limit $${++paramIndex}`;
      params.push(limit);

      const { rows } = await query(sql, params);
      const features = rows.map(mapRowToFeature);

      return NextResponse.json({
        mode: "bbox",
        bbox: { minLat, minLng, maxLat, maxLng },
        count: features.length,
        features,
      });
    }

    const params: unknown[] = [lng, lat];
    let paramIndex = params.length;

    let sql = `
      select
        id,
        city,
        name,
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
      from public.parking_zones
      where st_intersects(
        geom,
        st_setsrid(st_makepoint($1, $2), 4326)
      )
    `;

    if (type) {
      sql += ` and type = $${++paramIndex}`;
      params.push(type);
    }

    if (city) {
      sql += ` and city = $${++paramIndex}`;
      params.push(city);
    }

    sql += `
      order by st_area(geom) asc
      limit $${++paramIndex}
    `;
    params.push(limit);

    const { rows } = await query(sql, params);
    const features = rows.map(mapRowToFeature);

    return NextResponse.json({
      mode: "point",
      point: { lat, lng },
      count: features.length,
      features,
    });
  } catch (error) {
    console.error("Error fetching parking zones", error);
    return NextResponse.json(
      { error: "Failed to fetch parking zones" },
      { status: 500 },
    );
  }
}
