import { NextResponse } from "next/server";
import { query } from "../../../lib/db";
import { driverWarningsSql } from "@/lib/driver-warnings";
import { parseParkingSelection } from "@/lib/parking-selection";
import { legacyParkingEvaluation } from "@/lib/legacy-parking-evaluation";
import { approvedParkingPlaceIds } from "@/lib/approved-parking-coverage";
import { classifiedPlaces } from "@/lib/classified-places";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const now = new Date();
    let selection;
    try { selection = parseParkingSelection(searchParams, now); } catch {
      return NextResponse.json({ error: "Invalid parking selection" }, { status: 400 });
    }
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
      SELECT id, pay_station_id, meter_head, ${driverWarningsSql('METER')},
             schedules, raw_data,
             ST_AsGeoJSON(geom)::json as geom
      FROM parking_meters
      WHERE ST_Intersects(geom, ST_MakeEnvelope($1, $2, $3, $4, 4326))
      LIMIT 1000
    `;

    // Streets are context geometry; nearby meters do not establish curb rules.
    const streetsQuery = `
      SELECT s.id, s.block_id, s.street_use, ${driverWarningsSql('STREET')},
             ST_AsGeoJSON(s.geom)::json as geom
      FROM street_segments s
      WHERE ST_Intersects(s.geom, ST_MakeEnvelope($1, $2, $3, $4, 4326))
      LIMIT 1000
    `;

    const [metersRes, streetsRes, places] = await Promise.all([
      query(metersQuery, [west, south, east, north]),
      query(streetsQuery, [west, south, east, north]),
      approvedParkingPlaceIds().then(ids => classifiedPlaces(query, ids, [west, south, east, north], selection, now)),
    ]);

    return NextResponse.json({
      meters: metersRes.rows.map(row => ({ ...row, ...legacyParkingEvaluation('METER', row, selection) })),
      streets: streetsRes.rows.map(row => ({ ...row, ...legacyParkingEvaluation('STREET', row, selection) })),
      places,
      coverage: { level: 'none' },
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
