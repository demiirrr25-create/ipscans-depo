#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::env;
use std::sync::Arc;

use ipscans_core::design::{bind_app_server, run_http_loop};
use ipscans_core::json::{extract_json_bool, extract_json_string, json_str};
use ipscans_core::network::{discover_gateway_context, scan_local_subnet};
use ipscans_core::sentinel::{
    check_ollama_status, execute_autonomous_incident_pipeline, load_quarantine_ledger_raw,
    purge_modem_upnp_port_mappings, quarantine_device_now, restore_device_access,
};
use ipscans_core::win32::{
    elevate_self, is_running_as_admin, launch_desktop_app_window, open_admin_cmd_window,
    open_admin_powershell_window, run_privileged_shell,
};

const SENTINEL_HTML: &str = r#"<!DOCTYPE html>
<html lang="tr" data-theme="light">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>IPScans Sentinel — Otonom Siber Güvenlik, Modem ve Kamera Savunma Sistemi</title>
  <link rel="icon" href="/favicon.ico" />
  <link rel="stylesheet" href="/design/v2.css" />
  <style>
    .stage-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
      margin-top: 16px;
    }
    @media (max-width: 960px) { .stage-grid { grid-template-columns: 1fr 1fr; } }
    .stage-card {
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: 16px;
      padding: 14px;
      transition: all 220ms var(--ease-out-expo);
    }
    .stage-card.done {
      border-color: rgba(18, 183, 106, 0.42);
      box-shadow: inset 0 1px 0 rgba(18, 183, 106, 0.16);
    }
    .stage-step {
      font-size: 11px;
      font-weight: 600;
      color: var(--signal);
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 6px;
    }
    .stage-title {
      font-size: 13.5px;
      font-weight: 600;
      color: var(--ink);
      margin-bottom: 6px;
    }
    .stage-detail {
      font-size: 12px;
      color: var(--ink-2);
      line-height: 1.45;
    }
    .preset-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 10px;
    }
    .kpi-strip {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 14px;
      margin-bottom: 16px;
    }
    .kpi-box {
      background: var(--surface-dim);
      border: 1px solid var(--line);
      border-radius: 18px;
      padding: 16px 18px;
      box-shadow: var(--shadow-card);
    }
    .kpi-label { font-size: 11.5px; color: var(--ink-3); font-weight: 500; }
    .kpi-val { font-size: 22px; font-weight: 650; color: var(--ink); margin-top: 4px; letter-spacing: -0.03em; }
  </style>
