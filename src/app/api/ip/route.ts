import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function getClientIp(request: NextRequest): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return null;
}

function isPrivateOrLoopback(ip: string): boolean {
  if (ip === "::1" || ip.startsWith("127.") || ip === "0.0.0.0") return true;
  if (ip.startsWith("10.") || ip.startsWith("192.168.")) return true;
  if (ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe80"))
    return true;
  const m = ip.match(/^172\.(\d+)\./);
  if (m && Number(m[1]) >= 16 && Number(m[1]) <= 31) return true;
  return false;
}

const IP_REGEX =
  /^(\d{1,3}\.){3}\d{1,3}$|^([0-9a-fA-F:]+:+)+[0-9a-fA-F]+$/;

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("ip")?.trim();

  if (query && !IP_REGEX.test(query)) {
    return NextResponse.json({ error: "Invalid IP address" }, { status: 400 });
  }

  const clientIp = getClientIp(request);
  // If no query and the client IP is private/loopback (e.g. local dev),
  // let ipwho.is detect the public IP by passing an empty target.
  const target =
    query || (clientIp && !isPrivateOrLoopback(clientIp) ? clientIp : "");

  try {
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(target)}`, {
      next: { revalidate: 0 },
    });
    const data = await res.json();

    if (!data.success) {
      return NextResponse.json(
        { error: data.message || "Lookup failed" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ip: data.ip,
      country: data.country,
      countryCode: data.country_code,
      region: data.region,
      city: data.city,
      latitude: data.latitude,
      longitude: data.longitude,
      timezone: data.timezone?.id ?? null,
      isp: data.connection?.isp ?? null,
      org: data.connection?.org ?? null,
    });
  } catch {
    return NextResponse.json({ error: "Lookup failed" }, { status: 502 });
  }
}
