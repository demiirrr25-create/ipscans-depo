#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use ipscans_core::{
    design::{bind_app_server, run_http_loop},
    health_monitor::{HealthSampleRecord, HealthSessionTracker, summarize_rtt_samples},
    json::json_str,
    network::{discover_gateway_context, interface_arp_table, ping_ipv4, probe_host_ports},
    win32::{app_data_dir, launch_desktop_app_window},
};
use std::{
    collections::{HashMap, VecDeque},
    fmt::Write,
    fs::OpenOptions,
    io::Write as IoWrite,
    path::PathBuf,
    sync::{Arc, Mutex},
    thread,
    time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};

const WINDOW: usize = 60;

struct Monitor {
    samples: VecDeque<HealthSampleRecord>,
    tracker: HealthSessionTracker,
    active: bool,
    last_visit: Option<Instant>,
    dark: bool,
    log_path: PathBuf,
    last_sim_summary: Option<String>,
}

impl Default for Monitor {
    fn default() -> Self {
        let dir = app_data_dir("health");
        Self {
            samples: VecDeque::new(),
            tracker: HealthSessionTracker::new(),
            active: false,
            last_visit: None,
            dark: false,
            log_path: dir.join("telemetry-history.jsonl"),
            last_sim_summary: None,
        }
    }
}

fn sample_to_json(s: &HealthSampleRecord) -> String {
    let gw = s
        .gateway_rtt_ms
        .map(|v| v.to_string())
        .unwrap_or_else(|| "null".into());
    let wan = s
        .wan_rtt_ms
        .map(|v| v.to_string())
        .unwrap_or_else(|| "null".into());
    format!(
        "{{\"ts\":{},\"adapter\":{},\"gateway\":{},\"gwRttMs\":{},\"wanRttMs\":{},\"adapterChanged\":{},\"arpConflicts\":{}}}",
        s.timestamp_unix,
        json_str(&s.adapter_ip),
        json_str(&s.gateway_ip),
        gw,
        wan,
        s.adapter_changed,
        s.arp_conflicts.len()
    )
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
    let arp = interface_arp_table(&ctx.local_ip).unwrap_or_default();
    let time = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    let mut monitor = state.lock().unwrap();
    let sample = monitor.tracker.ingest_observation(
        time,
        &ctx.local_ip,
        &ctx.gateway_ip,
        gateway_ms,
        wan_ms,
        &arp,
    );
    if let Ok(mut file) = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&monitor.log_path)
    {
        let _ = writeln!(file, "{}", sample_to_json(&sample));
    }
    monitor.samples.push_front(sample);
    monitor.samples.truncate(WINDOW);
}

