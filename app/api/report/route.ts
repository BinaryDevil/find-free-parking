import { getClientIp } from "../../../lib/client-ip";
import { NextResponse } from "next/server";
import { query } from "../../../lib/db";

const MAX_REASON_LENGTH = 500;
// Matches the advisory Driver Warning window.
const REPORT_WINDOW = "90 days";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidCoordinate(value: unknown, limit: number): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    Math.abs(value) <= limit
  );
}

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

    if (typeof target_id !== "string" || !UUID_PATTERN.test(target_id)) {
      return NextResponse.json(
        { error: "Invalid target_id" },
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

    if (
      reason !== undefined &&
      reason !== null &&
      (typeof reason !== "string" || reason.length > MAX_REASON_LENGTH)
    ) {
      return NextResponse.json(
        {
          error: `Invalid reason. Must be text of at most ${MAX_REASON_LENGTH} characters`,
        },
        { status: 400 }
      );
    }

    const ip = getClientIp(request.headers);

    // Limit repeated reports from one client within the warning window.
    if (ip) {
      const existing = await query(
        `
          SELECT 1 FROM reports
          WHERE target_id = $1
            AND target_type = $2
            AND user_ip = $3
            AND created_at > now() - interval '${REPORT_WINDOW}'
          LIMIT 1
        `,
        [target_id, target_type, ip]
      );
      if (existing.rows.length > 0) {
        return NextResponse.json({ success: true, duplicate: true });
      }
    }

    // 0 is a valid latitude/longitude, so check type rather than truthiness.
    const hasLocation =
      isValidCoordinate(latitude, 90) && isValidCoordinate(longitude, 180);

    let sql = "";
    let params: unknown[] = [];

    if (hasLocation) {
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
  } catch (error) {
    console.error("Report API Error:", error);
    // Do not expose database error details to clients.
    return NextResponse.json(
      { error: "Failed to submit report" },
      { status: 500 }
    );
  }
}
