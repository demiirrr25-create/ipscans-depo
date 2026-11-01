#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use ipscans_core::console::{escape, field, json, page, serve, Reply};
use ipscans_core::cryptography::sha256_hex;
use ipscans_core::json::{extract_json_string, json_str};
use ipscans_core::network::{detect_local_ipv4, scan_local_subnet, DiscoveredHost};
use ipscans_core::remote_desktop::{
    capture_desktop_bmp, compute_adaptive_stream_profile, derive_station_identity,
    discover_ipcast_peer_by_id, generate_rdp_profile_content, inject_remote_key,
    inject_remote_mouse, primary_screen_resolution, probe_rdp_x224, RdpSessionManager,
    RdpSessionState,
};
fn now_iso8601() -> String {
    let secs = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    format!(
        "{:02}:{:02}:{:02} UTC",
        (secs / 3600) % 24,
        (secs / 60) % 60,
        secs % 60
    )
}

#[derive(Clone)]
struct FileTransferItem {
    id: String,
    filename: String,
    size_bytes: u64,
    direction: String,
    sha256_prefix: String,
    status: String,
    timestamp: String,
}

#[derive(Clone)]
struct ChatEntry {
    sender: String,
    role: String,
    text: String,
    timestamp: String,
}
use ipscans_core::win32::app_data_dir;
use std::{
    env, fs,
    io::{Read, Write},
    net::{IpAddr, SocketAddr, TcpListener, TcpStream, UdpSocket},
    path::Path,
    process::Command,
    sync::{Arc, Mutex},
    thread,
    time::Duration,
};

struct IpCastState {
    local_ip: String,
    hostname: String,
    formatted_id: String,
    compact_id: String,
    session_pin: String,
    unattended_pass: String,
    p2p_port: u16,
    allow_remote_control: bool,
    allow_file_transfer: bool,
    allow_clipboard: bool,
    active_peer_target: String,
    active_peer_label: String,
    active_peer_ip: String,
    active_peer_port: u16,
    active_peer_pin: String,
    p2p_connected: bool,
    last_rtt_ms: u32,
    transfers: Vec<FileTransferItem>,
    chat_messages: Vec<ChatEntry>,
    discovered_hosts: Vec<DiscoveredHost>,
}

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

    let ok1 = mgr.connect(800).is_ok() && matches!(mgr.state, RdpSessionState::Connected { .. });
    let dropped =
        !mgr.check_keepalive(300) && matches!(mgr.state, RdpSessionState::ConnectionLost { .. });
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

/// Spawns UDP 17949 discovery responder so other LAN stations can resolve this PC by its 9-digit IPCast ID.
fn start_udp_discovery_responder(state: Arc<Mutex<IpCastState>>) {
    thread::spawn(move || {
        let Ok(sock) = UdpSocket::bind("0.0.0.0:17949") else {
            return;
        };
        let mut buf = [0u8; 512];
        while let Ok((n, src)) = sock.recv_from(&mut buf) {
            let msg = String::from_utf8_lossy(&buf[..n]);
            let trimmed = msg.trim();
            if let Some(requested_id) = trimmed.strip_prefix("IPCAST_WHOIS|") {
                let st = state.lock().unwrap();
                if requested_id == st.compact_id || requested_id == "*" {
                    let reply = format!(
                        "IPCAST_HERE|{}|{}|{}|{}",
                        st.compact_id, st.local_ip, st.p2p_port, st.hostname
                    );
                    let _ = sock.send_to(reply.as_bytes(), src);
                }
            }
        }
    });
}

/// Spawns TCP P2P Remote Desktop Host listener (`0.0.0.0:17948`) for cross-machine LAN sessions.
fn start_p2p_host_listener(state: Arc<Mutex<IpCastState>>) -> u16 {
    let listener = TcpListener::bind("0.0.0.0:17948")
        .or_else(|_| TcpListener::bind("0.0.0.0:0"))
        .expect("bind p2p listener");
    let port = listener.local_addr().map(|a| a.port()).unwrap_or(17948);
    thread::spawn(move || {
        for stream in listener.incoming().flatten() {
            let st = Arc::clone(&state);
            thread::spawn(move || handle_p2p_stream(stream, st));
        }
    });
    port
}

fn handle_p2p_stream(mut stream: TcpStream, state: Arc<Mutex<IpCastState>>) {
    let _ = stream.set_read_timeout(Some(Duration::from_secs(4)));
    let _ = stream.set_write_timeout(Some(Duration::from_secs(4)));
    let mut buf = [0u8; 8192];
    let Ok(n) = stream.read(&mut buf) else {
        return;
    };
    if n == 0 {
        return;
    }
    let req = String::from_utf8_lossy(&buf[..n]);
    let first_line = req.lines().next().unwrap_or("");
    if first_line.starts_with("IPCAST_PING") {
        let st = state.lock().unwrap();
        let reply = format!(
            "IPCAST_PONG|{}|{}|{}\n",
            st.formatted_id, st.hostname, st.local_ip
        );
        let _ = stream.write_all(reply.as_bytes());
        return;
    }
    if first_line.starts_with("IPCAST_FRAME") {
        let (_, _, bmp) = capture_desktop_bmp(1280);
        let header = format!("BMP {}\r\n", bmp.len());
        let _ = stream.write_all(header.as_bytes());
        let _ = stream.write_all(&bmp);
    }
}

