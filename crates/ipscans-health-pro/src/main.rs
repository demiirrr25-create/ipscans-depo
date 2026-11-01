#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use ipscans_core::{
    design::{bind_app_server, run_http_loop},
    health_monitor::{detect_arp_mac_conflicts, summarize_rtt_samples},
    json::json_str,
    network::{discover_gateway_context, interface_arp_table, ping_ipv4, probe_host_ports},
    win32::launch_desktop_app_window,
};
use std::{
    collections::{HashMap, VecDeque},
    fmt::Write,
    sync::{Arc, Mutex},
    thread,
    time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};

const WINDOW: usize = 60;

struct Sample {
    time: u64,
    gateway: String,
    gateway_ms: Option<u32>,
    wan_ms: Option<u32>,
    changes: Option<Vec<String>>,
}

#[derive(Default)]
struct Monitor {
    samples: VecDeque<Sample>,
    previous: Option<(String, HashMap<String, String>)>,
    active: bool,
    last_visit: Option<Instant>,
    dark: bool,
}

fn measure(state: &Mutex<Monitor>) {
    let ctx = discover_gateway_context();
    let (gateway_ms, wan_ms) = thread::scope(|s| {
        let job = s.spawn(|| {
            ctx.gateway_ip
                .parse()
                .ok()
                .and_then(|ip| ping_ipv4(ip, 500))
        });
        let (_, wan) = probe_host_ports("1.1.1.1", &[443], 700);
        (job.join().unwrap_or(None), wan)
    });
    let arp = interface_arp_table(&ctx.local_ip);
    let mut monitor = state.lock().unwrap();
    let changes = match (&monitor.previous, &arp) {
        (Some((nic, base)), Some(now)) if nic == &ctx.local_ip => {
            let entries = now
                .iter()
                .map(|(a, b)| (a.clone(), b.clone()))
                .collect::<Vec<_>>();
            Some(
                detect_arp_mac_conflicts(base, &entries)
                    .iter()
                    .map(|a| format!("{} · {} → {}", a.ip, a.previous_mac, a.conflicting_mac))
                    .collect(),
            )
        }
        _ => None,
    };
    if let Some((previous_ip, _)) = &monitor.previous {
        if previous_ip != &ctx.local_ip {
            monitor.samples.clear();
        }
    }
    monitor.previous = arp.map(|map| (ctx.local_ip, map));
    let time = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    monitor.samples.push_front(Sample {
        time,
        gateway: ctx.gateway_ip,
        gateway_ms,
        wan_ms,
        changes,
    });
    monitor.samples.truncate(WINDOW);
}

