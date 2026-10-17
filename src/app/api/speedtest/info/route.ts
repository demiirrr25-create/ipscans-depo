import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const clientIp = forwarded ? forwarded.split(",")[0].trim() : realIp || "127.0.0.1";

  // Vercel edge geo headers when available
  const city = request.headers.get("x-vercel-ip-city");
  const country = request.headers.get("x-vercel-ip-country") || "TR";
  const region = request.headers.get("x-vercel-ip-country-region");
  const vercelId = request.headers.get("x-vercel-id") || "";
  const edgeLocation = vercelId.split("::")[0] || process.env.VERCEL_REGION || "local";

  const locationLabel = city 
    ? `${decodeURIComponent(city)}, ${country}` 
    : edgeLocation !== "local" 
      ? `Edge Node (${edgeLocation.toUpperCase()})` 
      : "Direct Core Network";

  return NextResponse.json(
    {
      ip: clientIp,
      server: {
        id: "ipscans-core",
        name: `IPScans Edge (${edgeLocation.toUpperCase()})`,
        location: locationLabel,
        country,
        region: edgeLocation,
      },
      client: {
        ip: clientIp,
        city: city ? decodeURIComponent(city) : undefined,
        country,
        region,
      },
      timestamp: Date.now(),
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}
