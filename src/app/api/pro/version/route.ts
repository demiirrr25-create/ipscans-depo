import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Auto-update check (spec item 34). Kept as a static object for now — bump
 * these values when a new .exe is published; no database needed for this.
 */
const LATEST = {
  version: "1.2.0",
  downloadUrl: "https://ipscans.com/downloads/ipscans-network-health-pro.exe",
  notes: "Rewrote IP conflict detection: it now judges a MAC change by what is happening right now (with a real-time re-check) instead of misreading history, so a device peacefully reclaiming its own address is no longer wrongly flagged as a fresh conflict. All alerts (conflict, offline, MAC/IP changed) now explain clearly what happened and what to check. Added HTTP/RTSP fingerprinting so plain IP cameras show real vendor/model/serial. Event Log and Inventory timestamps now show your local time. Dashboard shows a spinner while monitoring is starting.",
};

export async function GET() {
  return NextResponse.json(LATEST);
}
