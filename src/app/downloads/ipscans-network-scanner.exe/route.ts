import { desktopRelease } from "@/content/applications";

export function GET() {
  return Response.redirect(desktopRelease.scanner.installerUrl, 307);
}
