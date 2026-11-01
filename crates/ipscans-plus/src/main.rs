#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use ipscans_core::{
    console::{escape as html, field},
    design::{bind_app_server, run_http_loop},
    json::{extract_json_string, json_str},
    network::{
        check_ports_detailed, detect_adapters, inspect_ports, plan_targets, scan_bounds,
        scan_targets_with_options, AdapterInfo, CancelToken, DiscoveredHost, GatewayContext,
        PortResult, ScanMetrics, DISCOVERY_PORTS,
    },
    protocols::{
        build_topology, discover_onvif_cameras, query_snmp_v2c, validate_onvif_https_management,
        LinkConfidence, SnmpTopologyEvidence,
    },
    win32::{app_data_dir, launch_desktop_app_window},
};
use std::{
    collections::BTreeMap,
    fmt::Write,
    fs,
    net::{Ipv4Addr, SocketAddr},
    sync::{Arc, Mutex},
};

#[derive(Default)]
struct Inventory {
    context: Option<GatewayContext>,
    hosts: Vec<DiscoveredHost>,
    metrics: ScanMetrics,
    adapters: Vec<AdapterInfo>,
    selected_adapter: String,
    snmp_evidence: Vec<SnmpTopologyEvidence>,
    onvif_status: String,
    aliases: BTreeMap<String, String>,
    filter: String,
    dark: bool,
    elapsed_ms: u128,
}

