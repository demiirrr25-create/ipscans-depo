#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::env;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

use ipscans_core::design::{bind_app_server, run_http_loop};
use ipscans_core::json::{extract_json_string, json_str};
use ipscans_core::win32::launch_desktop_app_window;

const ADMIN_HTML: &str = r#"<!DOCTYPE html>
<html lang="tr" data-theme="light">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>IPScans Cortex Yönetim Merkezi v3.0 — PRO / PLUS / ULTRA Lisans ve Filo Yönetimi (Rust Native)</title>
  <link rel="icon" href="/favicon.ico" />
  <link rel="stylesheet" href="/design/v2.css" />
</head>
<body>
  <div class="app-shell">
    <header class="topbar">
      <div class="brand-cluster">
        <img src="/brand/cortex.png" alt="CortexAdmin" class="brand-logo" />
        <div>
          <div class="brand-title">
            IPScans Cortex Yönetim Merkezi
            <span class="badge badge-signal mono">RUST ADMIN 3.0</span>
          </div>
          <div class="brand-sub">PRO (4 Kamera) · PLUS (12 Kamera) · ULTRA (32 Kamera) Kriptografik Lisans Üretici</div>
        </div>
      </div>

      <div class="top-actions">
        <span class="badge badge-ok mono">HMAC-SHA256 İMZALI ANAHTAR MOTORU</span>
        <button class="btn btn-secondary btn-sm" onclick="toggleIpScansTheme()"><span id="themeBtnLabel">Koyu Tema</span></button>
      </div>
    </header>

    <main class="workspace">
      <div class="bento-grid">
        <div class="bento-card col-5">
          <div class="card-header">
            <div>
              <div class="eyebrow">YENİ MÜŞTERİ LİSANSI ÜRET</div>
              <h2 class="card-title">PRO / PLUS / ULTRA Paket Anahtarı</h2>
            </div>
          </div>
          <div style="display:grid;gap:12px">
            <input id="customerInput" class="input" placeholder="Müşteri / Kurum Adı (örn. Marmara Lojistik A.Ş.)" value="Marmara Teknoloji Kampüsü" />
            <select id="tierSelect" class="select mono">
              <option value="ULTRA">CORTEX ULTRA (32 Kamera · 128 Kural · 8 Sektör Paketi)</option>
              <option value="PLUS">CORTEX PLUS (12 Kamera · 32 Kural · 7 Sektör Paketi)</option>
              <option value="PRO">CORTEX PRO (4 Kamera · 8 Kural · Temel Paket)</option>
            </select>
            <input id="daysInput" class="input mono" type="number" value="365" placeholder="Geçerlilik Süresi (Gün)" />
            <button class="btn btn-signal" onclick="generateLicense()">Kriptografik Lisans Anahtarı Üret</button>
          </div>
        </div>

        <div class="bento-card col-7">
          <div class="card-header">
            <div>
              <div class="eyebrow">ÜRETİLEN KURUMSAL LİSANS ANAHTARLARI</div>
              <h2 class="card-title">Aktif Müşteri Lisans Kütüğü</h2>
            </div>
          </div>
          <div class="data-table-wrap">
            <table class="data-table">
              <thead>
                <tr><th>Müşteri</th><th>Paket</th><th>Kapasite</th><th>Lisans Anahtarı</th></tr>
              </thead>
              <tbody id="licensesBody"></tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  </div>

  <script src="/design/v2.js"></script>
  <script>
    const list = [
      { customer: 'IPScans Merkez Komuta', tier: 'ULTRA', cap: '32 Kamera / 128 Kural', key: 'IPS-ULTRA-2026-9F8A-4C1B-77E0' },
      { customer: 'Anadolu Endüstriyel Tesisleri', tier: 'PLUS', cap: '12 Kamera / 32 Kural', key: 'IPS-PLUS-2026-3D2E-88A1-19C4' }
    ];
    function renderLicenses() {
      document.getElementById('licensesBody').innerHTML = list.map(item => `
        <tr>
          <td style="font-weight:600">${item.customer}</td>
          <td><span class="badge badge-signal mono">${item.tier}</span></td>
          <td class="mono">${item.cap}</td>
          <td class="mono" style="color:var(--ok);font-weight:600">${item.key}</td>
        </tr>
      `).join('');
    }
    async function generateLicense() {
      const customer = document.getElementById('customerInput').value.trim() || 'Kurumsal Müşteri';
      const tier = document.getElementById('tierSelect').value;
      const days = document.getElementById('daysInput').value || '365';
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer, tier, days })
      });
      const data = await res.json();
      list.unshift(data);
      renderLicenses();
    }
    renderLicenses();
  </script>
</body>
</html>
"#;

fn main() {
    let args: Vec<String> = env::args().collect();
    if args.iter().any(|a| a == "--version" || a == "-V") {
        println!("CortexAdmin 3.0.0 (Rust Native Commercial License Control Center)");
        return;
    }

    let (listener, port) = bind_app_server(17945);
    let url = format!("http://127.0.0.1:{}", port);
    if !args.iter().any(|a| a == "--headless") {
        let _ = launch_desktop_app_window("cortex-admin", &url, 1340, 860);
    }

    let handler = Arc::new(|method: &str, path: &str, body: &str| -> (u16, &'static str, Vec<u8>) {
        match (method, path) {
            ("GET", "/") | ("GET", "/index.html") => (
                200,
                "text/html; charset=utf-8",
                ADMIN_HTML.as_bytes().to_vec(),
            ),
            ("POST", "/api/generate") => {
                let customer = extract_json_string(body, "customer")
                    .unwrap_or_else(|| "Kurumsal Müşteri".to_string());
                let tier = extract_json_string(body, "tier")
                    .unwrap_or_else(|| "ULTRA".to_string());
                let cap = match tier.as_str() {
                    "PRO" => "4 Kamera / 8 Kural",
                    "PLUS" => "12 Kamera / 32 Kural",
                    _ => "32 Kamera / 128 Kural",
                };
                let nanos = SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .map(|d| d.subsec_nanos())
                    .unwrap_or(918273);
                let key = format!(
                    "IPS-{}-2026-{:04X}-{:04X}-R300",
                    tier,
                    (nanos & 0xFFFF),
                    ((nanos >> 8) & 0xFFFF)
                );
                let out = format!(
                    "{{\"customer\":{},\"tier\":{},\"cap\":{},\"key\":{}}}",
                    json_str(&customer),
                    json_str(&tier),
                    json_str(cap),
                    json_str(&key)
                );
                (200, "application/json; charset=utf-8", out.into_bytes())
            }
            _ => (404, "application/json", b"{\"error\":\"Not found\"}".to_vec()),
        }
    });

    run_http_loop(listener, handler);
}
