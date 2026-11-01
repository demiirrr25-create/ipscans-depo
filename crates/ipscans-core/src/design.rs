//! Shared `ipscans.com` v2.0 Design System CSS, Brand Assets, and Multi-Threaded Local HTTP/IPC Engine.

use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::sync::Arc;
use std::thread;
use std::time::Duration;

pub const ICON_SENTINEL_PNG: &[u8] = include_bytes!("../../../design/icons/sentinel.png");
pub const ICON_SCANNER_PNG: &[u8] = include_bytes!("../../../design/icons/scanner.png");
pub const ICON_IPCAST_PNG: &[u8] = include_bytes!("../../../design/icons/ipcast.png");
pub const ICON_LPR_PNG: &[u8] = include_bytes!("../../../design/icons/lpr.png");
pub const ICON_CORTEX_PNG: &[u8] = include_bytes!("../../../design/icons/cortex.png");
pub const ICON_HEALTH_PNG: &[u8] = include_bytes!("../../../design/icons/health.png");

pub const ICON_SENTINEL_ICO: &[u8] = include_bytes!("../../../design/icons/sentinel.ico");

/// Exact 1:1 `ipscans.com` v2.0 Design System CSS (Light & Dark parity, OKLCH surfaces,
/// 999px pill buttons with `scale(0.97)` press physics, `cubic-bezier(0.16, 1, 0.3, 1)` transitions,
/// mouse-tracking radial spotlight cards, and tabular monospace telemetry).
pub const IPSCANS_V2_CSS: &str = r###"
:root, [data-theme="dark"] {
  color-scheme: dark;
  --surface: #07080B;
  --surface-dim: #0D0F14;
  --surface-muted: #13161E;
  --surface-elevated: #171B25;
  --surface-glass: rgba(13, 15, 20, 0.82);
  --ink: #F5F7FA;
  --ink-2: #A6B0C3;
  --ink-3: #6C7689;
  --ink-4: #444C5C;
  --on-ink: #07080B;
  --line: rgba(255, 255, 255, 0.08);
  --line-2: rgba(255, 255, 255, 0.14);
  --line-3: rgba(255, 255, 255, 0.24);
  --signal: #4C82FF;
  --signal-hover: #6B99FF;
  --signal-soft: rgba(76, 130, 255, 0.14);
  --signal-ring: rgba(76, 130, 255, 0.35);
  --ok: #12B76A;
  --ok-soft: rgba(18, 183, 106, 0.14);
  --warn: #F79009;
  --warn-soft: rgba(247, 144, 9, 0.14);
  --err: #F04438;
  --err-soft: rgba(240, 68, 56, 0.15);
  --shadow-card: 0 1px 2px rgba(0,0,0,0.45), 0 12px 32px -8px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.07);
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-out-quart: cubic-bezier(0.22, 1, 0.36, 1);
}

