import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Auto-update check (spec item 34). Kept as a static object for now — bump
 * these values when a new .exe is published; no database needed for this.
 */
const LATEST = {
  version: "1.2.1",
  downloadUrl: "https://ipscans.com/downloads/ipscans-network-health-pro.exe",
  notes: "Fixed a critical IP conflict detection gap: a second device taking over another device's static IP (with no prior history either way) is now correctly flagged as a conflict instead of a silent MAC-changed notice. Fixed invisible white-on-white text in dropdown menus and the tray right-click menu. Fixed the PRO badge on the app icon being too small to see once Windows shrinks it to a real desktop-icon size.",
};

export async function GET() {
  return NextResponse.json(LATEST);
}
