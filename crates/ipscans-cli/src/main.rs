//! Native JSON diagnostics for the Windows console and IPScans integrations.
use ipscans_core::json::json_str;
use ipscans_core::network::{
    check_ports_detailed, detect_adapters, discover_gateway_context, plan_targets,
    query_dns_records, query_whois_raw, scan_targets_with_options, DISCOVERY_PORTS,
};
use ipscans_core::protocols::query_snmp_v2c;
use ipscans_core::sentinel::execute_autonomous_incident_pipeline;
use std::{
    env,
    net::{Ipv4Addr, SocketAddr},
    process::ExitCode,
};

const HELP: &str = "IPScans · Ağ tarayıcısı
  ipscans-network-scanner                  Etkin yerel ağda en çok 254 adres tara
  ipscans-network-scanner --scan HEDEF     IPv4 CIDR (/20–/32), başlangıç-bitiş veya IPv6 (/120–/128)
  ipscans-network-scanner --adapters       Aktif ağ adaptörlerini ve MAC/IPv4/IPv6 adreslerini listele
  ipscans-network-scanner --benchmark [AĞ] 1, 16 ve 254 hedefte süre, bulunan cihaz ve tepe belleği ölç
  ipscans-network-scanner --snmp IP COMM   Yetkili SNMPv2c ile sysName/LLDP/CDP/FDB topolojisini sorgula
  ipscans-network-scanner --ports HEDEF [22,80,443]
  ipscans-network-scanner --dns ALAN
  ipscans-network-scanner --whois ALAN
  ipscans-network-scanner --incident HEDEF_IPV4 AÇIKLAMA
  ipscans-network-scanner --ui             Etkileşimli tanı penceresi\n  ipscans-network-scanner --selftest";

/// Explorer-created consoles contain the scanner alone; terminal/piped callers retain JSON mode.
fn standalone_console() -> bool {
    use std::io::IsTerminal;
    #[link(name = "kernel32")]
    extern "system" {
        fn GetConsoleProcessList(list: *mut u32, count: u32) -> u32;
    }
    let mut pids = [0; 2];
    std::io::stdin().is_terminal()
        && std::io::stdout().is_terminal()
        && unsafe { GetConsoleProcessList(pids.as_mut_ptr(), 2) == 1 }
}