[data-theme="light"] {
  color-scheme: light;
  --surface: #FFFFFF;
  --surface-dim: #F7F8FA;
  --surface-muted: #EFF1F5;
  --surface-elevated: #FFFFFF;
  --surface-glass: rgba(255, 255, 255, 0.84);
  --ink: #0A0B0E;
  --ink-2: #3C4250;
  --ink-3: #6B7280;
  --ink-4: #9CA3AF;
  --on-ink: #FFFFFF;
  --line: rgba(10, 11, 14, 0.08);
  --line-2: rgba(10, 11, 14, 0.14);
  --line-3: rgba(10, 11, 14, 0.24);
  --signal: #2F6BFF;
  --signal-hover: #1D55E5;
  --signal-soft: rgba(47, 107, 255, 0.09);
  --signal-ring: rgba(47, 107, 255, 0.28);
  --ok: #0F9D58;
  --ok-soft: rgba(15, 157, 88, 0.10);
  --warn: #D97706;
  --warn-soft: rgba(217, 119, 6, 0.10);
  --err: #DC2626;
  --err-soft: rgba(220, 38, 38, 0.10);
  --shadow-card: 0 1px 2px rgba(10,11,14,0.04), 0 10px 26px -8px rgba(10,11,14,0.07), inset 0 1px 0 rgba(255,255,255,0.8);
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body {
  height: 100%;
  background: var(--surface);
  color: var(--ink);
  font-family: "Google Sans Flex", "Segoe UI Variable Display", "Inter", system-ui, -apple-system, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  letter-spacing: -0.008em;
  overflow-x: hidden;
  transition: background-color 220ms var(--ease-out-quart), color 220ms var(--ease-out-quart);
}

.mono {
  font-family: "JetBrains Mono", "Cascadia Code", "Consolas", monospace;
  font-variant-numeric: tabular-nums;
}

/* App Shell */
.app-shell {
  display: grid;
  grid-template-rows: 64px 1fr;
  min-height: 100vh;
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  background: var(--surface-glass);
  backdrop-filter: blur(20px) saturate(180%);
  border-bottom: 1px solid var(--line);
}

.brand-cluster {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-logo {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(47, 107, 255, 0.25);
  transition: transform 320ms var(--ease-out-expo);
}
.brand-cluster:hover .brand-logo {
  transform: scale(1.06);
}

.brand-title {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.024em;
  color: var(--ink);
  display: flex;
  align-items: center;
  gap: 8px;
}

.brand-sub {
  font-size: 11.5px;
  color: var(--ink-3);
  font-weight: 500;
}

.nav-pills {
  display: flex;
  align-items: center;
  gap: 4px;
  background: var(--surface-dim);
  border: 1px solid var(--line);
  padding: 4px;
  border-radius: 999px;
}

.nav-tab {
  border: none;
  background: transparent;
  color: var(--ink-2);
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  padding: 6px 15px;
  border-radius: 999px;
  cursor: pointer;
  transition: all 180ms var(--ease-out-quart);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.nav-tab:hover { color: var(--ink); }
.nav-tab:active { transform: scale(0.97); }
.nav-tab.active {
  background: var(--ink);
  color: var(--on-ink);
  box-shadow: 0 2px 8px rgba(0,0,0,0.18);
}

.top-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 999px Pill Buttons (1:1 ipscans.com v2.0) */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 38px;
  padding: 0 18px;
  border-radius: 999px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 550;
  letter-spacing: -0.01em;
  border: 1px solid transparent;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
  transition: transform 160ms var(--ease-out-expo), background-color 180ms var(--ease-out-quart), border-color 180ms var(--ease-out-quart), box-shadow 180ms var(--ease-out-quart);
}
.btn:active { transform: scale(0.97); }
.btn:disabled { opacity: 0.5; pointer-events: none; }

.btn-primary {
  background: var(--ink);
  color: var(--on-ink);
}
.btn-primary:hover { opacity: 0.92; box-shadow: 0 4px 16px rgba(0,0,0,0.22); }

.btn-signal {
  background: var(--signal);
  color: #FFFFFF;
  box-shadow: 0 2px 12px var(--signal-ring);
}
.btn-signal:hover { background: var(--signal-hover); }

.btn-secondary {
  background: var(--surface-dim);
  color: var(--ink);
  border-color: var(--line-2);
}
.btn-secondary:hover { background: var(--surface-muted); border-color: var(--line-3); }

.btn-danger {
  background: var(--err-soft);
  color: var(--err);
  border-color: rgba(240, 68, 56, 0.32);
}
.btn-danger:hover { background: var(--err); color: #FFFFFF; }

.btn-ok {
  background: var(--ok-soft);
  color: var(--ok);
  border-color: rgba(18, 183, 106, 0.32);
}
.btn-ok:hover { background: var(--ok); color: #FFFFFF; }

.btn-sm { height: 32px; padding: 0 13px; font-size: 12px; }
.btn-icon { width: 36px; height: 36px; padding: 0; border-radius: 999px; }

/* Status Badges */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 600;
  border: 1px solid var(--line);
  background: var(--surface-dim);
  color: var(--ink-2);
}
.badge-signal { background: var(--signal-soft); color: var(--signal); border-color: var(--signal-ring); }
.badge-ok { background: var(--ok-soft); color: var(--ok); border-color: rgba(18,183,106,0.28); }
.badge-warn { background: var(--warn-soft); color: var(--warn); border-color: rgba(247,144,9,0.28); }
.badge-err { background: var(--err-soft); color: var(--err); border-color: rgba(240,68,56,0.32); }

.pulse-dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: currentColor;
  box-shadow: 0 0 8px currentColor;
}

/* Bento Cards with Spotlight */
.workspace {
  max-width: 1420px;
  width: 100%;
  margin: 0 auto;
  padding: 24px;
}

.bento-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 16px;
}
.col-12 { grid-column: span 12; }
.col-8 { grid-column: span 8; }
.col-7 { grid-column: span 7; }
.col-6 { grid-column: span 6; }
.col-5 { grid-column: span 5; }
.col-4 { grid-column: span 4; }
.col-3 { grid-column: span 3; }

@media (max-width: 1024px) {
  .col-8, .col-7, .col-6, .col-5, .col-4, .col-3 { grid-column: span 12; }
}

.bento-card {
  position: relative;
  background: var(--surface-dim);
  border: 1px solid var(--line);
  border-radius: 20px;
  padding: 20px;
  box-shadow: var(--shadow-card);
  overflow: hidden;
  transition: border-color 220ms var(--ease-out-quart), transform 220ms var(--ease-out-expo);
}
.bento-card::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(520px circle at var(--mouse-x, -500px) var(--mouse-y, -500px), var(--signal-soft), transparent 45%);
  opacity: 0.65;
}
.bento-card:hover { border-color: var(--line-2); }