</head>
<body>
  <div class="app-shell">
    <header class="topbar">
      <div class="brand-cluster">
        <img src="/brand/sentinel.png" alt="IPScans Sentinel" class="brand-logo" />
        <div>
          <div class="brand-title">
            IPScans Sentinel
            <span class="badge badge-signal mono">RUST 3.0</span>
          </div>
          <div class="brand-sub">Otonom Siber Güvenlik · Ana Modem ve Kamera Savunma Motoru</div>
        </div>
      </div>

      <nav class="nav-pills" role="tablist">
        <button class="nav-tab active" data-tab="defense" onclick="switchTab('defense')">Otonom Savunma &amp; AI Ajan</button>
        <button class="nav-tab" data-tab="network" onclick="switchTab('network')">Ana Modem &amp; Kamera Kalkanı</button>
        <button class="nav-tab" data-tab="terminal" onclick="switchTab('terminal')">Yönetici CMD &amp; PowerShell</button>
      </nav>

      <div class="top-actions">
        <span id="ollamaBadge" class="badge badge-ok mono"><span class="pulse-dot"></span>ipscans-cyber-agent: HAZIR</span>
        <span id="adminBadge" class="badge mono">YETKİ KONTROLÜ</span>
        <button class="btn btn-secondary btn-sm" onclick="elevateToAdmin()" id="elevateBtn">Yönetici Yükselt (UAC)</button>
        <button class="btn btn-secondary btn-sm" onclick="toggleIpScansTheme()"><span id="themeBtnLabel">Koyu Tema</span></button>
      </div>
    </header>

    <main class="workspace">
      <div class="kpi-strip">
        <div class="kpi-box">
          <div class="kpi-label">ANA MODEM / GATEWAY</div>
          <div class="kpi-val mono" id="kpiGateway">192.168.1.1</div>
          <div class="brand-sub mono" id="kpiGatewayMac">UPnP / NAT Kalkanı Aktif</div>
        </div>
        <div class="kpi-box">
          <div class="kpi-label">OLLAMA SİBER GÜVENLİK AJANI</div>
          <div class="kpi-val mono" id="kpiModel">ipscans-cyber-agent</div>
          <div class="brand-sub" id="kpiModelSub">Yerel 127.0.0.1:11434 · 0 Bulut Sızıntısı</div>
        </div>
        <div class="kpi-box">
          <div class="kpi-label">KEŞFEDİLEN AĞ &amp; KAMERA</div>
          <div class="kpi-val mono" id="kpiHosts">Taranıyor...</div>
          <div class="brand-sub" id="kpiCameras">Dahua / Hikvision / ONVIF İzleniyor</div>
        </div>
        <div class="kpi-box">
          <div class="kpi-label">KARANTİNA &amp; KORUMA DURUMU</div>
          <div class="kpi-val mono" id="kpiShield" style="color:var(--ok)">AKTİF KORUMA</div>
          <div class="brand-sub" id="kpiShieldSub">Milisaniyelik WAN/Firewall Kesici Hazır</div>
        </div>
      </div>

      <!-- TAB 1: AUTONOMOUS CYBER DEFENSE & OLLAMA AGENT -->
      <section id="pane-defense" class="view-pane active">
        <div class="bento-grid">
          <div class="bento-card col-8">
            <div class="card-header">
              <div>
                <div class="eyebrow">OLLAMA SİBER GÜVENLİK AJANI · OTONOM MÜDAHALE</div>
                <h2 class="card-title">Olay Bildirimi ve Otonom Savunma Operasyonu</h2>
                <p class="card-desc">Sorunu doğal dilde yazın; Rust motoru ve Ollama siber güvenlik ajanı taramayı başlatır, sızılan kameranın ağ çıkışını anında keser, ana modem ve kamera ayarlarını onarıp güvenli erişimi geri verir.</p>
              </div>
              <span class="badge badge-signal mono">4-AŞAMALI OTONOM HAT</span>
            </div>

            <div style="display:grid;grid-template-columns:1fr 200px;gap:10px;margin-bottom:10px">
              <input id="incidentInput" class="input" type="text" value="Dahua kamerama sızdılar, hemen ağa çıkmasını engelle, ana modemden portları kapat ve sorunu çözdükten sonra ağa erişim ver." placeholder="Örn: Dahua kamerama sızdılar..." />
              <input id="targetIpInput" class="input mono" type="text" placeholder="Hedef IP (Otomatik)" />
            </div>

            <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px">
              <div class="preset-pills" style="margin-top:0">
                <button class="btn btn-secondary btn-sm" onclick="setPreset('Dahua kamerama sızdılar, hemen ağa çıkmasını engelle, ana modemden portları kapat ve sorunu çözdükten sonra ağa erişim ver.', true)">Dahua Kamerama Sızdılar (Tam Otonom Müdahale)</button>
                <button class="btn btn-secondary btn-sm" onclick="setPreset('Kamerayı acil karantinaya al ve dış ağa çıkışını tamamen kilitle.', false)">Acil Kamera Karantinası (Kilitle)</button>
                <button class="btn btn-secondary btn-sm" onclick="setPreset('Ana modem UPnP port yönlendirmelerini temizle ve tüm alt ağı denetle.', true)">Ana Modem UPnP &amp; Port Temizliği</button>
              </div>
              <div style="display:flex;align-items:center;gap:8px">
                <label style="display:inline-flex;align-items:center;gap:6px;font-size:12.5px;color:var(--ink-2);cursor:pointer">
                  <input type="checkbox" id="autoRestoreCheck" checked />
                  Onarım sonrası LAN erişimini geri ver
                </label>
                <button class="btn btn-signal" id="runDefenseBtn" onclick="runAutonomousDefense()">Otonom Müdahaleyi Başlat</button>
              </div>
            </div>

            <div id="aiSummaryBanner" style="margin-top:16px;padding:14px 16px;border-radius:14px;background:var(--surface);border:1px solid var(--line-2);display:none">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
                <span class="badge badge-signal mono" id="aiBannerModel">ipscans-cyber-agent:latest</span>
                <span class="badge badge-err mono" id="aiBannerThreat">CRITICAL</span>
              </div>
              <div id="aiBannerText" style="font-size:13.5px;color:var(--ink);line-height:1.55"></div>
              <div id="aiBannerCves" class="preset-pills" style="margin-top:8px"></div>
            </div>

            <div class="stage-grid" id="stageGrid">
              <div class="stage-card" id="stageCard1">
                <div class="stage-step mono"><span>01 · TARAMA</span><span id="stageTime1">—</span></div>
                <div class="stage-title">Kamera &amp; Port Parmak İzi</div>
                <div class="stage-detail" id="stageDesc1">TCP 37777 (Dahua DVRIP), 554 (RTSP), 8000 (Hikvision), 8899 (ONVIF) ve ARP MAC OUI denetimi.</div>
              </div>
              <div class="stage-card" id="stageCard2">
                <div class="stage-step mono"><span>02 · KARANTİNA</span><span id="stageTime2">—</span></div>
                <div class="stage-title">Anında Ağ Çıkışını Kesme</div>
                <div class="stage-detail" id="stageDesc2">Windows Defender Firewall + Ana Modem UPnP DeletePortMapping ile dış ağ (WAN) izolasyonu.</div>
              </div>
              <div class="stage-card" id="stageCard3">
                <div class="stage-step mono"><span>03 · ONARIM</span><span id="stageTime3">—</span></div>
                <div class="stage-title">Modem &amp; Kamera Sıkılaştırma</div>
                <div class="stage-detail" id="stageDesc3">Kamera P2P bulut tüneli ve UPnP kapatma, RTSP Digest zorlama ve statik ARP MAC kilidi.</div>
              </div>
              <div class="stage-card" id="stageCard4">
                <div class="stage-step mono"><span>04 · ERİŞİM İZNİ</span><span id="stageTime4">—</span></div>
                <div class="stage-title">Doğrulama &amp; LAN Erişimi</div>
                <div class="stage-detail" id="stageDesc4">Tehdit temizlendikten sonra karantina kurallarını kaldırarak güvenli yerel ağ erişimini geri verme.</div>
              </div>
            </div>
          </div>

          <div class="bento-card col-4">
            <div class="card-header">
              <div>
                <div class="eyebrow">HIZLI MÜDAHALE KONTROLLERİ</div>
                <h2 class="card-title">Kamera Karantina &amp; Erişim Yönetimi</h2>
                <p class="card-desc">Hedef kamerayı veya şüpheli cihazı tek tuşla ağdan izole edin ya da onarım sonrası ağa geri alın.</p>
              </div>
            </div>

            <div style="display:grid;gap:10px;margin-bottom:14px">
              <input id="quickIpInput" class="input mono" type="text" placeholder="Kamera / Cihaz IP (örn. 192.168.1.108)" />
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
                <button class="btn btn-danger" onclick="manualQuarantine()">Ağ Çıkışını Engelle (Karantina)</button>
                <button class="btn btn-ok" onclick="manualRestore()">Ağa Erişim Ver (Onarıldı)</button>
              </div>
              <button class="btn btn-secondary" onclick="manualModemHarden()">Ana Modem UPnP Port Yönlendirmelerini Sil</button>
            </div>

            <div class="eyebrow" style="margin-top:14px;margin-bottom:8px">KARANTİNA VE MÜDAHALE GÜNLÜĞÜ</div>
            <div id="ledgerList" style="display:grid;gap:8px;max-height:250px;overflow-y:auto"></div>
          </div>

          <div class="bento-card col-12">
            <div class="card-header">
              <div>
                <div class="eyebrow">CANLI SAVUNMA TELEMETRİSİ</div>
                <h2 class="card-title">Adli Müdahale ve Ajan İşlem Kaydı</h2>
              </div>
              <button class="btn btn-secondary btn-sm" onclick="document.getElementById('defenseLog').textContent='[IPScans Sentinel Rust Engine] Günlük temizlendi.\n'">Günlüğü Temizle</button>
            </div>
            <pre class="terminal-box" id="defenseLog">[IPScans Sentinel v3.0 — Rust Native Engine] Hazır.
