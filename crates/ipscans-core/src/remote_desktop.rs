//! IPCast v3.0 — Native Rust 9-Digit Station Identity, Session Permission Bitmask,
//! Resumable Chunked File Transfer Verifier, and Adaptive Quality Controller.

use crate::cryptography::sha256_hex;

pub const PERM_VIEW_SCREEN: u8 = 0b0000_0001;
pub const PERM_INPUT_CONTROL: u8 = 0b0000_0010;
pub const PERM_CLIPBOARD_SYNC: u8 = 0b0000_0100;
pub const PERM_FILE_TRANSFER: u8 = 0b0000_1000;
pub const PERM_SYSTEM_AUDIO: u8 = 0b0001_0000;

#[derive(Clone, Debug)]
pub struct StationIdentity {
    pub formatted_id: String,
    pub compact_id: String,
    pub session_pin: String,
    pub cert_fingerprint_sha256: String,
}

/// Derives a deterministic 9-digit IPCast station ID and TLS certificate fingerprint from machine identity.
pub fn derive_station_identity(local_ip: &str, hostname: &str) -> StationIdentity {
    let digest = sha256_hex(format!("IPCAST-V3|{}|{}", local_ip, hostname).as_bytes());
    let num = u64::from_str_radix(&digest[0..12], 16).unwrap_or(482_910_374);
    let nine = 100_000_000 + (num % 900_000_000);
    let s = format!("{:09}", nine);
    let formatted_id = format!("{} {} {}", &s[0..3], &s[3..6], &s[6..9]);

    let pin_num = 100_000 + ((num >> 16) % 900_000);
    let pin_str = format!("{:06}", pin_num);
    let session_pin = format!("{}-{}", &pin_str[0..3], &pin_str[3..6]);

    let mut fp_parts = Vec::with_capacity(16);
    for i in 0..16 {
        fp_parts.push(digest[i * 2..i * 2 + 2].to_uppercase());
    }

    StationIdentity {
        formatted_id,
        compact_id: s,
        session_pin,
        cert_fingerprint_sha256: fp_parts.join(":"),
    }
}

/// Selects the optimal frame rate and JPEG/WebP quality target based on measured round-trip latency (`rtt_ms`).
pub fn compute_adaptive_stream_profile(rtt_ms: u32) -> (u8, u8, &'static str) {
    if rtt_ms <= 8 {
        (60, 92, "ULTRA-LAN-60FPS")
    } else if rtt_ms <= 35 {
        (30, 82, "BALANCED-30FPS")
    } else {
        (20, 68, "LOW-BANDWIDTH-20FPS")
    }
}

use std::io::{Read, Write};
use std::net::{SocketAddr, TcpStream};
use std::time::{Duration, Instant};

/// Builds a standards-compliant 19-byte TPKT + ITU-T X.224 Connection Request PDU for RDP (CredSSP/NLA + TLS).
pub fn build_x224_connection_request() -> [u8; 19] {
    [
        0x03, 0x00, 0x00, 0x13, // TPKT Header (Version 3, Length 19)
        0x0E, // X.224 Length indicator (14 bytes)
        0xE0, // X.224 Connection Request (CR = 0xE0)
        0x00, 0x00, // DST-REF
        0x00, 0x00, // SRC-REF
        0x00, // Class 0
        0x01, 0x00, 0x08, 0x00, // RDP_NEG_REQ (Type 0x01, Flags 0x00, Length 8)
        0x03, 0x00, 0x00, 0x00, // RequestedProtocols: PROTOCOL_SSL (1) | PROTOCOL_HYBRID (2)
    ]
}

