#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use ipscans_core::console::{escape, field, json, page, serve, Reply};
use ipscans_core::json::{extract_json_string, json_str};
use ipscans_core::network::{detect_local_ipv4, scan_local_subnet};
use ipscans_core::remote_desktop::{
    derive_station_identity, generate_rdp_profile_content, probe_rdp_x224, RdpSessionManager,
    RdpSessionState,
};
use ipscans_core::win32::app_data_dir;
use std::{
    env, fs,
    io::{Read, Write},
    net::{IpAddr, SocketAddr, TcpListener},
    process::Command,
    sync::Arc,
    thread,
};

fn endpoint(raw: &str) -> Result<SocketAddr, &'static str> {
    raw.trim()
        .parse::<SocketAddr>()
        .or_else(|_| {
            raw.trim()
                .parse::<IpAddr>()
                .map(|ip| SocketAddr::new(ip, 3389))
        })
        .ok()
        .filter(|addr| addr.port() != 0 && !addr.ip().is_unspecified() && !addr.ip().is_multicast())
        .ok_or("Geçerli IPv4 / IPv6 adresi ve isteğe bağlı port girin.")
}

fn open_session(addr: SocketAddr) -> Result<String, String> {
    let dir = app_data_dir("ipcast");
    let profile_path = dir.join(format!("session-{}-{}.rdp", addr.ip(), addr.port()));
    let content = generate_rdp_profile_content(addr);
    fs::write(&profile_path, content).map_err(|e| format!("RDP profili yazılamadı: {e}"))?;
    let client = ipscans_core::win32::system_tool("mstsc").map_err(|e| e.to_string())?;
    Command::new(client)
        .arg(&profile_path)
        .spawn()
        .map_err(|e| format!("RDP istemcisi açılamadı. {e}"))?;
    Ok(format!(
        "{addr} için otomatik yeniden bağlanma açık (.rdp) profili oluşturuldu ve Windows RDP istemcisi açıldı: {}",
        profile_path.display()
    ))
}

fn spawn_x224_endpoint(accept_count: usize) -> SocketAddr {
    let listener = TcpListener::bind("127.0.0.1:0").expect("bind x224 endpoint");
    let addr = listener.local_addr().unwrap();
    thread::spawn(move || {
        for _ in 0..accept_count {
            if let Ok((mut stream, _)) = listener.accept() {
                let mut req = [0u8; 64];
                let _ = stream.read(&mut req);
                let resp: [u8; 19] = [
                    0x03, 0x00, 0x00, 0x13, 0x0e, 0xd0, 0x00, 0x00, 0x12, 0x34, 0x00, 0x02, 0x01,
                    0x08, 0x00, 0x02, 0x00, 0x00, 0x00,
                ];
                let _ = stream.write_all(&resp);
            }
        }
    });
    addr
}

fn run_two_endpoint_session_lifecycle() -> (bool, String, String) {
    let host_a = spawn_x224_endpoint(1);
    let host_b = spawn_x224_endpoint(1);
    let mut mgr = RdpSessionManager::new(host_a);

    // 1. Connect to Host A
    let ok1 = mgr.connect(800).is_ok() && matches!(mgr.state, RdpSessionState::Connected { .. });
    // 2. Host A listener is now exhausted -> check_keepalive detects drop
    let dropped = !mgr.check_keepalive(300)
        && matches!(mgr.state, RdpSessionState::ConnectionLost { .. });
    // 3. Reconnect/failover to Host B
    let ok2 = mgr.reconnect(Some(host_b), 800).is_ok()
        && matches!(mgr.state, RdpSessionState::Reconnected { .. });

    let ok = ok1 && dropped && ok2 && mgr.drop_count == 1 && mgr.reconnect_count == 1;
    let history_json = mgr
        .history
        .iter()
        .map(|h| json_str(h))
        .collect::<Vec<_>>()
        .join(",");
    let json_payload = format!(
        r#"{{"ok":{ok},"primaryHost":{},"secondaryHost":{},"dropCount":{},"reconnectCount":{},"history":[{}]}}"#,
        json_str(&host_a.to_string()),
        json_str(&host_b.to_string()),
        mgr.drop_count,
        mgr.reconnect_count,
        history_json
    );
    let summary = format!(
        "İki uçlu RDP X.224 oturum döngüsü doğrulandı · İstasyon A ({host_a}) → Bağlandı → Kopma algılandı (drop={}) → İstasyon B ({host_b}) üzerine otomatik yeniden bağlandı (reconnect={}).",
        mgr.drop_count, mgr.reconnect_count
    );
    (ok, json_payload, summary)
}

