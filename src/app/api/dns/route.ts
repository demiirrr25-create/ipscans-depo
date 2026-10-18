import { NextRequest, NextResponse } from "next/server";
import { Resolver } from "node:dns/promises";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DOMAIN_REGEX = /^(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.[A-Za-z]{2,})+$/;

export async function GET(request: NextRequest) {
  const domain = request.nextUrl.searchParams.get("domain")?.trim().toLowerCase();

  if (!domain || !DOMAIN_REGEX.test(domain)) {
    return NextResponse.json({ error: "Invalid domain" }, { status: 400 });
  }

  const dns = new Resolver({ timeout: 1500, tries: 1 });

  async function safe<T>(fn: () => Promise<T>): Promise<T | []> {
    try {
      return await fn();
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENODATA" || code === "ENOTFOUND" || code === "ENOTIMP") return [];
      throw error;
    }
  }

  const records = await Promise.all([
    safe(() => dns.resolve4(domain, { ttl: true })),
    safe(() => dns.resolve6(domain, { ttl: true })),
    safe(() => dns.resolveMx(domain)),
    safe(() => dns.resolveTxt(domain)),
    safe(() => dns.resolveNs(domain)),
    safe(() => dns.resolveCname(domain)),
  ]).catch(() => null);
  if (!records) {
    return NextResponse.json({ error: "DNS resolver unavailable; retry later" }, { status: 503 });
  }
  const [a, aaaa, mx, txt, ns, cname] = records;
  const aList = a as { address: string; ttl: number }[];
  const aaaaList = aaaa as { address: string; ttl: number }[];
  const mxList = (mx as { exchange: string; priority: number }[])
    .slice()
    .sort((x, y) => x.priority - y.priority);
  const txtList = (txt as string[][]).map((r) => r.join(" "));
  const nsList = ns as string[];
  const cnameList = cname as string[];

  return NextResponse.json({
    domain,
    records: {
      A: aList.map((r) => r.address),
      AAAA: aaaaList.map((r) => r.address),
      MX: mxList.map((r) => `${r.priority} ${r.exchange}`),
      TXT: txtList,
      NS: nsList,
      CNAME: cnameList,
    },
    details: {
      A: aList.map((r) => ({ value: r.address, ttl: r.ttl })),
      AAAA: aaaaList.map((r) => ({ value: r.address, ttl: r.ttl })),
      MX: mxList.map((r) => ({ value: r.exchange, priority: r.priority })),
      TXT: txtList.map((value) => ({ value })),
      NS: nsList.map((value) => ({ value })),
      CNAME: cnameList.map((value) => ({ value })),
    },
  });
}
