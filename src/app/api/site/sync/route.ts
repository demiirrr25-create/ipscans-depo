import { NextRequest, NextResponse } from "next/server";
import { effectiveStatus, getLicense, isValidEmail, keysMatch, upsertSite } from "@/lib/license-store";

export const runtime = "nodejs";

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

/**
 * Multi-site sync (spec items 42-43): a licensed desktop install reports a
 * compact health summary for its configured "site name" here, so a
 * PRO+ account can see all its locations in one place (see /api/site/list).
 * Continuous-monitoring — and therefore syncing — is itself PRO-gated, so
 * this only ever needs to accept summaries from valid, active licenses.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { email, key, site } = (body as Record<string, unknown>) ?? {};
  if (!isValidEmail(email) || typeof key !== "string") {
    return NextResponse.json({ error: "email and key are required" }, { status: 400 });
  }
  const s = site as Record<string, unknown> | undefined;
  if (
    !s ||
    typeof s.name !== "string" ||
    s.name.trim().length === 0 ||
    s.name.length > 100 ||
    !isFiniteNumber(s.deviceCount) ||
    !isFiniteNumber(s.onlineCount) ||
    !isFiniteNumber(s.offlineCount) ||
    !isFiniteNumber(s.conflictCount) ||
    !isFiniteNumber(s.healthScore)
  ) {
    return NextResponse.json({ error: "Invalid site summary" }, { status: 400 });
  }

  try {
    const license = await getLicense(email);
    if (!license || !keysMatch(license.key, key) || effectiveStatus(license) === "EXPIRED") {
      return NextResponse.json({ error: "License not active" }, { status: 403 });
    }

    const sites = await upsertSite(email, {
      name: s.name.trim(),
      deviceCount: s.deviceCount,
      onlineCount: s.onlineCount,
      offlineCount: s.offlineCount,
      conflictCount: s.conflictCount,
      healthScore: s.healthScore,
      lastSyncedAt: new Date().toISOString(),
    });
    return NextResponse.json({ sites });
  } catch {
    return NextResponse.json({ error: "Sync failed, please try again" }, { status: 502 });
  }
}
