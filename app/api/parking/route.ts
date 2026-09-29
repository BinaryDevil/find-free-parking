import { NextResponse } from "next/server";
import { query } from "../../../lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parseBound = (key: string) => {
      const raw = searchParams.get(key);
      return raw === null || raw.trim() === "" ? NaN : Number(raw);
    };
    const north = parseBound("north");
    const south = parseBound("south");
    const east = parseBound("east");
    const west = parseBound("west");

    // 0 is a valid coordinate (equator / prime meridian), so check for
    // finiteness rather than truthiness.
    if (![north, south, east, west].every(Number.isFinite)) {
      return NextResponse.json({ error: "Missing bounds" }, { status: 400 });
    }

    // 1. Get Meters
    const metersQuery = `
      SELECT id, pay_station_id, meter_head, report_counts,
             schedules, raw_data,
             ST_AsGeoJSON(geom)::json as geom
      FROM parking_meters
      WHERE ST_Intersects(geom, ST_MakeEnvelope($1, $2, $3, $4, 4326))
      LIMIT 1000
    `;

    // 2. Get Streets with "has_meter" flag
    // We check if any meter is within 15 meters of the street line.
    // This implies PAIED parking is present on that block face.
    const streetsQuery = `
      SELECT s.id, s.block_id, s.street_use, s.report_counts,
             ST_AsGeoJSON(s.geom)::json as geom,
             (
                SELECT jsonb_agg(m.schedules)
                FROM parking_meters m
                WHERE ST_DWithin(s.geom::geography, m.geom::geography, 15)
             ) as meter_infos
      FROM street_segments s
      WHERE ST_Intersects(s.geom, ST_MakeEnvelope($1, $2, $3, $4, 4326))
      LIMIT 1000
    `;

    const [metersRes, streetsRes] = await Promise.all([
      query(metersQuery, [west, south, east, north]),
      query(streetsQuery, [west, south, east, north]),
    ]);

    return NextResponse.json({
      meters: metersRes.rows,
      streets: streetsRes.rows,
    });
  } catch (error) {
    console.error("API Error:", error);
    // Do not expose database error details to clients.
    return NextResponse.json(
      { error: "Failed to fetch parking data" },
      { status: 500 }
    );
  }
}
