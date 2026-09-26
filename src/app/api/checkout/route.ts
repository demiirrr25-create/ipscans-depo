import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Mock order creation: no payment/persistence backend wired up yet.
// A real implementation should validate items server-side and hand off
// to a payment provider (e.g. Stripe) + order store (e.g. Medusa/Postgres).
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: "Empty cart" }, { status: 400 });
  }

  const orderId = `IPS-${Date.now().toString(36).toUpperCase()}`;
  return NextResponse.json({ orderId });
}
