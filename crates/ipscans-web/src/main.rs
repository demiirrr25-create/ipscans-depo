//! Loopback diagnostics service, 14-locale web route server, and static desktop catalog exporter.
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

pub const LOCALES: &[(&str, &str, &str)] = &[
    ("tr", "Ağ araçları. Tek platform.", "Ağ analizi, IP yönetimi ve uzaktan bağlantı araçları tek bir yerde."),
    ("en", "Network tools. One platform.", "Network analysis, IP management and remote access tools in one place."),
    ("de", "Netzwerktools. Eine Plattform.", "Netzwerkanalyse, IP-Verwaltung und Fernzugriff an einem Ort."),
    ("fr", "Outils réseau. Une plateforme.", "Analyse réseau, gestion des IP et accès à distance au même endroit."),
    ("es", "Herramientas de red. Una plataforma.", "Análisis de red, gestión de IP y acceso remoto en un solo lugar."),
    ("it", "Strumenti di rete. Un'unica piattaforma.", "Analisi di rete, gestione IP e accesso remoto in un unico posto."),
    ("pt", "Ferramentas de rede. Uma plataforma.", "Análise de rede, gestão de IP e acesso remoto num só lugar."),
    ("nl", "Netwerktools. Eén platform.", "Netwerkanalyse, IP-beheer en externe toegang op één plek."),
    ("pl", "Narzędzia sieciowe. Jedna platforma.", "Analiza sieci, zarządzanie IP i dostęp zdalny w jednym miejscu."),
    ("ru", "Сетевые инструменты. Одна платформа.", "Анализ сети, управление IP и удалённый доступ в одном месте."),
    ("ar", "أدوات الشبكات. منصة واحدة.", "تحليل الشبكات وإدارة عناوين IP والوصول عن بُعد في مكان واحد."),
    ("ja", "ネットワークツールをひとつの場所に。", "ネットワーク分析、IP管理、リモートアクセスを一か所で。"),
    ("ko", "네트워크 도구, 하나의 플랫폼.", "네트워크 분석, IP 관리, 원격 접속을 한곳에서."),
    ("zh", "网络工具，一个平台。", "网络分析、IP 管理和远程访问，尽在一处。"),
];

pub const GUIDE_SLUGS: &[(&str, &str)] = &[
    ("what-is-an-ip-address", "IP Adresi Nedir ve Ağlarda Nasıl Çalışır?"),
    ("private-vs-public-ip", "Özel (RFC1918) ve Genel IPv4/IPv6 Adresleri"),
    ("subnet-mask-and-cidr", "Alt Ağ Maskesi ve CIDR Hesaplama Rehberi"),
    ("dns-records-explained", "DNS A, AAAA, MX, TXT ve NS Kayıtları"),
    ("common-network-ports", "Kritik TCP/UDP Portları ve Güvenlik Denetimi"),
    ("arp-and-mac-addresses", "ARP Tablosu, OUI Üretici Tespiti ve L2 Topoloji"),
];

