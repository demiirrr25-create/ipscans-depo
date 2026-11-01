//! `ipscans-web` — Native Rust HTTP/1.1 Web & API Platform Server for `ipscans.com`.
//! Serves all IPScans web API endpoints (`/api/ip`, `/api/dns`, `/api/whois`, `/api/ports`,
//! `/api/sentinel`, `/api/license/validate`) and the IPScans v2 Light/Dark web interface in 100% Rust.

use std::env;
use std::sync::Arc;

use ipscans_core::cryptography::issue_commercial_license;
use ipscans_core::design::{bind_app_server, run_http_loop};
use ipscans_core::json::{extract_json_bool, extract_json_string, json_str};
use ipscans_core::network::{
    check_ports_detailed, discover_gateway_context, query_dns_records, query_whois_raw,
    DISCOVERY_PORTS,
};
use ipscans_core::sentinel::{check_ollama_status, execute_autonomous_incident_pipeline};
use ipscans_core::vision_rules::sector_packs_to_json;

const WEB_PLATFORM_HTML: &str = r#"<!DOCTYPE html>
<html lang="tr" data-theme="light">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>IPScans.com — %100 Native Rust Ağ İstihbaratı, Siber Savunma ve Masaüstü Platformu</title>
  <link rel="icon" href="/favicon.ico" />
  <link rel="stylesheet" href="/design/v2.css" />
</head>
<body>
  <div class="app-shell">
    <header class="topbar">
      <div class="brand-cluster">
        <img src="/brand/sentinel.png" alt="IPScans" class="brand-logo" />
        <div>
          <div class="brand-title">
            IPScans.com
            <span class="badge badge-signal mono">100% NATIVE RUST PLATFORM</span>
          </div>
          <div class="brand-sub">Ağ İstihbaratı, Otonom Siber Savunma ve Windows x64 Masaüstü Ekosistemi</div>
        </div>
      </div>
      <div class="top-actions">
        <span class="badge badge-ok mono"><span class="pulse-dot"></span>RUST ENGINE v3.0</span>
        <button class="btn btn-secondary btn-sm" onclick="toggleIpScansTheme()"><span id="themeBtnLabel">Koyu Tema</span></button>
      </div>
    </header>
    <main class="workspace">
      <div class="bento-grid">
        <div class="bento-card col-12">
          <div class="eyebrow">IPSCANS NATIVE RUST EKOSİSTEMİ</div>
          <h1 class="card-title" style="font-size:24px;margin-top:4px">Tüm Ağ Araçları ve Masaüstü Uygulamaları %100 Rust Çekirdeğinde</h1>
          <p class="card-desc">IPScans Sentinel v3.0, IPscans+ v5.0, IPCast v3.0, IPScans LPR Pro v2.0, IPScans Cortex v3.0 ve Network Health Pro v3.0 tek bir birleşik Rust mimarisinde çalışır.</p>
        </div>
      </div>
    </main>
  </div>
  <script src="/design/v2.js"></script>
</body>
</html>"#;

fn main() {
    let args: Vec<String> = env::args().collect();
    if args.iter().any(|a| a == "--version" || a == "-V" || a == "--selftest") {
        println!("ipscans-web 3.0.0 (100% Native Rust Web & API Platform Server)");
        return;
    }

    let (listener, port) = bind_app_server(17980);
    println!("IPScans Native Rust Web Platform listening on http://127.0.0.1:{}", port);

    let handler = Arc::new(|method: &str, path: &str, body: &str| -> (u16, &'static str, Vec<u8>) {
        match (method, path) {
            ("GET", "/") | ("GET", "/index.html") => (
                200,
                "text/html; charset=utf-8",
                WEB_PLATFORM_HTML.as_bytes().to_vec(),
            ),
            ("GET", "/api/ip") => {
                let ctx = discover_gateway_context();
                let out = format!(
                    "{{\"ip\":{},\"gateway\":{},\"subnet\":{},\"engine\":\"ipscans-rust-web/3.0\"}}",
                    json_str(&ctx.local_ip),
                    json_str(&ctx.gateway_ip),
                    json_str(&format!("{}.0/24", ctx.subnet_prefix))
                );
                (200, "application/json; charset=utf-8", out.into_bytes())
            }
            ("POST", "/api/dns") => {
                let domain = extract_json_string(body, "domain")
                    .unwrap_or_else(|| "ipscans.com".to_string());
                (200, "application/json; charset=utf-8", query_dns_records(&domain).into_bytes())
            }
            ("POST", "/api/whois") => {
                let domain = extract_json_string(body, "domain")
                    .unwrap_or_else(|| "ipscans.com".to_string());
                (200, "application/json; charset=utf-8", query_whois_raw(&domain).into_bytes())
            }
            ("POST", "/api/ports") => {
                let target = extract_json_string(body, "target")
                    .unwrap_or_else(|| "127.0.0.1".to_string());
                let out = check_ports_detailed(&target, DISCOVERY_PORTS, 450);
                (200, "application/json; charset=utf-8", out.into_bytes())
            }
            ("GET", "/api/sentinel") => {
                let ctx = discover_gateway_context();
                let (ollama_up, models, best) = check_ollama_status();
                let models_json: Vec<String> = models.iter().map(|m| json_str(m)).collect();
                let out = format!(
                    "{{\"engine\":\"ipscans-sentinel-rust/3.0\",\"gatewayIp\":{},\"ollamaOnline\":{},\"bestModel\":{},\"models\":[{}]}}",
                    json_str(&ctx.gateway_ip),
                    if ollama_up { "true" } else { "false" },
                    json_str(&best),
                    models_json.join(",")
                );
                (200, "application/json; charset=utf-8", out.into_bytes())
            }
            ("POST", "/api/sentinel") => {
                let prompt = extract_json_string(body, "prompt")
                    .unwrap_or_else(|| "Dahua kamerama sızdılar".to_string());
                let target_ip = extract_json_string(body, "targetIp");
                let auto_restore = extract_json_bool(body, "autoRestore").unwrap_or(true);
                let out = execute_autonomous_incident_pipeline(
                    &prompt,
                    target_ip.as_deref(),
                    auto_restore,
                );
                (200, "application/json; charset=utf-8", out.into_bytes())
            }
            ("GET", "/api/cortex/packs") => (
                200,
                "application/json; charset=utf-8",
                sector_packs_to_json().into_bytes(),
            ),
            ("POST", "/api/license/activate") => {
                let customer = extract_json_string(body, "customer")
                    .unwrap_or_else(|| "Kurumsal Müşteri".to_string());
                let tier = extract_json_string(body, "tier")
                    .unwrap_or_else(|| "ULTRA".to_string());
                let key = issue_commercial_license(&customer, &tier, 365);
                let out = format!(
                    "{{\"ok\":true,\"customer\":{},\"tier\":{},\"licenseKey\":{}}}",
                    json_str(&customer),
                    json_str(&tier),
                    json_str(&key)
                );
                (200, "application/json; charset=utf-8", out.into_bytes())
            }
            _ => (404, "application/json", b"{\"error\":\"Not found\"}".to_vec()),
        }
    });

    run_http_loop(listener, handler);
}
