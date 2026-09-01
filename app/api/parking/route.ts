import { NextResponse } from "next/server";
import { query } from "../../../lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const north = Number(searchParams.get("north"));
    const south = Number(searchParams.get("south"));
    const east = Number(searchParams.get("east"));
    const west = Number(searchParams.get("west"));
    const mode = searchParams.get("mode");

    if (
      ![north, south, east, west].every(Number.isFinite) ||
      south >= north ||
      west >= east ||
      north > 90 ||
      south < -90 ||
      east > 180 ||
      west < -180
    ) {
      return NextResponse.json({ error: "Missing bounds" }, { status: 400 });
    }

    if (mode !== null && mode !== "FREE" && mode !== "PAID") {
      return NextResponse.json({ error: "Invalid parking mode" }, { status: 400 });
    }

    let streetModeFilter = "";
    if (mode === "FREE") {
      // Filter before the result cap so unrelated no-parking roads cannot hide
      // the useful street candidates in a dense city such as Richmond.
      streetModeFilter = `
        AND lower(coalesce(s.street_use, '')) IN (
          'residential', 'unrestricted', 'time limited'
        )
      `;
    } else if (mode === "PAID") {
      streetModeFilter = `
        AND (
          lower(coalesce(s.street_use, '')) = 'paid'
          OR EXISTS (
            SELECT 1
            FROM parking_meters candidate_meter
            WHERE ST_DWithin(
              s.geom::geography,
              candidate_meter.geom::geography,
              15
            )
          )
        )
      `;
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
      ${streetModeFilter}
      LIMIT 3000
    `;

    const [metersRes, streetsRes] = await Promise.all([
      query(metersQuery, [west, south, east, north]),
      query(streetsQuery, [west, south, east, north]),
    ]);

    return NextResponse.json({
      meters: metersRes.rows,
      streets: streetsRes.rows,
    });
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
