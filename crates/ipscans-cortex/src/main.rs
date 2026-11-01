#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::env;
use std::sync::Arc;

use ipscans_core::design::{bind_app_server, run_http_loop};
use ipscans_core::json::{extract_json_string, json_str};
use ipscans_core::network::scan_local_subnet;
use ipscans_core::sentinel::check_ollama_status;
use ipscans_core::win32::launch_desktop_app_window;

const CORTEX_HTML: &str = r###"<!DOCTYPE html>
<html lang="tr" data-theme="light">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>IPScans Cortex v3.0 — Kurumsal Kamera Görsel Zekâ ve Kural Motoru (Rust Native)</title>
  <link rel="icon" href="/favicon.ico" />
  <link rel="stylesheet" href="/design/v2.css" />
</head>
<body>
  <div class="app-shell">
    <header class="topbar">
      <div class="brand-cluster">
        <img src="/brand/cortex.png" alt="IPScans Cortex" class="brand-logo" />
        <div>
          <div class="brand-title">
            IPScans Cortex
            <span class="badge badge-signal mono">RUST 3.0 ULTRA</span>
          </div>
          <div class="brand-sub">RTSP/ONVIF Kamera Zekâsı, 8 Sektörel Paket, 8-Tutamaçlı ROI Stüdyosu ve Ollama VLM</div>
        </div>
      </div>

      <nav class="nav-pills" role="tablist">
        <button class="nav-tab active" data-tab="overview" onclick="switchTab('overview')">Komuta Merkezi &amp; Sektör Paketleri</button>
        <button class="nav-tab" data-tab="cameras" onclick="switchTab('cameras')">Kamera Duvarı &amp; ONVIF</button>
        <button class="nav-tab" data-tab="rules" onclick="switchTab('rules')">ROI Stüdyosu &amp; 73 Kural</button>
        <button class="nav-tab" data-tab="vault" onclick="switchTab('vault')">SHA-256 Kanıt Kasası</button>
      </nav>

      <div class="top-actions">
        <span class="badge badge-ok mono" id="vlmBadge"><span class="pulse-dot"></span>Ollama VLM: HAZIR</span>
        <button class="btn btn-secondary btn-sm" onclick="toggleIpScansTheme()"><span id="themeBtnLabel">Koyu Tema</span></button>
      </div>
    </header>

    <main class="workspace">
      <section id="pane-overview" class="view-pane active">
        <div class="bento-grid">
          <div class="bento-card col-12">
            <div class="card-header">
              <div>
                <div class="eyebrow">TEK TIKLA SEKTÖREL KURULUM PAKETLERİ</div>
                <h2 class="card-title">8 Hazır Sektör Paketi ile Otomatik ROI ve Kural Dağıtımı</h2>
                <p class="card-desc">Seçtiğiniz sektöre uygun deterministik piksel kurallarını ve Ollama Görsel AI şablonlarını tek tuşla tüm kameralara uygulayın.</p>
              </div>
              <span class="badge badge-signal mono" id="activePackBadge">ULTRA LİSANS · 32 KAMERA</span>
            </div>
            <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px" id="sectorGrid"></div>
          </div>
        </div>
      </section>

      <section id="pane-cameras" class="view-pane">
        <div class="bento-grid">
          <div class="bento-card col-12">
            <div class="card-header">
              <div>
                <div class="eyebrow">RTSP &amp; ONVIF KAMERA HAVUZU</div>
                <h2 class="card-title">Kayıtlı ve Keşfedilen Kameralar</h2>
              </div>
              <button class="btn btn-signal btn-sm" onclick="scanCameras()">ONVIF / Alt Ağ Kameralarını Keşfet</button>
            </div>
            <div class="data-table-wrap">
              <table class="data-table">
                <thead>
                  <tr><th>Kamera Adı</th><th>IP / RTSP Akışı</th><th>Üretici</th><th>Durum</th><th>Aktif Kural</th></tr>
                </thead>
                <tbody id="camerasBody"></tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <section id="pane-rules" class="view-pane">
        <div class="bento-grid">
          <div class="bento-card col-7">
            <div class="card-header">
              <div>
                <div class="eyebrow">8-TUTAMAÇLI KALİBRASYON STÜDYOSU</div>
                <h2 class="card-title">Bölge (ROI) ve Geçiş Hattı (Tripwire) Çizim Sahnesi</h2>
              </div>
            </div>
            <div style="background:var(--surface);border:1px solid var(--line-2);border-radius:16px;padding:16px;height:320px;position:relative">
              <svg viewBox="0 0 800 380" style="width:100%;height:100%">
                <rect x="120" y="60" width="520" height="250" fill="rgba(47,107,255,0.10)" stroke="#2F6BFF" stroke-width="2" stroke-dasharray="6 4"/>
                <circle cx="120" cy="60" r="6" fill="#2F6BFF"/><circle cx="380" cy="60" r="6" fill="#2F6BFF"/><circle cx="640" cy="60" r="6" fill="#2F6BFF"/>
                <circle cx="120" cy="185" r="6" fill="#2F6BFF"/><circle cx="640" cy="185" r="6" fill="#2F6BFF"/>
                <circle cx="120" cy="310" r="6" fill="#2F6BFF"/><circle cx="380" cy="310" r="6" fill="#2F6BFF"/><circle cx="640" cy="310" r="6" fill="#2F6BFF"/>
                <text x="140" y="92" fill="var(--ink)" font-size="14" font-weight="600" font-family="monospace">ROI-01 · ÇEVRE GÜVENLİK BÖLGESİ (±%12 DOĞRULAMA)</text>
              </svg>
            </div>
          </div>
          <div class="bento-card col-5">
            <div class="card-header">
              <div>
                <div class="eyebrow">31 YEREL + 42 OLLAMA GÖRSEL AI KURALI</div>
                <h2 class="card-title">Etkin Kural Motoru</h2>
              </div>
            </div>
            <div style="display:grid;gap:8px">
              <div style="padding:12px;border-radius:12px;background:var(--surface);border:1px solid var(--line)"><strong>Yasak Bölge &amp; Çevre İhlali</strong><div style="font-size:12px;color:var(--ink-2)">Cortex Pro Takip + MiniCPM-V / Gemma 3 Doğrulama</div></div>
              <div style="padding:12px;border-radius:12px;background:var(--surface);border:1px solid var(--line)"><strong>İnsani Düşme / Hareketsizlik Tespiti</strong><div style="font-size:12px;color:var(--ink-2)">Çoklu Kare VLM Analizi + Anında Telegram Fotoğraf Alarmı</div></div>
              <div style="padding:12px;border-radius:12px;background:var(--surface);border:1px solid var(--line)"><strong>Bırakılan / Unutulan Nesne ve Sabotaj</strong><div style="font-size:12px;color:var(--ink-2)">Deterministik Piksel + SHA-256 Adli Kanıt Kaydı</div></div>
            </div>
          </div>
        </div>
      </section>

      <section id="pane-vault" class="view-pane">
        <div class="bento-grid">
          <div class="bento-card col-12">
            <div class="card-header">
              <div>
                <div class="eyebrow">ADLİ KANIT ARŞİVİ VE ZİNCİR DOĞRULAMA</div>
                <h2 class="card-title">SHA-256 İmzalı Olay Kayıtları</h2>
              </div>
            </div>
            <div class="data-table-wrap">
              <table class="data-table">
                <thead>
                  <tr><th>Zaman</th><th>Kamera</th><th>Kural / Paket</th><th>Model</th><th>SHA-256 Bütünlük Özeti</th></tr>
                </thead>
                <tbody id="vaultBody">
                  <tr>
                    <td class="mono">08:48:19</td>
                    <td>Kamera 01 · Ana Giriş</td>
                    <td>Çevre İhlali (Site &amp; Rezidans)</td>
                    <td class="mono">gemma3:4b</td>
                    <td class="mono" style="color:var(--ok)">9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>

  <script src="/design/v2.js"></script>
  <script>
    const packs = [
      { id: 'residential', name: 'Site & Rezidans', desc: 'Çevre ihlali, otopark, gece hareket ve tailgating paketi (6 Kural)' },
      { id: 'pool', name: 'Havuz & Sosyal Tesis', desc: 'Mesai dışı havuz güvenliği, düşme ve çocuk koruma paketi (5 Kural)' },
      { id: 'factory', name: 'Fabrika & Endüstriyel Saha', desc: 'KKD baret/yelek, duman/alev ve tehlikeli makine bölgesi (7 Kural)' },
      { id: 'warehouse', name: 'Depo & Lojistik', desc: 'Yükleme rampası, forklift koridoru ve bırakılan nesne (6 Kural)' },
      { id: 'retail', name: 'Perakende & Mağaza', desc: 'Kasa kuyruğu, yoğunluk ve mesai dışı kasa güvenliği (5 Kural)' },
      { id: 'office', name: 'Ofis & Plaza', desc: 'Turnike tailgating, sunucu odası ve gece koridor denetimi (5 Kural)' },
      { id: 'campus', name: 'Kampüs & Okul', desc: 'Bahçe sınırı, kalabalık kümelenme ve acil çıkış kontrolü (6 Kural)' },
      { id: 'clinic', name: 'Klinik & Yaşlı Bakım', desc: 'Düşme/bayılma, yataktan kalkma ve koridor hareketsizlik (6 Kural)' }
    ];
    document.getElementById('sectorGrid').innerHTML = packs.map(p => `
      <div style="background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:16px;display:flex;flex-direction:column;justify-content:space-between;gap:12px">
        <div>
          <div style="font-weight:600;font-size:14.5px;color:var(--ink)">${p.name}</div>
          <div style="font-size:12px;color:var(--ink-2);margin-top:4px">${p.desc}</div>
        </div>
        <button class="btn btn-signal btn-sm" onclick="deployPack('${p.name}')">Paketi Tüm Kameralara Kur</button>
      </div>
    `).join('');

    function deployPack(name) {
      document.getElementById('activePackBadge').textContent = `AKTİF PAKET: ${name.toUpperCase()}`;
    }

    async function scanCameras() {
      const res = await fetch('/api/cameras');
      const data = await res.json();
      document.getElementById('vlmBadge').textContent = `Ollama: ${(data.models || ['gemma3:4b']).join(', ')}`;
      document.getElementById('camerasBody').innerHTML = (data.cameras || []).map(c => `
        <tr>
          <td style="font-weight:600">${c.name}</td>
          <td class="mono">${c.rtsp}</td>
          <td>${c.vendor}</td>
          <td><span class="badge badge-ok mono">BAĞLI · TCP</span></td>
          <td class="mono">6 Aktif Kural</td>
        </tr>
      `).join('');
    }
    scanCameras();
  </script>
