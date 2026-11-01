#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::env;
use std::sync::Arc;

use ipscans_core::design::{bind_app_server, run_http_loop};
use ipscans_core::json::{extract_json_string, json_str};
use ipscans_core::win32::launch_desktop_app_window;

const LPR_HTML: &str = r###"<!DOCTYPE html>
<html lang="tr" data-theme="light">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>IPScans LPR Pro v2.0 — Plaka Tanıma ve Bariyer Operatör Konsolu (Rust Native)</title>
  <link rel="icon" href="/favicon.ico" />
  <link rel="stylesheet" href="/design/v2.css" />
</head>
<body>
  <div class="app-shell">
    <header class="topbar">
      <div class="brand-cluster">
        <img src="/brand/lpr.png" alt="IPScans LPR Pro" class="brand-logo" />
        <div>
          <div class="brand-title">
            IPScans LPR Pro
            <span class="badge badge-signal mono">RUST 2.0</span>
          </div>
          <div class="brand-sub">Yerel ONNX Plaka Tanıma · Tetik/Okuma Çizgileri ve Sakin Araç Kütüğü</div>
        </div>
      </div>

      <nav class="nav-pills" role="tablist">
        <button class="nav-tab active" data-tab="live" onclick="switchTab('live')">Canlı Operatör Duvarı</button>
        <button class="nav-tab" data-tab="registry" onclick="switchTab('registry')">Blok / Daire Araç Kütüğü</button>
      </nav>

      <div class="top-actions">
        <span class="badge badge-ok mono"><span class="pulse-dot"></span>BARİYER RÖLE: HAZIR</span>
        <button class="btn btn-signal btn-sm" onclick="simulatePlateRead()">Plaka Okuma Simüle Et</button>
        <button class="btn btn-secondary btn-sm" onclick="toggleIpScansTheme()"><span id="themeBtnLabel">Koyu Tema</span></button>
      </div>
    </header>

    <main class="workspace">
      <section id="pane-live" class="view-pane active">
        <div class="bento-grid">
          <div class="bento-card col-7">
            <div class="card-header">
              <div>
                <div class="eyebrow">KANAL 01 · ANA GİRİŞ BARİYERİ (RTSP 1080P)</div>
                <h2 class="card-title">Tetik ve Plaka Okuma Bölgesi</h2>
              </div>
              <button class="btn btn-ok btn-sm" onclick="triggerBarrier()">Bariyeri Şimdi Aç (Röle 1)</button>
            </div>
            <div style="background:var(--surface);border:1px solid var(--line-2);border-radius:16px;padding:18px;position:relative;height:320px;display:flex;flex-direction:column;justify-content:space-between">
              <div style="display:flex;justify-content:space-between">
                <span class="badge badge-ok mono">RTSP CANLI · 25 FPS</span>
                <span class="badge badge-signal mono" id="lastPlateBadge">34 IPS 2026 · %99.4</span>
              </div>
              <div style="border-top:2px dashed var(--signal);padding-top:6px;font-size:11.5px;font-weight:600;color:var(--signal)" class="mono">OKUMA ÇİZGİSİ (RECOGNITION LINE · Y=148)</div>
              <div style="display:flex;align-items:center;justify-content:center;padding:14px;border-radius:12px;background:var(--surface-dim);border:1px solid var(--line)">
                <div class="mono" style="font-size:24px;font-weight:700;letter-spacing:0.08em;color:var(--ink);padding:8px 20px;border-radius:8px;border:2px solid var(--signal);background:var(--surface)">TR · 34 IPS 2026</div>
              </div>
              <div style="border-top:2px solid var(--ok);padding-top:6px;font-size:11.5px;font-weight:600;color:var(--ok)" class="mono">TETİK ÇİZGİSİ (TRIGGER LINE · RÖLE-1 AKTİF)</div>
            </div>
          </div>

          <div class="bento-card col-5">
            <div class="card-header">
              <div>
                <div class="eyebrow">GERÇEK ZAMANLI PLAKA GÜNLÜĞÜ</div>
                <h2 class="card-title">Son Geçiş Kayıtları</h2>
              </div>
            </div>
            <div class="data-table-wrap">
              <table class="data-table">
                <thead>
                  <tr><th>Saat</th><th>Plaka</th><th>Blok/Daire</th><th>Güven</th><th>Durum</th></tr>
                </thead>
                <tbody id="readsBody"></tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <section id="pane-registry" class="view-pane">
        <div class="bento-grid">
          <div class="bento-card col-12">
            <div class="card-header">
              <div>
                <div class="eyebrow">SAKİN VE MİSAFİR ARAÇ VERİTABANI</div>
                <h2 class="card-title">Yetkili Plaka Ekle</h2>
              </div>
            </div>
            <div style="display:grid;grid-template-columns:180px 180px 1fr auto;gap:10px">
              <input id="plateInput" class="input mono" placeholder="Plaka (örn. 34 ABC 123)" />
              <input id="unitInput" class="input" placeholder="Blok / Daire (örn. A-14)" />
              <input id="ownerInput" class="input" placeholder="Araç Sahibi Adı Soyadı" />
              <button class="btn btn-signal" onclick="addPlate()">Kütüğe Kaydet</button>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>

  <script src="/design/v2.js"></script>
  <script>
    const plates = [
      { time: '08:45:12', plate: '34 IPS 2026', unit: 'A Blok D:12', conf: '99.4%', status: 'İZİNLİ (BARİYER AÇILDI)' },
      { time: '08:41:03', plate: '06 RST 001', unit: 'B Blok D:04', conf: '98.8%', status: 'İZİNLİ (BARİYER AÇILDI)' },
      { time: '08:32:50', plate: '35 KMR 908', unit: 'Misafir', conf: '97.9%', status: 'OPERATÖR ONAYLI' }
    ];
    function renderReads() {
      document.getElementById('readsBody').innerHTML = plates.map(p => `
        <tr>
          <td class="mono">${p.time}</td>
          <td class="mono" style="font-weight:700;color:var(--signal)">${p.plate}</td>
          <td>${p.unit}</td>
          <td class="mono">${p.conf}</td>
          <td><span class="badge badge-ok mono">${p.status}</span></td>
        </tr>
      `).join('');
    }
    function simulatePlateRead() {
      const sample = '34 R' + Math.floor(100 + Math.random() * 899);
      const now = new Date().toLocaleTimeString('tr-TR');
      plates.unshift({ time: now, plate: sample, unit: 'A Blok D:08', conf: '99.2%', status: 'İZİNLİ (BARİYER AÇILDI)' });
      document.getElementById('lastPlateBadge').textContent = sample + ' · %99.2';
      renderReads();
    }
    function triggerBarrier() {
      const now = new Date().toLocaleTimeString('tr-TR');
      plates.unshift({ time: now, plate: 'MANUEL RÖLE', unit: 'Operatör', conf: '100%', status: 'BARİYER AÇILDI' });
      renderReads();
    }
    function addPlate() {
      const plate = document.getElementById('plateInput').value.trim().toUpperCase();
      const unit = document.getElementById('unitInput').value.trim() || 'Genel';
      if (!plate) return;
      plates.unshift({ time: new Date().toLocaleTimeString('tr-TR'), plate, unit, conf: '100%', status: 'KÜTÜĞE EKLENDİ' });
      renderReads();
      switchTab('live');
    }
    renderReads();
  </script>
</body>
</html>
"###;

fn main() {
    let args: Vec<String> = env::args().collect();
    if args.iter().any(|a| a == "--version" || a == "-V") {
        println!("IPScans-LPR-Pro 2.0.0 (Rust Native License Plate Recognition Engine)");
        return;
    }

    let (listener, port) = bind_app_server(17943);
    let url = format!("http://127.0.0.1:{}", port);
    if !args.iter().any(|a| a == "--headless") {
        let _ = launch_desktop_app_window("ipscans-lpr", &url, 1400, 900);
    }

    let handler = Arc::new(|method: &str, path: &str, _body: &str| -> (u16, &'static str, Vec<u8>) {
        match (method, path) {
            ("GET", "/") | ("GET", "/index.html") => (
                200,
                "text/html; charset=utf-8",
                LPR_HTML.as_bytes().to_vec(),
            ),
            _ => {
                let msg = format!("{{\"ok\":true,\"engine\":{}}}", json_str("ipscans-lpr-rust/2.0"));
                (200, "application/json; charset=utf-8", msg.into_bytes())
            }
        }
    });

    let _ = extract_json_string;
    run_http_loop(listener, handler);
}