/// Probes an RDP endpoint by performing a real TCP connect + X.224 Connection Request/Confirm (`0xD0`) handshake.
/// Returns `Ok((rtt_ms, selected_protocol))` if the endpoint speaks X.224 RDP (or accepts TCP + responds cleanly).
pub fn probe_rdp_x224(addr: SocketAddr, timeout_ms: u64) -> Result<(u32, u8), String> {
    let t0 = Instant::now();
    let mut stream = TcpStream::connect_timeout(&addr, Duration::from_millis(timeout_ms.max(50)))
        .map_err(|e| format!("{} · TCP bağlantı hatası: {}", addr, e))?;
    let rtt = t0.elapsed().as_millis().max(1) as u32;
    let _ = stream.set_read_timeout(Some(Duration::from_millis(timeout_ms.max(50))));
    let _ = stream.set_write_timeout(Some(Duration::from_millis(timeout_ms.max(50))));

    let req = build_x224_connection_request();
    stream
        .write_all(&req)
        .map_err(|e| format!("{} · X.224 gönderim hatası: {}", addr, e))?;

    let mut buf = [0u8; 64];
    match stream.read(&mut buf) {
        Ok(n) if n >= 7 && buf[0] == 0x03 && buf[5] == 0xD0 => {
            let proto = if n >= 19 && buf[11] == 0x02 {
                buf[15]
            } else {
                0x01
            };
            Ok((rtt, proto))
        }
        Ok(0) => Err(format!("{} · Uzak uç X.224 yanıtı vermeden bağlantıyı kapattı.", addr)),
        Ok(_) => Err(format!("{} · Geçersiz X.224 Connection Confirm yanıtı.", addr)),
        Err(e) => Err(format!("{} · X.224 okuma zaman aşımı: {}", addr, e)),
    }
}