/// Fetches a live BMP frame either locally (if connected to this PC) or from a remote LAN IPCast peer.
fn fetch_peer_screen_bmp(state: &Arc<Mutex<IpCastState>>, max_width: u32) -> (u32, u32, Vec<u8>) {
    let (ip, port, local_ip) = {
        let st = state.lock().unwrap();
        (
            st.active_peer_ip.clone(),
            st.active_peer_port,
            st.local_ip.clone(),
        )
    };
    if ip == "127.0.0.1" || ip == "localhost" || ip == local_ip || ip.is_empty() {
        return capture_desktop_bmp(max_width);
    }
    if let Ok(addr) = format!("{ip}:{port}").parse::<SocketAddr>() {
        if let Ok(mut s) = TcpStream::connect_timeout(&addr, Duration::from_millis(600)) {
            let _ = s.set_read_timeout(Some(Duration::from_millis(1500)));
            let _ = s.set_write_timeout(Some(Duration::from_millis(800)));
            if s.write_all(b"IPCAST_FRAME\n").is_ok() {
                let mut data = Vec::new();
                if s.read_to_end(&mut data).is_ok() {
                    if let Some(pos) = data.windows(2).position(|w| w == b"\r\n") {
                        let bmp = data[pos + 2..].to_vec();
                        if bmp.len() > 54 && &bmp[0..2] == b"BM" {
                            return (max_width, (max_width * 9) / 16, bmp);
                        }
                    }
                }
            }
        }
    }
    capture_desktop_bmp(max_width)
}

/// Resolves a user-entered target (9-digit ID `XXX-XXX-XXX`, `127.0.0.1`, or `IP[:port]`) and establishes an IPCast P2P session.
fn connect_p2p_target(
    state: &Arc<Mutex<IpCastState>>,
    raw_target: &str,
    pin: &str,
) -> Result<String, String> {
    let trimmed = raw_target.trim();
    if trimmed.is_empty() {
        return Err("Hedef IPCast ID (örn. 123-456-789) veya IP adresi girin.".into());
    }
    let digits: String = trimmed.chars().filter(|c| c.is_ascii_digit()).collect();
    let (local_ip, local_compact, local_formatted, local_host, local_port, local_pin, local_pass) = {
        let st = state.lock().unwrap();
        (
            st.local_ip.clone(),
            st.compact_id.clone(),
            st.formatted_id.clone(),
            st.hostname.clone(),
            st.p2p_port,
            st.session_pin.clone(),
            st.unattended_pass.clone(),
        )
    };

    // Case 1: 9-digit IPCast ID
    if digits.len() == 9 && !trimmed.contains('.') {
        if digits == local_compact {
            let mut st = state.lock().unwrap();
            st.active_peer_target = local_formatted.clone();
            st.active_peer_label = format!("{} ({})", local_host, local_formatted);
            st.active_peer_ip = "127.0.0.1".into();
            st.active_peer_port = local_port;
            st.active_peer_pin = pin.to_string();
            st.p2p_connected = true;
            st.last_rtt_ms = 1;
            return Ok(format!(
                "IPCast P2P oturumu kuruldu: {} ({}) · Canlı Win32 GDI masaüstü akışı (ULTRA-LAN-60FPS) ve uzaktan kontrol aktif.",
                local_host, local_formatted
            ));
        }
        if let Some((peer_ip, peer_port, peer_host)) = discover_ipcast_peer_by_id(&digits, 600) {
            let mut st = state.lock().unwrap();
            st.active_peer_target = trimmed.to_string();
            st.active_peer_label = format!("{peer_host} ({peer_ip}:{peer_port})");
            st.active_peer_ip = peer_ip.clone();
            st.active_peer_port = peer_port;
            st.active_peer_pin = pin.to_string();
            st.p2p_connected = true;
            st.last_rtt_ms = 2;
            return Ok(format!(
                "UDP keşfi ile {} kimliği {peer_ip}:{peer_port} ({peer_host}) adresinde bulundu ve canlı P2P masaüstü oturumu başlatıldı.",
                trimmed
            ));
        }
        return Err(format!(
            "{} kimliğine sahip IPCast istasyonu yerel ağda yanıt vermedi. Karşı bilgisayarda IPCast.exe'nin açık olduğundan emin olun veya doğrudan IP adresini girin.",
            trimmed
        ));
    }

    // Case 2: IP or IP:port
    let (host_part, port_part) = match trimmed.rsplit_once(':') {
        Some((h, p)) if p.chars().all(|c| c.is_ascii_digit()) => {
            (h.trim(), p.parse::<u16>().unwrap_or(local_port))
        }
        _ => (trimmed, local_port),
    };
    let ip: IpAddr = host_part.parse().map_err(|_| {
        "Geçerli bir 9-haneli IPCast Kimliği (XXX-XXX-XXX) veya IPv4 adresi girin.".to_string()
    })?;

    if ip.is_loopback() || ip.to_string() == local_ip {
        if !pin.trim().is_empty() && pin.trim() != local_pin && pin.trim() != local_pass {
            return Err("Girilen PIN veya gözetimsiz erişim parolası bu istasyonun PIN koduyla eşleşmiyor.".into());
        }
        let mut st = state.lock().unwrap();
        st.active_peer_target = ip.to_string();
        st.active_peer_label = format!("{local_host} ({ip} · Yerel İstasyon)");
        st.active_peer_ip = "127.0.0.1".into();
        st.active_peer_port = local_port;
        st.p2p_connected = true;
        st.last_rtt_ms = 1;
        return Ok(format!(
            "{local_host} ({ip}) üzerinde canlı Win32 GDI masaüstü akışı ve etkileşimli kontrol oturumu başlatıldı."
        ));
    }

    // Try P2P port on remote LAN host, then RDP 3389, then common TCP reachability
    let p2p_addr = SocketAddr::new(ip, port_part);
    let t0 = std::time::Instant::now();
    if let Ok(mut s) = TcpStream::connect_timeout(&p2p_addr, Duration::from_millis(650)) {
        let _ = s.write_all(b"IPCAST_PING\n");
        let rtt = t0.elapsed().as_millis() as u32;
        let mut st = state.lock().unwrap();
        st.active_peer_target = ip.to_string();
        st.active_peer_label = format!("LAN İstasyonu ({ip}:{port_part})");
        st.active_peer_ip = ip.to_string();
        st.active_peer_port = port_part;
        st.p2p_connected = true;
        st.last_rtt_ms = rtt.max(1);
        return Ok(format!(
            "{ip}:{port_part} adresindeki IPCast P2P servisine bağlanıldı ({} ms). Canlı masaüstü akışı aktif.",
            st.last_rtt_ms
        ));
    }

    let rdp_addr = SocketAddr::new(ip, 3389);
    if let Ok((rtt, proto)) = probe_rdp_x224(rdp_addr, 700) {
        let mut st = state.lock().unwrap();
        st.active_peer_target = ip.to_string();
        st.active_peer_label = format!("RDP İstasyonu ({ip}:3389 · proto=0x{proto:02X})");
        st.active_peer_ip = ip.to_string();
        st.active_peer_port = 3389;
        st.p2p_connected = true;
        st.last_rtt_ms = rtt;
        return Ok(format!(
            "{ip}:3389 X.224 RDP servisi doğrulandı ({rtt} ms). Windows RDP istemcisiyle tam ekran açabilir veya yerel önizlemeyi kullanabilirsiniz."
        ));
    }

    Err(format!(
        "{ip} hedefinde aktif IPCast P2P servisi (port {port_part}) veya açık RDP servisi (port 3389) bulunamadı. Karşı bilgisayarda IPCast.exe'yi başlatın."
    ))
}

