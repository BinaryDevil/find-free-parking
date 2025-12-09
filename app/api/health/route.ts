import { NextResponse } from "next/server";

import { query } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    await query("select 1");
    return NextResponse.json({ ok: true, db: "up" });
  } catch (error) {
    console.error("Health check failed", error);
    return NextResponse.json(
      { ok: false, error: "DB unreachable" },
      { status: 500 },
    );
  }
}
