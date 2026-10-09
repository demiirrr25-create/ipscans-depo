import { NextRequest, NextResponse } from "next/server";
import { Resolver } from "node:dns/promises";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DOMAIN_REGEX = /^(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.[A-Za-z]{2,})+$/;

export async function GET(request: NextRequest) {
  const domain = request.nextUrl.searchParams.get("domain")?.trim();

  if (!domain || !DOMAIN_REGEX.test(domain)) {
    return NextResponse.json({ error: "Invalid domain" }, { status: 400 });
  }

  const dns = new Resolver({ timeout: 1500, tries: 1 });

  async function safe<T>(fn: () => Promise<T>): Promise<T | []> {
    try {
      return await fn();
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === 'ENODATA' || code === 'ENOTFOUND') return [];
      throw error;
    }
  }

  const records = await Promise.all([
    safe(() => dns.resolve4(domain!)),
    safe(() => dns.resolve6(domain!)),
    safe(() => dns.resolveMx(domain!)),
    safe(() => dns.resolveTxt(domain!)),
    safe(() => dns.resolveNs(domain!)),
    safe(() => dns.resolveCname(domain!)),
  ]).catch(() => null);
  if (!records) {
    return NextResponse.json({ error: "DNS resolver unavailable; retry later" }, { status: 503 });
  }
  const [a, aaaa, mx, txt, ns, cname] = records;

  return NextResponse.json({
    domain,
    records: {
      A: a,
      AAAA: aaaa,
      MX: (mx as { exchange: string; priority: number }[]).map(
        (r) => `${r.priority} ${r.exchange}`
      ),
      TXT: (txt as string[][]).map((r) => r.join(" ")),
      NS: ns,
      CNAME: cname,
    },
  });
}
