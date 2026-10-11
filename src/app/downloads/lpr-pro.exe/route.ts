import { lprRelease } from "@/content/lpr-release";

export function GET() {
  return new Response(null, { status: 307, headers: { Location: lprRelease.url, "Cache-Control": "no-store" } });
}
