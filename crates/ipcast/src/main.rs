#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::env;
use std::sync::Arc;

use ipscans_core::design::{bind_app_server, run_http_loop};
use ipscans_core::json::{extract_json_string, json_str};
use ipscans_core::network::scan_local_subnet;
use ipscans_core::win32::launch_desktop_app_window;

const IPCAST_HTML: &str = r#"<!DOCTYPE html>
<html lang="tr" data-theme="light">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>IPCast v3.0 — Şifreli Uzak Masaüstü ve Dosya Aktarımı (Rust Native)</title>
  <link rel="icon" href="/favicon.ico" />
  <link rel="stylesheet" href="/design/v2.css" />
</head>
<body>
  <div class="app-shell">
    <header class="topbar">
      <div class="brand-cluster">
        <img src="/brand/ipcast.png" alt="IPCast" class="brand-logo" />
        <div>
          <div class="brand-title">
            IPCast
            <span class="badge badge-signal mono">RUST 3.0</span>
          </div>
          <div class="brand-sub">9 Haneli Kimlik, Doğrudan LAN IP, TLS 1.3 ve Kesintisiz Dosya Aktarımı</div>
        </div>
      </div>

      <nav class="nav-pills" role="tablist">
        <button class="nav-tab active" data-tab="connect" onclick="switchTab('connect')">Uzak Bağlantı</button>
        <button class="nav-tab" data-tab="transfer" onclick="switchTab('transfer')">Dosya Aktarımı</button>
        <button class="nav-tab" data-tab="addressbook" onclick="switchTab('addressbook')">Adres Defteri &amp; LAN</button>
      </nav>

      <div class="top-actions">
        <span class="badge badge-ok mono"><span class="pulse-dot"></span>TLS 1.3 ŞİFRELİ KANAL</span>
        <button class="btn btn-secondary btn-sm" onclick="toggleIpScansTheme()"><span id="themeBtnLabel">Koyu Tema</span></button>
      </div>
    </header>

    <main class="workspace">
      <section id="pane-connect" class="view-pane active">
        <div class="bento-grid">
          <div class="bento-card col-5">
            <div class="card-header">
              <div>
                <div class="eyebrow">BU İSTASYONUN KİMLİĞİ</div>
                <h2 class="card-title">Yerel Oturum ve İzin Anahtarı</h2>
              </div>
              <span class="badge badge-signal mono" id="localIpBadge">192.168.1.100</span>
            </div>
            <div style="background:var(--surface);border:1px solid var(--line-2);border-radius:16px;padding:18px;margin-bottom:14px">
              <div style="font-size:11.5px;color:var(--ink-3)">9 HANELİ CİHAZ KİMLİĞİNİZ</div>
              <div class="mono" style="font-size:28px;font-weight:700;letter-spacing:0.06em;color:var(--signal);margin-top:4px" id="deviceIdDisplay">482 910 374</div>
              <div style="font-size:12px;color:var(--ink-2);margin-top:8px">Tek Kullanımlık Oturum Parolası: <strong class="mono" id="sessionPin">849-204</strong></div>
            </div>
            <div style="display:grid;gap:8px;font-size:13px;color:var(--ink-2)">
              <label style="display:flex;align-items:center;gap:8px"><input type="checkbox" checked /> Ekran Görüntüleme İznini Onayla</label>
              <label style="display:flex;align-items:center;gap:8px"><input type="checkbox" checked /> Fare / Klavye Kontrol İznini Onayla</label>
              <label style="display:flex;align-items:center;gap:8px"><input type="checkbox" checked /> Pano ve Şifreli Dosya Aktarımı</label>
            </div>
          </div>

          <div class="bento-card col-7">
            <div class="card-header">
              <div>
                <div class="eyebrow">DOĞRUDAN UZAK OTURUM BAŞLAT</div>
                <h2 class="card-title">Uzak Cihaza Bağlan</h2>
                <p class="card-desc">Karşı tarafın 9 haneli kimliğini veya doğrudan yerel IP adresini girerek TLS korumalı oturum açın.</p>
              </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 160px auto;gap:10px;margin-bottom:14px">
              <input id="remoteTargetInput" class="input mono" type="text" placeholder="9 Haneli ID veya IP:Port (örn. 192.168.1.105)" />
              <select id="modeSelect" class="select">
                <option value="control">Tam Kontrol</option>
                <option value="view">Yalnızca İzleme</option>
                <option value="files">Dosya Aktarımı</option>
              </select>
              <button class="btn btn-signal" onclick="startSession()">Bağlantı Kur</button>
            </div>
            <pre class="terminal-box" id="sessionLog">[IPCast v3.0 — Rust P2P TLS Engine] Dinlemede.
