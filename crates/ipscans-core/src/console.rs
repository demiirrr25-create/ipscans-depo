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
    let version = env!("CARGO_PKG_VERSION");
    let html = format!(
        r#"<!doctype html><html lang="tr" data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{title}</title><link rel="icon" href="/brand/{icon}.png"><link rel="stylesheet" href="/design/v2.css"><style>
      .desk{{max-width:1080px;margin:clamp(16px,4vw,50px) auto;padding:0 18px}}.desk header,.desk section{{background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:clamp(18px,3vw,30px);margin-bottom:16px}}.desk header{{display:flex;align-items:center;gap:16px;background:var(--surface-dim)}}.desk header img{{width:64px;height:64px}}.desk h1{{margin:4px 0;font-size:clamp(24px,4vw,38px)}}.desk h2{{font-size:21px;margin:.25em 0 .7em}}.desk p{{color:var(--ink-2);margin:.5em 0 1em}}.desk label{{display:grid;gap:5px;color:var(--ink-2);font-weight:550}}.desk form{{display:flex;flex-wrap:wrap;gap:12px;align-items:end}}.desk .data-table-wrap{{overflow:auto}}.desk output{{display:block;overflow-wrap:anywhere;background:var(--surface-dim);padding:14px;border-left:3px solid var(--signal);margin:12px 0}}.desk details{{margin:10px 0}}.desk summary{{cursor:pointer;color:var(--signal);font-weight:600}}.desk .eyebrow{{color:var(--signal)}}.desk .btn-signal{{color:#07111c}}.desk .btn-signal:hover{{color:#fff}}.desk a{{color:var(--signal)}}
      @media(prefers-color-scheme:dark){{html{{color-scheme:dark}}}}
    </style></head><body><main class="desk"><header><img src="/brand/{icon}.png" alt=""><div><div class="eyebrow">IPSCANS / WINDOWS · {version}</div><h1>{title}</h1><p>{subtitle}</p></div></header>{body}</main></body></html>"#
    );
    (200, "text/html; charset=utf-8", html.into_bytes())
}

pub fn json(status: u16, body: String) -> Reply {
    (status, "application/json; charset=utf-8", body.into_bytes())
}

pub fn serve(slug: &str, port: u16, handler: Arc<RouteHandler>) {
    let (listener, port) = bind_app_server(port);
    if !std::env::args().any(|arg| arg == "--headless") {
        let _ = launch_desktop_app_window(slug, &format!("http://127.0.0.1:{port}"), 1280, 820);
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
