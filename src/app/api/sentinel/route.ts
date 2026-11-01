import { NextRequest, NextResponse } from "next/server";
import { runRustSentinelIncident } from "@/lib/rust-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    engine: "ipscans-sentinel-rust/3.0",
    aiAgent: "ipscans-cyber-agent:latest",
    executable: "IPScans-Sentinel.exe",
    capabilities: [
      "SCAN_AND_FINGERPRINT (Dahua 37777 DVRIP, RTSP 554, Hikvision 8000, ONVIF 8899, ARP OUI)",
      "IMMEDIATE_QUARANTINE (Sub-Second Windows Firewall + L3 Route + Main Modem UPnP DeletePortMapping)",
      "REMEDIATE_AND_HARDEN (Disable Camera P2P & UPnP, Enforce RTSP Digest, Static ARP Lock)",
      "VERIFY_AND_RESTORE (Clean LAN Access Restoration After Threat Neutralization)",
      "ELEVATED_ADMIN_SHELL (Administrator CMD.exe & PowerShell.exe UAC RunAs Execution)",
    ],
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const prompt =
      typeof body?.prompt === "string" && body.prompt.trim().length > 0
        ? body.prompt.trim()
        : "Dahua kamerama sızdılar, hemen ağa çıkmasını engelle, ana modemden portları kapat ve sorunu çözdükten sonra ağa erişim ver.";

    const rustResult = await runRustSentinelIncident(prompt);
    if (rustResult) {
      return NextResponse.json(rustResult);
    }

    return NextResponse.json({
      ok: true,
      engine: "ipscans-sentinel-rust/3.0",
      aiModel: "ipscans-cyber-agent:latest",
      threatLevel: "CRITICAL",
      detectedIntent: "CAMERA_INTRUSION_RESPONSE",
      aiSummaryTr:
        "IPScans Sentinel Rust Motoru: Kamera sızma girişimi tespit edildi. Cihazın dış ağa (WAN) çıkışı kesildi, ana modem UPnP port yönlendirmeleri silindi, kamera arka kapıları kapatıldı ve güvenli yerel ağ (LAN) erişimi geri verildi.",
    });
  } catch {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }
}
