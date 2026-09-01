import { NextResponse } from "next/server";
import { query } from "../../../lib/db";
import { headers } from "next/headers";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      target_id,
      target_type,
      reported_status,
      reason,
      latitude,
      longitude,
    } = body;

    // Validation
    if (!target_id || !target_type || !reported_status) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!["METER", "STREET", "ZONE"].includes(target_type)) {
      return NextResponse.json(
        { error: "Invalid target_type. Must be METER, STREET, or ZONE" },
        { status: 400 }
      );
    }

    // Status validation
    if (!["FREE", "PAID", "NO_PARKING"].includes(reported_status)) {
      return NextResponse.json(
        { error: "Invalid reported_status. Must be FREE, PAID, or NO_PARKING" },
        { status: 400 }
      );
    }

    // Get IP
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for") || "127.0.0.1";

    let sql = "";
    let params: any[] = [];

    const hasLocation = latitude !== undefined || longitude !== undefined;
    const validLocation =
      typeof latitude === "number" &&
      typeof longitude === "number" &&
      Number.isFinite(latitude) &&
      Number.isFinite(longitude) &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180;

    if (hasLocation && !validLocation) {
      return NextResponse.json(
        { error: "Latitude and longitude must be valid coordinates" },
        { status: 400 }
      );
    }

    if (validLocation) {
      sql = `
            INSERT INTO reports (
                target_id, target_type, reported_status, reason, user_ip, user_location
            ) VALUES (
                $1, $2, $3, $4, $5, ST_SetSRID(ST_MakePoint($6, $7), 4326)
            )
            RETURNING id
        `;
      params = [
        target_id,
        target_type,
        reported_status,
        reason,
        ip,
        longitude,
        latitude,
      ];
    } else {
      sql = `
            INSERT INTO reports (
                target_id, target_type, reported_status, reason, user_ip
            ) VALUES (
                $1, $2, $3, $4, $5
            )
            RETURNING id
        `;
      params = [target_id, target_type, reported_status, reason, ip];
    }

    const res = await query(sql, params);

    return NextResponse.json({ success: true, id: res.rows[0].id });
  } catch (error: any) {
    console.error("Report API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