Ollama Siber Güvenlik Ajanı (ipscans-cyber-agent:latest) yerel 127.0.0.1:11434 üzerinde aktif.</pre>
          </div>
        </div>
      </section>

      <!-- TAB 2: MAIN MODEM & SUBNET CAMERA SHIELD -->
      <section id="pane-network" class="view-pane">
        <div class="bento-grid">
          <div class="bento-card col-12">
            <div class="card-header">
              <div>
                <div class="eyebrow">PARALEL RUST ALT AĞ &amp; KAMERA TARAYICI</div>
                <h2 class="card-title">Ana Modem, IP Kameralar ve Aktif Cihaz Envanteri</h2>
                <p class="card-desc">Dahua (37777), Hikvision (8000), ONVIF (8899), RTSP (554) ve Ana Modem portlarını gerçek zamanlı denetleyin.</p>
              </div>
              <div style="display:flex;gap:8px">
                <button class="btn btn-secondary" onclick="manualModemHarden()">Ana Modem Portlarını Kapat</button>
                <button class="btn btn-signal" id="scanSubnetBtn" onclick="refreshSubnetScan()">Ağı Şimdi Tara</button>
              </div>
            </div>

            <div class="data-table-wrap">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>IP Adresi</th>
                    <th>MAC Adresi</th>
                    <th>Üretici (IEEE OUI)</th>
                    <th>Cihaz Rolü</th>
                    <th>Açık Portlar</th>
                    <th>Gecikme</th>
                    <th>Risk</th>
                    <th>Doğrudan Müdahale</th>
                  </tr>
                </thead>
                <tbody id="hostsTableBody">
                  <tr><td colspan="8" style="text-align:center;color:var(--ink-3)">Alt ağ taranıyor...</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <!-- TAB 3: ADMINISTRATOR CMD & POWERSHELL ENGINE -->
      <section id="pane-terminal" class="view-pane">
        <div class="bento-grid">
          <div class="bento-card col-12">
            <div class="card-header">
              <div>
                <div class="eyebrow">YÖNETİCİ KOMUTA TERMİNALİ (ELEVATED UAC ENGINE)</div>
                <h2 class="card-title">Yönetici CMD ve PowerShell Çalıştırma Motoru</h2>
                <p class="card-desc">Doğrudan uygulama içinden veya bağımsız Yönetici (RunAs Administrator) penceresinde CMD ve PowerShell komutları çalıştırın.</p>
              </div>
              <div style="display:flex;gap:8px">
                <button class="btn btn-secondary" onclick="openNativeAdminShell('cmd')">Yönetici CMD Penceresi Aç (RunAs)</button>
                <button class="btn btn-signal" onclick="openNativeAdminShell('powershell')">Yönetici PowerShell Penceresi Aç (RunAs)</button>
              </div>
            </div>

            <div style="display:grid;grid-template-columns:160px 1fr auto;gap:10px;margin-bottom:12px">
              <select id="shellTypeSelect" class="select mono">
                <option value="powershell">PowerShell (Admin)</option>
                <option value="cmd">CMD.exe (Admin)</option>
              </select>
              <input id="shellCmdInput" class="input mono" type="text" value="netsh advfirewall show allprofiles" onkeydown="if(event.key==='Enter')runInlineShell()" />
              <button class="btn btn-primary" onclick="runInlineShell()">Komutu Çalıştır</button>
            </div>

            <div class="preset-pills" style="margin-bottom:14px">
              <button class="btn btn-secondary btn-sm mono" onclick="execQuickShell('cmd', 'arp -a')">arp -a</button>
              <button class="btn btn-secondary btn-sm mono" onclick="execQuickShell('cmd', 'netstat -ano | findstr :37777')">netstat :37777 (Dahua)</button>
              <button class="btn btn-secondary btn-sm mono" onclick="execQuickShell('cmd', 'netstat -ano | findstr :554')">netstat :554 (RTSP)</button>
              <button class="btn btn-secondary btn-sm mono" onclick="execQuickShell('cmd', 'netsh advfirewall firewall show rule name=all | findstr IPScans_Sentinel')">Sentinel Firewall Kuralları</button>
              <button class="btn btn-secondary btn-sm mono" onclick="execQuickShell('powershell', 'Get-NetRoute -DestinationPrefix 0.0.0.0/0')">Varsayılan Ağ Geçidi (Gateway)</button>
              <button class="btn btn-secondary btn-sm mono" onclick="execQuickShell('cmd', 'ollama list')">ollama list</button>
            </div>

            <pre class="terminal-box" id="shellOutputBox" style="min-height:300px">C:\Windows\System32&gt; Hazır.</pre>
          </div>
        </div>
      </section>
    </main>
  </div>

  <script src="/design/v2.js"></script>
  <script>
    function logDefense(msg) {
      const box = document.getElementById('defenseLog');
      const ts = new Date().toLocaleTimeString('tr-TR');
      box.textContent = `[${ts}] ${msg}\n` + box.textContent;
    }

    function setPreset(text, autoRestore) {
      document.getElementById('incidentInput').value = text;
      document.getElementById('autoRestoreCheck').checked = !!autoRestore;
    }

    async function loadInitialState() {
      try {
        const res = await fetch('/api/status');
        const data = await res.json();
        document.getElementById('kpiGateway').textContent = data.gateway.ip;
        document.getElementById('kpiGatewayMac').textContent = `MAC: ${data.gateway.mac} · Alt Ağ: ${data.gateway.subnet}`;
        document.getElementById('quickIpInput').placeholder = `Kamera IP (örn. ${data.defaultCameraIp})`;

        const adminBadge = document.getElementById('adminBadge');
        if (data.isAdmin) {
          adminBadge.className = 'badge badge-ok mono';
          adminBadge.textContent = 'YÖNETİCİ (ADMIN) AKTİF';
          document.getElementById('elevateBtn').style.display = 'none';
        } else {
          adminBadge.className = 'badge badge-warn mono';
          adminBadge.textContent = 'STANDART YETKİ (UAC HAZIR)';
        }

        const ollamaBadge = document.getElementById('ollamaBadge');
        if (data.ollamaOnline) {
          ollamaBadge.className = 'badge badge-ok mono';
          ollamaBadge.innerHTML = '<span class="pulse-dot"></span>ipscans-cyber-agent: AKTİF';
          document.getElementById('kpiModelSub').textContent = `Modeller: ${data.ollamaModels.join(', ')}`;
        }
        renderLedger(data.ledger || []);
      } catch (e) {}
      refreshSubnetScan();
    }

    function renderLedger(items) {
      const el = document.getElementById('ledgerList');
      if (!items || !items.length) {
        el.innerHTML = '<div style="font-size:12.5px;color:var(--ink-3);padding:10px;border:1px dashed var(--line-2);border-radius:12px">Henüz karantina kaydı yok. Otonom müdahale başlatıldığında kayıtlar burada listelenir.</div>';
        return;
      }
      el.innerHTML = items.map(item => {
        const isLocked = item.status === 'QUARANTINED';
        return `<div style="padding:10px 12px;border-radius:12px;background:var(--surface);border:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;gap:8px">
          <div>
            <div class="mono" style="font-weight:600;font-size:13px;color:var(--ink)">${item.ip} <span class="badge ${isLocked ? 'badge-err' : 'badge-ok'} mono" style="margin-left:6px">${isLocked ? 'KARANTİNADA (AĞ KESİLDİ)' : 'ONARILDI · ERİŞİM AÇIK'}</span></div>
            <div style="font-size:11.5px;color:var(--ink-3);margin-top:2px">${item.vendor} · ${item.mac}</div>
          </div>
          <div>
            ${isLocked
              ? `<button class="btn btn-ok btn-sm" onclick="restoreIp('${item.ip}')">Erişim Ver</button>`
              : `<button class="btn btn-danger btn-sm" onclick="quarantineIp('${item.ip}', '${item.mac}')">Engelle</button>`
            }
          </div>
        </div>`;
      }).join('');
    }

    async function refreshSubnetScan() {
      const btn = document.getElementById('scanSubnetBtn');
      if (btn) { btn.disabled = true; btn.textContent = 'Taranıyor...'; }
      try {
        const res = await fetch('/api/scan');
        const data = await res.json();
        const hosts = data.hosts || [];
        const cams = hosts.filter(h => h.isCamera).length;
        document.getElementById('kpiHosts').textContent = `${hosts.length} Aktif Cihaz`;
        document.getElementById('kpiCameras').textContent = `${cams} Kamera / NVR · ${data.gateway.subnet}`;

        const tbody = document.getElementById('hostsTableBody');
        tbody.innerHTML = hosts.map(h => {
          const badgeClass = h.riskLevel === 'CRITICAL' ? 'badge-err' : h.riskLevel === 'HIGH' ? 'badge-warn' : 'badge-ok';
          return `<tr>
            <td class="mono" style="font-weight:600">${h.ip}</td>
            <td class="mono" style="color:var(--ink-2)">${h.mac}</td>
            <td>${h.vendor}</td>
            <td>${h.deviceType}</td>
            <td class="mono">${(h.openPorts || []).join(', ') || 'ICMP/ARP'}</td>
            <td class="mono">${h.latencyMs} ms</td>
            <td><span class="badge ${badgeClass} mono">${h.riskLevel}</span></td>
            <td>
              <div style="display:flex;gap:6px">
                <button class="btn btn-danger btn-sm" onclick="quarantineIp('${h.ip}', '${h.mac}')">Karantinaya Al</button>
                <button class="btn btn-ok btn-sm" onclick="restoreIp('${h.ip}')">Erişim Ver</button>
              </div>
            </td>
          </tr>`;
        }).join('');
      } catch (e) {}
      if (btn) { btn.disabled = false; btn.textContent = 'Ağı Şimdi Tara'; }
    }

    async function runAutonomousDefense() {
      const btn = document.getElementById('runDefenseBtn');
      const prompt = document.getElementById('incidentInput').value.trim();
      const targetIp = document.getElementById('targetIpInput').value.trim();
      const autoRestore = document.getElementById('autoRestoreCheck').checked;
      btn.disabled = true;
      btn.textContent = 'Otonom Müdahale Yürütülüyor...';
      logDefense(`Olay analiz ediliyor: "${prompt}"`);

      try {
        const res = await fetch('/api/sentinel/incident', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, targetIp, autoRestore })
        });
        const data = await res.json();

        document.getElementById('aiSummaryBanner').style.display = 'block';
        document.getElementById('aiBannerThreat').textContent = data.threatLevel || 'CRITICAL';
        document.getElementById('aiBannerText').textContent = data.aiSummaryTr;
        document.getElementById('aiBannerCves').innerHTML = (data.suspectedCves || [])
          .map(c => `<span class="badge badge-warn mono">${c}</span>`).join('');

        document.getElementById('quickIpInput').value = data.targetDevice.ip;

        (data.stages || []).forEach(st => {
          const card = document.getElementById('stageCard' + st.step);
          const timeEl = document.getElementById('stageTime' + st.step);
          const descEl = document.getElementById('stageDesc' + st.step);
          if (card) card.classList.add('done');
          if (timeEl) timeEl.textContent = st.durationMs + ' ms';
          if (descEl && st.details && st.details.length) {
            descEl.textContent = st.details.join(' · ');
          }
          logDefense(`[AŞAMA 0${st.step} - ${st.title}] (${st.durationMs}ms): ${(st.details || []).join(' | ')}`);
        });

        const shieldEl = document.getElementById('kpiShield');
        const shieldSub = document.getElementById('kpiShieldSub');
        if (data.targetDevice.finalStatus === 'PROTECTED_AND_RESTORED') {
          shieldEl.style.color = 'var(--ok)';
          shieldEl.textContent = 'ONARILDI & KORUNUYOR';
          shieldSub.textContent = `${data.targetDevice.ip} WAN kapatıldı, LAN erişimi geri verildi`;
        } else {
          shieldEl.style.color = 'var(--warn)';
          shieldEl.textContent = 'KARANTİNA KİLİTLİ';
          shieldSub.textContent = `${data.targetDevice.ip} ağ çıkışı engellendi`;
        }

        const stRes = await fetch('/api/status');
        const stData = await stRes.json();
        renderLedger(stData.ledger || []);
      } catch (e) {
        logDefense('Hata: ' + e.message);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Otonom Müdahaleyi Başlat';
      }
    }

    async function quarantineIp(ip, mac) {
      document.getElementById('quickIpInput').value = ip;
      logDefense(`${ip} için milisaniyelik ağ karantinası ve modem UPnP kesme işlemi başlatılıyor...`);
      const res = await fetch('/api/sentinel/quarantine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip, mac: mac || '3C:EF:8C:4A:91:08' })
      });
      const data = await res.json();
      (data.logs || []).forEach(l => logDefense(l));
      document.getElementById('kpiShield').style.color = 'var(--err)';
      document.getElementById('kpiShield').textContent = 'KARANTİNA AKTİF';
      document.getElementById('kpiShieldSub').textContent = `${ip} ağdan izole edildi`;
      renderLedger(data.ledger || []);
    }

    async function restoreIp(ip) {
      document.getElementById('quickIpInput').value = ip;
      logDefense(`${ip} için güvenlik doğrulaması sonrası yerel ağ (LAN) erişimi geri veriliyor...`);
      const res = await fetch('/api/sentinel/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip })
      });
      const data = await res.json();
      (data.logs || []).forEach(l => logDefense(l));
      document.getElementById('kpiShield').style.color = 'var(--ok)';
      document.getElementById('kpiShield').textContent = 'ONARILDI & AÇIK';
      document.getElementById('kpiShieldSub').textContent = `${ip} güvenli LAN erişiminde`;
      renderLedger(data.ledger || []);
    }

    function manualQuarantine() {
      const ip = document.getElementById('quickIpInput').value.trim() || '192.168.1.108';
      quarantineIp(ip, '3C:EF:8C:4A:91:08');
    }

    function manualRestore() {
      const ip = document.getElementById('quickIpInput').value.trim() || '192.168.1.108';
      restoreIp(ip);
    }

    async function manualModemHarden() {
      const ip = document.getElementById('quickIpInput').value.trim() || '192.168.1.108';
      logDefense('Ana Modem UPnP IGD / NAT port yönlendirme tablosu temizleniyor...');
      const res = await fetch('/api/sentinel/modem-harden', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cameraIp: ip })
      });
      const data = await res.json();
      (data.logs || []).forEach(l => logDefense(l));
    }

    async function runInlineShell() {
      const shell = document.getElementById('shellTypeSelect').value;
      const command = document.getElementById('shellCmdInput').value.trim();
      if (!command) return;
      const out = document.getElementById('shellOutputBox');
      out.textContent = `[${shell.toUpperCase()}] Çalıştırılıyor: ${command} ...\n`;
      const res = await fetch('/api/sentinel/shell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shell, command })
      });
      const data = await res.json();
      out.textContent = `[${shell.toUpperCase()} · Çıkış Kodu: ${data.exitCode} · Yönetici: ${data.isAdmin ? 'EVET' : 'STANDART'}]\n$ ${command}\n\n${data.stdout || ''}${data.stderr ? '\n' + data.stderr : ''}`;
    }

    function execQuickShell(shell, cmd) {
      document.getElementById('shellTypeSelect').value = shell;
      document.getElementById('shellCmdInput').value = cmd;
      runInlineShell();
    }

    async function openNativeAdminShell(kind) {
      const cmd = document.getElementById('shellCmdInput').value.trim();
      const res = await fetch('/api/sentinel/open-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shell: kind, command: cmd })
      });
      const data = await res.json();
      logDefense(data.message);
    }

    async function elevateToAdmin() {
      const res = await fetch('/api/sentinel/elevate', { method: 'POST' });
      const data = await res.json();
      logDefense(data.message);
    }

    loadInitialState();
  </script>
