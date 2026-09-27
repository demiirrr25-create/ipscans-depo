import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Auto-update check (spec item 34). Kept as a static object for now — bump
 * these values when a new .exe is published; no database needed for this.
 */
const LATEST = {
  version: "1.0.0",
  downloadUrl: "https://ipscans.com/downloads/ipscans-network-health-pro.exe",
  notes: "Initial Phase 1 release: IP conflict detection, health score, continuous monitoring.",
};

export async function GET() {
  return NextResponse.json(LATEST);
}