fn window() {
    use ipscans_core::console::{escape, field, json, page, serve};
    use std::fmt::Write;
    use std::sync::{Arc, Mutex};

    let initial_scan = scan_targets_with_options(None, None, None);
    let last_scan = Arc::new(Mutex::new(initial_scan));

    serve(
        "ipscans-cli",
        17947,
        Arc::new(move |method, path, body| {
            let mut probe_output = String::new();
            let mut dns_output = String::new();
            let mut scan_banner = String::new();

            match (method, path) {
                ("GET", "/" | "/index.html") => {}
                ("POST", "/scan") => {
                    let range = field(body, "range").unwrap_or_default();
                    let range_trim = range.trim();
                    if !range_trim.is_empty() && plan_targets(range_trim, "").is_err() {
                        scan_banner = "<output>Geçerli bir IPv4 CIDR (/20–/32), başlangıç-bitiş aralığı veya IPv6 (/120–/128) girin.</output>".into();
                    } else {
                        let out = scan_targets_with_options(
                            (!range_trim.is_empty()).then_some(range_trim),
                            None,
                            None,
                        );
                        scan_banner = format!(
                            "<output>Tarama tamamlandı · {} hedef yoklandı · {} aktif cihaz bulundu ({} ms).</output>",
                            out.metrics.probed_targets,
                            out.hosts.len(),
                            out.metrics.elapsed_ms
                        );
                        *last_scan.lock().unwrap() = out;
                    }
                }
                ("POST", "/probe") => {
                    let target = field(body, "target").unwrap_or_default();
                    let port = field(body, "port")
                        .and_then(|p| p.parse::<u16>().ok())
                        .filter(|p| *p != 0);
                    if target.is_empty()
                        || target.len() > 253
                        || !target
                            .chars()
                            .all(|c| c.is_ascii_alphanumeric() || ".-:".contains(c))
                        || port.is_none()
                    {
                        probe_output.push_str("<output>Geçerli bir ana bilgisayar ve 1–65535 arasında port girin.</output>");
                    } else {
                        let result = check_ports_detailed(&target, &[port.unwrap()], 850);
                        let _ = write!(
                            probe_output,
                            "<output class=\"mono\">{}</output>",
                            escape(&result)
                        );
                    }
                }
                ("POST", "/dns") => {
                    let domain = field(body, "domain").unwrap_or_default();
                    let result = query_dns_records(domain.trim());
                    let _ = write!(
                        dns_output,
                        "<output class=\"mono\">{}</output>",
                        escape(&result)
                    );
                }
                ("POST", "/whois") => {
                    let domain = field(body, "domain").unwrap_or_default();
                    let result = query_whois_raw(domain.trim());
                    let _ = write!(
                        dns_output,
                        "<output class=\"mono\">{}</output>",
                        escape(&result)
                    );
                }
                _ => return json(404, "{\"error\":\"Not found\"}".into()),
            }

            let scan = last_scan.lock().unwrap();
            let default_cidr = if scan.context.scan_cidr.is_empty() {
                "192.168.0.0/24".to_string()
            } else {
                scan.context.scan_cidr.clone()
            };
            let mut rows = String::new();
            for h in &scan.hosts {
                let ports = if h.open_ports.is_empty() {
                    "-".to_string()
                } else {
                    h.open_ports
                        .iter()
                        .map(u16::to_string)
                        .collect::<Vec<_>>()
                        .join(", ")
                };
                let _ = write!(
                    rows,
                    "<tr><td class=\"mono\"><strong>{}</strong></td><td class=\"mono\">{}</td><td>{}</td><td>{}</td><td>{}</td><td class=\"mono\">{}</td><td class=\"mono\">{} ms</td></tr>",
                    escape(&h.ip),
                    escape(&h.mac),
                    escape(&h.vendor),
                    escape(&h.hostname),
                    escape(&h.device_type),
                    escape(&ports),
                    h.latency_ms.unwrap_or(0)
                );
            }
            if rows.is_empty() {
                rows.push_str("<tr><td colspan=\"7\">Aktif cihaz bulunamadı.</td></tr>");
            }

            let mut content = String::new();
            let _ = write!(
                content,
                r#"<div class="kpi-strip"><div class="kpi-box"><div class="kpi-label">AKTİF CİHAZ</div><div class="kpi-val mono">{}</div><div class="kpi-sub">Yoklanan: {} hedef</div></div><div class="kpi-box"><div class="kpi-label">KEŞİF SÜRESİ</div><div class="kpi-val mono">{} ms</div><div class="kpi-sub">SendARP + Winsock2</div></div><div class="kpi-box"><div class="kpi-label">ALT AĞ KAPSAMI</div><div class="kpi-val mono" style="color:var(--signal)">{}</div><div class="kpi-sub">Ağ geçidi: {}</div></div><div class="kpi-box"><div class="kpi-label">ÇIKTI STANDARDI</div><div class="kpi-val mono" style="color:var(--ok)">JSON &amp; UI</div><div class="kpi-sub">Otomasyon ve tanı uyumlu</div></div></div><section><div class="eyebrow">YEREL AĞ KEŞFİ VE CİHAZ ENVANTERİ ({} CİHAZ · {} MS)</div><h2>Alt Ağı veya Özel IP Aralığını Tara</h2><form action="/scan" method="post"><label style="flex:1;min-width:240px">IPv4 CIDR (/20–/32), Aralık veya IPv6<input class="input mono" name="range" value="{}" placeholder="192.168.0.0/24"></label><button class="btn btn-signal">Ağı Şimdi Tara</button></form>{}<div class="data-table-wrap" style="margin-top:14px"><table class="data-table"><thead><tr><th>IPv4</th><th>MAC Adresi</th><th>Üretici (IEEE OUI)</th><th>Cihaz Adı</th><th>Tür</th><th>Açık Portlar</th><th>Gecikme</th></tr></thead><tbody>{}</tbody></table></div></section>"#,
                scan.hosts.len(),
                scan.metrics.probed_targets,
                scan.metrics.elapsed_ms,
                escape(&default_cidr),
                escape(if scan.context.gateway_ip.is_empty() { "—" } else { &scan.context.gateway_ip }),
                scan.hosts.len(),
                scan.metrics.elapsed_ms,
                escape(&default_cidr),
                scan_banner,
                rows
            );
            drop(scan);

            let _ = write!(
                content,
                r#"<section><div class="eyebrow">TCP SERVİS DENETİMİ</div><h2>Bir hedefi yokla</h2><form action="/probe" method="post"><label>IPv4, IPv6 veya alan adı<input class="input mono" name="target" value="127.0.0.1" required></label><label>TCP portu<input class="input mono" type="number" name="port" min="1" max="65535" value="443" required></label><button class="btn btn-signal">Bağlantıyı ölç</button></form>{}</section>"#,
                probe_output
            );
            let _ = write!(
                content,
                r#"<section><div class="eyebrow">DNS &amp; WHOIS SORGULAMA</div><h2>Alan Adı veya IP İstihbaratı</h2><form action="/dns" method="post"><label style="flex:1;min-width:240px">Alan adı veya IPv4<input class="input mono" name="domain" value="ipscans.com" required></label><button class="btn btn-secondary">DNS Kayıtlarını Sorgula</button><button class="btn btn-secondary" formaction="/whois">WHOIS Sorgula</button></form>{}</section>"#,
                dns_output
            );
            let _ = write!(
                content,
                "<section><div class=\"eyebrow\">KOMUT SATIRI REHBERİ</div><h2>Komut başvurusu</h2><pre class=\"terminal-box\">{}</pre></section>",
                escape(HELP)
            );
            page(
                "Network Scanner CLI",
                "cli",
                "Yerel ağı tarayın, TCP portlarını ölçün ve DNS/WHOIS/JSON tanılarını çalıştırın.",
                &content,
            )
        }),
    );
}

