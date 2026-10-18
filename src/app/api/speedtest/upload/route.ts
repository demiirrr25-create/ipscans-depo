import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let received = 0;
  const reader = request.body?.getReader();
  if (reader) {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        received += value?.byteLength ?? 0;
      }
    } catch {
      // Client aborted stream mid-upload; return bytes received so far.
    } finally {
      reader.releaseLock();
    }
  }
  return NextResponse.json(
    { received, timestamp: Date.now() },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        Pragma: "no-cache",
        "Timing-Allow-Origin": "*",
      },
    }
  );
}
