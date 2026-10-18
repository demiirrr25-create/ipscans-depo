import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB cap
const CHUNK_SIZE = 64 * 1024;

// Pre-seeded incompressible buffer so proxies/transports cannot compress zero pages.
const SHARED_CHUNK = (() => {
  const buf = new Uint8Array(CHUNK_SIZE);
  let state = 0x9e3779b9;
  for (let i = 0; i < buf.length; i++) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    buf[i] = state & 0xff;
  }
  return buf;
})();

export async function GET(request: NextRequest) {
  const rawBytes = request.nextUrl.searchParams.get("bytes");
  const requested = rawBytes !== null ? Number(rawBytes) : 5_000_000;
  const bytes = Number.isFinite(requested)
    ? Math.min(Math.max(Math.floor(requested), 0), MAX_BYTES)
    : 5_000_000;

  if (bytes === 0) {
    return new Response(new Uint8Array(0), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Length": "0",
        "Cache-Control": "no-store, no-cache, must-revalidate, no-transform",
        "Content-Encoding": "identity",
        "Timing-Allow-Origin": "*",
      },
    });
  }

  let sent = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (sent >= bytes) {
        controller.close();
        return;
      }
      const remaining = bytes - sent;
      const size = Math.min(CHUNK_SIZE, remaining);
      controller.enqueue(
        size === CHUNK_SIZE ? SHARED_CHUNK : SHARED_CHUNK.subarray(0, size)
      );
      sent += size;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Length": String(bytes),
      "Cache-Control": "no-store, no-cache, must-revalidate, no-transform",
      "Content-Encoding": "identity",
      "Timing-Allow-Origin": "*",
    },
  });
}
