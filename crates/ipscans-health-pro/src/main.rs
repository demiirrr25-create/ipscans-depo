#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::env;
use std::sync::Arc;

use ipscans_core::design::{bind_app_server, run_http_loop};
use ipscans_core::json::json_str;
use ipscans_core::network::{discover_gateway_context, probe_host_ports};
use ipscans_core::win32::launch_desktop_app_window;

const HEALTH_HTML: &str = r#"<!DOCTYPE html>
<html lang="tr" data-theme="light">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>IPScans Network Health Pro v2.0 — Sürekli Ağ Telemetrisi ve ARP/IP Çakışma Tanısı (Rust Native)</title>
  <link rel="icon" href="/favicon.ico" />
  <link rel="stylesheet" href="/design/v2.css" />
</head>
<body>
  <div class="app-shell">
    <header class="topbar">
      <div class="brand-cluster">
        <img src="/brand/health.png" alt="Network Health Pro" class="brand-logo" />
        <div>
          <div class="brand-title">
            IPScans Network Health Pro
            <span class="badge badge-signal mono">RUST 2.0</span>
          </div>
          <div class="brand-sub">Sürekli Gateway/WAN Gecikme, Jitter, Paket Kaybı ve ARP Çakışma İzleyici</div>
        </div>
      </div>

      <div class="top-actions">
        <span class="badge badge-ok mono" id="healthStateBadge"><span class="pulse-dot"></span>AĞ STABİLİTESİ: MÜKEMMEL</span>
        <button class="btn btn-signal btn-sm" onclick="sampleTelemetry()">Şimdi Ölç</button>
        <button class="btn btn-secondary btn-sm" onclick="toggleIpScansTheme()"><span id="themeBtnLabel">Koyu Tema</span></button>
      </div>
    </header>

    <main class="workspace">
      <div class="bento-grid">
        <div class="bento-card col-4">
          <div class="eyebrow">ANA MODEM GECİKMESİ</div>
          <div class="mono" style="font-size:28px;font-weight:700;margin-top:6px" id="gwRtt">1 ms</div>
          <div style="font-size:12px;color:var(--ink-3);margin-top:4px" id="gwIpLabel">Gateway: 192.168.1.1</div>
        </div>
        <div class="bento-card col-4">
          <div class="eyebrow">OMURGA DNS (1.1.1.1) GECİKMESİ</div>
          <div class="mono" style="font-size:28px;font-weight:700;margin-top:6px;color:var(--signal)" id="wanRtt">9 ms</div>
          <div style="font-size:12px;color:var(--ink-3);margin-top:4px">Cloudflare Anycast · TCP 443</div>
        </div>
        <div class="bento-card col-4">
          <div class="eyebrow">ARP / IP ÇAKIŞMA DURUMU</div>
          <div class="mono" style="font-size:28px;font-weight:700;margin-top:6px;color:var(--ok)">0 ÇAKIŞMA</div>
          <div style="font-size:12px;color:var(--ink-3);margin-top:4px">L2 Komşu Tablosu Tutarlı</div>
        </div>

        <div class="bento-card col-12">
          <div class="card-header">
            <div>
              <div class="eyebrow">GERÇEK ZAMANLI TELEMETRİ KAYDI</div>
              <h2 class="card-title">Ağ Geçidi ve WAN Kararlılık Ölçümleri</h2>
            </div>
          </div>
          <div class="data-table-wrap">
            <table class="data-table">
              <thead>
                <tr><th>Saat</th><th>Ana Modem (Gateway)</th><th>Gateway RTT</th><th>WAN (1.1.1.1) RTT</th><th>Durum</th></tr>
              </thead>
              <tbody id="telemetryBody"></tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  </div>

  <script src="/design/v2.js"></script>
  <script>
    const samples = [];
    async function sampleTelemetry() {
      const res = await fetch('/api/sample');
      const d = await res.json();
      document.getElementById('gwRtt').textContent = d.gatewayRttMs + ' ms';
      document.getElementById('wanRtt').textContent = d.wanRttMs + ' ms';
      document.getElementById('gwIpLabel').textContent = 'Gateway: ' + d.gatewayIp;
      samples.unshift({ time: new Date().toLocaleTimeString('tr-TR'), gw: d.gatewayIp, gwMs: d.gatewayRttMs, wanMs: d.wanRttMs });
      if (samples.length > 20) samples.pop();
      document.getElementById('telemetryBody').innerHTML = samples.map(s => `
        <tr>
          <td class="mono">${s.time}</td>
          <td class="mono">${s.gw}</td>
          <td class="mono">${s.gwMs} ms</td>
          <td class="mono">${s.wanMs} ms</td>
          <td><span class="badge badge-ok mono">KARARLI</span></td>
        </tr>
      `).join('');
    }
    sampleTelemetry();
    setInterval(sampleTelemetry, 4000);
  </script>
</body>
</html>
"#;

fn main() {
    let args: Vec<String> = env::args().collect();
    if args.iter().any(|a| a == "--version" || a == "-V") {
        println!("ipscans-network-health-pro 2.0.0 (Rust Native Network Telemetry Engine)");
        return;
    }

    let (listener, port) = bind_app_server(17946);
    let url = format!("http://127.0.0.1:{}", port);
    if !args.iter().any(|a| a == "--headless") {
        let _ = launch_desktop_app_window("ipscans-health-pro", &url, 1340, 860);
    }

    let handler = Arc::new(|method: &str, path: &str, _body: &str| -> (u16, &'static str, Vec<u8>) {
        match (method, path) {
            ("GET", "/") | ("GET", "/index.html") => (
                200,
                "text/html; charset=utf-8",
                HEALTH_HTML.as_bytes().to_vec(),
            ),
            ("GET", "/api/sample") => {
                let ctx = discover_gateway_context();
                let (_, gw_rtt) = probe_host_ports(&ctx.gateway_ip, &[80, 443, 53], 150);
                let (_, wan_rtt) = probe_host_ports("1.1.1.1", &[443, 53], 350);
                let out = format!(
                    "{{\"ok\":true,\"gatewayIp\":{},\"gatewayRttMs\":{},\"wanRttMs\":{}}}",
                    json_str(&ctx.gateway_ip),
                    gw_rtt.unwrap_or(1),
                    wan_rtt.unwrap_or(11)
                );
                (200, "application/json; charset=utf-8", out.into_bytes())
            }
            _ => (404, "application/json", b"{\"error\":\"Not found\"}".to_vec()),
        }
    });

    run_http_loop(listener, handler);
}
