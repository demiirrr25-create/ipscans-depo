import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Auto-update check (spec item 34). Kept as a static object for now — bump
 * these values when a new .exe is published; no database needed for this.
 */
const LATEST = {
  version: "1.1.0",
  downloadUrl: "https://ipscans.com/downloads/ipscans-network-health-pro.exe",
  notes: "Offline detection fix for fully-disconnected devices, device identity now persists across MAC/DHCP reshuffles, smarter camera/NVR/router recognition, corrected numeric IP sorting, and a consolidated Settings tab.",
};

export async function GET() {
  return NextResponse.json(LATEST);
}
