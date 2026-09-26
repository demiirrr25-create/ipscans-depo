import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    { t: Date.now() },
    { headers: { "Cache-Control": "no-store" } }
  );
}
