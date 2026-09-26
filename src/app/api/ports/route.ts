import { NextRequest, NextResponse } from "next/server";
import net from "node:net";
import { promises as dns } from "node:dns";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HOST_REGEX =
  /^(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.[A-Za-z0-9-]{1,63})*$|^(\d{1,3}\.){3}\d{1,3}$/;

const COMMON_PORTS: { port: number; name: string }[] = [
  { port: 21, name: "FTP" },
  { port: 22, name: "SSH" },
  { port: 25, name: "SMTP" },
  { port: 53, name: "DNS" },
  { port: 80, name: "HTTP" },
  { port: 110, name: "POP3" },
  { port: 143, name: "IMAP" },
  { port: 443, name: "HTTPS" },
  { port: 3306, name: "MySQL" },
  { port: 3389, name: "RDP" },
  { port: 5432, name: "PostgreSQL" },
  { port: 8080, name: "HTTP-alt" },
];

function isPrivateIp(ip: string): boolean {
  if (ip === "::1" || ip.startsWith("127.") || ip === "0.0.0.0") return true;
  if (ip.startsWith("10.") || ip.startsWith("192.168.")) return true;
  if (ip.startsWith("169.254.")) return true;
  if (ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe80"))
    return true;
  const m = ip.match(/^172\.(\d+)\./);
  if (m && Number(m[1]) >= 16 && Number(m[1]) <= 31) return true;
  return false;
}

function checkPort(host: string, port: number, timeout = 1500): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;
    const done = (open: boolean) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(open);
    };
    socket.setTimeout(timeout);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
    socket.connect(port, host);
  });
}

export async function GET(request: NextRequest) {
  const host = request.nextUrl.searchParams.get("host")?.trim().toLowerCase();

  if (!host || host.length > 253 || !HOST_REGEX.test(host)) {
    return NextResponse.json({ error: "Invalid host" }, { status: 400 });
  }

  // Resolve to guard against private/internal targets (SSRF protection).
  let ip = host;
  if (!net.isIP(host)) {
    try {
      const { address } = await dns.lookup(host);
      ip = address;
    } catch {
      return NextResponse.json({ error: "Host not found" }, { status: 404 });
    }
  }

  if (isPrivateIp(ip)) {
    return NextResponse.json(
      { error: "Private/internal targets are not allowed" },
      { status: 403 }
    );
  }

  const results = await Promise.all(
    COMMON_PORTS.map(async (p) => ({
      ...p,
      open: await checkPort(ip, p.port),
    }))
  );

  return NextResponse.json({ host, ip, ports: results });
}