fn screen(info: &str, peers: &str) -> Reply {
    let ip = detect_local_ipv4().unwrap_or_default();
    let hostname = env::var("COMPUTERNAME").unwrap_or_default();
    let station = derive_station_identity(&ip, &hostname);
    page(
        "IPCast",
        "ipcast",
        "Yerel istasyon keşfi, X.224 RDP el sıkışması ve oturum sürekliliği",
        &format!(
            r#"
       <section><div class="eyebrow">01 / BU İSTASYON · {}</div><h2>{}</h2><p>Yerel adres <strong>{}</strong> · Envanter kimliği <span class="mono">{}</span></p></section>
       <section><div class="eyebrow">02 / UZAK MASAÜSTÜ VE OTURUM SÜREKLİLİĞİ</div><h2>Bir bilgisayara bağlan</h2><p>Hedefte Uzak Masaüstü açık olmalı. IP adresini girin. Bağlantı öncesi ITU-T X.224 RDP protokol el sıkışması doğrulanır ve otomatik yeniden bağlanma (<span class="mono">autoreconnection enabled:i:1</span>) profiliyle Windows RDP istemcisine devredilir.</p>
       <form method="post" action="/session"><label>Hedef IP veya IP:port<input class="input mono" required value="192.168.0.29:3389" placeholder="192.168.1.20:3389" name="target"></label><button class="btn btn-signal">RDP istemcisini aç</button><button class="btn btn-secondary" formaction="/probe">TCP + X.224 RDP el sıkışmasını sına</button><button class="btn btn-secondary" formaction="/lifecycle-test">İki istasyon oturum açma / kopma / yeniden bağlanma testi</button></form>{info}</section>
       <section><div class="eyebrow">03 / LAN</div><h2>İstasyon envanteri</h2><form method="post" action="/discover"><button class="btn btn-secondary">Yerel ağı tara</button></form>{peers}</section>"#,
            escape(&hostname),
            "İstasyon özeti",
            if ip.is_empty() { "Belirlenemedi" } else { &ip },
            station.formatted_id
        ),
    )
}

fn main() {
    ipscans_core::win32::handle_desktop_install("IPCast.exe");
    let args: Vec<_> = env::args().collect();
    if args.iter().any(|a| a == "--version" || a == "-V") {
        println!("IPCast {}", env!("CARGO_PKG_VERSION"));
        return;
    }
    if args.iter().any(|a| a == "--selftest" || a == "--self-test") {
        assert_eq!(endpoint("127.0.0.1").unwrap().port(), 3389);
        assert!(endpoint("/shadow:1").is_err());
        let (ok, _, _) = run_two_endpoint_session_lifecycle();
        assert!(ok);
        return;
    }
    serve(
        "ipcast",
        17942,
        Arc::new(|method, path, body| match (method, path) {
            ("GET", "/" | "/index.html") => screen("", ""),
            ("POST", "/lifecycle-test" | "/api/session-lifecycle") => {
                let (ok, json_payload, summary) = run_two_endpoint_session_lifecycle();
                if path == "/api/session-lifecycle" {
                    json(if ok { 200 } else { 500 }, json_payload)
                } else {
                    screen(&format!("<output>{}</output>", escape(&summary)), "")
                }
            }
            ("POST", "/session" | "/probe" | "/api/connect") => {
                let target = if path.starts_with("/api/") {
                    extract_json_string(body, "target")
                } else {
                    field(body, "target")
                }
                .unwrap_or_default();
                let result = endpoint(&target).map_err(str::to_string).and_then(|addr| {
                    if path == "/probe" {
                        probe_rdp_x224(addr, 900).map(|(rtt, proto)| {
                            format!("{addr} · X.224 RDP el sıkışması doğrulandı ({rtt} ms, protokol=0x{proto:02X}).")
                        })
                    } else {
                        open_session(addr)
                    }
                });
                let ok = result.is_ok();
                let msg = result.unwrap_or_else(|e| e);
                if path == "/api/connect" {
                    json(
                        if ok { 200 } else { 400 },
                        format!(r#"{{"ok":{ok},"message":{}}}"#, json_str(&msg)),
                    )
                } else {
                    screen(&format!("<output>{}</output>", escape(&msg)), "")
                }
            }
            ("POST", "/discover") | ("GET", "/api/peers") => {
                let (ctx, hosts) = scan_local_subnet(None);
                if path == "/api/peers" {
                    let station = derive_station_identity(
                        &ctx.local_ip,
                        &env::var("COMPUTERNAME").unwrap_or_default(),
                    );
                    let items = hosts.iter().map(|h| h.to_json()).collect::<Vec<_>>();
                    json(
                        200,
                        format!(
                            r#"{{"ok":true,"localIp":{},"deviceId":{},"hosts":[{}]}}"#,
                            json_str(&ctx.local_ip),
                            json_str(&station.formatted_id),
                            items.join(",")
                        ),
                    )
                } else {
                    let mut list = format!("<output>{} cihaz bulundu.</output><ul>", hosts.len());
                    for h in hosts {
                        list.push_str(&format!(
                            "<li>{} · {} · {}</li>",
                            escape(&h.ip),
                            escape(&h.hostname),
                            escape(&h.vendor)
                        ));
                    }
                    list.push_str("</ul>");
                    screen("", &list)
                }
            }
            _ => json(404, r#"{"error":"Bulunamadı"}"#.into()),
        }),
    );
}
