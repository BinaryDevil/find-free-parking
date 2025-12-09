import { NextResponse } from "next/server";

import { query } from "@/lib/db";

export const runtime = "nodejs";

const targetTypes = new Set(["ZONE", "SPOT"]);

type SubmissionRow = {
  id: string;
  target_type: string;
  target_id: string | null;
  status: string;
  payload: unknown;
  submitter_email: string | null;
  submitter_note: string | null;
  created_at: string;
};

export async function POST(req: Request) {
  let body: Record<string, unknown>;

  try {
    body = await req.json();
  } catch (error) {
    console.error("Failed to parse request body for submission", error);
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const targetType = body.targetType;
  const targetId = body.targetId;
  const payload = body.payload;
  const submitterEmail = body.email ?? body.submitterEmail;
  const submitterNote = body.note ?? body.submitterNote;

  if (typeof targetType !== "string" || !targetTypes.has(targetType)) {
    return NextResponse.json({ error: "Invalid targetType" }, { status: 400 });
  }

  if (targetId !== undefined && targetId !== null && typeof targetId !== "string") {
    return NextResponse.json({ error: "targetId must be a string when provided" }, { status: 400 });
  }

  if (payload === undefined || payload === null || typeof payload !== "object") {
    return NextResponse.json({ error: "payload must be a JSON object" }, { status: 400 });
  }

  if (submitterEmail && typeof submitterEmail !== "string") {
    return NextResponse.json({ error: "email must be a string" }, { status: 400 });
  }

  if (submitterNote && typeof submitterNote !== "string") {
    return NextResponse.json({ error: "note must be a string" }, { status: 400 });
  }

  try {
    const insertSql = `
      insert into public.user_submissions (
        target_type,
        target_id,
        payload,
        submitter_email,
        submitter_note
      )
      values ($1, $2, $3::jsonb, $4, $5)
      returning
        id,
        target_type,
        target_id,
        status,
        payload,
        submitter_email,
        submitter_note,
        created_at
    `;

    const { rows } = await query<SubmissionRow>(insertSql, [
      targetType,
      targetId ?? null,
      JSON.stringify(payload),
      submitterEmail ?? null,
      submitterNote ?? null,
    ]);

    const row = rows[0];

    return NextResponse.json(
      {
        id: row.id,
        targetType: row.target_type,
        targetId: row.target_id,
        status: row.status,
        payload: row.payload,
        email: row.submitter_email,
        note: row.submitter_note,
        createdAt: row.created_at,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating submission", error);
    return NextResponse.json(
      { error: "Failed to create submission" },
      { status: 500 },
    );
  }
}