impl Inventory {
    fn key(&self, h: &DiscoveredHost) -> String {
        let scope = self.context.as_ref().map(|c| {
            if c.gateway_mac.is_empty() {
                &c.scan_cidr
            } else {
                &c.gateway_mac
            }
        });
        format!(
            "{}|{}",
            scope.map(String::as_str).unwrap_or(""),
            if h.mac.is_empty() { &h.ip } else { &h.mac }
        )
    }
    fn label(&self, h: &DiscoveredHost) -> &str {
        self.aliases
            .get(&self.key(h))
            .map(String::as_str)
            .unwrap_or("")
    }
    fn visible(&self) -> Vec<&DiscoveredHost> {
        let q = self.filter.trim().to_lowercase();
        self.hosts
            .iter()
            .filter(|h| {
                if let Some(port) = q.strip_prefix("port:") {
                    return port
                        .trim()
                        .parse::<u16>()
                        .is_ok_and(|p| h.open_ports.contains(&p));
                }
                if let Some(ip) = q.strip_prefix("ip:") {
                    return h.ip.starts_with(ip.trim());
                }
                format!(
                    "{} {} {} {} {} {} {:?}",
                    h.ip,
                    h.hostname,
                    self.label(h),
                    h.mac,
                    h.vendor,
                    h.device_type,
                    h.open_ports
                )
                .to_lowercase()
                .contains(&q)
            })
            .collect()
    }
    fn json(&self, all: bool) -> String {
        let ctx = self.context.as_ref();
        let rows: Vec<_> = if all {
            self.hosts.iter().collect()
        } else {
            self.visible()
        };
        let items: Vec<_> = rows
            .iter()
            .map(|h| {
                let mut row = h.to_json();
                row.pop();
                format!("{row},\"label\":{}}}", json_str(self.label(h)))
            })
            .collect();
        let host_ips: Vec<String> = self.hosts.iter().map(|h| h.ip.clone()).collect();
        let topo = build_topology(
            ctx.map_or("", |c| &c.gateway_ip),
            &host_ips,
            &self.snmp_evidence,
        );
        format!(
            "{{\"ok\":true,\"gateway\":{{\"ip\":{},\"mac\":{},\"subnet\":{}}},\"hostCount\":{},\"elapsedMs\":{},\"metrics\":{},\"topology\":{{\"confirmedLinks\":{},\"inferredLinks\":{}}},\"hosts\":[{}]}}",
            json_str(ctx.map_or("", |c| &c.gateway_ip)),
            json_str(ctx.map_or("", |c| &c.gateway_mac)),
            json_str(ctx.map_or("", |c| &c.scan_cidr)),
            rows.len(),
            self.elapsed_ms,
            self.metrics.to_json(),
            topo.confirmed_count,
            topo.inferred_count,
            items.join(",")
        )
    }
    fn csv(&self) -> String {
        let mut out = String::from("\u{feff}IP,Ad,Hostname,MAC,Üretici,Sınıf,Portlar,RTT ms\r\n");
        for h in self.visible() {
            let ports = h
                .open_ports
                .iter()
                .map(u16::to_string)
                .collect::<Vec<_>>()
                .join(" ");
            let rtt = h.latency_ms.map(|v| v.to_string()).unwrap_or_default();
            let values = [
                &h.ip[..],
                self.label(h),
                &h.hostname,
                &h.mac,
                &h.vendor,
                &h.device_type,
                &ports,
                &rtt,
            ];
            let values: Vec<_> = values
                .iter()
                .map(|v| {
                    let prefix = if v.starts_with(['=', '+', '-', '@', '\t', '\r']) {
                        "'"
                    } else {
                        ""
                    };
                    format!("\"{prefix}{}\"", v.replace('"', "\"\""))
                })
                .collect();
            let _ = write!(out, "{}\r\n", values.join(","));
        }
        out
    }
    fn map_svg(&self, part: usize) -> String {
        let gateway = self.context.as_ref().map_or("", |c| c.gateway_ip.as_str());
        let host_ips: Vec<String> = self.hosts.iter().map(|h| h.ip.clone()).collect();
        let topo = build_topology(gateway, &host_ips, &self.snmp_evidence);
        let peers: Vec<_> = self
            .visible()
            .into_iter()
            .filter(|h| !h.is_gateway)
            .collect();
        let chunk = peers.chunks(20).nth(part).unwrap_or(&[]);
        let center = if gateway.is_empty() {
            "Ağ geçidi bilinmiyor"
        } else {
            gateway
        };
        let mut svg = String::from(
            r##"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 430" role="img" aria-label="Mantıksal IPv4 ve L2 topoloji görünümü" style="width:100%;max-height:430px"><rect width="900" height="430" rx="14" fill="#0d1524"/>"##,
        );
        for (i, h) in chunk.iter().enumerate() {
            let a = (i as f64 * std::f64::consts::TAU / chunk.len().max(1) as f64)
                - std::f64::consts::FRAC_PI_2;
            let (x, y) = (450. + 362. * a.cos(), 215. + 172. * a.sin());
            let is_confirmed = topo.links.iter().any(|l| {
                l.confidence == LinkConfidence::ConfirmedL2 && (l.to == h.ip || l.from == h.ip)
            });
            if is_confirmed {
                let _ = write!(
                    svg,
                    r##"<path d="M450 215 L{x:.0} {y:.0}" stroke="#12b76a" stroke-width="2"/>"##
                );
            } else if !gateway.is_empty() {
                let _ = write!(
                    svg,
                    r##"<path d="M450 215 L{x:.0} {y:.0}" stroke="#516d99" stroke-dasharray="4 5"/>"##
                );
            }
            let label = html(&h.ip);
            let _ = write!(
                svg,
                r##"<g transform="translate({x:.0} {y:.0})"><title>{label} · {}</title><rect x="-57" y="-13" width="114" height="26" rx="8" fill="#15243a" stroke="#88a2c9"/><text fill="#eff6ff" text-anchor="middle" y="5" font-family="monospace" font-size="12">{label}</text></g>"##,
                html(&h.device_type)
            );
        }
        let _ = write!(
            svg,
            r##"<rect x="372" y="191" width="156" height="48" rx="12" fill="#244d89"/><text x="450" y="209" fill="white" text-anchor="middle" font-family="sans-serif" font-size="11">YEREL AĞ GEÇİDİ</text><text x="450" y="227" fill="white" text-anchor="middle" font-family="monospace" font-size="12">{}</text></svg>"##,
            html(center)
        );
        svg
    }
    fn page(&self, message: &str, ports: Option<(&str, &[PortResult])>, report: bool) -> String {
        let theme = if self.dark { "dark" } else { "light" };
        let mut out = format!(
            r#"<!doctype html><html lang="tr" data-theme="{theme}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>IPScans+ · Ağ envanteri</title><link rel="icon" href="/brand/scanner.png"><link rel="stylesheet" href="/design/v2.css"><style>
        .topbar{{position:static;min-height:68px;gap:12px;flex-wrap:wrap}}.flow,.bar{{display:flex;gap:10px;align-items:center;flex-wrap:wrap}}.workspace{{display:grid;gap:16px}}.scope{{background:var(--surface-dim);padding:22px;border-left:4px solid var(--signal);border-radius:14px}}.scope h1{{font-size:clamp(25px,4vw,46px);letter-spacing:-.055em}}.bar .input,.bar .select{{width:auto;max-width:100%}}a{{color:var(--signal)}}small{{color:var(--ink-2)}}.map{{display:flex;flex-wrap:wrap;gap:8px}}.map span{{padding:6px 12px;border:1px dashed var(--line-3);border-radius:8px}}td details{{min-width:100px}}@media print{{.no-print,details,form,header button{{display:none!important}}.workspace,.bento-card,.data-table-wrap{{overflow:visible;padding:0;box-shadow:none;border:none}}table{{font-size:10px}}thead{{display:table-header-group}}tr{{break-inside:avoid}}}}</style></head><body>
        <header class="topbar"><div class="brand-cluster"><img class="brand-logo" alt="" src="/brand/scanner.png"><div><strong>IPScans+</strong><div class="brand-sub">Ağ keşfi, çoklu adaptör ve L2 topoloji · v{}</div></div></div><form class="no-print" method="post" action="/theme"><button class="btn btn-secondary">Temayı değiştir</button></form></header><main class="workspace">"#,
            env!("CARGO_PKG_VERSION")
        );
        let range = self
            .context
            .as_ref()
            .map(|c| c.scan_cidr.as_str())
            .filter(|s| !s.is_empty())
            .unwrap_or("Hazır");
        let rows = self.visible();
        let peak_mb = (self.metrics.peak_working_set_bytes as f64) / (1024.0 * 1024.0);
        let _ = write!(
            out,
            r#"<section class="scope"><div class="eyebrow">AĞ ENVANTERİ · DOĞRULANMIŞ KEŞİF</div><h1>{}</h1><p>{} bulunan cihaz ({} yoklanan / {} planlanan hedef) · {} görünür · {:.2} sn · Tepe bellek {:.1} MB</p></section>"#,
            html(range),
            self.hosts.len(),
            self.metrics.probed_targets,
            self.metrics.planned_targets,
            rows.len(),
            self.elapsed_ms as f64 / 1000.0,
            peak_mb
        );
        if !message.is_empty() {
            let _ = write!(
                out,
                "<p role=\"status\" class=\"badge badge-warn\">{}</p>",
                html(message)
            );
        }
        if !report {
            let mut adapter_opts = String::from("<option value=\"\">Otomatik (Varsayılan Rota)</option>");
            for a in &self.adapters {
                let sel = if a.ipv4 == self.selected_adapter && !a.ipv4.is_empty() {
                    " selected"
                } else {
                    ""
                };
                let _ = write!(
                    adapter_opts,
                    "<option value=\"{}\"{sel}>{} · {} ({})</option>",
                    html(&a.ipv4),
                    html(&a.name),
                    html(&a.ipv4),
                    html(if a.mac.is_empty() { "MAC yok" } else { &a.mac })
                );
            }
            let _ = write!(
                out,
                r#"<section class="bento-card"><form class="bar" action="/scan" method="post"><label for="adapter">Adaptör</label><select class="select mono" id="adapter" name="adapter">{adapter_opts}</select><label for="range">Hedef aralığı (IPv4 CIDR, başlangıç-bitiş, !dışla veya IPv6 /120–/128)</label><input class="input mono" id="range" name="range" placeholder="Otomatik, 192.168.0.1-16, 192.168.0.0/24 veya ::1/128"><button class="btn btn-signal">Ağı tara</button></form><form class="bar" style="margin-top:8px" action="/cancel" method="post"><button class="btn btn-secondary">Aktif taramayı iptal et</button></form><p class="card-desc">Bilinmeyen cihaz adı, üretici veya topoloji bağı tahminle doldurulmaz. ICMP engelli ama TCP portu açık veya ARP yanıtı veren hedefler SendARP + paralel Winsock2 ile doğrulanır.</p></section>"#
            );
            let _ = write!(
                out,
                r#"<section class="bar"><form class="bar" method="post" action="/filter"><label for="q">Filtre</label><input class="input" id="q" name="q" placeholder="ip:192.168 · port:443 · üretici" value="{}"><button class="btn btn-secondary">Uygula</button></form><a download="envanter.json" href="/export/json">JSON</a><a download="envanter.csv" href="/export/csv">CSV</a><a download="envanter.html" href="/export/html">HTML</a><a href="/report">Yazdır / PDF</a></section>"#,
                html(&self.filter)
            );
        }
        out.push_str(r#"<section class="bento-card"><div class="card-header"><h2 class="card-title">Cihaz envanteri</h2></div><div class="data-table-wrap"><table class="data-table"><thead><tr><th>Cihaz / IP</th><th>Ad</th><th>MAC / üretici</th><th>Sınıflandırma</th><th>Açık TCP</th><th>RTT</th></tr></thead><tbody>"#);
        for h in &rows {
            let label = self.label(h);
            let name = if label.is_empty() { &h.hostname } else { label };
            let mac = if h.mac.is_empty() { "—" } else { &h.mac };
            let port_text = h
                .open_ports
                .iter()
                .map(u16::to_string)
                .collect::<Vec<_>>()
                .join(", ");
            let _ = write!(
                out,
                r#"<tr><td><a class="mono" href="{}://{}" target="_blank" rel="noopener">{}</a></td><td>{}"#,
                if h.open_ports.contains(&443) {
                    "https"
                } else {
                    "http"
                },
                h.ip,
                h.ip,
                if name.is_empty() {
                    "—".into()
                } else {
                    html(name)
                }
            );
            if !report {
                let _ = write!(
                    out,
                    r#"<details class="no-print"><summary>Adlandır</summary><form method="post" action="/rename"><input type="hidden" name="ip" value="{}"><input aria-label="Cihaz adı" name="label" maxlength="80" value="{}"><button>Kaydet</button></form></details>"#,
                    h.ip,
                    html(label)
                );
            }
            let _ = write!(
                out,
                "</td><td>{}<br><small>{}</small></td><td>{}</td><td>{}</td><td>{}</td></tr>",
                html(mac),
                html(&h.vendor),
                html(&h.device_type),
                if port_text.is_empty() {
                    "—"
                } else {
                    &port_text
                },
                h.latency_ms
                    .map(|v| format!("{v} ms"))
                    .unwrap_or_else(|| "—".into())
            );
        }
        if rows.is_empty() {
            out.push_str("<tr><td colspan=\"6\">Görüntülenecek cihaz yok. Bir tarama başlatın veya filtreyi değiştirin.</td></tr>");
        }
        out.push_str("</tbody></table></div></section>");
        if !report {
            let gateway = self
                .context
                .as_ref()
                .map(|c| c.gateway_ip.as_str())
                .filter(|s| !s.is_empty())
                .unwrap_or("Algılanmadı");
            let host_ips: Vec<String> = self.hosts.iter().map(|h| h.ip.clone()).collect();
            let topo = build_topology(
                self.context.as_ref().map_or("", |c| c.gateway_ip.as_str()),
                &host_ips,
                &self.snmp_evidence,
            );
            let _ = write!(
                out,
                r#"<section class="bento-card"><div class="eyebrow">TOPOLOJİ · DOĞRULANMIŞ L2 ({}) &amp; ÇIKARSANAN ROTA ({})</div><h2 class="card-title">Ağ geçidi · {}</h2><p class="card-desc">SNMP/LLDP/CDP ile doğrulanan komşuluklar düz yeşil çizgiyle, varsayılan ağ geçidi rotası kesikli çizgiyle gösterilir. Ağ geçidi yoksa sahte bağ üretilmez.</p><div class="map">"#,
                topo.confirmed_count,
                topo.inferred_count,
                html(gateway)
            );
            if !self.hosts.is_empty() {
                out.push_str(&self.map_svg(0));
                for i in 0..rows
                    .iter()
                    .filter(|h| !h.is_gateway)
                    .count()
                    .div_ceil(20)
                    .max(1)
                {
                    let _ = write!(
                        out,
                        "<a target=\"_blank\" href=\"/map/{i}\">SVG / Bölüm {}</a> ",
                        i + 1
                    );
                }
            }
            out.push_str(r#"</div><form class="bar" style="margin-top:12px" action="/snmp" method="post"><label for="snmp_target">SNMPv2c Anahtar/Cihaz IP</label><input class="input mono" name="target" id="snmp_target" placeholder="192.168.0.1:161" required><label for="community">Community</label><input class="input mono" name="community" id="community" value="public" required><button class="btn btn-secondary">LLDP / CDP / MIB Yokla</button></form></section>"#);

            let _ = write!(
                out,
                r#"<section class="bento-card"><div class="eyebrow">ONVIF KAMERA KEŞFİ VE HTTPS YÖNETİM DOĞRULAMASI</div><h2 class="card-title">WS-Discovery (UDP 3702) &amp; Kimlik Doğrulamalı HTTPS</h2><form class="bar" action="/onvif" method="post"><label for="xaddrs">ONVIF XAddrs (Boş bırakılırsa WS-Discovery yayınlanır)</label><input class="input mono" name="xaddrs" id="xaddrs" placeholder="https://192.168.0.50:443/onvif/device_service"><label for="user">Kullanıcı</label><input class="input mono" name="username" id="user" placeholder="admin"><label for="pass">Parola</label><input class="input mono" type="password" name="password" id="pass" placeholder="••••••••"><button class="btn btn-secondary">ONVIF Doğrula</button></form>{}</section>"#,
                if self.onvif_status.is_empty() {
                    String::new()
                } else {
                    format!("<p class=\"mono\" style=\"margin-top:8px\">{}</p>", html(&self.onvif_status))
                }
            );

            out.push_str(r#"<section class="bento-card"><h2 class="card-title">TCP servis denetimi</h2><form class="bar" action="/ports" method="post"><label for="target">Ana bilgisayar</label><input class="input mono" name="target" id="target" required placeholder="127.0.0.1"><button class="btn btn-signal">Portları yokla</button></form>"#);
            if let Some((target, ports)) = ports {
                let _ = write!(out, "<h3>{}</h3><table class=\"data-table\"><thead><tr><th>Port</th><th>Servis</th><th>Durum</th><th>RTT</th></tr></thead><tbody>", html(target));
                for p in ports {
                    let _ = write!(
                        out,
                        "<tr><td>{}</td><td>{}</td><td>{}</td><td>{}</td></tr>",
                        p.port,
                        p.service,
                        p.status,
                        p.latency_ms
                            .map(|n| format!("{n} ms"))
                            .unwrap_or_else(|| "—".into())
                    );
                }
                out.push_str("</tbody></table>");
            }
            out.push_str("</section>");
        } else {
            out.push_str("<p class=\"no-print\">PDF kaydetmek için Ctrl+P ile yazdırma iletişim kutusunu açın.</p>");
        }
        out.push_str("</main></body></html>");
        out
    }
}

fn main() {
    ipscans_core::win32::handle_desktop_install("IPscans-Plus.exe");
    let args: Vec<_> = std::env::args().collect();
    if args.iter().any(|a| a == "--version" || a == "-V") {
        println!("IPScans+ {}", env!("CARGO_PKG_VERSION"));
        return;
    }
    if args.iter().any(|a| a == "--selftest") {
        assert_eq!(scan_bounds("127.0.0.1/32").map(|(a, b)| b - a), Some(0));
        assert!(plan_targets("192.168.0.1-16", "").is_ok());
        assert!(Inventory::default()
            .page("", None, false)
            .contains("Cihaz envanteri"));
        return;
    }
    let file = app_data_dir("scanner").join("labels.tsv");
    let startup_scan = scan_targets_with_options(None, None, None);
    let mut initial = Inventory {
        context: Some(startup_scan.context),
        hosts: startup_scan.hosts,
        metrics: startup_scan.metrics.clone(),
        elapsed_ms: startup_scan.metrics.elapsed_ms,
        adapters: detect_adapters(),
        dark: true,
        ..Default::default()
    };
    if let Ok(saved) = fs::read_to_string(&file) {
        initial.aliases = saved
            .lines()
            .filter_map(|l| l.split_once('\t'))
            .map(|(k, v)| (k.to_string(), v.to_string()))
            .collect();
    }
    let state = Mutex::new(initial);
    let scanning = Mutex::new(());
    let active_cancel: Mutex<CancelToken> = Mutex::new(CancelToken::new());
    let (listener, port) = bind_app_server(17941);
    if !args.iter().any(|a| a == "--headless") {
        let _ = launch_desktop_app_window(
            "ipscans-plus",
            &format!("http://127.0.0.1:{port}"),
            1400,
            900,
        );
    }
    run_http_loop(
        listener,
        Arc::new(move |method, path, body| {
            const PAGE: &str = "text/html; charset=utf-8";
            const JSON: &str = "application/json; charset=utf-8";
            if method == "POST" && (path == "/cancel" || path == "/api/scan/cancel") {
                active_cancel.lock().unwrap().cancel();
                return if path == "/api/scan/cancel" {
                    (200, JSON, br#"{"ok":true,"cancelled":true}"#.to_vec())
                } else {
                    (
                        200,
                        PAGE,
                        state
                            .lock()
                            .unwrap()
                            .page("Aktif tarama iptal sinyali gönderildi.", None, false)
                            .into_bytes(),
                    )
                };
            }
            if method == "POST" && (path == "/scan" || path == "/api/scan") {
                let Ok(_guard) = scanning.try_lock() else {
                    return (400, JSON, br#"{"error":"Tarama devam ediyor"}"#.to_vec());
                };
                let range = field(body, "range")
                    .or_else(|| extract_json_string(body, "range"))
                    .unwrap_or_default();
                let adapter = field(body, "adapter")
                    .or_else(|| extract_json_string(body, "adapter"))
                    .unwrap_or_default();
                let range = range.trim();
                let adapter = adapter.trim();

                if !range.is_empty() && plan_targets(range, "").is_err() {
                    return if path == "/api/scan" {
                        (
                            400,
                            JSON,
                            br#"{"error":"Invalid target range specification"}"#.to_vec(),
                        )
                    } else {
                        (
                            400,
                            PAGE,
                            state
                                .lock()
                                .unwrap()
                                .page(
                                    "Geçerli bir IPv4 aralığı (/20–/32, başlangıç-bitiş) veya IPv6 (/120–/128) girin.",
                                    None,
                                    false,
                                )
                                .into_bytes(),
                        )
                    };
                }

                let token = CancelToken::new();
                *active_cancel.lock().unwrap() = token.clone();
                let outcome = scan_targets_with_options(
                    (!range.is_empty()).then_some(range),
                    (!adapter.is_empty()).then_some(adapter),
                    Some(&token),
                );
                let mut inv = state.lock().unwrap();
                inv.adapters = detect_adapters();
                inv.selected_adapter = adapter.to_string();
                let msg = if outcome.metrics.cancelled {
                    "Tarama kullanıcı tarafından iptal edildi."
                } else if outcome.context.scan_cidr.is_empty() {
                    "IPv4 arabirimi bulunamadı. Bir aralık belirtin."
                } else {
                    "Tarama tamamlandı."
                };
                inv.elapsed_ms = outcome.metrics.elapsed_ms;
                inv.context = Some(outcome.context);
                inv.hosts = outcome.hosts;
                inv.metrics = outcome.metrics;
                return if path == "/api/scan" {
                    (200, JSON, inv.json(true).into_bytes())
                } else {
                    (200, PAGE, inv.page(msg, None, false).into_bytes())
                };
            }
            if method == "POST" && (path == "/snmp" || path == "/api/snmp") {
                let target_raw = field(body, "target")
                    .or_else(|| extract_json_string(body, "target"))
                    .unwrap_or_default();
                let community = field(body, "community")
                    .or_else(|| extract_json_string(body, "community"))
                    .unwrap_or_else(|| "public".into());
                let addr = target_raw
                    .trim()
                    .parse::<SocketAddr>()
                    .or_else(|_| {
                        target_raw
                            .trim()
                            .parse::<Ipv4Addr>()
                            .map(|ip| SocketAddr::from((ip, 161)))
                    });
                let mut inv = state.lock().unwrap();
                match addr {
                    Ok(sock) => match query_snmp_v2c(sock, &community, 600) {
                        Ok(ev) => {
                            let msg = format!(
                                "SNMPv2c {} · sysName={} · LLDP={} · CDP={}",
                                ev.agent_ip,
                                ev.sys_name,
                                ev.lldp_neighbors.len(),
                                ev.cdp_neighbors.len()
                            );
                            inv.snmp_evidence.retain(|e| e.agent_ip != ev.agent_ip);
                            inv.snmp_evidence.push(ev);
                            return if path == "/api/snmp" {
                                (200, JSON, inv.json(true).into_bytes())
                            } else {
                                (200, PAGE, inv.page(&msg, None, false).into_bytes())
                            };
                        }
                        Err(e) => {
                            return if path == "/api/snmp" {
                                (
                                    400,
                                    JSON,
                                    format!("{{\"ok\":false,\"error\":{}}}", json_str(&e))
                                        .into_bytes(),
                                )
                            } else {
                                (200, PAGE, inv.page(&e, None, false).into_bytes())
                            };
                        }
                    },
                    Err(_) => {
                        return (
                            400,
                            PAGE,
                            inv.page("Geçerli SNMP hedef IP veya IP:port girin.", None, false)
                                .into_bytes(),
                        );
                    }
                }
            }
            if method == "POST" && (path == "/onvif" || path == "/api/onvif") {
                let xaddrs = field(body, "xaddrs")
                    .or_else(|| extract_json_string(body, "xaddrs"))
                    .unwrap_or_default();
                let username = field(body, "username")
                    .or_else(|| extract_json_string(body, "username"))
                    .unwrap_or_default();
                let password = field(body, "password")
                    .or_else(|| extract_json_string(body, "password"))
                    .unwrap_or_default();
                let mut inv = state.lock().unwrap();
                if xaddrs.trim().is_empty() {
                    let found = discover_onvif_cameras(500);
                    inv.onvif_status = format!(
                        "WS-Discovery tamamlandı: {} ONVIF kamera yanıtı alındı.",
                        found.len()
                    );
                } else {
                    match validate_onvif_https_management(&xaddrs, &username, &password) {
                        Ok(ok_msg) => inv.onvif_status = ok_msg,
                        Err(err_msg) => inv.onvif_status = err_msg.to_string(),
                    }
                }
                return if path == "/api/onvif" {
                    (
                        200,
                        JSON,
                        format!("{{\"ok\":true,\"status\":{}}}", json_str(&inv.onvif_status))
                            .into_bytes(),
                    )
                } else {
                    let status = inv.onvif_status.clone();
                    (200, PAGE, inv.page(&status, None, false).into_bytes())
                };
            }
            if method == "POST" && (path == "/ports" || path == "/api/ports") {
                let target = field(body, "target")
                    .or_else(|| extract_json_string(body, "target"))
                    .unwrap_or_default();
                if target.is_empty()
                    || target.len() > 253
                    || target
                        .chars()
                        .any(|c| !(c.is_ascii_alphanumeric() || ".-:".contains(c)))
                {
                    return (400, JSON, br#"{"error":"Invalid host"}"#.to_vec());
                }
                if path == "/api/ports" {
                    return (
                        200,
                        JSON,
                        check_ports_detailed(&target, DISCOVERY_PORTS, 250).into_bytes(),
                    );
                }
                let ports = inspect_ports(&target, DISCOVERY_PORTS, 250);
                return (
                    200,
                    PAGE,
                    state
                        .lock()
                        .unwrap()
                        .page("", Some((&target, &ports)), false)
                        .into_bytes(),
                );
            }
            let mut inv = state.lock().unwrap();
            let mut message = "";
            match (method, path) {
                ("GET", p) if p.starts_with("/map/") => {
                    let Some(part) = p
                        .strip_prefix("/map/")
                        .and_then(|n| n.parse::<usize>().ok())
                        .filter(|n| *n < 205)
                    else {
                        return (404, "text/plain", Vec::new());
                    };
                    return (200, "image/svg+xml", inv.map_svg(part).into_bytes());
                }
                ("GET", "/" | "/index.html") => {}
                ("GET", "/api/adapters") => {
                    let list: Vec<String> = inv.adapters.iter().map(|a| a.to_json()).collect();
                    return (
                        200,
                        JSON,
                        format!("{{\"ok\":true,\"adapters\":[{}]}}", list.join(",")).into_bytes(),
                    );
                }
                ("POST", "/theme") => inv.dark = !inv.dark,
                ("POST", "/filter") => {
                    inv.filter = field(body, "q")
                        .unwrap_or_default()
                        .chars()
                        .take(256)
                        .collect()
                }
                ("POST", "/rename") => {
                    let ip = field(body, "ip").unwrap_or_default();
                    let name = field(body, "label").unwrap_or_default();
                    if name.chars().any(char::is_control)
                        || name.chars().count() > 80
                        || ip.parse::<Ipv4Addr>().is_err()
                    {
                        return (
                            400,
                            PAGE,
                            inv.page("Geçersiz cihaz etiketi.", None, false)
                                .into_bytes(),
                        );
                    }
                    let Some(h) = inv.hosts.iter().find(|h| h.ip == ip) else {
                        return (
                            400,
                            PAGE,
                            inv.page("Cihaz envanterde bulunamadı.", None, false)
                                .into_bytes(),
                        );
                    };
                    let key = inv.key(h);
                    let mut aliases = inv.aliases.clone();
                    if name.trim().is_empty() {
                        aliases.remove(&key);
                    } else {
                        aliases.insert(key, name.trim().to_string());
                    }
                    let content = aliases
                        .iter()
                        .map(|(k, v)| format!("{k}\t{v}\n"))
                        .collect::<String>();
                    let tmp = file.with_extension("tmp");
                    if fs::write(&tmp, content)
                        .and_then(|_| fs::rename(&tmp, &file))
                        .is_err()
                    {
                        return (
                            500,
                            PAGE,
                            inv.page("Etiket dosyası kaydedilemedi.", None, false)
                                .into_bytes(),
                        );
                    }
                    inv.aliases = aliases;
                    message = "Cihaz etiketi kaydedildi.";
                }
                ("GET", "/api/scan") => return (200, JSON, inv.json(true).into_bytes()),
                ("GET", "/export/json") => return (200, JSON, inv.json(false).into_bytes()),
                ("GET", "/export/csv") => {
                    return (200, "text/csv; charset=utf-8", inv.csv().into_bytes())
                }
                ("GET", "/report" | "/export/html") => {
                    return (200, PAGE, inv.page("", None, true).into_bytes())
                }
                _ => return (404, JSON, br#"{"error":"Not found"}"#.to_vec()),
            }
            (200, PAGE, inv.page(message, None, false).into_bytes())
        }),
    );
}
