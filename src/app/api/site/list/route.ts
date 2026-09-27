import { NextRequest, NextResponse } from "next/server";
import { effectiveStatus, getLicense, getSites, isValidEmail, keysMatch } from "@/lib/license-store";

export const runtime = "nodejs";

/** Returns every site reported under a license (spec item 43, "My Sites"). */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { email, key } = (body as { email?: unknown; key?: unknown }) ?? {};
  if (!isValidEmail(email) || typeof key !== "string") {
    return NextResponse.json({ error: "email and key are required" }, { status: 400 });
  }

  try {
    const license = await getLicense(email);
    if (!license || !keysMatch(license.key, key) || effectiveStatus(license) === "EXPIRED") {
      return NextResponse.json({ error: "License not active" }, { status: 403 });
    }
    const sites = await getSites(email);
    return NextResponse.json({ sites });
  } catch {
    return NextResponse.json({ error: "Lookup failed, please try again" }, { status: 502 });
  }
}