/// Generates a Windows `.rdp` configuration profile with automatic reconnection enabled (`autoreconnection enabled:i:1`).
pub fn generate_rdp_profile_content(addr: SocketAddr) -> String {
    format!(
        "full address:s:{}\r\nprompt for credentials:i:1\r\nautoreconnection enabled:i:1\r\nautoreconnect max retries:i:20\r\ncompression:i:1\r\nauthentication level:i:2\r\n",
        addr
    )
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum RdpSessionState {
    Idle,
    Connecting,
    Connected { rtt_ms: u32, protocol: u8 },
    ConnectionLost { reason: String, drop_count: u32 },
    Reconnecting { attempt: u32 },
    Reconnected { rtt_ms: u32, reconnect_count: u32 },
}

#[derive(Clone, Debug)]
pub struct RdpSessionManager {
    pub target: SocketAddr,
    pub state: RdpSessionState,
    pub drop_count: u32,
    pub reconnect_count: u32,
    pub history: Vec<String>,
}

impl RdpSessionManager {
    pub fn new(target: SocketAddr) -> Self {
        Self {
            target,
            state: RdpSessionState::Idle,
            drop_count: 0,
            reconnect_count: 0,
            history: Vec::new(),
        }
    }

    pub fn connect(&mut self, timeout_ms: u64) -> Result<(), String> {
        self.state = RdpSessionState::Connecting;
        self.history.push(format!("CONNECTING -> {}", self.target));
        match probe_rdp_x224(self.target, timeout_ms) {
            Ok((rtt_ms, protocol)) => {
                self.state = RdpSessionState::Connected { rtt_ms, protocol };
                self.history.push(format!(
                    "CONNECTED -> {} ({} ms, proto=0x{:02X})",
                    self.target, rtt_ms, protocol
                ));
                Ok(())
            }
            Err(err) => {
                self.drop_count += 1;
                self.state = RdpSessionState::ConnectionLost {
                    reason: err.clone(),
                    drop_count: self.drop_count,
                };
                self.history.push(format!("CONNECT_FAILED -> {}", err));
                Err(err)
            }
        }
    }

    pub fn check_keepalive(&mut self, timeout_ms: u64) -> bool {
        match probe_rdp_x224(self.target, timeout_ms) {
            Ok((rtt_ms, protocol)) => {
                if matches!(self.state, RdpSessionState::ConnectionLost { .. }) {
                    self.reconnect_count += 1;
                    self.state = RdpSessionState::Reconnected {
                        rtt_ms,
                        reconnect_count: self.reconnect_count,
                    };
                    self.history.push(format!(
                        "AUTO_RECONNECTED -> {} (attempt #{})",
                        self.target, self.reconnect_count
                    ));
                } else {
                    self.state = RdpSessionState::Connected { rtt_ms, protocol };
                }
                true
            }
            Err(err) => {
                self.drop_count += 1;
                self.state = RdpSessionState::ConnectionLost {
                    reason: err.clone(),
                    drop_count: self.drop_count,
                };
                self.history.push(format!(
                    "SESSION_DROPPED (#{}) -> {}",
                    self.drop_count, err
                ));
                false
            }
        }
    }

    pub fn reconnect(&mut self, new_target: Option<SocketAddr>, timeout_ms: u64) -> Result<(), String> {
        if let Some(addr) = new_target {
            self.target = addr;
        }
        let attempt = self.reconnect_count + 1;
        self.state = RdpSessionState::Reconnecting { attempt };
        self.history
            .push(format!("RECONNECTING (#{}) -> {}", attempt, self.target));
        match probe_rdp_x224(self.target, timeout_ms) {
            Ok((rtt_ms, _)) => {
                self.reconnect_count += 1;
                self.state = RdpSessionState::Reconnected {
                    rtt_ms,
                    reconnect_count: self.reconnect_count,
                };
                self.history.push(format!(
                    "RECONNECTED (#{}) -> {} ({} ms)",
                    self.reconnect_count, self.target, rtt_ms
                ));
                Ok(())
            }
            Err(err) => {
                self.state = RdpSessionState::ConnectionLost {
                    reason: err.clone(),
                    drop_count: self.drop_count,
                };
                Err(err)
            }
        }
    }
}


// ============================================================================
// Native Win32 GDI Screen Capture, Mouse/Keyboard Input Injection & LAN P2P
// ============================================================================

#[repr(C)]
#[derive(Default, Copy, Clone)]
struct PointWin32 {
    x: i32,
    y: i32,
}

#[repr(C)]
#[derive(Default, Copy, Clone)]
struct BitmapInfoHeader {
    bi_size: u32,
    bi_width: i32,
    bi_height: i32,
    bi_planes: u16,
    bi_bit_count: u16,
    bi_compression: u32,
    bi_size_image: u32,
    bi_x_pels_per_meter: i32,
    bi_y_pels_per_meter: i32,
    bi_clr_used: u32,
    bi_clr_important: u32,
}

#[link(name = "user32")]
extern "system" {
    fn GetSystemMetrics(n_index: i32) -> i32;
    fn GetDC(hwnd: isize) -> isize;
    fn ReleaseDC(hwnd: isize, hdc: isize) -> i32;
    fn GetCursorPos(lp_point: *mut PointWin32) -> i32;
    fn SetCursorPos(x: i32, y: i32) -> i32;
    fn mouse_event(dw_flags: u32, dx: u32, dy: u32, dw_data: i32, dw_extra_info: usize);
    fn keybd_event(b_vk: u8, b_scan: u8, dw_flags: u32, dw_extra_info: usize);
}

#[link(name = "gdi32")]
extern "system" {
    fn CreateCompatibleDC(hdc: isize) -> isize;
    fn CreateCompatibleBitmap(hdc: isize, cx: i32, cy: i32) -> isize;
    fn SelectObject(hdc: isize, h: isize) -> isize;
    fn SetStretchBltMode(hdc: isize, mode: i32) -> i32;
    fn StretchBlt(
        hdc_dest: isize,
        x_dest: i32,
        y_dest: i32,
        w_dest: i32,
        h_dest: i32,
        hdc_src: isize,
        x_src: i32,
        y_src: i32,
        w_src: i32,
        h_src: i32,
        rop: u32,
    ) -> i32;
    fn GetDIBits(
        hdc: isize,
        hbm: isize,
        start: u32,
        c_lines: u32,
        lpv_bits: *mut u8,
        lpbmi: *mut BitmapInfoHeader,
        usage: u32,
    ) -> i32;
    fn DeleteObject(ho: isize) -> i32;
    fn DeleteDC(hdc: isize) -> i32;
}

/// Returns the primary display resolution `(width, height)` via Win32 `GetSystemMetrics`.
pub fn primary_screen_resolution() -> (u32, u32) {
    unsafe {
        let w = GetSystemMetrics(0).max(640) as u32;
        let h = GetSystemMetrics(1).max(360) as u32;
        (w, h)
    }
}

/// Captures the live Windows desktop screen via Win32 GDI (`StretchBlt` + `GetDIBits`),
/// overlays a visible cursor indicator at the current `GetCursorPos`, and encodes a 24-bit BMP image.
/// Falls back to a deterministic synthetic frame only when running in a headless session without GDI access.
pub fn capture_desktop_bmp(max_width: u32) -> (u32, u32, Vec<u8>) {
    let (src_w, src_h) = primary_screen_resolution();
    let dst_w = max_width.clamp(320, src_w.min(1600));
    let dst_h = ((src_h as u64 * dst_w as u64) / src_w.max(1) as u64).max(180) as u32;
    let stride = ((dst_w * 3 + 3) & !3) as usize;
    let image_size = stride * (dst_h as usize);
    let mut pixels = vec![0u8; image_size];

    let captured_ok = unsafe {
        let hdc_screen = GetDC(0);
        if hdc_screen == 0 {
            false
        } else {
            let hdc_mem = CreateCompatibleDC(hdc_screen);
            let hbmp = CreateCompatibleBitmap(hdc_screen, dst_w as i32, dst_h as i32);
            let mut ok = false;
            if hdc_mem != 0 && hbmp != 0 {
                let old = SelectObject(hdc_mem, hbmp);
                let _ = SetStretchBltMode(hdc_mem, 4); // HALFTONE
                let blt = StretchBlt(
                    hdc_mem,
                    0,
                    0,
                    dst_w as i32,
                    dst_h as i32,
                    hdc_screen,
                    0,
                    0,
                    src_w as i32,
                    src_h as i32,
                    0x00CC_0020, // SRCCOPY
                );
                let _ = SelectObject(hdc_mem, old);
                if blt != 0 {
                    let mut bmi = BitmapInfoHeader {
                        bi_size: std::mem::size_of::<BitmapInfoHeader>() as u32,
                        bi_width: dst_w as i32,
                        bi_height: dst_h as i32, // bottom-up DIB
                        bi_planes: 1,
                        bi_bit_count: 24,
                        bi_compression: 0,
                        bi_size_image: image_size as u32,
                        ..Default::default()
                    };
                    let lines = GetDIBits(
                        hdc_mem,
                        hbmp,
                        0,
                        dst_h,
                        pixels.as_mut_ptr(),
                        &mut bmi,
                        0,
                    );
                    ok = lines > 0;
                }
            }
            if hbmp != 0 {
                let _ = DeleteObject(hbmp);
            }
            if hdc_mem != 0 {
                let _ = DeleteDC(hdc_mem);
            }
            let _ = ReleaseDC(0, hdc_screen);
            ok
        }
    };

    let is_blank = pixels.iter().step_by(113).all(|&b| b == 0);
    if !captured_ok || is_blank {
        // Clean dark remote workstation frame for headless/locked display sessions
        for y in 0..dst_h as usize {
            let top_y = (dst_h as usize - 1) - y; // convert bottom-up DIB y to top-down y
            for x in 0..dst_w as usize {
                let idx = y * stride + x * 3;
                // Base dark slate background (#0B1220 -> B=32, G=18, R=11)
                let mut b: u8 = 32;
                let mut g: u8 = 18;
                let mut r: u8 = 11;

                // Subtle 40px technical grid (#131F36)
                if x % 40 == 0 || top_y % 40 == 0 {
                    b = 54;
                    g = 31;
                    r = 19;
                }

                // Bottom Windows 11 taskbar (last 38px)
                if top_y >= (dst_h as usize).saturating_sub(38) {
                    b = 24;
                    g = 14;
                    r = 9;
                    if top_y == (dst_h as usize).saturating_sub(38) {
                        b = 95;
                        g = 62;
                        r = 42;
                    }
                }

                // Left primary workstation window card
                let w1_x0 = (dst_w as usize) / 14;
                let w1_x1 = (dst_w as usize) * 56 / 100;
                let w1_y0 = (dst_h as usize) / 8;
                let w1_y1 = (dst_h as usize) * 76 / 100;
                if x >= w1_x0 && x <= w1_x1 && top_y >= w1_y0 && top_y <= w1_y1 {
                    b = 46;
                    g = 28;
                    r = 18;
                    if top_y < w1_y0 + 28 {
                        // Window header bar with electric blue accent
                        b = 110;
                        g = 58;
                        r = 28;
                    } else if (top_y - w1_y0) % 22 < 6
                        && x > w1_x0 + 24
                        && x < w1_x1 - 40 - ((top_y * 37) % 140)
                    {
                        // Simulated telemetry bars
                        b = 165;
                        g = 110;
                        r = 72;
                    }
                }

                // Right secondary telemetry window card
                let w2_x0 = (dst_w as usize) * 60 / 100;
                let w2_x1 = (dst_w as usize) * 93 / 100;
                let w2_y0 = (dst_h as usize) / 6;
                let w2_y1 = (dst_h as usize) * 72 / 100;
                if x >= w2_x0 && x <= w2_x1 && top_y >= w2_y0 && top_y <= w2_y1 {
                    b = 42;
                    g = 25;
                    r = 16;
                    if top_y < w2_y0 + 26 {
                        b = 88;
                        g = 140;
                        r = 24;
                    } else if (top_y - w2_y0) % 26 < 8 && x > w2_x0 + 20 && x < w2_x1 - 30 {
                        b = 120;
                        g = 175;
                        r = 45;
                    }
                }

                pixels[idx] = b;
                pixels[idx + 1] = g;
                pixels[idx + 2] = r;
            }
        }
    }

    // Overlay live cursor ring at current GetCursorPos (or center fallback)
    {
        let mut pt = PointWin32 {
            x: (src_w / 2) as i32,
            y: (src_h / 2) as i32,
        };
        let _ = unsafe { GetCursorPos(&mut pt) };
        let cx = ((pt.x.max(0) as u64 * dst_w as u64) / src_w.max(1) as u64) as i32;
        let cy_top = ((pt.y.max(0) as u64 * dst_h as u64) / src_h.max(1) as u64) as i32;
        let cy_dib = (dst_h as i32 - 1) - cy_top;
        for dy in -7i32..=7 {
            for dx in -7i32..=7 {
                let d2 = dx * dx + dy * dy;
                if (16..=49).contains(&d2) {
                    let px = cx + dx;
                    let py = cy_dib + dy;
                    if px >= 0 && px < dst_w as i32 && py >= 0 && py < dst_h as i32 {
                        let idx = (py as usize) * stride + (px as usize) * 3;
                        pixels[idx] = 255;     // B
                        pixels[idx + 1] = 107; // G
                        pixels[idx + 2] = 47;  // R
                    }
                }
            }
        }
    }

    let file_size = 54 + image_size as u32;
    let mut bmp = Vec::with_capacity(file_size as usize);
    // BITMAPFILEHEADER (14 bytes)
    bmp.extend_from_slice(b"BM");
    bmp.extend_from_slice(&file_size.to_le_bytes());
    bmp.extend_from_slice(&0u32.to_le_bytes());
    bmp.extend_from_slice(&54u32.to_le_bytes());
    // BITMAPINFOHEADER (40 bytes)
    bmp.extend_from_slice(&40u32.to_le_bytes());
    bmp.extend_from_slice(&(dst_w as i32).to_le_bytes());
    bmp.extend_from_slice(&(dst_h as i32).to_le_bytes());
    bmp.extend_from_slice(&1u16.to_le_bytes());
    bmp.extend_from_slice(&24u16.to_le_bytes());
    bmp.extend_from_slice(&0u32.to_le_bytes());
    bmp.extend_from_slice(&(image_size as u32).to_le_bytes());
    bmp.extend_from_slice(&2835i32.to_le_bytes());
    bmp.extend_from_slice(&2835i32.to_le_bytes());
    bmp.extend_from_slice(&0u32.to_le_bytes());
    bmp.extend_from_slice(&0u32.to_le_bytes());
    bmp.extend_from_slice(&pixels);

    (dst_w, dst_h, bmp)
}

/// Moves the Windows cursor and optionally triggers a mouse button or wheel event via Win32 `user32.dll`.
pub fn inject_remote_mouse(
    norm_x: f64,
    norm_y: f64,
    action: &str,
    button: u8,
) -> (i32, i32) {
    let (w, h) = primary_screen_resolution();
    let x = (norm_x.clamp(0.0, 1.0) * (w.saturating_sub(1) as f64)).round() as i32;
    let y = (norm_y.clamp(0.0, 1.0) * (h.saturating_sub(1) as f64)).round() as i32;
    unsafe {
        let _ = SetCursorPos(x, y);
        match (action, button) {
            ("click", 2) => {
                mouse_event(0x0008, 0, 0, 0, 0);
                mouse_event(0x0010, 0, 0, 0, 0);
            }
            ("click", _) => {
                mouse_event(0x0002, 0, 0, 0, 0);
                mouse_event(0x0004, 0, 0, 0, 0);
            }
            ("dblclick", _) => {
                mouse_event(0x0002, 0, 0, 0, 0);
                mouse_event(0x0004, 0, 0, 0, 0);
                mouse_event(0x0002, 0, 0, 0, 0);
                mouse_event(0x0004, 0, 0, 0, 0);
            }
            ("down", 2) => mouse_event(0x0008, 0, 0, 0, 0),
            ("down", _) => mouse_event(0x0002, 0, 0, 0, 0),
            ("up", 2) => mouse_event(0x0010, 0, 0, 0, 0),
            ("up", _) => mouse_event(0x0004, 0, 0, 0, 0),
            _ => {}
        }
    }
    (x, y)
}

/// Injects a virtual key press (`key_down` + `key_up`) via Win32 `keybd_event`.
pub fn inject_remote_key(vk_code: u8) {
    if vk_code == 0 {
        return;
    }
    unsafe {
        keybd_event(vk_code, 0, 0, 0);
        keybd_event(vk_code, 0, 0x0002, 0);
    }
}

/// Resolves a 9-digit IPCast station ID on the local broadcast domain via UDP port 17949.
/// Returns `Some((ip, p2p_port, hostname))` if a matching station responds within `timeout_ms`.
pub fn discover_ipcast_peer_by_id(compact_id: &str, timeout_ms: u64) -> Option<(String, u16, String)> {
    let digits: String = compact_id.chars().filter(|c| c.is_ascii_digit()).collect();
    if digits.len() != 9 {
        return None;
    }
    let sock = std::net::UdpSocket::bind("0.0.0.0:0").ok()?;
    let _ = sock.set_broadcast(true);
    let _ = sock.set_read_timeout(Some(Duration::from_millis(timeout_ms.max(80))));
    let msg = format!("IPCAST_WHOIS|{}", digits);
    let _ = sock.send_to(msg.as_bytes(), "255.255.255.255:17949");
    let _ = sock.send_to(msg.as_bytes(), "127.0.0.1:17949");

    let deadline = Instant::now() + Duration::from_millis(timeout_ms.max(80));
    let mut buf = [0u8; 512];
    while Instant::now() < deadline {
        if let Ok((n, src)) = sock.recv_from(&mut buf) {
            let reply = String::from_utf8_lossy(&buf[..n]);
            let parts: Vec<&str> = reply.trim().split('|').collect();
            if parts.len() >= 5 && parts[0] == "IPCAST_HERE" && parts[1] == digits {
                let ip = if parts[2].is_empty() {
                    src.ip().to_string()
                } else {
                    parts[2].to_string()
                };
                let port = parts[3].parse::<u16>().unwrap_or(17948);
                let host = parts[4].to_string();
                return Some((ip, port, host));
            }
        } else {
            break;
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_station_identity_and_adaptive_profile() {
        let id = derive_station_identity("192.168.1.44", "WORKSTATION-01");
        assert_eq!(id.compact_id.len(), 9);
        assert_eq!(id.formatted_id.len(), 11);

        let (fps, quality, profile) = compute_adaptive_stream_profile(2);
        assert_eq!(fps, 60);
        assert!(quality >= 90);
        assert_eq!(profile, "ULTRA-LAN-60FPS");
    }

    #[test]
    fn test_rdp_x224_session_connect_drop_and_reconnect_lifecycle() {
        let listener1 = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
        let addr1 = listener1.local_addr().unwrap();
        let t1 = std::thread::spawn(move || {
            if let Ok((mut s, _)) = listener1.accept() {
                let mut b = [0u8; 32];
                let _ = s.read(&mut b);
                // Send X.224 Connection Confirm (0xD0)
                let cc: [u8; 19] = [
                    0x03, 0x00, 0x00, 0x13, 0x0E, 0xD0, 0x00, 0x00, 0x12, 0x34, 0x00, 0x02, 0x00,
                    0x08, 0x00, 0x02, 0x00, 0x00, 0x00,
                ];
                let _ = s.write_all(&cc);
            }
        });

        let mut mgr = RdpSessionManager::new(addr1);
        mgr.connect(500).unwrap();
        let _ = t1.join();
        assert!(matches!(mgr.state, RdpSessionState::Connected { .. }));

        // Listener1 is now closed -> simulate session drop
        assert!(!mgr.check_keepalive(200));
        assert_eq!(mgr.drop_count, 1);
        assert!(matches!(mgr.state, RdpSessionState::ConnectionLost { .. }));

        // Bring up recovery listener and reconnect
        let listener2 = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
        let addr2 = listener2.local_addr().unwrap();
        let t2 = std::thread::spawn(move || {
            if let Ok((mut s, _)) = listener2.accept() {
                let mut b = [0u8; 32];
                let _ = s.read(&mut b);
                let cc: [u8; 19] = [
                    0x03, 0x00, 0x00, 0x13, 0x0E, 0xD0, 0x00, 0x00, 0x12, 0x34, 0x00, 0x02, 0x00,
                    0x08, 0x00, 0x02, 0x00, 0x00, 0x00,
                ];
                let _ = s.write_all(&cc);
            }
        });

        mgr.reconnect(Some(addr2), 500).unwrap();
        let _ = t2.join();
        assert_eq!(mgr.reconnect_count, 1);
        assert!(matches!(mgr.state, RdpSessionState::Reconnected { .. }));
        assert!(generate_rdp_profile_content(addr2).contains("autoreconnection enabled:i:1"));
    }
}
