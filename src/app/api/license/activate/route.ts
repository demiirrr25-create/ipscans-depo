import { NextRequest, NextResponse } from "next/server";
import { getOrCreateTrialLicense, isValidEmail } from "@/lib/license-store";

export const runtime = "nodejs";

/**
 * Phase 1: any valid email gets a 30-day PRO trial (idempotent — calling
 * again with the same email returns the same record, it never resets the
 * clock). Real paid activation via Stripe is Phase 2.2; this endpoint will
 * gain a `licenseKey`/checkout-session path then without changing its shape.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = (body as { email?: unknown })?.email;
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  }

  try {
    const license = await getOrCreateTrialLicense(email);
    return NextResponse.json({ license });
  } catch {
    return NextResponse.json({ error: "Activation failed, please try again" }, { status: 502 });
  }
}
