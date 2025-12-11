import { NextResponse } from "next/server";
import { query } from "../../../lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const north = parseFloat(searchParams.get("north") || "0");
    const south = parseFloat(searchParams.get("south") || "0");
    const east = parseFloat(searchParams.get("east") || "0");
    const west = parseFloat(searchParams.get("west") || "0");

    if (!north || !south || !east || !west) {
      return NextResponse.json({ error: "Missing bounds" }, { status: 400 });
    }

    // 1. Get Meters
    const metersQuery = `
      SELECT id, pay_station_id, meter_head, time_in_effect, credit_card,
             raw_data->>'t_mf_9a_6p' as t_mf_9a_6p,
             raw_data->>'t_mf_6p_10' as t_mf_6p_10,
             raw_data->>'t_sa_9a_6p' as t_sa_9a_6p,
             raw_data->>'t_sa_6p_10' as t_sa_6p_10,
             raw_data->>'t_su_9a_6p' as t_su_9a_6p,
             raw_data->>'t_su_6p_10' as t_su_6p_10,
             raw_data->>'r_mf_9a_6p' as r_mf_9a_6p,
             raw_data->>'r_mf_6p_10' as r_mf_6p_10,
             raw_data->>'r_sa_9a_6p' as r_sa_9a_6p,
             raw_data->>'r_sa_6p_10' as r_sa_6p_10,
             raw_data->>'r_su_9a_6p' as r_su_9a_6p,
             raw_data->>'r_su_6p_10' as r_su_6p_10,
             ST_AsGeoJSON(geom)::json as geom
      FROM parking_meters
      WHERE ST_Intersects(geom, ST_MakeEnvelope($1, $2, $3, $4, 4326))
      LIMIT 1000
    `;

    // 2. Get Streets with "has_meter" flag
    // We check if any meter is within 15 meters of the street line.
    // This implies PAIED parking is present on that block face.
    const streetsQuery = `
      SELECT s.id, s.block_id, s.street_use,
             ST_AsGeoJSON(s.geom)::json as geom,
             (
                SELECT json_agg(json_build_object('time_in_effect', m.time_in_effect, 'rate', m.raw_data->>'r_mf_9a_6p')) 
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
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
