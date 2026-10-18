import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
  "Timing-Allow-Origin": "*",
};

export function GET() {
  return NextResponse.json(
    { t: Date.now() },
    { headers: NO_STORE_HEADERS }
  );
}

export function HEAD() {
  return new Response(null, {
    status: 204,
    headers: NO_STORE_HEADERS,
  });
}