fn run_resilience_simulation(state: &Mutex<Monitor>) -> String {
    let mut sim = HealthSessionTracker::new();
    let mut arp_eth = HashMap::new();
    arp_eth.insert("192.168.0.1".to_string(), "aa-bb-cc-00-11-22".to_string());
    let mut arp_wifi = HashMap::new();
    arp_wifi.insert("192.168.1.1".to_string(), "dd-ee-ff-33-44-55".to_string());

    // 1. Healthy baseline on primary adapter
    sim.ingest_observation(1_700_000_000, "192.168.0.29", "192.168.0.1", Some(2), Some(14), &arp_eth);
    sim.ingest_observation(1_700_000_005, "192.168.0.29", "192.168.0.1", Some(3), Some(15), &arp_eth);
    // 2. Complete connection loss (both gateway and WAN unreachable)
    sim.ingest_observation(1_700_000_010, "192.168.0.29", "192.168.0.1", None, None, &arp_eth);
    sim.ingest_observation(1_700_000_015, "192.168.0.29", "192.168.0.1", None, None, &arp_eth);
    // 3. Adapter transition (failover to Wi-Fi adapter) and recovery
    sim.ingest_observation(1_700_000_020, "192.168.1.44", "192.168.1.1", Some(6), Some(19), &arp_wifi);
    // 4. Genuine ARP conflict on the same adapter
    let mut arp_wifi_spoof = arp_wifi;
    arp_wifi_spoof.insert("192.168.1.1".to_string(), "99-88-77-66-55-44".to_string());
    sim.ingest_observation(1_700_000_025, "192.168.1.44", "192.168.1.1", Some(5), Some(18), &arp_wifi_spoof);

    let rep = sim.report();
    let outage_secs = sim.outages.first().map(|o| o.duration_secs).unwrap_or(0);
    let outage_samples = sim.outages.first().map(|o| o.failed_samples).unwrap_or(0);
    let summary = format!(
        "Doğrulama tamamlandı · Toplam örnek: {} · Kesinti olayı: {} ({} ardışık kayıp, {} sn) · Adaptör değişimi: {} (192.168.0.29 → 192.168.1.44) · Aynı adaptörde ARP/MAC uyuşmazlığı: {}",
        rep.total_samples,
        rep.outage_count,
        outage_samples,
        outage_secs,
        rep.adapter_switch_count,
        rep.arp_conflict_count
    );
    let mut monitor = state.lock().unwrap();
    monitor.last_sim_summary = Some(summary);
    format!(
        r#"{{"ok":true,"totalSamples":{},"gatewayLossPct":{:.2},"wanLossPct":{:.2},"gatewayP95Ms":{},"wanP95Ms":{},"outageCount":{},"adapterSwitchCount":{},"arpConflictCount":{}}}"#,
        rep.total_samples,
        rep.gateway_loss_pct,
        rep.wan_loss_pct,
        rep.gateway_p95_ms,
        rep.wan_p95_ms,
        rep.outage_count,
        rep.adapter_switch_count,
        rep.arp_conflict_count
    )
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
        let changes = format!(
            "[{}]",
            s.arp_conflicts
                .iter()
                .map(|a| json_str(&format!("{} · {} → {}", a.ip, a.previous_mac, a.conflicting_mac)))
                .collect::<Vec<_>>()
                .join(",")
        );
        let rep = self.tracker.report();
        format!(
            "{{\"ok\":true,\"adapterIp\":{},\"gatewayIp\":{},\"gatewayRttMs\":{},\"wanRttMs\":{},\"arpChanges\":{},\"adapterSwitched\":{},\"outageCount\":{},\"adapterTransitionCount\":{},\"timestamp\":{},\"sampleCount\":{}}}",
            json_str(&s.adapter_ip),
            json_str(&s.gateway_ip),
            as_json(s.gateway_rtt_ms),
            as_json(s.wan_rtt_ms),
            changes,
            if s.adapter_changed { "true" } else { "false" },
            rep.outage_count,
            rep.adapter_switch_count,
            s.timestamp_unix,
            self.samples.len()
        )
    }
    fn page(&self) -> String {
        let theme = if self.dark { "dark" } else { "light" };
        let refresh = if self.active {
            r#"<meta http-equiv="refresh" content="5;url=/">"#
        } else {
            ""
        };
        let rep = self.tracker.report();
        let mut page = format!(
            r#"<!doctype html><html lang="tr" data-theme="{theme}"><head><meta charset="utf-8">{refresh}<meta name="viewport" content="width=device-width,initial-scale=1"><title>Network Health Pro · Bağlantı ölçümleri</title><link rel="icon" href="/brand/health.png"><link rel="stylesheet" href="/design/v2.css"><style>.hero{{margin-bottom:20px;border-left:4px solid var(--signal);padding:18px 24px;background:linear-gradient(135deg,var(--surface) 0%,var(--surface-dim) 100%);border-radius:18px;border-top:1px solid var(--line-2);border-right:1px solid var(--line-2);border-bottom:1px solid var(--line-2);box-shadow:var(--shadow-sm)}}.hero h1{{font-size:clamp(26px,4vw,42px);letter-spacing:-.05em}}.actions{{display:flex;gap:8px;flex-wrap:wrap}}.metric{{font-size:1.8rem;font-weight:700;letter-spacing:-.045em}}.bars{{display:flex;align-items:end;height:46px;gap:4px;margin-top:12px}}.bars i{{display:block;width:9px;min-height:4px;background:var(--signal);border-radius:3px}}.bars i.miss{{height:4px;background:var(--warn)}}.note{{margin-top:12px}}.tablebox{{max-height:420px;overflow:auto}}</style></head><body><div class="app-shell"><header class="topbar"><div class="brand-cluster"><img class="brand-logo" src="/brand/health.png" alt=""><div><div style="display:flex;align-items:center;gap:8px"><strong>Network Health Pro</strong><span class="badge badge-signal mono">v{}</span></div><div class="brand-sub">Sürekli ağ geçidi/WAN gecikme, kesinti, adaptör değişimi ve L2 ARP telemetrisi</div></div></div><div class="actions"><span class="badge badge-ok mono"><span class="status-dot"></span>TELEMETRİ AKTİF</span><form action="/theme" method="post"><button class="btn btn-secondary">Temayı değiştir</button></form><form action="/sample" method="post"><button class="btn btn-secondary">Şimdi ölç</button></form><form action="/simulate-test" method="post"><button class="btn btn-secondary">Kesinti ve adaptör geçişini sına</button></form><form action="/{}" method="post"><button class="btn btn-signal">{}</button></form></div></header><main class="workspace"><section class="hero"><span class="eyebrow">BAĞLANTI GÖZLEMİ VE DAYANIKLILIK</span><h1>Ağ sağlığı ve kesintisiz telemetri</h1><p>{} · Son {} ölçüm / {} örneklik pencere · Kesinti: {} · Adaptör geçişi: {}</p></section><div class="kpi-strip"><div class="kpi-box"><div class="kpi-label">GÖZLEM PENCERESİ</div><div class="kpi-value mono">{} / {}</div><div class="kpi-sub">JSONL kalıcı günlük kaydı</div></div><div class="kpi-box"><div class="kpi-label">AĞ GEÇİDİ P95 RTT</div><div class="kpi-value mono">{} ms</div><div class="kpi-sub">Kayıp oranı: {:.1}%</div></div><div class="kpi-box"><div class="kpi-label">WAN (1.1.1.1) P95 RTT</div><div class="kpi-value mono">{} ms</div><div class="kpi-sub">Kayıp oranı: {:.1}%</div></div><div class="kpi-box"><div class="kpi-label">ADAPTÖR / ARP OLAYI</div><div class="kpi-value mono" style="color:var(--ok)">{} / {}</div><div class="kpi-sub">Adaptör geçişi / ARP uyuşmazlığı</div></div></div><div class="bento-grid">"#,
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
            WINDOW,
            rep.outage_count,
            rep.adapter_switch_count,
            self.samples.len(),
            WINDOW,
            rep.gateway_p95_ms,
            rep.gateway_loss_pct,
            rep.wan_p95_ms,
            rep.wan_loss_pct,
            rep.adapter_switch_count,
            rep.arp_conflict_count,
        );
        if let Some(sim) = &self.last_sim_summary {
            let _ = write!(
                page,
                r#"<section class="bento-card col-12"><div class="eyebrow">DOĞRULANMIŞ DAYANIKLILIK SENARYOSU</div><p class="mono">{sim}</p></section>"#
            );
        }
        for (gateway, title) in [
            (true, "AĞ GEÇİDİ · ICMP ECHO"),
            (false, "1.1.1.1 · TCP 443"),
        ] {
            let readings: Vec<_> = self
                .samples
                .iter()
                .rev()
                .map(|s| if gateway { s.gateway_rtt_ms } else { s.wan_rtt_ms })
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
            let p95_val = if gateway { rep.gateway_p95_ms } else { rep.wan_p95_ms };
            let jitter = if good.len() >= 2 {
                format!("{:.1} ms · p95 {} ms", summary.jitter_ms, p95_val)
            } else {
                "—".into()
            };
            let _ = write!(
                page,
                r#"<section class="bento-card col-6"><div class="eyebrow">{title}</div><div class="metric mono">{value}</div><p>{label} {loss} · Gecikme farkı {jitter}</p><div class="bars" aria-hidden="true">"#
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
        let text = match last {
            Some(s) if s.adapter_changed => "Adaptör değişti (ARP tablosu yeni arayüze sıfırlandı)".into(),
            Some(s) if s.arp_conflicts.is_empty() => "Değişiklik gözlenmedi".into(),
            Some(s) => format!("{} MAC değişimi", s.arp_conflicts.len()),
            None => "Karşılaştırılabilir iki ARP kaydı bekleniyor".into(),
        };
        let _ = write!(
            page,
            r#"<section class="bento-card col-12"><div class="eyebrow">L2 KOMŞU TABLOSU VE ADAPTÖR SÜREKLİLİĞİ</div><h2 class="card-title">{text}</h2><p class="card-desc">Aynı arabirimde iki gözlem arasında IPv4 adresinin MAC karşılığı değişirse kaydedilir. Adaptör değiştiğinde yanlış ARP sahteciliği uyarısı üretilmez. Uzun süreli kayıt dosyası: <span class="mono">{}</span></p>"#,
            self.log_path.display()
        );
        if let Some(s) = last {
            for c in &s.arp_conflicts {
                let _ = write!(
                    page,
                    "<p class=\"mono\">{} · {} → {}</p>",
                    c.ip, c.previous_mac, c.conflicting_mac
                );
            }
        }
        page.push_str(r#"</section><section class="bento-card col-12"><div class="card-header"><h2 class="card-title">Ölçüm geçmişi</h2></div><div class="data-table-wrap tablebox"><table class="data-table"><thead><tr><th>Saat (UTC)</th><th>Adaptör IP</th><th>Ağ geçidi</th><th>ICMP RTT</th><th>WAN TCP RTT</th><th>ARP değişimi</th></tr></thead><tbody>"#);
        for s in &self.samples {
            let t = s.timestamp_unix % 86400;
            let _ = write!(
                page,
                "<tr><td>{:02}:{:02}:{:02}</td><td class=\"mono\">{}</td><td class=\"mono\">{}</td><td>{}</td><td>{}</td><td>{}</td></tr>",
                t / 3600,
                t / 60 % 60,
                t % 60,
                if s.adapter_ip.is_empty() { "—" } else { &s.adapter_ip },
                if s.gateway_ip.is_empty() { "Algılanmadı" } else { &s.gateway_ip },
                rtt(s.gateway_rtt_ms),
                rtt(s.wan_rtt_ms),
                if s.adapter_changed {
                    "Adaptör geçişi".to_string()
                } else {
                    s.arp_conflicts.len().to_string()
                }
            );
        }
        if self.samples.is_empty() {
            page.push_str(
                "<tr><td colspan=\"6\">İlk örnek için Şimdi ölç düğmesini kullanın.</td></tr>",
            );
        }
        page.push_str("</tbody></table></div><p class=\"card-desc note\">TCP bağlantı süresi ve ICMP yanıt süresi farklı ölçümlerdir. ICMP engellenebilir. Pencere kapatıldıktan sonra izleme en geç bir dakika içinde durur.</p></section></div></main></div><script src=\"/design/v2.js\"></script></body></html>");
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
        let state = Mutex::new(Monitor::default());
        assert!(state.lock().unwrap().json().contains("no_samples"));
        assert!(ping_ipv4(std::net::Ipv4Addr::LOCALHOST, 500).is_some());
        let sim_json = run_resilience_simulation(&state);
        assert!(sim_json.contains("\"outageCount\":1"));
        assert!(sim_json.contains("\"adapterSwitchCount\":1"));
        return;
    }
    let (listener, port) = bind_app_server(17946);
    let state = Arc::new(Mutex::new(Monitor {
        active: true,
        dark: true,
        last_visit: Some(Instant::now()),
        ..Monitor::default()
    }));
    measure(&state);
    measure(&state);
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
                ("POST", "/simulate-test" | "/api/simulate-test") => {
                    let json_out = run_resilience_simulation(&state);
                    if path == "/api/simulate-test" {
                        return (200, "application/json; charset=utf-8", json_out.into_bytes());
                    }
                }
                ("GET", "/api/report") => {
                    let s = state.lock().unwrap();
                    let rep = s.tracker.report();
                    let out = format!(
                        r#"{{"ok":true,"totalSamples":{},"gatewayLossPct":{:.2},"wanLossPct":{:.2},"gatewayP95Ms":{},"wanP95Ms":{},"outageCount":{},"adapterSwitchCount":{},"arpConflictCount":{}}}"#,
                        rep.total_samples,
                        rep.gateway_loss_pct,
                        rep.wan_loss_pct,
                        rep.gateway_p95_ms,
                        rep.wan_p95_ms,
                        rep.outage_count,
                        rep.adapter_switch_count,
                        rep.arp_conflict_count
                    );
                    return (200, "application/json; charset=utf-8", out.into_bytes());
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
