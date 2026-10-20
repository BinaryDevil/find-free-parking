import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Deployment identity is public metadata; never return configuration or secrets.
export async function GET() {
  return NextResponse.json(
    {
      revision: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
      environment: process.env.VERCEL_ENV ?? null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