fn rtt(ms: Option<u32>) -> String {
    ms.map(|n| format!("{n} ms"))
        .unwrap_or_else(|| "Yanıt yok".into())
}
fn as_json(ms: Option<u32>) -> String {
    ms.map(|v| v.to_string()).unwrap_or_else(|| "null".into())
}
impl Monitor {
    fn json(&self) -> String {
        let Some(s) = self.samples.front() else {
            return "{\"ok\":false,\"reason\":\"no_samples\"}".into();
        };
        let changes = s
            .changes
            .as_ref()
            .map(|c| {
                format!(
                    "[{}]",
                    c.iter().map(|v| json_str(v)).collect::<Vec<_>>().join(",")
                )
            })
            .unwrap_or_else(|| "null".into());
        format!("{{\"ok\":true,\"gatewayIp\":{},\"gatewayRttMs\":{},\"wanRttMs\":{},\"arpChanges\":{},\"timestamp\":{},\"sampleCount\":{}}}",json_str(&s.gateway),as_json(s.gateway_ms),as_json(s.wan_ms),changes,s.time,self.samples.len())
    }
    fn page(&self) -> String {
        let theme = if self.dark { "dark" } else { "light" };
        let refresh = if self.active {
            r#"<meta http-equiv="refresh" content="5;url=/">"#
        } else {
            ""
        };
        let mut page = format!(
            r#"<!doctype html><html lang="tr" data-theme="{theme}"><head><meta charset="utf-8">{refresh}<meta name="viewport" content="width=device-width,initial-scale=1"><title>Network Health Pro · Bağlantı ölçümleri</title><link rel="icon" href="/brand/health.png"><link rel="stylesheet" href="/design/v2.css"><style>.topbar{{position:static;min-height:68px;gap:10px;flex-wrap:wrap}}.hero{{margin-bottom:20px;border-left:4px solid var(--signal);padding:10px 18px}}.hero h1{{font-size:clamp(26px,4vw,46px);letter-spacing:-.055em}}.actions{{display:flex;gap:8px;flex-wrap:wrap}}.metric{{font-size:1.8rem;font-weight:600;letter-spacing:-.045em}}.bars{{display:flex;align-items:end;height:42px;gap:3px;margin-top:10px}}.bars i{{display:block;width:8px;min-height:3px;background:var(--signal);border-radius:3px}}.bars i.miss{{height:3px;background:var(--warn)}}.note{{margin-top:12px}}.tablebox{{max-height:420px;overflow:auto}}</style></head><body><header class="topbar"><div class="brand-cluster"><img class="brand-logo" src="/brand/health.png" alt=""><div><strong>Network Health Pro</strong><div class="brand-sub">Bağlantı telemetrisi · v{}</div></div></div><div class="actions"><form action="/theme" method="post"><button class="btn btn-secondary">Temayı değiştir</button></form><form action="/sample" method="post"><button class="btn btn-secondary">Şimdi ölç</button></form><form action="/{}" method="post"><button class="btn btn-signal">{}</button></form></div></header><main class="workspace"><section class="hero"><span class="eyebrow">BAĞLANTI GÖZLEMİ</span><h1>Ağ sağlığı</h1><p>{} · Son {} ölçüm / {} örneklik pencere</p></section><div class="bento-grid">"#,
            env!("CARGO_PKG_VERSION"),
            if self.active { "stop" } else { "start" },
            if self.active {
                "İzlemeyi durdur"
            } else {
                "İzlemeyi başlat"
            },
            if self.active {
                "Sürekli izleme açık"
            } else {
                "Sürekli izleme kapalı"
            },
            self.samples.len(),
            WINDOW
        );
        for (gateway, title) in [
            (true, "AĞ GEÇİDİ · ICMP ECHO"),
            (false, "1.1.1.1 · TCP 443"),
        ] {
            let readings: Vec<_> = self
                .samples
                .iter()
                .rev()
                .map(|s| if gateway { s.gateway_ms } else { s.wan_ms })
                .collect();
            let good: Vec<_> = readings.iter().filter_map(|n| n.map(u64::from)).collect();
            let summary = summarize_rtt_samples(&good);
            let value = readings
                .last()
                .map(|v| rtt(*v))
                .unwrap_or_else(|| "—".into());
            let loss = if readings.is_empty() {
                "—".into()
            } else {
                format!(
                    "{:.0}%",
                    (readings.len() - good.len()) as f64 * 100. / readings.len() as f64
                )
            };
            let label = if gateway {
                "ICMP yanıtsız"
            } else {
                "TCP başarısız"
            };
            let jitter = if good.len() >= 2 {
                format!("{:.1} ms", summary.jitter_ms)
            } else {
                "—".into()
            };
            let _ = write!(
                page,
                r#"<section class="bento-card col-6"><div class="eyebrow">{title}</div><div class="metric mono">{value}</div><p>{label} {loss} · Ardışık başarılı ölçümlerin gecikme farkı {jitter}</p><div class="bars" aria-hidden="true">"#
            );
            for n in readings {
                if let Some(n) = n {
                    let _ = write!(
                        page,
                        "<i style=\"height:{}px\" title=\"{n} ms\"></i>",
                        3 + (n as u64 * 36 / summary.max_rtt_ms.max(1))
                    );
                } else {
                    page.push_str("<i class=\"miss\" title=\"Yanıt yok\"></i>");
                }
            }
            page.push_str("</div></section>");
        }
        let last = self.samples.front();
        let arps = last.and_then(|s| s.changes.as_ref());
        let text = match arps {
            Some(c) if c.is_empty() => "Değişiklik gözlenmedi".into(),
            Some(c) => format!("{} MAC değişimi", c.len()),
            None => "Karşılaştırılabilir iki ARP kaydı bekleniyor".into(),
        };
        let _ = write!(
            page,
            r#"<section class="bento-card col-12"><div class="eyebrow">L2 KOMŞU TABLOSU</div><h2 class="card-title">{text}</h2><p class="card-desc">Aynı arabirimde iki gözlem arasında IPv4 adresinin MAC karşılığı değişirse kaydedilir.</p>"#
        );
        if let Some(changes) = arps {
            for c in changes {
                let _ = write!(page, "<p class=\"mono\">{c}</p>");
            }
        }
        page.push_str(r#"</section><section class="bento-card col-12"><div class="card-header"><h2 class="card-title">Ölçüm geçmişi</h2></div><div class="data-table-wrap tablebox"><table class="data-table"><thead><tr><th>Saat (UTC)</th><th>Ağ geçidi</th><th>ICMP RTT</th><th>WAN TCP RTT</th><th>ARP değişimi</th></tr></thead><tbody>"#);
        for s in &self.samples {
            let t = s.time % 86400;
            let _=write!(page,"<tr><td>{:02}:{:02}:{:02}</td><td class=\"mono\">{}</td><td>{}</td><td>{}</td><td>{}</td></tr>",t/3600,t/60%60,t%60,if s.gateway.is_empty(){"Algılanmadı"}else{&s.gateway},rtt(s.gateway_ms),rtt(s.wan_ms),s.changes.as_ref().map(|c|c.len().to_string()).unwrap_or_else(||"—".into()));
        }
        if self.samples.is_empty() {
            page.push_str(
                "<tr><td colspan=\"5\">İlk örnek için Şimdi ölç düğmesini kullanın.</td></tr>",
            );
        }
        page.push_str("</tbody></table></div><p class=\"card-desc note\">TCP bağlantı süresi ve ICMP yanıt süresi farklı ölçümlerdir. ICMP engellenebilir. Pencere kapatıldıktan sonra izleme en geç bir dakika içinde durur.</p></section></div></main></body></html>");
        page
    }
}

fn main() {
    ipscans_core::win32::handle_desktop_install("ipscans-network-health-pro.exe");
    let args: Vec<_> = std::env::args().collect();
    if args.iter().any(|a| a == "--version" || a == "-V") {
        println!("Network Health Pro {}", env!("CARGO_PKG_VERSION"));
        return;
    }
    if args.iter().any(|a| a == "--selftest") {
        assert!(Monitor::default().json().contains("no_samples"));
        assert!(ping_ipv4(std::net::Ipv4Addr::LOCALHOST, 500).is_some());
        return;
    }
    let (listener, port) = bind_app_server(17946);
    let state = Arc::new(Mutex::new(Monitor::default()));
    let sampling = Arc::new(Mutex::new(()));
    let worker = state.clone();
    let busy = sampling.clone();
    thread::spawn(move || loop {
        thread::sleep(Duration::from_secs(4));
        let Ok(_guard) = busy.try_lock() else {
            continue;
        };
        let should_sample = {
            let mut s = worker.lock().unwrap();
            if s.last_visit
                .is_none_or(|t| t.elapsed() > Duration::from_secs(50))
            {
                s.active = false;
            }
            s.active
        };
        if should_sample {
            measure(&worker);
        }
    });
    if !args.iter().any(|a| a == "--headless") {
        let _ = launch_desktop_app_window(
            "ipscans-health-pro",
            &format!("http://127.0.0.1:{port}"),
            1340,
            860,
        );
    }
    run_http_loop(
        listener,
        Arc::new(move |method, path, _| {
            match (method, path) {
                ("POST", "/api/sample" | "/sample" | "/start") => {
                    if path == "/start" {
                        let mut s = state.lock().unwrap();
                        s.active = true;
                        s.last_visit = Some(Instant::now());
                    }
                    let _guard = sampling.lock().unwrap();
                    measure(&state);
                }
                ("POST", "/stop") => state.lock().unwrap().active = false,
                ("POST", "/theme") => {
                    let mut s = state.lock().unwrap();
                    s.dark = !s.dark;
                }
                ("GET", "/" | "/index.html" | "/api/sample") => {}
                _ => {
                    return (
                        404,
                        "application/json",
                        br#"{"error":"Not found"}"#.to_vec(),
                    )
                }
            }
            let mut s = state.lock().unwrap();
            s.last_visit = Some(Instant::now());
            if path == "/api/sample" {
                (
                    200,
                    "application/json; charset=utf-8",
                    s.json().into_bytes(),
                )
            } else {
                (200, "text/html; charset=utf-8", s.page().into_bytes())
            }
        }),
    );
}