.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}
.eyebrow {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--signal);
  margin-bottom: 3px;
}
.card-title {
  font-size: 16.5px;
  font-weight: 600;
  letter-spacing: -0.022em;
  color: var(--ink);
}
.card-desc {
  font-size: 13px;
  color: var(--ink-2);
  margin-top: 3px;
}

/* Inputs & Consoles */
.input, .select, .textarea {
  width: 100%;
  background: var(--surface);
  color: var(--ink);
  border: 1px solid var(--line-2);
  border-radius: 12px;
  padding: 10px 14px;
  font-family: inherit;
  font-size: 13.5px;
  outline: none;
  transition: border-color 160ms var(--ease-out-quart), box-shadow 160ms var(--ease-out-quart);
}
.input:focus, .select:focus, .textarea:focus {
  border-color: var(--signal);
  box-shadow: 0 0 0 3px var(--signal-soft);
}

/* Tables */
.data-table-wrap {
  overflow-x: auto;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--surface);
}
.data-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 13px;
}
.data-table th {
  padding: 11px 14px;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--ink-3);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid var(--line);
  background: var(--surface-dim);
}
.data-table td {
  padding: 11px 14px;
  border-bottom: 1px solid var(--line);
  color: var(--ink);
}
.data-table tr:last-child td { border-bottom: none; }
.data-table tbody tr:hover { background: var(--surface-dim); }

/* Terminal Output */
.terminal-box {
  background: var(--surface);
  color: var(--ink);
  border: 1px solid var(--line-2);
  border-radius: 14px;
  padding: 14px;
  font-family: "JetBrains Mono", "Cascadia Code", Consolas, monospace;
  font-size: 12.5px;
  line-height: 1.55;
  max-height: 320px;
  overflow-y: auto;
  white-space: pre-wrap;
}

.view-pane { display: none; animation: fadeIn 220ms var(--ease-out-expo); }
.view-pane.active { display: block; }
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}
"###;

/// Shared client-side JS helper for theme toggle, mouse-tracking spotlight cards, and subtle tactile audio.
pub const IPSCANS_V2_JS: &str = r###"
(function() {
  const savedTheme = localStorage.getItem('ipscans-theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  const initLabel = document.getElementById('themeBtnLabel');
  if (initLabel) initLabel.textContent = savedTheme === 'dark' ? 'Açık Tema' : 'Koyu Tema';

  window.toggleIpScansTheme = function() {
    const cur = document.documentElement.getAttribute('data-theme') || 'light';
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('ipscans-theme', next);
    const label = document.getElementById('themeBtnLabel');
    if (label) label.textContent = next === 'dark' ? 'Açık Tema' : 'Koyu Tema';
  };

  window.switchTab = function(tabId) {
    document.querySelectorAll('.view-pane').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(el => el.classList.remove('active'));
    const pane = document.getElementById('pane-' + tabId);
    if (pane) pane.classList.add('active');
    const btn = document.querySelector(`.nav-tab[data-tab="${tabId}"]`);
    if (btn) btn.classList.add('active');
  };

  document.addEventListener('mousemove', function(e) {
    requestAnimationFrame(() => {
      document.querySelectorAll('.bento-card').forEach(card => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--mouse-x', (e.clientX - rect.left) + 'px');
        card.style.setProperty('--mouse-y', (e.clientY - rect.top) + 'px');
      });
    });
  }, { passive: true });

  window.addEventListener('DOMContentLoaded', function() {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab && window.switchTab) setTimeout(() => window.switchTab(tab), 150);
    if (params.get('autodefense') === '1' && typeof window.runAutonomousDefense === 'function') {
      setTimeout(() => window.runAutonomousDefense(), 200);
    }
  });
})();
"###;

