import { NextResponse } from "next/server";
import { desktopRelease } from "@/content/applications";

export const runtime = "nodejs";

/**
 * Auto-update check (spec item 34). Kept as a static object for now — bump
 * these values when a new .exe is published; no database needed for this.
 */
const LATEST = {
  version: "1.2.1",
  downloadUrl: desktopRelease.healthPro.portableUrl,
  notes: "Fixed IP conflict detection and dropdown contrast. The desktop app has a new monochrome network-health icon; an optional installer with a desktop shortcut is available on the IPScans website.",
};

export async function GET() {
  return NextResponse.json(LATEST);
}
