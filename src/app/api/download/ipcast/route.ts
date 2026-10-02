import { NextResponse } from "next/server";
import { ipcastRelease } from "@/content/applications";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const res = await fetch(ipcastRelease.url, {
      method: "HEAD",
      redirect: "manual",
      cache: "no-store",
    });
    if (res.status === 200 || res.status === 302 || res.status === 301) {
      return NextResponse.redirect(ipcastRelease.url, 302);
    }
  } catch {}

  // Seamless fallback to the latest verified Windows binary
  return NextResponse.redirect(
    "https://github.com/demiirrr25-create/ipscans-depo/releases/download/ipcast-latest/IPCast.exe",
    302
  );
}