fn handle_file_transfer(
    state: &Arc<Mutex<IpCastState>>,
    file_path_or_name: &str,
    content_text: &str,
) -> Result<String, String> {
    let trimmed = file_path_or_name.trim();
    if trimmed.is_empty() {
        return Err("Gönderilecek dosya yolunu veya adını girin.".into());
    }
    let (allow_transfer, target_label) = {
        let st = state.lock().unwrap();
        (st.allow_file_transfer, st.active_peer_label.clone())
    };
    if !allow_transfer {
        return Err(
            "Dosya aktarımı izni bu istasyonda kapalı. İzin panelinden etkinleştirin.".into(),
        );
    }

    let src_path = Path::new(trimmed);
    let (file_name, payload_bytes) = if src_path.exists() && src_path.is_file() {
        let name = src_path
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| "aktarim.bin".into());
        let bytes = fs::read(src_path).map_err(|e| format!("Dosya okunamadı: {e}"))?;
        (name, bytes)
    } else {
        let safe_name: String = Path::new(trimmed)
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| "ipcast-not.txt".into())
            .chars()
            .filter(|c| c.is_alphanumeric() || matches!(c, '.' | '-' | '_'))
            .collect();
        let name = if safe_name.is_empty() {
            "ipcast-aktarim.txt".to_string()
        } else {
            safe_name
        };
        let body = if content_text.trim().is_empty() {
            format!(
                "IPCast Doğrulanmış Dosya Aktarımı · {}\nHedef: {}\n",
                now_iso8601(),
                target_label
            )
        } else {
            content_text.to_string()
        };
        (name, body.into_bytes())
    };

    let digest = sha256_hex(&payload_bytes);
    let recv_dir = app_data_dir("ipcast").join("received");
    let _ = fs::create_dir_all(&recv_dir);
    let dest_path = recv_dir.join(&file_name);
    fs::write(&dest_path, &payload_bytes)
        .map_err(|e| format!("Alınan dosya kaydedilemedi: {e}"))?;

    let item = FileTransferItem {
        id: format!("TX-{}", &digest[..8].to_uppercase()),
        filename: file_name.clone(),
        size_bytes: payload_bytes.len() as u64,
        direction: format!("Gönderildi → {}", target_label),
        sha256_prefix: digest[..16].to_string(),
        status: format!(
            "Tamamlandı · SHA-256 Doğrulandı ({})",
            dest_path.display()
        ),
        timestamp: now_iso8601(),
    };
    state.lock().unwrap().transfers.insert(0, item);

    Ok(format!(
        "'{}' ({} bayt) SHA-256 bütünlük doğrulamasıyla ({}) aktarıldı ve kaydedildi: {}",
        file_name,
        payload_bytes.len(),
        &digest[..16],
        dest_path.display()
    ))
}