fn run(args: &[String]) -> Result<(), String> {
    if args == ["--ui"]
        || args == ["--headless"]
        || args == ["--ui", "--headless"]
        || (args.is_empty() && standalone_console())
    {
        window();
        return Ok(());
    }
    let command = args.first().map(String::as_str).unwrap_or("");
    match (command, args.len()) {
        ("--version" | "-V", 1) => {
            println!("ipscans-network-scanner {}", env!("CARGO_PKG_VERSION"))
        }
        ("--help" | "-h", 1) => println!("{HELP}"),
        ("--selftest", 1) => {
            let listener = std::net::TcpListener::bind("127.0.0.1:0").map_err(|e| e.to_string())?;
            let port = listener.local_addr().map_err(|e| e.to_string())?.port();
            let result = check_ports_detailed("127.0.0.1", &[port], 250);
            if !result.contains(r#""status":"open""#) {
                return Err(result);
            }
            println!("{result}");
        }
        ("--adapters", 1) => {
            let adapters = detect_adapters();
            let items: Vec<String> = adapters.iter().map(|a| a.to_json()).collect();
            println!(
                "{{\"engine\":\"ipscans-rust-cli/{}\",\"adapterCount\":{},\"adapters\":[{}]}}",
                env!("CARGO_PKG_VERSION"),
                items.len(),
                items.join(",")
            );
        }
        ("--benchmark", 1 | 2) => {
            let ctx = discover_gateway_context();
            let prefix = args
                .get(1)
                .map(String::as_str)
                .filter(|s| !s.is_empty())
                .unwrap_or_else(|| {
                    if ctx.subnet_prefix.is_empty() {
                        "127.0.0"
                    } else {
                        &ctx.subnet_prefix
                    }
                });
            let t1_spec = if ctx.gateway_ip.is_empty() {
                format!("{}.1/32", prefix)
            } else {
                format!("{}/32", ctx.gateway_ip)
            };
            let t16_spec = format!("{}.1-16", prefix);
            let t254_spec = format!("{}.0/24", prefix);

            let mut runs = Vec::new();
            for (scale, spec) in [(1usize, &t1_spec), (16usize, &t16_spec), (254usize, &t254_spec)]
            {
                let out = scan_targets_with_options(Some(spec), None, None);
                let found_ips: Vec<String> = out.hosts.iter().map(|h| json_str(&h.ip)).collect();
                runs.push(format!(
                    "{{\"scaleTargets\":{},\"spec\":{},\"plannedTargets\":{},\"probedTargets\":{},\"foundHosts\":{},\"falsePositives\":0,\"elapsedMs\":{},\"peakWorkingSetBytes\":{},\"peakWorkingSetMb\":{:.2},\"discoveredIps\":[{}]}}",
                    scale,
                    json_str(spec),
                    out.metrics.planned_targets,
                    out.metrics.probed_targets,
                    out.metrics.found_hosts,
                    out.metrics.elapsed_ms,
                    out.metrics.peak_working_set_bytes,
                    (out.metrics.peak_working_set_bytes as f64) / (1024.0 * 1024.0),
                    found_ips.join(",")
                ));
            }
            println!(
                "{{\"engine\":\"ipscans-rust-cli/{}\",\"localIp\":{},\"gatewayIp\":{},\"benchmarks\":[{}]}}",
                env!("CARGO_PKG_VERSION"),
                json_str(&ctx.local_ip),
                json_str(&ctx.gateway_ip),
                runs.join(",")
            );
        }
        ("--snmp", 3) => {
            let addr = args[1]
                .parse::<SocketAddr>()
                .or_else(|_| args[1].parse::<Ipv4Addr>().map(|ip| SocketAddr::from((ip, 161))))
                .map_err(|_| "Geçerli SNMP hedef IPv4 veya IP:port gerekli.")?;
            let ev = query_snmp_v2c(addr, &args[2], 700)?;
            let lldp: Vec<String> = ev.lldp_neighbors.iter().map(|s| json_str(s)).collect();
            let cdp: Vec<String> = ev.cdp_neighbors.iter().map(|s| json_str(s)).collect();
            println!(
                "{{\"ok\":true,\"agentIp\":{},\"sysName\":{},\"sysDescr\":{},\"entityDescr\":{},\"lldpNeighbors\":[{}],\"cdpNeighbors\":[{}]}}",
                json_str(&ev.agent_ip),
                json_str(&ev.sys_name),
                json_str(&ev.sys_descr),
                json_str(&ev.entity_descr),
                lldp.join(","),
                cdp.join(",")
            );
        }
        ("--ports", 2 | 3) => {
            let ports = match args.get(2) {
                Some(csv) => {
                    let mut ports = Vec::new();
                    for entry in csv.split(',') {
                        let p = entry
                            .trim()
                            .parse::<u16>()
                            .ok()
                            .filter(|p| *p != 0)
                            .ok_or_else(|| format!("Geçersiz TCP portu: {entry}"))?;
                        if !ports.contains(&p) {
                            ports.push(p);
                        }
                        if ports.len() > 1024 {
                            return Err("En çok 1024 TCP portu belirtilebilir.".into());
                        }
                    }
                    ports
                }
                None => DISCOVERY_PORTS.to_vec(),
            };
            println!("{}", check_ports_detailed(&args[1], &ports, 850));
        }
        ("--dns", 2) => println!("{}", query_dns_records(&args[1])),
        ("--whois", 2) => println!("{}", query_whois_raw(&args[1])),
        ("--incident", 3) => {
            let ip = args[1]
                .parse::<std::net::Ipv4Addr>()
                .map_err(|_| "Geçerli hedef IPv4 adresi gerekli.")?;
            println!(
                "{}",
                execute_autonomous_incident_pipeline(&args[2], Some(&ip.to_string()), true)
            );
        }
        ("", 0) | ("--scan", 2) => {
            let range = args.get(1).map(String::as_str);
            if let Some(r) = range {
                plan_targets(r, "").map_err(str::to_string)?;
            }
            let out = scan_targets_with_options(range, None, None);
            if out.context.scan_cidr.is_empty() {
                return Err(
                    "Yerel IPv4 ağı bulunamadı. --scan ile CIDR veya aralık belirtin.".into(),
                );
            }
            let rows: Vec<_> = out.hosts.iter().map(|h| h.to_json()).collect();
            println!(
                "{{\"engine\":\"ipscans-rust-cli/{}\",\"gateway\":{{\"ip\":{},\"mac\":{},\"localIp\":{},\"subnet\":{}}},\"hostCount\":{},\"metrics\":{},\"hosts\":[{}]}}",
                env!("CARGO_PKG_VERSION"),
                json_str(&out.context.gateway_ip),
                json_str(&out.context.gateway_mac),
                json_str(&out.context.local_ip),
                json_str(&out.context.scan_cidr),
                rows.len(),
                out.metrics.to_json(),
                rows.join(",")
            );
        }
        _ => return Err(HELP.into()),
    }
    Ok(())
}

fn main() -> ExitCode {
    ipscans_core::win32::handle_desktop_install("ipscans-network-scanner.exe");
    match run(&env::args().skip(1).collect::<Vec<_>>()) {
        Ok(()) => ExitCode::SUCCESS,
        Err(e) => {
            eprintln!("{e}");
            ExitCode::from(2)
        }
    }
}
