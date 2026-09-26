import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB cap

export async function GET(request: NextRequest) {
  const requested = Number(request.nextUrl.searchParams.get("bytes")) || 5_000_000;
  const bytes = Math.min(Math.max(requested, 1), MAX_BYTES);
  const chunkSize = 64 * 1024;
  const chunk = new Uint8Array(chunkSize);

  let sent = 0;
  const stream = new ReadableStream({
    pull(controller) {
      if (sent >= bytes) {
        controller.close();
        return;
      }
      const remaining = bytes - sent;
      const size = Math.min(chunkSize, remaining);
      controller.enqueue(size === chunkSize ? chunk : chunk.subarray(0, size));
      sent += size;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Length": String(bytes),
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
