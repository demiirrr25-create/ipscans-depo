import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isLoopback(ip: string): boolean {
  return ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1";
}

export async function GET(request: NextRequest) {
  const cfIp = request.headers.get("cf-connecting-ip")?.trim();
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip")?.trim();

  const rawIp =
    cfIp ||
    (forwarded ? forwarded.split(",")[0].trim() : null) ||
    realIp ||
    null;
  const clientIp = rawIp && !isLoopback(rawIp) ? rawIp : null;

  const rawCity =
    request.headers.get("x-vercel-ip-city") ||
    request.headers.get("cf-ipcity") ||
    null;
  let city: string | null = null;
  if (rawCity) {
    try {
      city = decodeURIComponent(rawCity);
    } catch {
      city = rawCity;
    }
  }

  const country =
    request.headers.get("x-vercel-ip-country") ||
    request.headers.get("cf-ipcountry") ||
    null;
  const region =
    request.headers.get("x-vercel-ip-country-region") ||
    request.headers.get("cf-region") ||
    null;

  const vercelId = request.headers.get("x-vercel-id") || "";
  const cfRay = request.headers.get("cf-ray") || "";
  const cfColo = cfRay.includes("-") ? cfRay.split("-").pop() || null : null;
  const vercelRegion = vercelId.split("::")[0]?.trim() || process.env.VERCEL_REGION || null;

  const edgeCode = (cfColo || vercelRegion || "").toUpperCase() || null;

  const locationParts = [city, country].filter(Boolean);
  const locationLabel =
    locationParts.length > 0
      ? locationParts.join(", ")
      : edgeCode
        ? edgeCode
        : null;

  return NextResponse.json(
    {
      ip: clientIp,
      server: {
        id: edgeCode ? `ipscans-${edgeCode.toLowerCase()}` : "ipscans-origin",
        name: edgeCode ? `IPScans Edge (${edgeCode})` : "IPScans Origin",
        location: locationLabel,
        country: country || undefined,
        region: edgeCode || region || undefined,
        colo: edgeCode || undefined,
      },
      client: {
        ip: clientIp || undefined,
        city: city || undefined,
        country: country || undefined,
        region: region || undefined,
      },
      timestamp: Date.now(),
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        Pragma: "no-cache",
      },
    }
  );
}
