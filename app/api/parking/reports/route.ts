import { NextResponse } from "next/server";

import { query } from "@/lib/db";

export const runtime = "nodejs";

const targetTypes = new Set(["ZONE", "SPOT"]);

type ReportRow = {
  id: string;
  target_type: string;
  target_id: string;
  status: string;
  reason: string | null;
  reporter_email: string | null;
  reporter_note: string | null;
  created_at: string;
};

export async function POST(req: Request) {
  let body: Record<string, unknown>;

  try {
    body = await req.json();
  } catch (error) {
    console.error("Failed to parse request body for report", error);
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const targetType = body.targetType;
  const targetId = body.targetId;
  const reason = body.reason;
  const email = body.email;
  const note = body.note;

  if (typeof targetType !== "string" || !targetTypes.has(targetType)) {
    return NextResponse.json({ error: "Invalid targetType" }, { status: 400 });
  }

  if (typeof targetId !== "string" || targetId.length === 0) {
    return NextResponse.json({ error: "targetId is required" }, { status: 400 });
  }

  if (typeof reason !== "string" || reason.trim().length === 0) {
    return NextResponse.json({ error: "reason is required" }, { status: 400 });
  }

  if (email && typeof email !== "string") {
    return NextResponse.json({ error: "email must be a string" }, { status: 400 });
  }

  if (note && typeof note !== "string") {
    return NextResponse.json({ error: "note must be a string" }, { status: 400 });
  }

  try {
    const insertSql = `
      insert into public.reports (
        target_type,
        target_id,
        reason,
        reporter_email,
        reporter_note
      )
      values ($1, $2, $3, $4, $5)
      returning
        id,
        target_type,
        target_id,
        status,
        reason,
        reporter_email,
        reporter_note,
        created_at
    `;

    const { rows } = await query<ReportRow>(insertSql, [
      targetType,
      targetId,
      reason,
      email ?? null,
      note ?? null,
    ]);

    const row = rows[0];

    return NextResponse.json(
      {
        id: row.id,
        targetType: row.target_type,
        targetId: row.target_id,
        status: row.status,
        reason: row.reason,
        email: row.reporter_email,
        note: row.reporter_note,
        createdAt: row.created_at,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating report", error);
    return NextResponse.json(
      { error: "Failed to create report" },
      { status: 500 },
    );
  }
}
