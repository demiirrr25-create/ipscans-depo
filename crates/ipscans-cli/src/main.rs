//! Native JSON diagnostics for the Windows console and IPScans integrations.
use ipscans_core::json::json_str;
use ipscans_core::network::{
    check_ports_detailed, query_dns_records, query_whois_raw, scan_bounds, scan_local_subnet,
    DISCOVERY_PORTS,
};
use ipscans_core::sentinel::execute_autonomous_incident_pipeline;
use std::{env, process::ExitCode};

const HELP: &str = "IPScans · Ağ tarayıcısı
  ipscans-network-scanner                  Etkin yerel ağda en çok 254 adres tara
  ipscans-network-scanner --scan CIDR      Özel IPv4 aralığı (/20–/32)
  ipscans-network-scanner --ports HEDEF [22,80,443]
  ipscans-network-scanner --dns ALAN
  ipscans-network-scanner --whois ALAN
  ipscans-network-scanner --incident HEDEF_IPV4 AÇIKLAMA
  ipscans-network-scanner --ui            Etkileşimli tanı penceresi\n  ipscans-network-scanner --selftest";

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
    serve(
        "ipscans-cli",
        17947,
        std::sync::Arc::new(|method, path, body| {
            let mut content = String::from(
                r#"<section><div class="eyebrow">TCP / SERVİS DENETİMİ</div><h2>Bir hedefi yokla</h2><form action="/probe" method="post"><label>IPv4, IPv6 veya alan adı<input class="input mono" name="target" value="127.0.0.1" required></label><label>TCP portu<input class="input mono" type="number" name="port" min="1" max="65535" value="443" required></label><button class="btn btn-signal">Bağlantıyı ölç</button></form>"#,
            );
            match (method, path) {
                ("GET", "/" | "/index.html") => {}
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
                        content.push_str("<output>Geçerli bir ana bilgisayar ve 1–65535 arasında port girin.</output>");
                    } else {
                        let result = check_ports_detailed(&target, &[port.unwrap()], 850);
                        let _ = write!(
                            content,
                            "<output class=\"mono\">{}</output>",
                            escape(&result)
                        );
                    }
                }
                _ => return json(404, "{\"error\":\"Not found\"}".into()),
            }
            let _=write!(content,"</section><section><div class=\"eyebrow\">TERMİNAL</div><h2>Komut başvurusu</h2><pre class=\"terminal-box\">{}</pre></section>",escape(HELP));
            page(
                "Network Scanner CLI",
                "cli",
                "TCP portlarını ölçün ve komut satırında JSON tanılarını çalıştırın.",
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
            if range.is_some_and(|r| scan_bounds(r).is_none()) {
                return Err("Geçerli IPv4 CIDR aralığı bekleniyor (/20–/32).".into());
            }
            let (ctx, hosts) = scan_local_subnet(range);
            if ctx.scan_cidr.is_empty() {
                return Err("Yerel IPv4 ağı bulunamadı. --scan ile CIDR belirtin.".into());
            }
            let rows: Vec<_> = hosts.iter().map(|h| h.to_json()).collect();
            println!("{{\"engine\":\"ipscans-rust-cli/{}\",\"gateway\":{{\"ip\":{},\"mac\":{},\"localIp\":{},\"subnet\":{}}},\"hostCount\":{},\"hosts\":[{}]}}",
                env!("CARGO_PKG_VERSION"), json_str(&ctx.gateway_ip), json_str(&ctx.gateway_mac),
                json_str(&ctx.local_ip), json_str(&ctx.scan_cidr), rows.len(), rows.join(","));
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