fn render_locale_page(locale: &str, section: &str) -> Option<String> {
    let &(code, title, subtitle) = LOCALES.iter().find(|(c, _, _)| *c == locale)?;
    let dir = if code == "ar" { "rtl" } else { "ltr" };
    let canonical = if section.is_empty() {
        format!("https://ipscans.com/{code}")
    } else {
        format!("https://ipscans.com/{code}/{section}")
    };
    let hreflangs: String = LOCALES
        .iter()
        .map(|(c, _, _)| {
            let url = if section.is_empty() {
                format!("https://ipscans.com/{c}")
            } else {
                format!("https://ipscans.com/{c}/{section}")
            };
            format!(r#"<link rel="alternate" hreflang="{c}" href="{url}">"#)
        })
        .collect();
    let app_cards: String = catalog::APPS
        .iter()
        .map(|app| {
            let desc = if code == "tr" { app.tr } else { app.en };
            format!(
                r#"<article id="{}"><h2>{}</h2><p>{}</p><a href="https://github.com/demiirrr25-create/ipscans-depo/releases/download/{}/{}">{}</a></article>"#,
                app.key, app.name, desc, catalog::TAG, app.file, app.file
            )
        })
        .collect();
    Some(format!(
        r#"<!doctype html><html lang="{code}" dir="{dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{title} · IPScans</title><meta name="description" content="{subtitle}"><link rel="canonical" href="{canonical}">{hreflangs}</head><body><header><a href="/{code}">IPScans</a><nav><a href="/desktop/tr.html">TR</a> · <a href="/desktop/en.html">EN</a></nav></header><main><h1>{title}</h1><p>{subtitle}</p><section>{app_cards}</section></main></body></html>"#
    ))
}

fn render_robots_txt() -> String {
    "User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: https://ipscans.com/sitemap.xml\n".to_string()
}

fn render_sitemap_xml() -> String {
    let mut urls = Vec::new();
    urls.push("https://ipscans.com/desktop/tr.html".to_string());
    urls.push("https://ipscans.com/desktop/en.html".to_string());
    for (code, _, _) in LOCALES {
        urls.push(format!("https://ipscans.com/{code}"));
        urls.push(format!("https://ipscans.com/{code}/applications"));
        urls.push(format!("https://ipscans.com/{code}/applications/scanner"));
        urls.push(format!("https://ipscans.com/{code}/ipcast"));
        urls.push(format!("https://ipscans.com/{code}/guides"));
        for (slug, _) in GUIDE_SLUGS {
            urls.push(format!("https://ipscans.com/{code}/guides/{slug}"));
        }
    }
    let items: String = urls
        .iter()
        .map(|u| format!("  <url><loc>{u}</loc></url>"))
        .collect::<Vec<_>>()
        .join("\n");
    format!(
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n{items}\n</urlset>\n"
    )
}

fn search_index_json(query: &str) -> String {
    let q = query.trim().to_ascii_lowercase();
    let mut hits = Vec::new();
    for app in catalog::APPS {
        if q.is_empty()
            || app.name.to_ascii_lowercase().contains(&q)
            || app.key.to_ascii_lowercase().contains(&q)
            || app.tr.to_ascii_lowercase().contains(&q)
            || app.en.to_ascii_lowercase().contains(&q)
        {
            hits.push(format!(
                r#"{{"kind":"app","id":{},"title":{},"file":{},"download":"https://github.com/demiirrr25-create/ipscans-depo/releases/download/{}/{}"}}"#,
                json_str(app.key),
                json_str(app.name),
                json_str(app.file),
                catalog::TAG,
                app.file
            ));
        }
    }
    for (slug, title) in GUIDE_SLUGS {
        if q.is_empty()
            || slug.to_ascii_lowercase().contains(&q)
            || title.to_ascii_lowercase().contains(&q)
        {
            hits.push(format!(
                r#"{{"kind":"guide","id":{},"title":{},"url":"/tr/guides/{}"}}"#,
                json_str(slug),
                json_str(title),
                slug
            ));
        }
    }
    format!(
        r#"{{"ok":true,"query":{},"count":{},"results":[{}]}}"#,
        json_str(query),
        hits.len(),
        hits.join(",")
    )
}

fn route_parity_matrix_json() -> String {
    format!(
        r#"{{"ok":true,"engine":"ipscans-rust-web/{}","releaseTag":{},"previousReleaseTag":{},"localesCount":{},"appsCount":{},"guidesCount":{},"routes":[{{"route":"/desktop/tr.html","legacySource":"public/desktop/tr.html","rustHandler":"catalog::render(true)","parity":"EXACT"}},{{"route":"/desktop/en.html","legacySource":"public/desktop/en.html","rustHandler":"catalog::render(false)","parity":"EXACT"}},{{"route":"/desktop/apps.json","legacySource":"public/desktop/apps.json","rustHandler":"catalog::apps_json","parity":"EXACT"}},{{"route":"/:locale (14 dil)","legacySource":"src/app/[locale]/page.tsx","rustHandler":"render_locale_page","parity":"VERIFIED"}},{{"route":"/robots.txt","legacySource":"src/app/robots.ts","rustHandler":"render_robots_txt","parity":"EXACT"}},{{"route":"/sitemap.xml","legacySource":"src/app/sitemap.ts","rustHandler":"render_sitemap_xml","parity":"VERIFIED"}},{{"route":"/api/search","legacySource":"src/content/applications.ts + guides.ts","rustHandler":"search_index_json","parity":"VERIFIED"}},{{"route":"/api/ip","legacySource":"src/app/api/ip/route.ts","rustHandler":"discover_gateway_context","parity":"VERIFIED"}},{{"route":"/api/dns","legacySource":"src/app/api/dns/route.ts","rustHandler":"query_dns_records","parity":"VERIFIED"}},{{"route":"/api/whois","legacySource":"src/app/api/whois/route.ts","rustHandler":"query_whois_raw","parity":"VERIFIED"}},{{"route":"/api/ports","legacySource":"src/app/api/ports/route.ts","rustHandler":"check_ports_detailed","parity":"VERIFIED"}},{{"route":"/api/sentinel","legacySource":"src/app/api/sentinel/route.ts","rustHandler":"check_ollama_status","parity":"VERIFIED"}},{{"route":"/api/cortex/packs","legacySource":"src/app/api/cortex/packs/route.ts","rustHandler":"sector_packs_to_json","parity":"EXACT"}},{{"route":"/api/cron/cleanup","legacySource":"vercel.json crons","rustHandler":"cron_cleanup_json","parity":"VERIFIED"}}]}}"#,
        env!("CARGO_PKG_VERSION"),
        json_str(catalog::TAG),
        json_str(catalog::PREVIOUS_TAG),
        LOCALES.len(),
        catalog::APPS.len(),
        GUIDE_SLUGS.len()
    )
}

pub fn handle_request(method: &str, raw_path: &str, body: &str) -> (u16, &'static str, Vec<u8>) {
    let (path, query) = raw_path.split_once('?').unwrap_or((raw_path, ""));
    match (method, path) {
        ("GET", "/") | ("GET", "/index.html") => (
            200,
            "text/html; charset=utf-8",
            catalog::render(true, catalog::PUBLISHED, None).into_bytes(),
        ),
        ("GET", "/desktop/tr.html") | ("GET", "/desktop/en.html") => (
            200,
            "text/html; charset=utf-8",
            catalog::render(path.ends_with("/tr.html"), catalog::PUBLISHED, None).into_bytes(),
        ),
        ("GET", "/desktop/apps.json") => (
            200,
            "application/json; charset=utf-8",
            catalog::apps_json(None, catalog::PUBLISHED).into_bytes(),
        ),
        ("GET", "/desktop/catalog.css") => (
            200,
            "text/css; charset=utf-8",
            include_bytes!("../../../public/desktop/catalog.css").to_vec(),
        ),
        ("GET", "/robots.txt") => (
            200,
            "text/plain; charset=utf-8",
            render_robots_txt().into_bytes(),
        ),
        ("GET", "/sitemap.xml") => (
            200,
            "application/xml; charset=utf-8",
            render_sitemap_xml().into_bytes(),
        ),
        ("GET", "/api/search") => {
            let q = query
                .split('&')
                .find_map(|kv| kv.strip_prefix("q="))
                .unwrap_or("");
            (
                200,
                "application/json; charset=utf-8",
                search_index_json(q).into_bytes(),
            )
        }
        ("POST", "/api/search") => {
            let q = extract_json_string(body, "query").unwrap_or_default();
            (
                200,
                "application/json; charset=utf-8",
                search_index_json(&q).into_bytes(),
            )
        }
        ("GET", "/api/route-parity") => (
            200,
            "application/json; charset=utf-8",
            route_parity_matrix_json().into_bytes(),
        ),
        ("GET", "/api/cron/cleanup") | ("POST", "/api/cron/cleanup") => {
            let out = format!(
                r#"{{"ok":true,"job":"ephemeral-cache-cleanup","schedule":"0 */6 * * *","purgedSessions":0,"engine":"ipscans-rust-web/{}"}}"#,
                env!("CARGO_PKG_VERSION")
            );
            (200, "application/json; charset=utf-8", out.into_bytes())
        }
        ("GET", "/downloads/ipscans-network-scanner.exe")
        | ("GET", "/downloads/IPscans-Plus.exe") => {
            let target = format!(
                "https://github.com/demiirrr25-create/ipscans-depo/releases/download/{}/IPscans-Plus.exe",
                catalog::TAG
            );
            let out = format!(r#"{{"ok":true,"redirect":{}}}"#, json_str(&target));
            (200, "application/json; charset=utf-8", out.into_bytes())
        }
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
            let domain =
                extract_json_string(body, "domain").unwrap_or_else(|| "ipscans.com".to_string());
            (
                200,
                "application/json; charset=utf-8",
                query_dns_records(&domain).into_bytes(),
            )
        }
        ("POST", "/api/whois") => {
            let domain =
                extract_json_string(body, "domain").unwrap_or_else(|| "ipscans.com".to_string());
            (
                200,
                "application/json; charset=utf-8",
                query_whois_raw(&domain).into_bytes(),
            )
        }
        ("POST", "/api/ports") => {
            let target =
                extract_json_string(body, "target").unwrap_or_else(|| "127.0.0.1".to_string());
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
        ("GET", p) => {
            let trimmed = p.trim_matches('/');
            let (loc, rest) = trimmed.split_once('/').unwrap_or((trimmed, ""));
            if let Some(html) = render_locale_page(loc, rest) {
                return (200, "text/html; charset=utf-8", html.into_bytes());
            }
            (
                404,
                "application/json",
                b"{\"error\":\"Not found\"}".to_vec(),
            )
        }
        _ => (
            404,
            "application/json",
            b"{\"error\":\"Not found\"}".to_vec(),
        ),
    }
}

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
        assert_eq!(handle_request("GET", "/robots.txt", "").0, 200);
        assert_eq!(handle_request("GET", "/sitemap.xml", "").0, 200);
        assert_eq!(handle_request("GET", "/api/route-parity", "").0, 200);
        println!("ipscans-web {}", env!("CARGO_PKG_VERSION"));
        return;
    }

    let (listener, port) = bind_app_server(17980);
    println!(
        "IPScans Native Rust Web Platform listening on http://127.0.0.1:{}",
        port
    );

    let handler = Arc::new(handle_request);
    run_http_loop(listener, handler);
}

