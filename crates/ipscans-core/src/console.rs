//! Rust-rendered pages and form decoding for the loopback desktop consoles.
use crate::design::{bind_app_server, run_http_loop, RouteHandler};
use crate::win32::launch_desktop_app_window;
use std::sync::Arc;

pub type Reply = (u16, &'static str, Vec<u8>);

pub fn escape(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#39;")
}

pub fn field(body: &str, name: &str) -> Option<String> {
    let encoded = body
        .split('&')
        .filter_map(|part| part.split_once('='))
        .find(|(k, _)| *k == name)?
        .1;
    let mut bytes = encoded.bytes();
    let mut out = Vec::new();
    while let Some(b) = bytes.next() {
        out.push(match b {
            b'+' => b' ',
            b'%' => {
                let high = (bytes.next()? as char).to_digit(16)?;
                let low = (bytes.next()? as char).to_digit(16)?;
                (high * 16 + low) as u8
            }
            _ => b,
        });
    }
    String::from_utf8(out).ok()
}

pub fn page(title: &str, icon: &str, subtitle: &str, body: &str) -> Reply {
    let html = format!(
        r##"<!doctype html><html lang="tr" data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{title} — IPScans</title><link rel="icon" href="/brand/{icon}.png"><link rel="stylesheet" href="/design/v2.css"><style>
      .desk-workspace{{max-width:1420px;margin:0 auto;padding:24px}}
      .desk-grid{{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:16px}}
      .desk-grid > section{{grid-column:span 12;position:relative;background:var(--surface-dim);border:1px solid var(--line);border-radius:20px;padding:22px 24px;box-shadow:var(--shadow-card);overflow:hidden;transition:border-color 220ms var(--ease-out-quart)}}
      .desk-grid > section::before{{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(520px circle at var(--mouse-x,-500px) var(--mouse-y,-500px),var(--signal-soft),transparent 45%);opacity:0.65}}
      .desk-grid > section:hover{{border-color:var(--line-2)}}
      .desk-grid h2{{font-size:18px;font-weight:650;letter-spacing:-0.022em;margin:4px 0 10px;color:var(--ink)}}
      .desk-grid p{{color:var(--ink-2);margin:6px 0 14px;font-size:13.5px;line-height:1.58}}
      .desk-grid label{{display:grid;gap:6px;color:var(--ink-2);font-weight:550;font-size:13px}}
      .desk-grid form{{display:flex;flex-wrap:wrap;gap:12px;align-items:end}}
      .desk-grid .data-table-wrap{{overflow:auto;margin-top:12px}}
      .desk-grid output{{display:block;overflow-wrap:anywhere;background:var(--surface);padding:14px 16px;border-radius:12px;border:1px solid var(--line-2);border-left:4px solid var(--signal);margin:14px 0;font-size:13px}}
      .desk-grid details{{margin:10px 0;padding:12px 16px;border-radius:12px;background:var(--surface);border:1px solid var(--line)}}
      .desk-grid summary{{cursor:pointer;color:var(--signal);font-weight:600}}
      .kpi-strip{{grid-column:span 12;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}}
      @media(max-width:980px){{.kpi-strip{{grid-template-columns:repeat(2,minmax(0,1fr))}}}}
      .kpi-box{{background:var(--surface-dim);border:1px solid var(--line);border-radius:18px;padding:16px 18px;box-shadow:var(--shadow-card)}}
      .kpi-label{{font-size:11px;font-weight:650;letter-spacing:0.06em;text-transform:uppercase;color:var(--signal)}}
      .kpi-val{{font-size:21px;font-weight:700;color:var(--ink);margin-top:4px;letter-spacing:-0.03em}}
      .kpi-sub{{font-size:12px;color:var(--ink-3);margin-top:2px}}
      .stage-grid{{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:14px}}
      @media(max-width:980px){{.stage-grid{{grid-template-columns:repeat(2,minmax(0,1fr))}}}}
      .stage-card{{background:var(--surface);border:1px solid var(--line-2);border-radius:14px;padding:14px}}
      .sector-grid{{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:12px}}
      @media(max-width:980px){{.sector-grid{{grid-template-columns:repeat(2,minmax(0,1fr))}}}}
      .sector-card{{background:var(--surface);border:1px solid var(--line-2);border-radius:14px;padding:15px;display:flex;flex-direction:column;justify-content:space-between;gap:10px}}
    </style></head><body>
    <div class="app-shell">
      <header class="topbar">
        <div class="brand-cluster">
          <span class="ipscans-hex-mark" aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
              <defs>
                <linearGradient id="ips-hex-grad" x1="3" y1="3" x2="29" y2="29" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stop-color="#2F6BFF"/>
                  <stop offset="50%" stop-color="#00C2FF"/>
                  <stop offset="100%" stop-color="#7A5CFF"/>
                </linearGradient>
              </defs>
              <path d="M16 3L27.2583 9.5V22.5L16 29L4.74167 22.5V9.5L16 3Z" stroke="url(#ips-hex-grad)" stroke-width="2" stroke-linejoin="round"/>
              <path d="M16 9V16M16 16L22 19.5M16 16L10 19.5" stroke="url(#ips-hex-grad)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="16" cy="16" r="2.6" fill="url(#ips-hex-grad)"/>
            </svg>
          </span>
          <span class="brand-divider" aria-hidden="true"></span>
          <img class="brand-logo" src="/brand/{icon}.png" alt="">
          <div>
            <div class="brand-title">{title}</div>
            <div class="brand-sub">{subtitle}</div>
          </div>
        </div>
        <nav class="nav-pills" id="autoNavPills" role="tablist">
          <button type="button" class="nav-tab active" onclick="window.filterDeskSection(-1, this)">Tüm Modüller</button>
        </nav>
        <div class="top-actions">
          <button type="button" class="btn btn-secondary btn-sm" onclick="window.toggleIpScansTheme()"><span id="themeBtnLabel">Açık Tema</span></button>
        </div>
      </header>
      <main class="desk-workspace">
        <div class="desk-grid" id="deskGridContainer">{body}</div>
      </main>
    </div>
    <script src="/design/v2.js"></script>
    <script>
    (function(){{
      const nav = document.getElementById('autoNavPills');
      const sections = Array.from(document.querySelectorAll('#deskGridContainer > section'));
      if (nav && sections.length > 1) {{
        sections.forEach((sec, idx) => {{
          const h2 = sec.querySelector('h2');
          const raw = h2 ? h2.textContent.trim() : ('Modül ' + (idx + 1)); const label = raw.length > 24 ? raw.slice(0, 24).replace(/\s+\S*$/, '') : raw;
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'nav-tab';
          btn.textContent = label;
          btn.onclick = function() {{ window.filterDeskSection(idx, btn); }};
          nav.appendChild(btn);
        }});
      }}
      window.filterDeskSection = function(idx, activeBtn) {{
        document.querySelectorAll('#autoNavPills .nav-tab').forEach(b => b.classList.remove('active'));
        if (activeBtn) activeBtn.classList.add('active');
        sections.forEach((sec, i) => {{
          sec.style.display = (idx === -1 || idx === i) ? '' : 'none';
        }});
      }};
    }})();
    </script>
    </body></html>"##
    );
    (200, "text/html; charset=utf-8", html.into_bytes())
}

pub fn json(status: u16, body: String) -> Reply {
    (status, "application/json; charset=utf-8", body.into_bytes())
}

pub fn serve(slug: &str, port: u16, handler: Arc<RouteHandler>) {
    let (listener, port) = bind_app_server(port);
    if !std::env::args().any(|arg| arg == "--headless") {
        let _ = launch_desktop_app_window(slug, &format!("http://127.0.0.1:{port}"), 1380, 880);
    } else {
        println!("http://127.0.0.1:{port}");
    }
    run_http_loop(listener, handler);
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn text_roundtrip() {
        assert_eq!(
            field("owner=Ali+%C3%87elik%26Can", "owner").as_deref(),
            Some("Ali Çelik&Can")
        );
        assert_eq!(field("owner=%2", "owner"), None);
        assert_eq!(escape("<a'&>"), "&lt;a&#39;&amp;&gt;");
    }
}
