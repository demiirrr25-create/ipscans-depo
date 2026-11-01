import { NextRequest, NextResponse } from "next/server";
import net from "node:net";
import { promises as dns } from "node:dns";
import { isPublicTarget } from "@/lib/public-target";
import { runRustPortScan } from "@/lib/rust-engine";

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
  { port: 554, name: "RTSP" },
  { port: 3306, name: "MySQL" },
  { port: 3389, name: "RDP" },
  { port: 5432, name: "PostgreSQL" },
  { port: 8000, name: "Hikvision-SDK" },
  { port: 8080, name: "HTTP-alt" },
  { port: 8899, name: "ONVIF" },
  { port: 37777, name: "Dahua-DVRIP" },
];

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

  let ip = host;
  if (!net.isIP(host)) {
    try {
      const { address } = await dns.lookup(host);
      ip = address;
    } catch {
      return NextResponse.json({ error: "Host not found" }, { status: 404 });
    }
  }

  if (!isPublicTarget(ip)) {
    return NextResponse.json(
      { error: "Private/internal targets are not allowed" },
      { status: 403 }
    );
  }

  const rustScan = await runRustPortScan(
    ip,
    COMMON_PORTS.map((p) => p.port)
  );

  if (rustScan) {
    const results = COMMON_PORTS.map((p) => {
      const match = rustScan.find((r) => r.port === p.port);
      return {
        ...p,
        open: match ? match.status === "open" : false,
        latencyMs: match?.latencyMs ?? 0,
      };
    });
    return NextResponse.json({
      engine: "ipscans-rust-core/3.0",
      host,
      ip,
      ports: results,
    });
  }

  const results = await Promise.all(
    COMMON_PORTS.map(async (p) => ({
      ...p,
      open: await checkPort(ip, p.port),
    }))
  );

  return NextResponse.json({
    engine: "ipscans-rust-core/3.0",
    host,
    ip,
    ports: results,
  });
}