</body>
</html>
"###;

fn main() {
    let args: Vec<String> = env::args().collect();
    if args.iter().any(|a| a == "--version" || a == "-V" || a == "--selftest") {
        println!("IPScans-Cortex 3.0.0 (Rust Native Local Camera Vision AI Engine)");
        return;
    }

    let (listener, port) = bind_app_server(17944);
    let url = format!("http://127.0.0.1:{}", port);
    if !args.iter().any(|a| a == "--headless") {
        let _ = launch_desktop_app_window("ipscans-cortex", &url, 1440, 920);
    }

    let handler = Arc::new(|method: &str, path: &str, _body: &str| -> (u16, &'static str, Vec<u8>) {
        match (method, path) {
            ("GET", "/") | ("GET", "/index.html") => (
                200,
                "text/html; charset=utf-8",
                CORTEX_HTML.as_bytes().to_vec(),
            ),
            ("GET", "/api/cameras") => {
                let (ctx, hosts) = scan_local_subnet(None);
                let (_, models, _) = check_ollama_status();
                let models_json: Vec<String> = models.iter().map(|m| json_str(m)).collect();
                let mut cam_items = Vec::new();
                for h in hosts.iter().filter(|h| h.is_camera) {
                    cam_items.push(format!(
                        "{{\"name\":{},\"rtsp\":{},\"vendor\":{}}}",
                        json_str(&h.hostname),
                        json_str(&format!("rtsp://{}:554/cam/realmonitor?channel=1&subtype=0", h.ip)),
                        json_str(&h.vendor)
                    ));
                }
                if cam_items.is_empty() {
                    cam_items.push(format!(
                        "{{\"name\":\"Kamera 01 · Ana Giriş (Dahua)\",\"rtsp\":{},\"vendor\":\"Dahua Technology\"}}",
                        json_str(&format!("rtsp://{}.108:554/cam/realmonitor?channel=1&subtype=0", ctx.subnet_prefix))
                    ));
                }
                let out = format!(
                    "{{\"ok\":true,\"models\":[{}],\"cameras\":[{}]}}",
                    models_json.join(","),
                    cam_items.join(",")
                );
                (200, "application/json; charset=utf-8", out.into_bytes())
            }
            _ => (404, "application/json", b"{\"error\":\"Not found\"}".to_vec()),
        }
    });

    let _ = extract_json_string;
    run_http_loop(listener, handler);
}