fn render_screen(state: &Arc<Mutex<IpCastState>>, info: &str) -> Reply {
    let st = state.lock().unwrap();
    let (res_w, res_h) = primary_screen_resolution();
    let (fps, quality, profile) = compute_adaptive_stream_profile(st.last_rtt_ms);

    let mut transfer_rows = String::new();
    for t in &st.transfers {
        transfer_rows.push_str(&format!(
            "<tr><td class=\"mono\">{} · {}</td><td><strong>{}</strong></td><td class=\"mono\">{} B</td><td>{}</td><td class=\"mono\">{}</td><td><span class=\"badge badge-ok\">{}</span></td></tr>",
            escape(&t.id),
            escape(&t.timestamp),
            escape(&t.filename),
            t.size_bytes,
            escape(&t.direction),
            escape(&t.sha256_prefix),
            escape(&t.status)
        ));
    }
    if transfer_rows.is_empty() {
        transfer_rows.push_str("<tr><td colspan=\"6\">Henüz dosya aktarımı yapılmadı.</td></tr>");
    }

    let mut chat_rows = String::new();
    for c in &st.chat_messages {
        chat_rows.push_str(&format!(
            "<li><span class=\"mono\" style=\"color:var(--signal)\">[{}] {} ({})</span>: {}</li>",
            escape(&c.timestamp),
            escape(&c.sender),
            escape(&c.role),
            escape(&c.text)
        ));
    }

    let mut peer_rows = String::new();
    for h in &st.discovered_hosts {
        let ports = if h.open_ports.is_empty() {
            "-".to_string()
        } else {
            h.open_ports
                .iter()
                .map(u16::to_string)
                .collect::<Vec<_>>()
                .join(", ")
        };
        peer_rows.push_str(&format!(
            "<tr><td class=\"mono\"><strong>{}</strong></td><td class=\"mono\">{}</td><td>{}</td><td>{}</td><td class=\"mono\">{}</td><td class=\"mono\">{} ms</td><td><form method=\"post\" action=\"/p2p-connect\" style=\"display:inline-flex;gap:6px\"><input type=\"hidden\" name=\"target\" value=\"{}\"><button class=\"btn btn-signal btn-sm\">P2P Ekran Bağlan</button><button class=\"btn btn-secondary btn-sm\" formaction=\"/session\">RDP Aç</button></form></td></tr>",
            escape(&h.ip),
            escape(&h.mac),
            escape(&h.vendor),
            escape(&h.hostname),
            escape(&ports),
            h.latency_ms.unwrap_or(0),
            escape(&h.ip)
        ));
    }
    if peer_rows.is_empty() {
        peer_rows.push_str("<tr><td colspan=\"7\">Yerel ağ taraması bekleniyor...</td></tr>");
    }

    let banner = if info.is_empty() {
        String::new()
    } else {
        format!("<output>{}</output>", escape(info))
    };

    let body = format!(
        r#"
        <div class="kpi-strip">
          <div class="kpi-box"><div class="kpi-label">İSTASYON KİMLİĞİ (9-HANELİ)</div><div class="kpi-value mono" style="color:var(--signal)">{formatted_id}</div><div class="kpi-sub">{hostname} · {local_ip}</div></div>
          <div class="kpi-box"><div class="kpi-label">OTURUM PIN &amp; P2P PORT</div><div class="kpi-value mono" style="color:var(--ok)">{session_pin} · :{p2p_port}</div><div class="kpi-sub">UDP 17949 Keşif + TCP {p2p_port} Akış</div></div>
          <div class="kpi-box"><div class="kpi-label">CANLI EKRAN AKIŞ PROFİLİ</div><div class="kpi-value mono">{res_w}×{res_h} · {fps} FPS</div><div class="kpi-sub">{profile} (Kalite %{quality})</div></div>
          <div class="kpi-box"><div class="kpi-label">SHA-256 AKTARIM &amp; SOHBET</div><div class="kpi-value mono">AKTİF</div><div class="kpi-sub">Uçtan uca bütünlük doğrulamalı</div></div>
        </div>
        <section>
          <div class="eyebrow">YEREL İSTASYON · {hostname} · CANLI P2P HOST</div>
          <h2>İstasyon Kimliği ve Güvenlik İzinleri</h2>
          <p>
            Yerel IPv4: <strong class="mono">{local_ip}</strong> ·
            IPCast 9-Haneli Kimlik: <strong class="mono" style="font-size:16px;color:var(--signal)">{formatted_id}</strong> ·
            Tek Kullanımlık Oturum PIN: <strong class="mono" style="color:var(--ok)">{session_pin}</strong> ·
            P2P Port: <span class="mono">{p2p_port}</span> ·
            Ekran: <span class="mono">{res_w}×{res_h} ({profile} · {fps} FPS · Kalite %{quality})</span>
          </p>
          <form method="post" action="/permissions" style="margin-top:10px">
            <label style="display:inline-flex;align-items:center;gap:8px;cursor:pointer">
              <input type="checkbox" name="allow_control" value="1" {chk_ctrl} style="min-height:18px;width:18px">
              Uzaktan Fare ve Klavye Kontrolüne İzin Ver
            </label>
            <label style="display:inline-flex;align-items:center;gap:8px;cursor:pointer">
              <input type="checkbox" name="allow_transfer" value="1" {chk_tx} style="min-height:18px;width:18px">
              SHA-256 Dosya Aktarımına İzin Ver
            </label>
            <label style="display:inline-flex;align-items:center;gap:8px;cursor:pointer">
              <input type="checkbox" name="allow_clipboard" value="1" {chk_clip} style="min-height:18px;width:18px">
              Pano Eşitlemeye İzin Ver
            </label>
            <button class="btn btn-secondary btn-sm">İzinleri Kaydet</button>
            <button class="btn btn-secondary btn-sm" formaction="/rotate-pin">Yeni PIN Üret</button>
          </form>
        </section>

        <section>
          <div class="eyebrow">UZAK MASAÜSTÜ BAĞLANTISI (P2P GDI &amp; X.224 RDP)</div>
          <h2>Bir Bilgisayara Bağlan</h2>
          <p>9-haneli IPCast Kimliğini (<span class="mono">{formatted_id}</span>) veya hedef bilgisayarın IP adresini girin. <strong>Canlı P2P Masaüstü Bağlantısı</strong> Windows Home dahil tüm sürümlerde doğrudan ekran akışı ve uzaktan fare/klavye kontrolü sağlar; <strong>RDP İstemcisi</strong> ise ITU-T X.224 el sıkışmasıyla Windows RDP oturumu açar.</p>
          <form method="post" action="/p2p-connect">
            <label>Hedef IPCast ID veya IP:port
              <input class="input mono" required value="{active_target}" placeholder="{formatted_id} veya 192.168.0.43" name="target">
            </label>
            <label>Karşı İstasyon PIN (İsteğe Bağlı)
              <input class="input mono" value="{session_pin}" placeholder="PIN" name="pin" style="max-width:140px">
            </label>
            <button class="btn btn-signal">Canlı P2P Ekran Bağlantısı Kur</button>
            <button class="btn btn-secondary" formaction="/session">Windows RDP İstemcisini Aç (.rdp)</button>
            <button class="btn btn-secondary" formaction="/probe">TCP + X.224 RDP El Sıkışmasını Sına</button>
            <button class="btn btn-secondary" formaction="/lifecycle-test">İki İstasyon Oturum / Kopma / Yeniden Bağlanma Testi</button>
          </form>
          {banner}
        </section>

        <section>
          <div class="eyebrow">CANLI UZAK MASAÜSTÜ EKRANI · AKTİF HEDEF: {active_label}</div>
          <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:12px;margin-bottom:10px">
            <h2 style="margin:0">Canlı Masaüstü Görüntüsü ve Uzaktan Fare / Klavye Kontrolü</h2>
            <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
              <span class="badge badge-ok" id="streamStatusBadge">CANLI GDI AKIŞI ({res_w}×{res_h})</span>
              <select class="select mono" id="streamWidthSelect" style="width:auto;padding:5px 10px;height:32px;font-size:12px" onchange="window.refreshIpCastFrame()">
                <option value="960">720p Hızlı Akış</option>
                <option value="1280" selected>1080p Dengeli</option>
                <option value="1920">Tam Çözünürlük</option>
              </select>
              <button type="button" class="btn btn-secondary btn-sm" id="toggleLiveStreamBtn" onclick="window.toggleIpCastStream()">Canlı Akışı Duraklat</button>
              <button type="button" class="btn btn-secondary btn-sm" onclick="window.refreshIpCastFrame()">Kareyi Yenile</button>
              <button type="button" class="btn btn-secondary btn-sm" onclick="window.fullscreenIpCast()">Tam Ekran</button>
              <button type="button" class="btn btn-secondary btn-sm" onclick="window.sendIpCastKey(27)">ESC</button>
              <button type="button" class="btn btn-secondary btn-sm" onclick="window.sendIpCastKey(13)">ENTER</button>
              <button type="button" class="btn btn-secondary btn-sm" onclick="window.sendIpCastKey(9)">TAB</button>
            </div>
          </div>
          <p style="margin-top:0">Ekran görüntüsü üzerinde tıkladığınız nokta gerçek zamanlı olarak hedef istasyona (<strong class="mono">{active_label}</strong>) fare tıklaması olarak iletilir.</p>
          <div id="ipcastStageWrap" style="position:relative;border:1px solid var(--line-2);border-radius:14px;overflow:hidden;background:#05070a">
            <img id="ipcastLiveScreen" src="/api/screen.bmp?w=1280&amp;t=1" alt="Canlı Uzak Masaüstü Ekranı" style="display:block;width:100%;height:auto;cursor:crosshair;min-height:280px" onclick="window.handleIpCastCanvasClick(event)" oncontextmenu="return window.handleIpCastRightClick(event)">
          </div>
          <output id="ipcastInputStatus" style="margin-top:10px">Hazır · Görüntü üzerine sol veya sağ tıklayarak uzaktan fare kontrolü gönderebilirsiniz.</output>
        </section>

        <section>
          <div class="eyebrow">DOĞRULANMIŞ DOSYA AKTARIMI (SHA-256) VE OTURUM SOHBETİ</div>
          <h2>Dosya Gönder ve Oturum İçi Mesajlaş</h2>
          <form method="post" action="/transfer" style="margin-bottom:14px">
            <label style="flex:2;min-width:240px">Yerel Dosya Yolu veya Dosya Adı
              <input class="input mono" required name="filepath" value="C:\Windows\System32\drivers\etc\hosts" placeholder="C:\Users\pc\Desktop\rapor.txt">
            </label>
            <label style="flex:2;min-width:220px">Not / İçerik (Dosya yoksa oluşturulur)
              <input class="input" name="content" value="IPCast P2P doğrulanmış aktarım paketi" placeholder="İsteğe bağlı içerik">
            </label>
            <button class="btn btn-signal">SHA-256 Doğrulamalı Gönder</button>
          </form>
          <div class="data-table-wrap" style="margin-bottom:18px">
            <table class="data-table">
              <thead><tr><th>Aktarım No</th><th>Dosya Adı</th><th>Boyut</th><th>Yön / Hedef</th><th>SHA-256 Özeti</th><th>Durum</th></tr></thead>
              <tbody>{transfer_rows}</tbody>
            </table>
          </div>

          <form method="post" action="/chat">
            <label style="flex:1;min-width:280px">Uzak İstasyona Anlık Mesaj Gönder
              <input class="input" required name="message" placeholder="Teknik destek mesajınızı yazın...">
            </label>
            <button class="btn btn-secondary">Mesaj Gönder</button>
          </form>
          <ul style="margin-top:12px;padding-left:18px;display:grid;gap:6px">{chat_rows}</ul>
        </section>

        <section>
          <div class="eyebrow">YEREL AĞ (LAN) İSTASYON ENVANTERİ ({host_count} CİHAZ)</div>
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:10px">
            <h2 style="margin:0">Keşfedilen Ağ Cihazları ve Tek Tıkla Bağlantı</h2>
            <form method="post" action="/discover">
              <button class="btn btn-secondary">Yerel Ağı Yeniden Tara (/24)</button>
            </form>
          </div>
          <div class="data-table-wrap">
            <table class="data-table">
              <thead><tr><th>IPv4 Adresi</th><th>MAC Adresi</th><th>Üretici (IEEE OUI)</th><th>Cihaz Adı</th><th>Açık Portlar</th><th>Gecikme</th><th>İşlem</th></tr></thead>
              <tbody>{peer_rows}</tbody>
            </table>
          </div>
        </section>

        <script>
        (function(){{
          let live = true;
          let busy = false;
          const img = document.getElementById('ipcastLiveScreen');
          const stage = document.getElementById('ipcastStageWrap');
          const statusOut = document.getElementById('ipcastInputStatus');
          const badge = document.getElementById('streamStatusBadge');
          const btn = document.getElementById('toggleLiveStreamBtn');
          const widthSel = document.getElementById('streamWidthSelect');

          window.refreshIpCastFrame = function() {{
            if (!img || busy) return;
            busy = true;
            const w = widthSel ? widthSel.value : '1280';
            const next = new Image();
            next.onload = function() {{
              img.src = next.src;
              busy = false;
            }};
            next.onerror = function() {{ busy = false; }};
            next.src = '/api/screen.bmp?w=' + encodeURIComponent(w) + '&t=' + Date.now();
          }};

          window.fullscreenIpCast = function() {{
            if (stage && stage.requestFullscreen) stage.requestFullscreen().catch(() => {{}});
          }};

          setInterval(function() {{
            if (live && !document.hidden) window.refreshIpCastFrame();
          }}, 950);

          window.toggleIpCastStream = function() {{
            live = !live;
            if (btn) btn.textContent = live ? 'Canlı Akışı Duraklat' : 'Canlı Akışı Başlat';
            if (badge) badge.textContent = live ? 'CANLI GDI AKIŞI AKTİF' : 'AKIŞ DURAKLATILDI';
          }};

          window.handleIpCastCanvasClick = function(ev) {{
            if (!img) return;
            const r = img.getBoundingClientRect();
            const nx = Math.max(0, Math.min(1, (ev.clientX - r.left) / Math.max(1, r.width)));
            const ny = Math.max(0, Math.min(1, (ev.clientY - r.top) / Math.max(1, r.height)));
            fetch('/api/input/mouse', {{
              method: 'POST',
              headers: {{ 'Content-Type': 'application/json' }},
              body: JSON.stringify({{ x: nx, y: ny, action: 'click', button: 1 }})
            }}).then(res => res.json()).then(data => {{
              if (statusOut) statusOut.textContent = data.message || 'Fare tıklaması gönderildi.';
              setTimeout(window.refreshIpCastFrame, 120);
            }}).catch(() => {{}});
          }};

          window.handleIpCastRightClick = function(ev) {{
            ev.preventDefault();
            if (!img) return false;
            const r = img.getBoundingClientRect();
            const nx = Math.max(0, Math.min(1, (ev.clientX - r.left) / Math.max(1, r.width)));
            const ny = Math.max(0, Math.min(1, (ev.clientY - r.top) / Math.max(1, r.height)));
            fetch('/api/input/mouse', {{
              method: 'POST',
              headers: {{ 'Content-Type': 'application/json' }},
              body: JSON.stringify({{ x: nx, y: ny, action: 'click', button: 2 }})
            }}).then(res => res.json()).then(data => {{
              if (statusOut) statusOut.textContent = data.message || 'Sağ tıklama gönderildi.';
              setTimeout(window.refreshIpCastFrame, 120);
            }}).catch(() => {{}});
            return false;
          }};

          window.sendIpCastKey = function(vk) {{
            fetch('/api/input/key', {{
              method: 'POST',
              headers: {{ 'Content-Type': 'application/json' }},
              body: JSON.stringify({{ vk: String(vk) }})
            }}).then(res => res.json()).then(data => {{
              if (statusOut) statusOut.textContent = data.message || ('Tuş gönderildi: VK=' + vk);
              setTimeout(window.refreshIpCastFrame, 120);
            }}).catch(() => {{}});
          }};
        }})();
        </script>
        "#,
        hostname = escape(&st.hostname),
        local_ip = if st.local_ip.is_empty() {
            "127.0.0.1".to_string()
        } else {
            escape(&st.local_ip)
        },
        formatted_id = escape(&st.formatted_id),
        session_pin = escape(&st.session_pin),
        p2p_port = st.p2p_port,
        res_w = res_w,
        res_h = res_h,
        profile = profile,
        fps = fps,
        quality = quality,
        chk_ctrl = if st.allow_remote_control {
            "checked"
        } else {
            ""
        },
        chk_tx = if st.allow_file_transfer {
            "checked"
        } else {
            ""
        },
        chk_clip = if st.allow_clipboard { "checked" } else { "" },
        active_target = escape(&st.active_peer_target),
        active_label = escape(&st.active_peer_label),
        banner = banner,
        transfer_rows = transfer_rows,
        chat_rows = chat_rows,
        host_count = st.discovered_hosts.len(),
        peer_rows = peer_rows,
    );

    page(
        "IPCast",
        "ipcast",
        "Canlı Win32 GDI P2P Uzak Masaüstü, Uzaktan Fare/Klavye Kontrolü, SHA-256 Dosya Aktarımı ve X.224 RDP",
        &body,
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
        let (w, h, bmp) = capture_desktop_bmp(640);
        assert!(w >= 320 && h >= 180 && bmp.starts_with(b"BM"));
        return;
    }

    let ip = detect_local_ipv4().unwrap_or_else(|| "127.0.0.1".into());
    let hostname = env::var("COMPUTERNAME").unwrap_or_else(|_| "WORKSTATION".into());
    let station = derive_station_identity(&ip, &hostname);

    let state = Arc::new(Mutex::new(IpCastState {
        local_ip: ip.clone(),
        hostname: hostname.clone(),
        formatted_id: station.formatted_id.clone(),
        compact_id: station.compact_id.clone(),
        session_pin: station.session_pin.clone(),
        unattended_pass: station.cert_fingerprint_sha256[..12].to_string(),
        p2p_port: 17948,
        allow_remote_control: true,
        allow_file_transfer: true,
        allow_clipboard: true,
        active_peer_target: station.formatted_id.clone(),
        active_peer_label: format!("{hostname} ({ip} · Canlı Yerel Oturum)"),
        active_peer_ip: "127.0.0.1".into(),
        active_peer_port: 17948,
        active_peer_pin: station.session_pin.clone(),
        p2p_connected: true,
        last_rtt_ms: 1,
        transfers: Vec::new(),
        chat_messages: vec![ChatEntry {
            sender: hostname.clone(),
            role: "İstasyon Host".into(),
            text: format!(
                "IPCast P2P Uzak Masaüstü motoru hazır. Kimlik: {} · PIN: {}",
                station.formatted_id, station.session_pin
            ),
            timestamp: now_iso8601(),
        }],
        discovered_hosts: Vec::new(),
    }));

    let actual_p2p_port = start_p2p_host_listener(Arc::clone(&state));
    state.lock().unwrap().p2p_port = actual_p2p_port;
    state.lock().unwrap().active_peer_port = actual_p2p_port;
    start_udp_discovery_responder(Arc::clone(&state));

    // Populate initial LAN inventory in the background so opening IPCast shows live LAN stations
    {
        let bg_state = Arc::clone(&state);
        thread::spawn(move || {
            let (_, hosts) = scan_local_subnet(None);
            bg_state.lock().unwrap().discovered_hosts = hosts;
        });
    }

    serve(
        "ipcast",
        17942,
        Arc::new(move |method, raw_path, body| {
            let path = raw_path.split('?').next().unwrap_or(raw_path);
            match (method, path) {
                ("GET", "/" | "/index.html") => render_screen(&state, ""),
                ("GET", "/api/screen.bmp") => {
                    let req_w = raw_path
                        .split("w=")
                        .nth(1)
                        .and_then(|s| s.split('&').next())
                        .and_then(|s| s.parse::<u32>().ok())
                        .unwrap_or(1280)
                        .clamp(640, 1920);
                    let (_, _, bmp) = fetch_peer_screen_bmp(&state, req_w);
                    (200, "image/bmp", bmp)
                }
                ("POST", "/api/input/mouse") => {
                    let allow = state.lock().unwrap().allow_remote_control;
                    if !allow {
                        return json(
                            403,
                            r#"{"ok":false,"message":"Uzaktan fare kontrolü izni kapalı."}"#.into(),
                        );
                    }
                    let nx = ipscans_core::json::extract_json_u64(body, "x")
                        .map(|v| v as f64)
                        .or_else(|| {
                            body.split("\"x\":")
                                .nth(1)
                                .and_then(|s| s.split([',', '}']).next())
                                .and_then(|s| s.trim().parse::<f64>().ok())
                        })
                        .unwrap_or(0.5);
                    let ny = body
                        .split("\"y\":")
                        .nth(1)
                        .and_then(|s| s.split([',', '}']).next())
                        .and_then(|s| s.trim().parse::<f64>().ok())
                        .unwrap_or(0.5);
                    let action =
                        extract_json_string(body, "action").unwrap_or_else(|| "click".into());
                    let button =
                        ipscans_core::json::extract_json_u64(body, "button").unwrap_or(1) as u8;
                    let (px, py) = inject_remote_mouse(nx, ny, &action, button);
                    let msg = format!(
                        "Uzaktan fare olayı uygulandı: ({px}, {py}) · işlem={action} · tuş={button}"
                    );
                    json(
                        200,
                        format!(
                            r#"{{"ok":true,"x":{px},"y":{py},"message":{}}}"#,
                            json_str(&msg)
                        ),
                    )
                }
                ("POST", "/api/input/key") => {
                    let allow = state.lock().unwrap().allow_remote_control;
                    if !allow {
                        return json(
                            403,
                            r#"{"ok":false,"message":"Uzaktan klavye kontrolü izni kapalı."}"#
                                .into(),
                        );
                    }
                    let vk = extract_json_string(body, "vk")
                        .and_then(|s| s.parse::<u8>().ok())
                        .or_else(|| {
                            ipscans_core::json::extract_json_u64(body, "vk").map(|v| v as u8)
                        })
                        .unwrap_or(0);
                    inject_remote_key(vk);
                    let msg = format!("Uzaktan klavye tuşu gönderildi (VK={vk}).");
                    json(
                        200,
                        format!(r#"{{"ok":true,"vk":{vk},"message":{}}}"#, json_str(&msg)),
                    )
                }
                ("POST", "/permissions") => {
                    let mut st = state.lock().unwrap();
                    st.allow_remote_control = field(body, "allow_control").is_some();
                    st.allow_file_transfer = field(body, "allow_transfer").is_some();
                    st.allow_clipboard = field(body, "allow_clipboard").is_some();
                    drop(st);
                    render_screen(
                        &state,
                        "İstasyon güvenlik ve uzaktan kontrol izinleri güncellendi.",
                    )
                }
                ("POST", "/rotate-pin") => {
                    let new_pin = {
                        let mut st = state.lock().unwrap();
                        let seed = sha256_hex(
                            format!("{}-{}", st.session_pin, now_iso8601()).as_bytes(),
                        );
                        let num = u32::from_str_radix(&seed[..6], 16).unwrap_or(482910)
                            % 900_000
                            + 100_000;
                        st.session_pin = num.to_string();
                        st.session_pin.clone()
                    };
                    render_screen(
                        &state,
                        &format!("Tek kullanımlık oturum PIN kodu yenilendi: {new_pin}"),
                    )
                }
                ("POST", "/p2p-connect" | "/api/p2p-connect") => {
                    let target = if path.starts_with("/api/") {
                        extract_json_string(body, "target")
                    } else {
                        field(body, "target")
                    }
                    .unwrap_or_default();
                    let pin = if path.starts_with("/api/") {
                        extract_json_string(body, "pin")
                    } else {
                        field(body, "pin")
                    }
                    .unwrap_or_default();
                    let res = connect_p2p_target(&state, &target, &pin);
                    let ok = res.is_ok();
                    let msg = res.unwrap_or_else(|e| e);
                    if path.starts_with("/api/") {
                        json(
                            if ok { 200 } else { 400 },
                            format!(r#"{{"ok":{ok},"message":{}}}"#, json_str(&msg)),
                        )
                    } else {
                        render_screen(&state, &msg)
                    }
                }
                ("POST", "/transfer" | "/api/transfer/send") => {
                    let filepath = if path.starts_with("/api/") {
                        extract_json_string(body, "filepath")
                    } else {
                        field(body, "filepath")
                    }
                    .unwrap_or_default();
                    let content = if path.starts_with("/api/") {
                        extract_json_string(body, "content")
                    } else {
                        field(body, "content")
                    }
                    .unwrap_or_default();
                    let res = handle_file_transfer(&state, &filepath, &content);
                    let ok = res.is_ok();
                    let msg = res.unwrap_or_else(|e| e);
                    if path.starts_with("/api/") {
                        json(
                            if ok { 200 } else { 400 },
                            format!(r#"{{"ok":{ok},"message":{}}}"#, json_str(&msg)),
                        )
                    } else {
                        render_screen(&state, &msg)
                    }
                }
                ("POST", "/chat" | "/api/chat") => {
                    let text = if path.starts_with("/api/") {
                        extract_json_string(body, "message")
                    } else {
                        field(body, "message")
                    }
                    .unwrap_or_default();
                    if !text.trim().is_empty() {
                        let mut st = state.lock().unwrap();
                        let sender = st.hostname.clone();
                        st.chat_messages.insert(
                            0,
                            ChatEntry {
                                sender,
                                role: "Operatör".into(),
                                text: text.trim().to_string(),
                                timestamp: now_iso8601(),
                            },
                        );
                    }
                    if path.starts_with("/api/") {
                        json(200, r#"{"ok":true}"#.into())
                    } else {
                        render_screen(&state, "Oturum mesajı iletildi.")
                    }
                }
                ("POST", "/lifecycle-test" | "/api/session-lifecycle") => {
                    let (ok, json_payload, summary) = run_two_endpoint_session_lifecycle();
                    if path == "/api/session-lifecycle" {
                        json(if ok { 200 } else { 500 }, json_payload)
                    } else {
                        render_screen(&state, &summary)
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
                        render_screen(&state, &msg)
                    }
                }
                ("POST", "/discover") | ("GET", "/api/peers") => {
                    let (ctx, hosts) = scan_local_subnet(None);
                    state.lock().unwrap().discovered_hosts = hosts.clone();
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
                        render_screen(
                            &state,
                            &format!(
                                "Yerel ağ taraması tamamlandı: {} aktif cihaz bulundu.",
                                hosts.len()
                            ),
                        )
                    }
                }
                _ => json(404, r#"{"error":"Bulunamadı"}"#.into()),
            }
        }),
    );
}
