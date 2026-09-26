import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DOMAIN_REGEX = /^(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.[A-Za-z]{2,})+$/;

type RdapEvent = { eventAction: string; eventDate: string };
type RdapEntity = {
  roles?: string[];
  vcardArray?: [string, [string, object, string, string][]];
};
type RdapResponse = {
  events?: RdapEvent[];
  entities?: RdapEntity[];
  nameservers?: { ldhName?: string }[];
  status?: string[];
};

function eventDate(events: RdapEvent[] | undefined, action: string) {
  return events?.find((e) => e.eventAction === action)?.eventDate ?? null;
}

function registrarName(entities: RdapEntity[] | undefined): string | null {
  const registrar = entities?.find((e) => e.roles?.includes("registrar"));
  const fn = registrar?.vcardArray?.[1]?.find((v) => v[0] === "fn");
  return (fn?.[3] as string) ?? null;
}

export async function GET(request: NextRequest) {
  const domain = request.nextUrl.searchParams.get("domain")?.trim().toLowerCase();

  if (!domain || !DOMAIN_REGEX.test(domain)) {
    return NextResponse.json({ error: "Invalid domain" }, { status: 400 });
  }

  try {
    const res = await fetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`, {
      headers: {
        Accept: "application/rdap+json",
        "User-Agent": "ipscans.com WHOIS lookup (+https://ipscans.com)",
      },
      redirect: "follow",
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const data: RdapResponse = await res.json();

    return NextResponse.json({
      domain,
      registrar: registrarName(data.entities),
      created: eventDate(data.events, "registration"),
      updated: eventDate(data.events, "last changed"),
      expires: eventDate(data.events, "expiration"),
      status: data.status ?? [],
      nameservers: (data.nameservers ?? [])
        .map((n) => n.ldhName?.toLowerCase())
        .filter(Boolean),
    });
  } catch {
    return NextResponse.json({ error: "Lookup failed" }, { status: 502 });
  }
}
