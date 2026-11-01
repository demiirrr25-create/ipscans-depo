#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::env;
use std::sync::Arc;

use ipscans_core::design::{bind_app_server, run_http_loop};
use ipscans_core::json::{extract_json_string, json_str};
use ipscans_core::network::{check_ports_detailed, scan_local_subnet, DISCOVERY_PORTS};
use ipscans_core::win32::launch_desktop_app_window;

const SCANNER_HTML: &str = r#"<!DOCTYPE html>
<html lang="tr" data-theme="light">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>IPscans+ v5.0 — Ağ Keşfi ve Topoloji Motoru (Rust Native)</title>
  <link rel="icon" href="/favicon.ico" />
  <link rel="stylesheet" href="/design/v2.css" />
</head>
<body>
  <div class="app-shell">
    <header class="topbar">
      <div class="brand-cluster">
        <img src="/brand/scanner.png" alt="IPscans+" class="brand-logo" />
        <div>
          <div class="brand-title">
            IPscans+
            <span class="badge badge-signal mono">RUST 5.0</span>
          </div>
          <div class="brand-sub">Çok İş Parçacıklı Alt Ağ Keşfi, IEEE OUI ve L2/L3 Topoloji Haritası</div>
        </div>
      </div>

      <nav class="nav-pills" role="tablist">
        <button class="nav-tab active" data-tab="inventory" onclick="switchTab('inventory')">Cihaz Envanteri</button>
        <button class="nav-tab" data-tab="topology" onclick="switchTab('topology')">Topoloji Haritası</button>
        <button class="nav-tab" data-tab="ports" onclick="switchTab('ports')">Derin Port Denetimi</button>
      </nav>

      <div class="top-actions">
        <span id="subnetBadge" class="badge badge-ok mono">192.168.1.0/24</span>
        <button class="btn btn-signal btn-sm" id="scanBtn" onclick="runScan()">Alt Ağı Tara</button>
        <button class="btn btn-secondary btn-sm" onclick="exportJson()">JSON İndir</button>
        <button class="btn btn-secondary btn-sm" onclick="toggleIpScansTheme()"><span id="themeBtnLabel">Koyu Tema</span></button>
      </div>
    </header>

    <main class="workspace">
      <section id="pane-inventory" class="view-pane active">
        <div class="bento-grid">
          <div class="bento-card col-12">
            <div class="card-header">
              <div>
                <div class="eyebrow">PARALEL 64-THREAD RUST KEŞİF MOTORU</div>
                <h2 class="card-title">Canlı Alt Ağ Envanteri</h2>
              </div>
              <div style="width:360px">
                <input id="filterInput" class="input mono" type="text" placeholder="Filtrele: ip:, port:554, Dahua, Gateway..." oninput="renderTable()" />
              </div>
            </div>
            <div class="data-table-wrap">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>IPv4 Adresi</th>
                    <th>Ana Bilgisayar</th>
                    <th>MAC Adresi</th>
                    <th>Donanım Üreticisi (IEEE OUI)</th>
                    <th>Cihaz Sınıflandırması</th>
                    <th>Açık Servis Portları</th>
                    <th>Yanıt Süresi</th>
                  </tr>
                </thead>
                <tbody id="inventoryBody">
                  <tr><td colspan="7" style="text-align:center;color:var(--ink-3)">Alt ağ taranıyor...</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <section id="pane-topology" class="view-pane">
        <div class="bento-grid">
          <div class="bento-card col-12">
            <div class="card-header">
              <div>
                <div class="eyebrow">KANIT TABANLI HİYERARŞİK AĞ TOPOLOJİSİ</div>
                <h2 class="card-title">Ana Modem (Gateway) ve Uç Nokta Bağlantı Haritası</h2>
              </div>
            </div>
            <div style="background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:16px;text-align:center">
              <svg id="topologySvg" viewBox="0 0 1000 540" style="width:100%;height:500px"></svg>
            </div>
          </div>
        </div>
      </section>

      <section id="pane-ports" class="view-pane">
        <div class="bento-grid">
          <div class="bento-card col-12">
            <div class="card-header">
              <div>
                <div class="eyebrow">DOĞRUDAN TCP SOKET ANALİZÖRÜ</div>
                <h2 class="card-title">Hedef Cihaz Port ve Servis Denetimi</h2>
              </div>
              <div style="display:flex;gap:8px">
                <input id="portTargetInput" class="input mono" type="text" value="127.0.0.1" style="width:240px" />
                <button class="btn btn-signal" onclick="runPortCheck()">Portları Yokla</button>
              </div>
            </div>
            <div class="data-table-wrap">
              <table class="data-table">
                <thead>
                  <tr><th>Port</th><th>Servis</th><th>Durum</th><th>Gecikme</th></tr>
                </thead>
                <tbody id="portsBody"></tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>

  <script src="/design/v2.js"></script>
  <script>
    let lastData = { gateway: { ip: '192.168.1.1', subnet: '192.168.1.0/24' }, hosts: [] };

    async function runScan() {
      const btn = document.getElementById('scanBtn');
      btn.disabled = true; btn.textContent = 'Taranıyor...';
      try {
        const res = await fetch('/api/scan');
        lastData = await res.json();
        document.getElementById('subnetBadge').textContent = `${lastData.gateway.subnet} · ${lastData.hosts.length} Cihaz`;
        document.getElementById('portTargetInput').value = lastData.gateway.ip;
        renderTable();
        renderTopology();
      } catch (e) {}
      btn.disabled = false; btn.textContent = 'Alt Ağı Tara';
    }

    function renderTable() {
      const q = (document.getElementById('filterInput').value || '').toLowerCase().trim();
      const rows = (lastData.hosts || []).filter(h => {
        if (!q) return true;
        const blob = `${h.ip} ${h.hostname} ${h.mac} ${h.vendor} ${h.deviceType} ${(h.openPorts||[]).join(' ')}`.toLowerCase();
        return blob.includes(q);
      });
      document.getElementById('inventoryBody').innerHTML = rows.map(h => `
        <tr ondblclick="window.open('http://' + '${h.ip}', '_blank')" style="cursor:pointer" title="Web arayüzünü açmak için çift tıklayın">
          <td class="mono" style="font-weight:600;color:var(--signal)">${h.ip}</td>
          <td class="mono">${h.hostname}</td>
          <td class="mono" style="color:var(--ink-2)">${h.mac}</td>
          <td>${h.vendor}</td>
          <td><span class="badge ${h.isGateway ? 'badge-signal' : h.isCamera ? 'badge-warn' : ''}">${h.deviceType}</span></td>
          <td class="mono">${(h.openPorts || []).join(', ') || 'ARP/ICMP'}</td>
          <td class="mono">${h.latencyMs} ms</td>
        </tr>
      `).join('');
    }

    function renderTopology() {
      const svg = document.getElementById('topologySvg');
      const hosts = lastData.hosts || [];
      const cx = 500, cy = 270, r = 200;
      let lines = '', nodes = '';
      nodes += `<g transform="translate(${cx},${cy})">
        <circle r="44" fill="var(--signal-soft)" stroke="var(--signal)" stroke-width="2"/>
        <text text-anchor="middle" dy="-4" fill="var(--ink)" font-size="12" font-weight="600">GATEWAY</text>
        <text text-anchor="middle" dy="14" fill="var(--signal)" font-size="11" class="mono">${lastData.gateway.ip}</text>
      </g>`;

      const peers = hosts.filter(h => !h.isGateway);
      peers.forEach((h, idx) => {
        const angle = (2 * Math.PI * idx) / Math.max(peers.length, 1);
        const x = Math.round(cx + r * Math.cos(angle));
        const y = Math.round(cy + r * Math.sin(angle));
        const color = h.isCamera ? '#F79009' : '#12B76A';
        lines += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="${color}" stroke-opacity="0.45" stroke-width="1.5"/>`;
        nodes += `<g transform="translate(${x},${y})">
          <rect x="-68" y="-24" width="136" height="48" rx="12" fill="var(--surface-dim)" stroke="${color}" stroke-width="1.5"/>
          <text text-anchor="middle" dy="-4" fill="var(--ink)" font-size="11.5" font-weight="600" class="mono">${h.ip}</text>
          <text text-anchor="middle" dy="13" fill="var(--ink-2)" font-size="10">${h.vendor.slice(0, 18)}</text>
        </g>`;
      });
      svg.innerHTML = lines + nodes;
    }

    async function runPortCheck() {
      const target = document.getElementById('portTargetInput').value.trim();
      const res = await fetch('/api/ports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target })
      });
      const data = await res.json();
      document.getElementById('portsBody').innerHTML = (data.results || []).map(r => `
        <tr>
          <td class="mono" style="font-weight:600">${r.port}</td>
          <td class="mono">${r.service}</td>
          <td><span class="badge ${r.status === 'open' ? 'badge-ok' : ''} mono">${r.status.toUpperCase()}</span></td>
          <td class="mono">${r.latencyMs} ms</td>
        </tr>
      `).join('');
    }

    function exportJson() {
      const blob = new Blob([JSON.stringify(lastData, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'ipscans-plus-inventory.json';
      a.click();
    }

    runScan();
  </script>
</body>
</html>
"#;

fn main() {
    let args: Vec<String> = env::args().collect();
    if args.iter().any(|a| a == "--version" || a == "-V") {
        println!("IPscans-Plus 5.0.0 (Rust Native Network Discovery & Topology Engine)");
        return;
    }

    let (listener, port) = bind_app_server(17941);
    let url = format!("http://127.0.0.1:{}", port);
    if !args.iter().any(|a| a == "--headless") {
        let _ = launch_desktop_app_window("ipscans-plus", &url, 1400, 900);
    }

    let handler = Arc::new(|method: &str, path: &str, body: &str| -> (u16, &'static str, Vec<u8>) {
        match (method, path) {
            ("GET", "/") | ("GET", "/index.html") => (
                200,
                "text/html; charset=utf-8",
                SCANNER_HTML.as_bytes().to_vec(),
            ),
            ("GET", "/api/scan") => {
                let (ctx, hosts) = scan_local_subnet(None);
                let hosts_json: Vec<String> = hosts.iter().map(|h| h.to_json()).collect();
                let out = format!(
                    "{{\"ok\":true,\"gateway\":{{\"ip\":{},\"mac\":{},\"subnet\":{}}},\"hosts\":[{}]}}",
                    json_str(&ctx.gateway_ip),
                    json_str(&ctx.gateway_mac),
                    json_str(&format!("{}.0/24", ctx.subnet_prefix)),
                    hosts_json.join(",")
                );
                (200, "application/json; charset=utf-8", out.into_bytes())
            }
            ("POST", "/api/ports") => {
                let target = extract_json_string(body, "target")
                    .unwrap_or_else(|| "127.0.0.1".to_string());
                let out = check_ports_detailed(&target, DISCOVERY_PORTS, 250);
                (200, "application/json; charset=utf-8", out.into_bytes())
            }
            _ => (404, "application/json", b"{\"error\":\"Not found\"}".to_vec()),
        }
    });

    run_http_loop(listener, handler);
}
