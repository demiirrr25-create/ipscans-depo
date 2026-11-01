#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use ipscans_core::console::{escape, field, json, page, serve, Reply};
use ipscans_core::json::{extract_json_string, json_str};
use ipscans_core::network::{detect_local_ipv4, scan_local_subnet};
use ipscans_core::remote_desktop::derive_station_identity;
use std::{
    env,
    net::{IpAddr, SocketAddr, TcpStream},
    process::Command,
    sync::Arc,
    time::Duration,
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
    let client = ipscans_core::win32::system_tool("mstsc").map_err(|e| e.to_string())?;
    Command::new(client)
        .arg(format!("/v:{addr}"))
        .arg("/prompt")
        .spawn()
        .map_err(|e| format!("RDP istemcisi açılamadı. {e}"))?;
    Ok(format!("{addr} için Windows RDP istemcisi açıldı. Kimlik bilgilerini ve sertifikayı istemcide doğrulayın."))
}

fn screen(info: &str, peers: &str) -> Reply {
    let ip = detect_local_ipv4().unwrap_or_default();
    let hostname = env::var("COMPUTERNAME").unwrap_or_default();
    let station = derive_station_identity(&ip, &hostname);
    page(
        "IPCast",
        "ipcast",
        "Yerel istasyon keşfi ve Windows Uzak Masaüstü",
        &format!(
            r#"
       <section><div class="eyebrow">01 / BU İSTASYON · {}</div><h2>{}</h2><p>Yerel adres <strong>{}</strong> · Envanter kimliği <span class="mono">{}</span></p></section>
       <section><div class="eyebrow">02 / UZAK MASAÜSTÜ</div><h2>Bir bilgisayara bağlan</h2><p>Hedefte Uzak Masaüstü açık olmalı. IP adresini girin. Pano, disk paylaşımı ve kimlik doğrulaması Windows RDP istemcisinden yönetilir.</p>
       <form method="post" action="/session"><label>Hedef IP veya IP:port<input class="input mono" required placeholder="192.168.1.20:3389" name="target"></label><button class="btn btn-signal">RDP istemcisini aç</button><button class="btn btn-secondary" formaction="/probe">TCP erişimini sına</button></form>{info}</section>
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
        return;
    }
    serve(
        "ipcast",
        17942,
        Arc::new(|method, path, body| match (method, path) {
            ("GET", "/" | "/index.html") => screen("", ""),
            ("POST", "/session" | "/probe" | "/api/connect") => {
                let target = if path.starts_with("/api/") {
                    extract_json_string(body, "target")
                } else {
                    field(body, "target")
                }
                .unwrap_or_default();
                let result = endpoint(&target).map_err(str::to_string).and_then(|addr| {
                    if path == "/probe" {
                        TcpStream::connect_timeout(&addr, Duration::from_millis(900))
                            .map(|_| format!("{addr} · TCP bağlantısı doğrulandı."))
                            .map_err(|e| format!("{addr} · Bağlantı kurulamadı. {e}"))
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
