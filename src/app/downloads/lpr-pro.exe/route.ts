import { lprRelease } from "@/content/lpr-release";

export function GET() {
  return Response.redirect(lprRelease.url || lprRelease.releaseUrl, 307);
}