</body>
</html>
"#;

fn main() {
    let args: Vec<String> = env::args().collect();

    // CLI / Verification Modes
    if args.iter().any(|a| a == "--version" || a == "-V") {
        println!("IPScans-Sentinel 3.0.0 (Rust Native Cybersecurity & Camera Defense Engine)");
        return;
    }

    if args.iter().any(|a| a == "--self-test") {
        let report = execute_autonomous_incident_pipeline(
            "Dahua kamerama sızdılar, hemen ağa çıkmasını engelle ve sorunu çözdükten sonra ağa erişim ver.",
            None,
            true,
        );
        println!("{}", report);
        return;
    }

    if let Some(pos) = args.iter().position(|a| a == "--incident") {
        let prompt = args
            .get(pos + 1)
            .map(|s| s.as_str())
            .unwrap_or("Dahua kamerama sızdılar");
        let report = execute_autonomous_incident_pipeline(prompt, None, true);
        println!("{}", report);
        return;
    }

    let (listener, port) = bind_app_server(17940);
    let url = format!("http://127.0.0.1:{}", port);

    if !args.iter().any(|a| a == "--headless") {
        let _ = launch_desktop_app_window("sentinel", &url, 1440, 920);
    }

    let handler = Arc::new(|method: &str, path: &str, body: &str| -> (u16, &'static str, Vec<u8>) {
        match (method, path) {
            ("GET", "/") | ("GET", "/index.html") => (
                200,
                "text/html; charset=utf-8",
                SENTINEL_HTML.as_bytes().to_vec(),
            ),
            ("GET", "/api/status") => {
                let ctx = discover_gateway_context();
                let (ollama_ok, models, has_cyber) = check_ollama_status();
                let ledger = load_quarantine_ledger_raw();
                let ledger_json: Vec<String> = ledger.iter().map(|e| e.to_json()).collect();
                let models_json: Vec<String> = models.iter().map(|m| json_str(m)).collect();
                let default_cam = format!("{}.108", ctx.subnet_prefix);
                let json = format!(
                    "{{\"ok\":true,\"engine\":\"ipscans-sentinel-rust/3.0\",\"isAdmin\":{},\"ollamaOnline\":{},\"hasCyberAgent\":{},\"ollamaModels\":[{}],\"defaultCameraIp\":{},\"gateway\":{{\"ip\":{},\"mac\":{},\"localIp\":{},\"subnet\":{}}},\"ledger\":[{}]}}",
                    is_running_as_admin(),
                    ollama_ok,
                    has_cyber,
                    models_json.join(","),
                    json_str(&default_cam),
                    json_str(&ctx.gateway_ip),
                    json_str(&ctx.gateway_mac),
                    json_str(&ctx.local_ip),
                    json_str(&format!("{}.0/24", ctx.subnet_prefix)),
                    ledger_json.join(",")
                );
                (200, "application/json; charset=utf-8", json.into_bytes())
            }
            ("GET", "/api/scan") => {
                let (ctx, hosts) = scan_local_subnet(None);
                let hosts_json: Vec<String> = hosts.iter().map(|h| h.to_json()).collect();
                let json = format!(
                    "{{\"ok\":true,\"gateway\":{{\"ip\":{},\"mac\":{},\"localIp\":{},\"subnet\":{}}},\"hosts\":[{}]}}",
                    json_str(&ctx.gateway_ip),
                    json_str(&ctx.gateway_mac),
                    json_str(&ctx.local_ip),
                    json_str(&format!("{}.0/24", ctx.subnet_prefix)),
                    hosts_json.join(",")
                );
                (200, "application/json; charset=utf-8", json.into_bytes())
            }
            ("POST", "/api/sentinel/incident") => {
                let prompt = extract_json_string(body, "prompt")
                    .unwrap_or_else(|| "Dahua kamerama sızdılar".to_string());
                let target_ip = extract_json_string(body, "targetIp");
                let auto_restore = extract_json_bool(body, "autoRestore").unwrap_or(true);
                let report = execute_autonomous_incident_pipeline(
                    &prompt,
                    target_ip.as_deref(),
                    auto_restore,
                );
                (200, "application/json; charset=utf-8", report.into_bytes())
            }
            ("POST", "/api/sentinel/quarantine") => {
                let ctx = discover_gateway_context();
                let ip = extract_json_string(body, "ip")
                    .unwrap_or_else(|| format!("{}.108", ctx.subnet_prefix));
                let mac = extract_json_string(body, "mac")
                    .unwrap_or_else(|| "3C:EF:8C:4A:91:08".to_string());
                let (_, logs) = quarantine_device_now(
                    &ip,
                    &mac,
                    &ctx.gateway_ip,
                    "Operatör acil kamera/cihaz karantinası",
                );
                let ledger = load_quarantine_ledger_raw();
                let ledger_json: Vec<String> = ledger.iter().map(|e| e.to_json()).collect();
                let logs_json: Vec<String> = logs.iter().map(|l| json_str(l)).collect();
                let json = format!(
                    "{{\"ok\":true,\"ip\":{},\"logs\":[{}],\"ledger\":[{}]}}",
                    json_str(&ip),
                    logs_json.join(","),
                    ledger_json.join(",")
                );
                (200, "application/json; charset=utf-8", json.into_bytes())
            }
            ("POST", "/api/sentinel/restore") => {
                let ctx = discover_gateway_context();
                let ip = extract_json_string(body, "ip")
                    .unwrap_or_else(|| format!("{}.108", ctx.subnet_prefix));
                let logs = restore_device_access(&ip);
                let ledger = load_quarantine_ledger_raw();
                let ledger_json: Vec<String> = ledger.iter().map(|e| e.to_json()).collect();
                let logs_json: Vec<String> = logs.iter().map(|l| json_str(l)).collect();
                let json = format!(
                    "{{\"ok\":true,\"ip\":{},\"logs\":[{}],\"ledger\":[{}]}}",
                    json_str(&ip),
                    logs_json.join(","),
                    ledger_json.join(",")
                );
                (200, "application/json; charset=utf-8", json.into_bytes())
            }
            ("POST", "/api/sentinel/modem-harden") => {
                let ctx = discover_gateway_context();
                let cam_ip = extract_json_string(body, "cameraIp")
                    .unwrap_or_else(|| format!("{}.108", ctx.subnet_prefix));
                let (ok, logs) = purge_modem_upnp_port_mappings(&ctx.gateway_ip, &cam_ip);
                let logs_json: Vec<String> = logs.iter().map(|l| json_str(l)).collect();
                let json = format!(
                    "{{\"ok\":{},\"gatewayIp\":{},\"logs\":[{}]}}",
                    ok,
                    json_str(&ctx.gateway_ip),
                    logs_json.join(",")
                );
                (200, "application/json; charset=utf-8", json.into_bytes())
            }
            ("POST", "/api/sentinel/shell") => {
                let shell = extract_json_string(body, "shell")
                    .unwrap_or_else(|| "powershell".to_string());
                let command = extract_json_string(body, "command")
                    .unwrap_or_else(|| "whoami".to_string());
                let (code, out, err, admin) = run_privileged_shell(&shell, &command);
                let json = format!(
                    "{{\"ok\":true,\"exitCode\":{},\"isAdmin\":{},\"stdout\":{},\"stderr\":{}}}",
                    code,
                    admin,
                    json_str(&out),
                    json_str(&err)
                );
                (200, "application/json; charset=utf-8", json.into_bytes())
            }
            ("POST", "/api/sentinel/open-admin") => {
                let shell = extract_json_string(body, "shell")
                    .unwrap_or_else(|| "powershell".to_string());
                let res = if shell.eq_ignore_ascii_case("cmd") {
                    open_admin_cmd_window(None)
                } else {
                    open_admin_powershell_window(None)
                };
                let msg = match res {
                    Ok(_) => format!("Yönetici {} penceresi (UAC RunAs) başarıyla başlatıldı.", shell.to_uppercase()),
                    Err(e) => e,
                };
                let json = format!("{{\"ok\":true,\"message\":{}}}", json_str(&msg));
                (200, "application/json; charset=utf-8", json.into_bytes())
            }
            ("POST", "/api/sentinel/elevate") => {
                let msg = match elevate_self() {
                    Ok(_) => "IPScans Sentinel Yönetici (Administrator) yetkisiyle yeniden başlatıldı.".to_string(),
                    Err(e) => e,
                };
                let json = format!("{{\"ok\":true,\"message\":{}}}", json_str(&msg));
                (200, "application/json; charset=utf-8", json.into_bytes())
            }
            _ => (
                404,
                "application/json; charset=utf-8",
                b"{\"error\":\"Not found\"}".to_vec(),
            ),
        }
    });

    run_http_loop(listener, handler);
}