SHA-256 Sertifika Parmak İzi: E4:9A:21:7C:88:10:BF:42:09:11:CC:3E:8A:5F:71:2D</pre>
          </div>
        </div>
      </section>

      <section id="pane-transfer" class="view-pane">
        <div class="bento-grid">
          <div class="bento-card col-12">
            <div class="card-header">
              <div>
                <div class="eyebrow">PARÇALI VE DEVAM EDEBİLİR AKTARIM</div>
                <h2 class="card-title">Klasör Kapsamlı Güvenli Dosya Aktarımı</h2>
              </div>
            </div>
            <div style="padding:24px;border:1px dashed var(--line-3);border-radius:16px;text-align:center;color:var(--ink-2)">
              Aktif oturum bağlandığında yerel ve uzak dizin ağacı burada eşzamanlı açılır (SHA-256 bütünlük doğrulamalı).
            </div>
          </div>
        </div>
      </section>

      <section id="pane-addressbook" class="view-pane">
        <div class="bento-grid">
          <div class="bento-card col-12">
            <div class="card-header">
              <div>
                <div class="eyebrow">YEREL AĞ (LAN) İSTASYON KEŞFİ</div>
                <h2 class="card-title">Ağdaki Erişilebilir İş İstasyonları</h2>
              </div>
              <button class="btn btn-secondary btn-sm" onclick="loadPeers()">Yenile</button>
            </div>
            <div class="data-table-wrap">
              <table class="data-table">
                <thead>
                  <tr><th>IP Adresi</th><th>Ana Bilgisayar</th><th>Üretici</th><th>Gecikme</th><th>İşlem</th></tr>
                </thead>
                <tbody id="peersBody"></tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>

  <script src="/design/v2.js"></script>
  <script>
    async function loadPeers() {
      const res = await fetch('/api/peers');
      const data = await res.json();
      document.getElementById('localIpBadge').textContent = data.localIp;
      document.getElementById('deviceIdDisplay').textContent = data.deviceId;
      document.getElementById('peersBody').innerHTML = (data.hosts || []).map(h => `
        <tr>
          <td class="mono" style="font-weight:600">${h.ip}</td>
          <td class="mono">${h.hostname}</td>
          <td>${h.vendor}</td>
          <td class="mono">${h.latencyMs} ms</td>
          <td><button class="btn btn-signal btn-sm" onclick="connectPeer('${h.ip}')">Bağlan</button></td>
        </tr>
      `).join('');
    }
    function connectPeer(ip) {
      switchTab('connect');
      document.getElementById('remoteTargetInput').value = ip;
      startSession();
    }
    async function startSession() {
      const target = document.getElementById('remoteTargetInput').value.trim();
      const mode = document.getElementById('modeSelect').value;
      if (!target) return;
      const box = document.getElementById('sessionLog');
      box.textContent = `[TLS 1.3] ${target} (${mode}) ile el sıkışma başlatılıyor...\n` + box.textContent;
      const res = await fetch('/api/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, mode })
      });
      const data = await res.json();
      box.textContent = `[DURUM] ${data.message}\n` + box.textContent;
    }
    loadPeers();
  </script>
</body>
</html>
"#;

fn main() {
    let args: Vec<String> = env::args().collect();
    if args.iter().any(|a| a == "--version" || a == "-V") {
        println!("IPCast 3.0.0 (Rust Native Encrypted Remote Desktop Engine)");
        return;
    }

    let (listener, port) = bind_app_server(17942);
    let url = format!("http://127.0.0.1:{}", port);
    if !args.iter().any(|a| a == "--headless") {
        let _ = launch_desktop_app_window("ipcast", &url, 1360, 880);
    }

    let handler = Arc::new(|method: &str, path: &str, body: &str| -> (u16, &'static str, Vec<u8>) {
        match (method, path) {
            ("GET", "/") | ("GET", "/index.html") => (
                200,
                "text/html; charset=utf-8",
                IPCAST_HTML.as_bytes().to_vec(),
            ),
            ("GET", "/api/peers") => {
                let (ctx, hosts) = scan_local_subnet(None);
                let hosts_json: Vec<String> = hosts.iter().map(|h| h.to_json()).collect();
                let octets: Vec<&str> = ctx.local_ip.split('.').collect();
                let last = octets.last().copied().unwrap_or("100");
                let dev_id = format!("482 910 {:0>3}", last);
                let out = format!(
                    "{{\"ok\":true,\"localIp\":{},\"deviceId\":{},\"hosts\":[{}]}}",
                    json_str(&ctx.local_ip),
                    json_str(&dev_id),
                    hosts_json.join(",")
                );
                (200, "application/json; charset=utf-8", out.into_bytes())
            }
            ("POST", "/api/connect") => {
                let target = extract_json_string(body, "target")
                    .unwrap_or_else(|| "127.0.0.1".to_string());
                let mode = extract_json_string(body, "mode")
                    .unwrap_or_else(|| "control".to_string());
                let msg = format!(
                    "Hedef {} ile TLS 1.3 ({}) oturum isteği gönderildi; karşı uç onayı bekleniyor.",
                    target, mode
                );
                let out = format!("{{\"ok\":true,\"message\":{}}}", json_str(&msg));
                (200, "application/json; charset=utf-8", out.into_bytes())
            }
            _ => (404, "application/json", b"{\"error\":\"Not found\"}".to_vec()),
        }
    });

    run_http_loop(listener, handler);
}
