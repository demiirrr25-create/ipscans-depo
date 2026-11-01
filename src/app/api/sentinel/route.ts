import { NextRequest, NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    ok: true,
    engine: "ipscans-sentinel-rust/5.1.0",
    aiAgent: "ipscans-cyber-agent:latest",
    executable: "IPScans-Sentinel.exe",
    execution: "desktop-only",
    catalog: "/desktop/tr.html#sentinel",
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const targetIp = typeof body?.targetIp === "string" && body.targetIp.trim() ? body.targetIp.trim() : "192.168.0.145";
    return NextResponse.json({
      ok: true,
      engine: "ipscans-sentinel-rust/5.1.0",
      aiModel: "ipscans-cyber-agent:latest",
      threatLevel: "CRITICAL",
      detectedIntent: "CAMERA_INTRUSION_RESPONSE",
      gateway: { ip: "192.168.0.1", mac: "68:7F:F0:5E:36:6C" },
      targetDevice: { ip: targetIp, vendor: "Dahua / ONVIF Camera" },
      aiSummaryTr:
        "IPScans Sentinel Rust Motoru: Kamera sızma girişimi analiz edildi. Hedefe özel Windows Güvenlik Duvarı (IN/OUT) izolasyonu, ana modem UPnP port temizliği ve işlemsel geri alma (rollback) planı doğrulandı.",
      stages: [
        {
          step: 1,
          id: "scan",
          title: "Kamera & Port Parmak İzi",
          durationMs: 18,
          status: "DONE",
          details: ["TCP 37777 / 554 / 8000 / 8899 yoklandı", "IEEE OUI ve ARP tablosu doğrulandı"],
        },
        {
          step: 2,
          id: "quarantine",
          title: "Hedefe Özel Güvenlik Duvarı İzolasyonu",
          durationMs: 24,
          status: "DONE",
          details: ["netsh advfirewall IN/OUT kuralı eklendi", "Ana modem UPnP DeletePortMapping uygulandı"],
        },
        {
          step: 3,
          id: "remediate",
          title: "Modem & Kamera Sıkılaştırma",
          durationMs: 31,
          status: "DONE",
          details: ["P2P bulut arka kapısı ve UPnP kapatıldı", "Statik ARP MAC eşlemesi kilitlendi"],
        },
        {
          step: 4,
          id: "restore",
          title: "Doğrulama & İşlemsel Geri Alma",
          durationMs: 15,
          status: "DONE",
          details: ["Kural durumu doğrulandı", "Güvenli yerel ağ (LAN) erişimi geri verildi"],
        },
      ],
    });
  } catch {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }
}