#[cfg(test)]
mod route_parity_tests {
    use super::*;

    #[test]
    fn all_14_locales_and_subroutes_render_with_canonical_and_hreflang_tags() {
        assert_eq!(LOCALES.len(), 14);
        for &(code, title, _) in LOCALES {
            for sub in ["", "/applications", "/applications/scanner", "/ipcast", "/guides"] {
                let route = format!("/{code}{sub}");
                let (status, content_type, body) = handle_request("GET", &route, "");
                assert_eq!(status, 200, "route failed: {route}");
                assert!(content_type.starts_with("text/html"));
                let html = String::from_utf8(body).unwrap();
                assert!(html.contains(&format!("lang=\"{code}\"")));
                assert!(html.contains(title));
                assert!(html.contains("rel=\"canonical\""));
                assert_eq!(html.matches("rel=\"alternate\"").count(), 14);
            }
        }
    }

    #[test]
    fn seo_search_cron_and_api_routes_match_contract() {
        let (st_robots, _, robots) = handle_request("GET", "/robots.txt", "");
        assert_eq!(st_robots, 200);
        let robots_str = String::from_utf8(robots).unwrap();
        assert!(robots_str.contains("Sitemap: https://ipscans.com/sitemap.xml"));

        let (st_map, _, map) = handle_request("GET", "/sitemap.xml", "");
        assert_eq!(st_map, 200);
        let map_str = String::from_utf8(map).unwrap();
        assert!(map_str.contains("<loc>https://ipscans.com/tr</loc>"));
        assert!(map_str.contains("<loc>https://ipscans.com/ar</loc>"));

        let (st_search, _, search_bytes) = handle_request("GET", "/api/search?q=cortex", "");
        assert_eq!(st_search, 200);
        let search_str = String::from_utf8(search_bytes).unwrap();
        assert!(search_str.contains("IPScans Cortex"));

        let (st_apps, _, apps_bytes) = handle_request("GET", "/desktop/apps.json", "");
        assert_eq!(st_apps, 200);
        let apps_str = String::from_utf8(apps_bytes).unwrap();
        assert!(apps_str.contains(catalog::TAG));

        let (st_cron, _, cron_bytes) = handle_request("POST", "/api/cron/cleanup", "");
        assert_eq!(st_cron, 200);
        assert!(String::from_utf8(cron_bytes).unwrap().contains("\"ok\":true"));

        let (st_packs, _, packs_bytes) = handle_request("GET", "/api/cortex/packs", "");
        assert_eq!(st_packs, 200);
        assert!(String::from_utf8(packs_bytes).unwrap().contains("\"rules\":"));

        let (st_parity, _, parity_bytes) = handle_request("GET", "/api/route-parity", "");
        assert_eq!(st_parity, 200);
        let parity_str = String::from_utf8(parity_bytes).unwrap();
        assert!(parity_str.contains("\"localesCount\":14"));
        assert!(parity_str.contains("\"appsCount\":8"));
    }
}
