import { NextRequest, NextResponse } from "next/server";
import { effectiveStatus, getLicense, isValidEmail, keysMatch } from "@/lib/license-store";

export const runtime = "nodejs";

/**
 * Validates an (email, key) pair the desktop app cached from activation.
 * Returns the current authoritative status (which may have flipped to
 * EXPIRED since activation) — the app caches this response locally so it
 * keeps working offline for a grace period (product spec item 32).
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { email, key } = (body as { email?: unknown; key?: unknown }) ?? {};
  if (!isValidEmail(email) || typeof key !== "string" || key.length === 0) {
    return NextResponse.json({ error: "email and key are required" }, { status: 400 });
  }

  try {
    const license = await getLicense(email);
    if (!license || !keysMatch(license.key, key)) {
      return NextResponse.json({ valid: false }, { status: 404 });
    }
    return NextResponse.json({
      valid: true,
      license: { ...license, status: effectiveStatus(license) },
    });
  } catch {
    return NextResponse.json({ error: "Validation failed, please try again" }, { status: 502 });
  }
}
