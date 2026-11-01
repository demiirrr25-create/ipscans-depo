//! Loopback diagnostics service and static desktop catalog exporter.
use std::env;
use std::sync::Arc;

use ipscans_core::design::{bind_app_server, run_http_loop};
use ipscans_core::json::{extract_json_string, json_str};
use ipscans_core::network::{
    check_ports_detailed, discover_gateway_context, query_dns_records, query_whois_raw,
    DISCOVERY_PORTS,
};
use ipscans_core::sentinel::check_ollama_status;
use ipscans_core::vision_rules::sector_packs_to_json;

mod catalog;

fn main() {
    let args: Vec<String> = env::args().collect();
    if let Some(dir) = args
        .get(1)
        .filter(|v| v.as_str() == "--export-catalog")
        .and_then(|_| args.get(2))
    {
        catalog::export(std::path::Path::new(dir), catalog::PUBLISHED).expect("export catalog");
        return;
    }
    if args
        .iter()
        .any(|a| a == "--version" || a == "-V" || a == "--selftest")
    {
        println!("ipscans-web {}", env!("CARGO_PKG_VERSION"));
        return;
    }

    let (listener, port) = bind_app_server(17980);
    println!(
        "IPScans Native Rust Web Platform listening on http://127.0.0.1:{}",
        port
    );

    let handler = Arc::new(
        |method: &str, path: &str, body: &str| -> (u16, &'static str, Vec<u8>) {
            match (method, path) {
                ("GET", "/") | ("GET", "/index.html") => (
                    200,
                    "text/html; charset=utf-8",
                    catalog::render(true, catalog::PUBLISHED, None).into_bytes(),
                ),
                ("GET", "/desktop/tr.html") | ("GET", "/desktop/en.html") => (
                    200,
                    "text/html; charset=utf-8",
                    catalog::render(path.ends_with("/tr.html"), catalog::PUBLISHED, None)
                        .into_bytes(),
                ),
                ("GET", "/desktop/catalog.css") => (
                    200,
                    "text/css; charset=utf-8",
                    include_bytes!("../../../public/desktop/catalog.css").to_vec(),
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
                    (
                        200,
                        "application/json; charset=utf-8",
                        query_dns_records(&domain).into_bytes(),
                    )
                }
                ("POST", "/api/whois") => {
                    let domain = extract_json_string(body, "domain")
                        .unwrap_or_else(|| "ipscans.com".to_string());
                    (
                        200,
                        "application/json; charset=utf-8",
                        query_whois_raw(&domain).into_bytes(),
                    )
                }
                ("POST", "/api/ports") => {
                    let target = extract_json_string(body, "target")
                        .unwrap_or_else(|| "127.0.0.1".to_string());
                    let out = check_ports_detailed(&target, DISCOVERY_PORTS, 450);
                    (200, "application/json; charset=utf-8", out.into_bytes())
                }
                ("GET", "/api/sentinel") => {
                    let ctx = discover_gateway_context();
                    let (ollama_installed, models, ollama_up) = check_ollama_status();
                    let best = models
                        .first()
                        .cloned()
                        .unwrap_or_else(|| "qwen2.5-coder:7b".to_string());
                    let models_json: Vec<String> = models.iter().map(|m| json_str(m)).collect();
                    let out = format!(
                    "{{\"engine\":\"ipscans-sentinel-rust/3.0\",\"gatewayIp\":{},\"ollamaInstalled\":{},\"ollamaOnline\":{},\"bestModel\":{},\"models\":[{}]}}",
                    json_str(&ctx.gateway_ip),
                    if ollama_installed { "true" } else { "false" },
                    if ollama_up { "true" } else { "false" },
                    json_str(&best),
                    models_json.join(",")
                );
                    (200, "application/json; charset=utf-8", out.into_bytes())
                }
                ("GET", "/api/cortex/packs") => (
                    200,
                    "application/json; charset=utf-8",
                    sector_packs_to_json().into_bytes(),
                ),
                _ => (
                    404,
                    "application/json",
                    b"{\"error\":\"Not found\"}".to_vec(),
                ),
            }
        },
    );

    run_http_loop(listener, handler);
}