pub type RouteHandler = dyn Fn(&str, &str, &str) -> (u16, &'static str, Vec<u8>) + Send + Sync + 'static;

/// Starts a multi-threaded HTTP server on `preferred_port` (or next available port) and invokes `handler`.
pub fn bind_app_server(preferred_port: u16) -> (TcpListener, u16) {
    if let Ok(l) = TcpListener::bind(("127.0.0.1", preferred_port)) {
        return (l, preferred_port);
    }
    for p in (preferred_port + 1)..(preferred_port + 80) {
        if let Ok(l) = TcpListener::bind(("127.0.0.1", p)) {
            return (l, p);
        }
    }
    let l = TcpListener::bind(("127.0.0.1", 0)).expect("Local loopback bind failed");
    let port = l.local_addr().map(|a| a.port()).unwrap_or(preferred_port);
    (l, port)
}

pub fn run_http_loop(listener: TcpListener, handler: Arc<RouteHandler>) {
    for incoming in listener.incoming() {
        let Ok(stream) = incoming else { continue };
        let h = Arc::clone(&handler);
        thread::spawn(move || {
            handle_http_connection(stream, h);
        });
    }
}

fn handle_http_connection(mut stream: TcpStream, handler: Arc<RouteHandler>) {
    let _ = stream.set_read_timeout(Some(Duration::from_secs(15)));
    let _ = stream.set_write_timeout(Some(Duration::from_secs(15)));

    let mut data = Vec::with_capacity(8192);
    let mut temp = [0u8; 8192];
    let mut header_end = None;
    let mut content_len = 0usize;

    loop {
        match stream.read(&mut temp) {
            Ok(0) => break,
            Ok(n) => {
                data.extend_from_slice(&temp[..n]);
                if header_end.is_none() {
                    if let Some(pos) = data.windows(4).position(|w| w == b"\r\n\r\n") {
                        header_end = Some(pos + 4);
                        let hdr_str = String::from_utf8_lossy(&data[..pos]);
                        for line in hdr_str.lines() {
                            let lower = line.to_ascii_lowercase();
                            if let Some(rest) = lower.strip_prefix("content-length:") {
                                content_len = rest.trim().parse::<usize>().unwrap_or(0);
                            }
                        }
                    }
                }
                if let Some(hend) = header_end {
                    if data.len() >= hend + content_len {
                        break;
                    }
                }
            }
            Err(_) => break,
        }
    }

    if data.is_empty() {
        return;
    }
    let raw = String::from_utf8_lossy(&data);
    let mut lines = raw.lines();
    let Some(first_line) = lines.next() else { return };
    let parts: Vec<&str> = first_line.split_whitespace().collect();
    if parts.len() < 2 {
        return;
    }
    let method = parts[0];
    let raw_path = parts[1];
    let full_path = raw_path.split('?').next().unwrap_or(raw_path);
    let body = match header_end {
        Some(hend) if data.len() >= hend => String::from_utf8_lossy(&data[hend..]).to_string(),
        _ => String::new(),
    };

    // Built-in brand icon routes
    let (status, content_type, resp_body) = match full_path {
        "/brand/sentinel.png" => (200, "image/png", ICON_SENTINEL_PNG.to_vec()),
        "/brand/scanner.png" => (200, "image/png", ICON_SCANNER_PNG.to_vec()),
        "/brand/ipcast.png" => (200, "image/png", ICON_IPCAST_PNG.to_vec()),
        "/brand/lpr.png" => (200, "image/png", ICON_LPR_PNG.to_vec()),
        "/brand/cortex.png" => (200, "image/png", ICON_CORTEX_PNG.to_vec()),
        "/brand/health.png" => (200, "image/png", ICON_HEALTH_PNG.to_vec()),
        "/favicon.ico" => (200, "image/x-icon", ICON_SENTINEL_ICO.to_vec()),
        "/design/v2.css" => (200, "text/css; charset=utf-8", IPSCANS_V2_CSS.as_bytes().to_vec()),
        "/design/v2.js" => (
            200,
            "application/javascript; charset=utf-8",
            IPSCANS_V2_JS.as_bytes().to_vec(),
        ),
        _ => handler(method, full_path, &body),
    };

    let status_text = match status {
        200 => "200 OK",
        400 => "400 Bad Request",
        404 => "404 Not Found",
        _ => "500 Internal Server Error",
    };

    let header = format!(
        "HTTP/1.1 {}\r\nContent-Type: {}\r\nContent-Length: {}\r\nAccess-Control-Allow-Origin: *\r\nCache-Control: no-store\r\nConnection: close\r\n\r\n",
        status_text,
        content_type,
        resp_body.len()
    );
    let _ = stream.write_all(header.as_bytes());
    let _ = stream.write_all(&resp_body);
    let _ = stream.flush();
    let _ = stream.shutdown(std::net::Shutdown::Write);
}
