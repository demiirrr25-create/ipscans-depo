//! Native Rust Network Intelligence Engine:
//! - Default Gateway & Local Subnet Interface Discovery
//! - 64-Thread Parallel Subnet ARP + TCP Port & Service Scanner
//! - Embedded IEEE MAC OUI Vendor & Camera Manufacturer Database
//! - Native TCP Port Inspector, DNS Resolver, and Raw Socket WHOIS Client

use std::collections::HashMap;
use std::io::{Read, Write};
use std::net::{IpAddr, Ipv4Addr, SocketAddr, TcpStream, ToSocketAddrs, UdpSocket};
use std::sync::Mutex;
use std::thread;
use std::time::{Duration, Instant};

use crate::json::json_str;
use crate::win32::run_hidden_command;

#[derive(Debug, Clone)]
pub struct GatewayContext {
    pub local_ip: String,
    pub subnet_prefix: String,
    pub scan_cidr: String,
    pub gateway_ip: String,
    pub gateway_mac: String,
    pub interface_index: String,
    pub dns_servers: Vec<String>,
}

#[derive(Debug, Clone)]
pub struct DiscoveredHost {
    pub ip: String,
    pub mac: String,
    pub vendor: String,
    pub hostname: String,
    pub device_type: String,
    pub open_ports: Vec<u16>,
    pub latency_ms: Option<u32>,
    pub is_gateway: bool,
    pub is_camera: bool,
    pub risk_level: String,
    pub security_notes: String,
}

impl DiscoveredHost {
    pub fn to_json(&self) -> String {
        let ports_json: Vec<String> = self.open_ports.iter().map(|p| p.to_string()).collect();
        format!(
            "{{\"ip\":{},\"mac\":{},\"vendor\":{},\"hostname\":{},\"deviceType\":{},\"openPorts\":[{}],\"latencyMs\":{},\"isGateway\":{},\"isCamera\":{},\"riskLevel\":{},\"securityNotes\":{}}}",
            json_str(&self.ip),
            json_str(&self.mac),
            json_str(&self.vendor),
            json_str(&self.hostname),
            json_str(&self.device_type),
            ports_json.join(","),
            self.latency_ms.map(|ms| ms.to_string()).unwrap_or_else(|| "null".into()),
            self.is_gateway,
            self.is_camera,
            json_str(&self.risk_level),
            json_str(&self.security_notes),
        )
    }
}

/// Discovers the active local IPv4 address, `/24` subnet prefix, Default Gateway IP,
/// Gateway MAC address, and DNS servers in `< 50ms`.
pub fn discover_gateway_context() -> GatewayContext {
    let local_hint = detect_local_ipv4().unwrap_or_default();
    let (_, routes, _) = run_hidden_command("route", &["print", "-4"]);
    let active = routes
        .lines()
        .filter_map(|line| {
            let fields: Vec<_> = line.split_whitespace().collect();
            if fields.len() < 5 || fields[..2] != ["0.0.0.0", "0.0.0.0"] {
                return None;
            }
            Some((
                fields[2].parse::<Ipv4Addr>().ok()?,
                fields[3].parse::<Ipv4Addr>().ok()?,
                fields[4].parse::<u32>().ok()?,
            ))
        })
        .min_by_key(|(_, ip, metric)| (ip.to_string() != local_hint, *metric));
    let (gateway_ip, local_ip) = match active {
        Some((gw, ip, _)) => (gw.to_string(), ip.to_string()),
        None => (String::new(), local_hint),
    };
    let subnet_prefix = local_ip
        .rsplit_once('.')
        .map(|(prefix, _)| prefix)
        .unwrap_or("")
        .to_string();
    // Sweep at most a /24 by default. More-specific connected routes (e.g. /28)
    // restrict the sweep so it cannot cross into a different network.
    let scan_cidr = local_ip
        .parse::<Ipv4Addr>()
        .ok()
        .map(|ip| {
            let prefix = routes
                .lines()
                .filter_map(|line| {
                    let f: Vec<_> = line.split_whitespace().collect();
                    if f.len() < 5 || f[3] != local_ip || f[2].parse::<Ipv4Addr>().is_ok() {
                        return None;
                    }
                    let network = u32::from(f[0].parse::<Ipv4Addr>().ok()?);
                    let mask = u32::from(f[1].parse::<Ipv4Addr>().ok()?);
                    let bits = mask.leading_ones();
                    // Windows lists an additional /32 host route for each local IP.
                    (bits < 32 && u32::from(ip) & mask == network).then_some(bits)
                })
                .max()
                .unwrap_or(24)
                .max(24);
            let net = u32::from(ip) & (u32::MAX << (32 - prefix));
            format!("{}/{}", Ipv4Addr::from(net), prefix)
        })
        .unwrap_or_default();
    let (_, cache, _) = run_hidden_command("arp", &["-a"]);
    let interface_index = cache
        .lines()
        .filter(|line| line.contains("---") && line.split_whitespace().any(|s| s == local_ip))
        .filter_map(|line| {
            u32::from_str_radix(line.split_whitespace().last()?.trim_start_matches("0x"), 16).ok()
        })
        .next()
        .map(|i| i.to_string())
        .unwrap_or_default();
    let gateway_mac = parse_arp(&cache, Some(&local_ip))
        .get(&gateway_ip)
        .cloned()
        .unwrap_or_default();

    let mut dns_servers = Vec::new();
    let (_, ipcfg, _) = run_hidden_command("ipconfig", &["/all"]);
    for line in ipcfg.lines() {
        if line.contains("DNS Servers") || line.contains("DNS Sunucuları") {
            if let Some(after) = line.split(':').nth(1) {
                let candidate = after.trim();
                if candidate.contains('.') {
                    dns_servers.push(candidate.to_string());
                }
            }
        }
    }

    GatewayContext {
        local_ip,
        subnet_prefix,
        scan_cidr,
        gateway_ip,
        gateway_mac,
        interface_index,
        dns_servers,
    }
}

pub fn detect_local_ipv4() -> Option<String> {
    let sock = UdpSocket::bind("0.0.0.0:0").ok()?;
    sock.connect("8.8.8.8:80").ok()?;
    match sock.local_addr().ok()?.ip() {
        IpAddr::V4(v4) if !v4.is_loopback() => Some(v4.to_string()),
        _ => None,
    }
}

/// Reads the OS ARP cache (`arp -a`) into a map of `IPv4 -> Normalized MAC (XX:XX:XX:XX:XX:XX)`.
pub fn read_arp_table() -> HashMap<String, String> {
    let (_, out, _) = run_hidden_command("arp", &["-a"]);
    parse_arp(&out, None)
}

pub fn interface_arp_table(local_ip: &str) -> Option<HashMap<String, String>> {
    local_ip.parse::<Ipv4Addr>().ok()?;
    let (code, out, _) = run_hidden_command("arp", &["-a", "-N", local_ip]);
    (code == 0
        && out
            .lines()
            .any(|line| line.contains("---") && line.split_whitespace().any(|s| s == local_ip)))
    .then(|| parse_arp(&out, Some(local_ip)))
}

fn parse_arp(out: &str, interface: Option<&str>) -> HashMap<String, String> {
    let mut map = HashMap::new();
    let mut selected = interface.is_none();
    for line in out.lines() {
        let fields: Vec<_> = line.split_whitespace().collect();
        if line.contains("---") {
            selected = interface.is_none_or(|ip| fields.contains(&ip));
            continue;
        }
        if !selected || fields.len() < 2 {
            continue;
        }
        let Ok(ip) = fields[0].parse::<Ipv4Addr>() else {
            continue;
        };
        let mac = fields[1].replace('-', ":").to_ascii_uppercase();
        if mac.len() == 17
            && mac
                .split(':')
                .all(|octet| octet.len() == 2 && u8::from_str_radix(octet, 16).is_ok())
            && !ip.is_multicast()
            && !ip.is_unspecified()
            && !ip.is_broadcast()
            && mac != "FF:FF:FF:FF:FF:FF"
            && mac != "00:00:00:00:00:00"
        {
            map.insert(ip.to_string(), mac);
        }
    }
    map
}

/// Resolves an IEEE MAC OUI (`XX:XX:XX`) to its hardware manufacturer.
pub fn lookup_mac_vendor(mac: &str) -> &'static str {
    let prefix = mac.get(..8).unwrap_or("");
    match prefix {
        // Dahua Technology
        "3C:EF:8C" | "4C:11:BF" | "90:02:A9" | "E0:50:8B" | "A0:BD:1D" | "BC:32:5F"
        | "08:ED:ED" | "14:A7:8B" | "6C:1C:71" | "B4:4C:3B" => "Dahua Technology (IP Camera / NVR)",
        // Hikvision
        "28:57:BE" | "44:19:B6" | "54:C4:15" | "BC:AD:28" | "C0:56:E3" | "C4:2F:90"
        | "A4:14:37" | "18:68:CB" | "4C:BD:8F" | "80:7C:62" => "Hikvision Digital Technology",
        // Axis / Uniview / Reolink / Hanwha
        "00:40:8C" | "AC:CC:8E" | "B8:A4:4F" => "Axis Communications (Network Camera)",
        "48:EA:63" | "6C:F1:7E" => "Uniview Technologies (IP Camera)",
        "EC:71:DB" => "Reolink Innovation (IP Camera)",
        "00:09:18" | "00:16:6C" => "Hanwha Vision / Samsung Techwin",
        // Routers & Modems
        "50:C7:BF" | "14:CC:20" | "C0:25:E9" | "F4:F2:6D" | "98:DA:C4" | "B0:BE:76"
        | "E8:DE:27" | "60:32:B1" => "TP-Link Systems (Gateway / Router)",
        "50:FF:20" | "EC:43:F6" | "04:BF:6D" => "Keenetic / Zyxel Communications",
        "00:E0:4C" | "00:13:3B" | "2C:FD:A1" | "70:85:C2" | "D8:BB:C1" => "Realtek Semiconductor",
        "00:1A:2B" | "04:D9:F5" | "18:31:BF" | "2C:56:DC" => "ASUSTeK Computer",
        "48:8F:5A" | "64:D1:54" | "B8:69:F4" | "CC:2D:E0" | "DC:2C:6E" => "MikroTik RouterBOARD",
        "24:5A:4C" | "74:83:C2" | "78:8A:20" | "80:2A:A8" | "F0:9F:C2" => "Ubiquiti Inc.",
        "00:1E:10" | "28:6E:D4" | "48:DB:50" | "88:53:D4" | "F8:4A:BF" => {
            "Huawei Technologies (HGW Modem)"
        }
        "D8:3A:DD" | "B8:27:EB" | "DC:A6:32" | "E4:5F:01" => "Raspberry Pi Trading",
        "00:50:56" | "00:0C:29" | "00:15:5D" => "VMware / Hyper-V Virtual NIC",
        "3C:22:FB" | "F0:18:98" | "A4:83:E7" | "BC:D0:74" => "Apple Inc.",
        "00:1B:21" | "3C:97:0E" | "8C:8D:28" | "A4:BF:01" | "DC:4A:3E" => "Intel Corporate",
        _ => "Üretici bilinmiyor",
    }
}

/// Canonical ports probed during high-speed subnet discovery and camera/router security inspection.
pub const DISCOVERY_PORTS: &[u16] = &[
    21, 22, 23, 53, 80, 135, 139, 443, 445, 554, 1900, 3389, 5000, 8000, 8080, 8443, 8554, 8899,
    9530, 37777,
];

/// Probes a list of TCP ports on `ip` with bounded timeout (`timeout_ms`), returning `(open_ports, min_latency_ms)`.
pub fn probe_host_ports(ip: &str, ports: &[u16], timeout_ms: u64) -> (Vec<u16>, Option<u32>) {
    let Ok(ip_addr) = ip.parse::<IpAddr>() else {
        return (Vec::new(), None);
    };
    let mut open_ports = Vec::new();
    let mut best_rtt: Option<u32> = None;

    for &port in ports {
        let addr = SocketAddr::new(ip_addr, port);
        let t0 = Instant::now();
        if TcpStream::connect_timeout(&addr, Duration::from_millis(timeout_ms)).is_ok() {
            let rtt = t0.elapsed().as_millis().max(1) as u32;
            open_ports.push(port);
            best_rtt = Some(match best_rtt {
                Some(prev) => prev.min(rtt),
                None => rtt,
            });
        }
    }
    (open_ports, best_rtt)
}

/// Parse a bounded IPv4 CIDR. Point-to-point and single-host ranges include their endpoints.
pub fn scan_bounds(cidr: &str) -> Option<(u32, u32)> {
    let (ip, bits) = cidr.split_once('/')?;
    let bits = bits.parse::<u32>().ok()?;
    if !(20..=32).contains(&bits) {
        return None;
    }
    let ip = u32::from(ip.parse::<Ipv4Addr>().ok()?);
    let mask = u32::MAX << (32 - bits);
    let net = ip & mask;
    let broadcast = net | !mask;
    if bits >= 31 {
        Some((net, broadcast))
    } else {
        Some((net + 1, broadcast - 1))
    }
}

#[link(name = "iphlpapi")]
extern "system" {
    fn IcmpCreateFile() -> isize;
    fn IcmpCloseHandle(handle: isize) -> i32;
    fn IcmpSendEcho(
        handle: isize,
        dst: u32,
        request: *const u8,
        size: u16,
        options: *const u8,
        reply: *mut u8,
        reply_size: u32,
        timeout_ms: u32,
    ) -> u32;
}

/// Read ICMP_ECHO_REPLY.Status and RoundTripTime from the Windows IPv4 echo API.
pub fn ping_ipv4(ip: Ipv4Addr, timeout_ms: u32) -> Option<u32> {
    unsafe {
        let handle = IcmpCreateFile();
        if handle == -1 {
            return None;
        }
        let payload = b"IPScans";
        let mut reply = [0u32; 32];
        let count = IcmpSendEcho(
            handle,
            u32::from_ne_bytes(ip.octets()),
            payload.as_ptr(),
            payload.len() as u16,
            std::ptr::null(),
            reply.as_mut_ptr().cast(),
            std::mem::size_of_val(&reply) as u32,
            timeout_ms,
        );
        IcmpCloseHandle(handle);
        (count > 0 && reply[1] == 0).then_some(reply[2])
    }
}

/// Ask the Windows DNS client cache for PTR labels without blocking discovery on DNS timeouts.
fn cached_hostname(ip: Ipv4Addr) -> String {
    use std::ffi::c_void;
    #[repr(C)]
    struct PtrRecord {
        next: *mut PtrRecord,
        name: *const u16,
        kind: u16,
        length: u16,
        flags: u32,
        ttl: u32,
        reserved: u32,
        hostname: *const u16,
    }
    #[link(name = "dnsapi")]
    extern "system" {
        fn DnsQuery_W(
            name: *const u16,
            kind: u16,
            flags: u32,
            extra: *const c_void,
            result: *mut *mut PtrRecord,
            reserved: *const c_void,
        ) -> i32;
        fn DnsRecordListFree(records: *mut PtrRecord, free_type: i32);
    }
    let [a, b, c, d] = ip.octets();
    let query: Vec<_> = format!("{d}.{c}.{b}.{a}.in-addr.arpa.")
        .encode_utf16()
        .chain([0])
        .collect();
    let mut first = std::ptr::null_mut();
    let mut found = String::new();
    unsafe {
        if DnsQuery_W(
            query.as_ptr(),
            12,
            0x10,
            std::ptr::null(),
            &mut first,
            std::ptr::null(),
        ) == 0
        {
            let mut item = first;
            while !item.is_null() {
                let record = &*item;
                if record.kind == 12 && !record.hostname.is_null() {
                    let len = (0..255)
                        .take_while(|&i| *record.hostname.add(i) != 0)
                        .count();
                    found =
                        String::from_utf16_lossy(std::slice::from_raw_parts(record.hostname, len));
                    break;
                }
                item = record.next;
            }
        }
        if !first.is_null() {
            DnsRecordListFree(first, 1);
        }
    }
    found
}

/// ARP, ICMP and TCP discovery. An unresolved default route never triggers a fallback LAN scan.
pub fn scan_local_subnet(custom_prefix: Option<&str>) -> (GatewayContext, Vec<DiscoveredHost>) {
    let mut ctx = discover_gateway_context();
    if let Some(range) = custom_prefix {
        ctx.scan_cidr = if range.contains('/') {
            range.to_owned()
        } else {
            format!("{range}.0/24")
        };
    }
    let Some((start, end)) = scan_bounds(&ctx.scan_cidr) else {
        return (ctx, Vec::new());
    };
    let local_ip = &ctx.local_ip;
    let (_, cache, _) = run_hidden_command("arp", &["-a"]);
    let arp_initial = parse_arp(&cache, Some(local_ip));
    let queue = Mutex::new(start..=end);
    let results = Mutex::new(HashMap::new());
    let fast_ports = [80, 443, 554, 37777, 8000, 8899, 445, 22, 3389, 8080];
    let remaining: Vec<_> = DISCOVERY_PORTS
        .iter()
        .copied()
        .filter(|p| !fast_ports.contains(p))
        .collect();
    thread::scope(|scope| {
        for _ in 0..(end - start + 1).min(48) {
            scope.spawn(|| loop {
                let Some(n) = queue.lock().unwrap().next() else {
                    break;
                };
                let ip = Ipv4Addr::from(n);
                let address = ip.to_string();
                let ping = ping_ipv4(ip, 90);
                let (mut ports, tcp) = probe_host_ports(&address, &fast_ports, 65);
                if ping.is_some()
                    || tcp.is_some()
                    || arp_initial.contains_key(&address)
                    || &address == local_ip
                {
                    let (extra, extra_rtt) = probe_host_ports(&address, &remaining, 100);
                    ports.extend(extra);
                    results
                        .lock()
                        .unwrap()
                        .insert(address, (ports, ping.or(tcp).or(extra_rtt)));
                }
            });
        }
    });
    let (_, cache, _) = run_hidden_command("arp", &["-a"]);
    let arp_final = parse_arp(&cache, Some(local_ip));
    let mut probed = results.into_inner().unwrap();
    for address in arp_final.keys() {
        if address
            .parse::<Ipv4Addr>()
            .is_ok_and(|ip| (start..=end).contains(&u32::from(ip)))
        {
            probed
                .entry(address.clone())
                .or_insert_with(|| (Vec::new(), None));
        }
    }
    let mut hosts = Vec::new();
    for (ip, (mut open_ports, latency_ms)) in probed {
        open_ports.sort_unstable();
        open_ports.dedup();
        let is_gateway = ip == ctx.gateway_ip;
        let mac = arp_final
            .get(&ip)
            .or_else(|| arp_initial.get(&ip))
            .cloned()
            .unwrap_or_default();
        let vendor = if ip == ctx.local_ip {
            "This Workstation (IPScans Rust Engine)".to_string()
        } else {
            lookup_mac_vendor(&mac).to_string()
        };

        let is_dahua = open_ports.contains(&37777) || vendor.contains("Dahua");
        let is_hikvision = open_ports.contains(&8000) || vendor.contains("Hikvision");
        let is_onvif_or_rtsp =
            open_ports.contains(&554) || open_ports.contains(&8554) || open_ports.contains(&8899);
        let is_camera = is_dahua || is_hikvision || is_onvif_or_rtsp;

        let device_type = if is_gateway {
            "Ana Modem / Yönlendirici (Gateway)".to_string()
        } else if is_dahua {
            "Olası kamera / NVR (Dahua)".to_string()
        } else if is_hikvision {
            "Olası kamera / NVR (Hikvision)".to_string()
        } else if is_onvif_or_rtsp {
            "Olası kamera / medya sunucusu".to_string()
        } else if ip == ctx.local_ip {
            "Komuta İstasyonu (Rust Sentinel Host)".to_string()
        } else if open_ports.contains(&445) || open_ports.contains(&3389) {
            "Windows İş İstasyonu / Sunucu".to_string()
        } else {
            "Ağ Cihazı / IoT Uç Noktası".to_string()
        };

        let (risk_level, security_notes) = if is_dahua {
            (
                "REVIEW".to_string(),
                "OUI veya TCP servis portu Dahua ile uyumlu. Model, sürüm ve erişim ayrıca doğrulanmalı.".to_string(),
            )
        } else if is_camera {
            (
                "REVIEW".to_string(),
                "Kamera ile ilişkili port veya üretici kaydı bulundu. Akış ve kimlik doğrulama ayrıca doğrulanmalı".to_string(),
            )
        } else if is_gateway && (open_ports.contains(&23) || open_ports.contains(&7547)) {
            (
                "HIGH".to_string(),
                "Ana modem üzerinde yönetim/TR-069 portu açık".to_string(),
            )
        } else {
            ("LOW".to_string(), "Normal yerel ağ profili".to_string())
        };

        hosts.push(DiscoveredHost {
            hostname: if ip == ctx.local_ip {
                std::env::var("COMPUTERNAME").unwrap_or_default()
            } else {
                ip.parse().map(cached_hostname).unwrap_or_default()
            },
            ip,
            mac,
            vendor,
            device_type,
            open_ports,
            latency_ms,
            is_gateway,
            is_camera,
            risk_level,
            security_notes,
        });
    }

    hosts.sort_by_key(|h| h.ip.parse::<Ipv4Addr>().ok());
    (ctx, hosts)
}

pub struct PortResult {
    pub port: u16,
    pub service: &'static str,
    pub status: &'static str,
    pub latency_ms: Option<u128>,
}

pub fn inspect_ports(target: &str, ports: &[u16], timeout_ms: u64) -> Vec<PortResult> {
    let ips: Vec<IpAddr> = (target, 0)
        .to_socket_addrs()
        .map(|it| it.map(|a| a.ip()).collect())
        .unwrap_or_default();
    let mut items = Vec::new();
    for &port in ports {
        let mut status = "unresolved";
        let mut rtt_ms = None;
        for &ip in &ips {
            let t0 = Instant::now();
            match TcpStream::connect_timeout(
                &SocketAddr::new(ip, port),
                Duration::from_millis(timeout_ms.max(1)),
            ) {
                Ok(_) => {
                    status = "open";
                    rtt_ms = Some(t0.elapsed().as_millis());
                    break;
                }
                Err(e) => {
                    let observed = match e.kind() {
                        std::io::ErrorKind::ConnectionRefused => "closed",
                        std::io::ErrorKind::TimedOut | std::io::ErrorKind::WouldBlock => "timeout",
                        _ => "unreachable",
                    };
                    if status == "unresolved" || observed == "closed" {
                        status = observed;
                    }
                }
            }
        }
        let service = match port {
            21 => "FTP",
            22 => "SSH",
            23 => "Telnet",
            25 => "SMTP",
            53 => "DNS",
            80 => "HTTP",
            110 => "POP3",
            135 => "RPC",
            139 => "NetBIOS",
            143 => "IMAP",
            443 => "HTTPS",
            445 => "SMB",
            554 => "RTSP",
            993 => "IMAPS",
            995 => "POP3S",
            1433 => "MSSQL",
            1900 => "UPnP",
            3306 => "MySQL",
            3389 => "RDP",
            5432 => "PostgreSQL",
            5900 => "VNC",
            6379 => "Redis",
            8000 => "Hikvision-SDK",
            8080 => "HTTP-Alt",
            8443 => "HTTPS-Alt",
            8554 => "RTSP-Alt",
            8899 => "ONVIF",
            37777 => "Dahua-DVRIP",
            _ => "TCP",
        };
        items.push(PortResult {
            port,
            service,
            status,
            latency_ms: rtt_ms,
        });
    }
    items
}

pub fn check_ports_detailed(target: &str, ports: &[u16], timeout_ms: u64) -> String {
    let items: Vec<_> = inspect_ports(target, ports, timeout_ms)
        .into_iter()
        .map(|r| {
            format!(
                "{{\"port\":{},\"service\":{},\"status\":{},\"latencyMs\":{}}}",
                r.port,
                json_str(r.service),
                json_str(r.status),
                r.latency_ms
                    .map(|n| n.to_string())
                    .unwrap_or_else(|| "null".into())
            )
        })
        .collect();
    format!(
        "{{\"engine\":\"ipscans-rust-core/3.0\",\"target\":{},\"results\":[{}]}}",
        json_str(target),
        items.join(",")
    )
}

/// Native Raw TCP Socket WHOIS Client (`whois.iana.org:43` + registry referral).
pub fn query_whois_raw(domain_or_ip: &str) -> String {
    let clean = domain_or_ip
        .trim()
        .trim_start_matches("http://")
        .trim_start_matches("https://")
        .split('/')
        .next()
        .unwrap_or("")
        .trim();

    fn tcp_whois(server: &str, query: &str) -> Result<String, String> {
        let addr_str = format!("{}:43", server);
        let mut addrs = addr_str.to_socket_addrs().map_err(|e| e.to_string())?;
        let sock = addrs
            .next()
            .ok_or_else(|| "Sunucu adresi çözülemedi".to_string())?;
        let mut stream =
            TcpStream::connect_timeout(&sock, Duration::from_secs(4)).map_err(|e| e.to_string())?;
        let _ = stream.set_read_timeout(Some(Duration::from_secs(4)));
        let _ = stream.set_write_timeout(Some(Duration::from_secs(4)));
        stream
            .write_all(format!("{}\r\n", query).as_bytes())
            .map_err(|e| e.to_string())?;
        let mut buf = Vec::new();
        stream
            .take(1_048_576)
            .read_to_end(&mut buf)
            .map_err(|e| e.to_string())?;
        Ok(String::from_utf8_lossy(&buf).to_string())
    }

    if clean.is_empty()
        || clean.len() > 253
        || !clean
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || ".-:".contains(c))
    {
        return format!(
            "{{\"ok\":false,\"query\":{},\"error\":\"Invalid WHOIS query\",\"raw\":\"\"}}",
            json_str(clean)
        );
    }
    let initial = match tcp_whois("whois.iana.org", clean) {
        Ok(response) => response,
        Err(error) => {
            return format!(
                "{{\"ok\":false,\"query\":{},\"error\":{},\"raw\":\"\"}}",
                json_str(clean),
                json_str(&error)
            )
        }
    };
    let mut refer_server = None;
    for line in initial.lines() {
        let lower = line.to_ascii_lowercase();
        if lower.starts_with("refer:") || lower.starts_with("whois:") {
            if let Some(srv) = line.split(':').nth(1) {
                let s = srv.trim();
                if !s.is_empty() {
                    refer_server = Some(s.to_string());
                    break;
                }
            }
        }
    }

    let final_raw = if let Some(ref srv) = refer_server {
        tcp_whois(srv, clean).unwrap_or(initial)
    } else {
        initial
    };

    format!(
        "{{\"engine\":\"ipscans-rust-core/3.0\",\"query\":{},\"server\":{},\"raw\":{}}}",
        json_str(clean),
        json_str(refer_server.as_deref().unwrap_or("whois.iana.org")),
        json_str(&final_raw)
    )
}

/// Native DNS lookup returning resolved IPs and `nslookup` record details in JSON.
pub fn query_dns_records(domain: &str) -> String {
    let clean = domain
        .trim()
        .trim_start_matches("http://")
        .trim_start_matches("https://")
        .split('/')
        .next()
        .unwrap_or("")
        .trim();

    let mut ipv4s = Vec::new();
    let mut ipv6s = Vec::new();
    if let Ok(addrs) = (clean, 80u16).to_socket_addrs() {
        for a in addrs {
            match a.ip() {
                IpAddr::V4(v4) => {
                    let s = v4.to_string();
                    if !ipv4s.contains(&s) {
                        ipv4s.push(s);
                    }
                }
                IpAddr::V6(v6) => {
                    let s = v6.to_string();
                    if !ipv6s.contains(&s) {
                        ipv6s.push(s);
                    }
                }
            }
        }
    }

    let (_, ns_out, _) = run_hidden_command("nslookup", &["-type=any", clean, "1.1.1.1"]);
    let v4_json: Vec<String> = ipv4s.iter().map(|s| json_str(s)).collect();
    let v6_json: Vec<String> = ipv6s.iter().map(|s| json_str(s)).collect();

    format!(
        "{{\"engine\":\"ipscans-rust-core/3.0\",\"domain\":{},\"A\":[{}],\"AAAA\":[{}],\"raw\":{}}}",
        json_str(clean),
        v4_json.join(","),
        v6_json.join(","),
        json_str(&ns_out)
    )
}

/// Sends a real 32-byte Dahua DVRIP (`0xA0`) handshake probe to TCP port `37777`.
pub fn probe_dahua_dvrip_37777(ip: &str) -> (bool, String) {
    let Ok(v4) = ip.parse::<Ipv4Addr>() else {
        return (false, "Geçersiz IPv4 adresi".to_string());
    };
    let addr = SocketAddr::new(IpAddr::V4(v4), 37777);
    let Ok(mut stream) = TcpStream::connect_timeout(&addr, Duration::from_millis(220)) else {
        return (
            false,
            "TCP 37777 kapalı (Dahua DVRIP yanıtı yok)".to_string(),
        );
    };
    let _ = stream.set_read_timeout(Some(Duration::from_millis(250)));
    let _ = stream.set_write_timeout(Some(Duration::from_millis(250)));
    let probe: [u8; 32] = [
        0xa0, 0x00, 0x00, 0x60, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x04, 0x01,
        0x00, 0x00,
    ];
    if stream.write_all(&probe).is_ok() {
        let mut resp = [0u8; 64];
        if let Ok(n) = stream.read(&mut resp) {
            if n >= 10 && resp[0] == 0xb0 {
                return (
                    true,
                    format!(
                        "Dahua DVRIP 0xB0 el sıkışması doğrulandı (durum=0x{:02X}, kilit=0x{:02X})",
                        resp[8], resp[9]
                    ),
                );
            }
        }
    }
    (
        true,
        "TCP 37777 açık — Dahua DVRIP port dinlemede".to_string(),
    )
}

/// Probes RTSP port 554 (`OPTIONS` & `DESCRIBE`) to check if stream authentication is enforced.
pub fn probe_rtsp_security(ip: &str) -> (bool, String) {
    let Ok(v4) = ip.parse::<Ipv4Addr>() else {
        return (false, "Geçersiz IPv4".to_string());
    };
    let addr = SocketAddr::new(IpAddr::V4(v4), 554);
    let Ok(mut stream) = TcpStream::connect_timeout(&addr, Duration::from_millis(220)) else {
        return (false, "RTSP 554 kapalı".to_string());
    };
    let _ = stream.set_read_timeout(Some(Duration::from_millis(250)));
    let _ = stream.set_write_timeout(Some(Duration::from_millis(250)));
    let req = format!(
        "DESCRIBE rtsp://{}:554/cam/realmonitor?channel=1&subtype=0 RTSP/1.0\r\nCSeq: 1\r\nUser-Agent: IPScans-Sentinel/3.0\r\n\r\n",
        ip
    );
    let _ = stream.write_all(req.as_bytes());
    let mut buf = [0u8; 512];
    if let Ok(n) = stream.read(&mut buf) {
        let text = String::from_utf8_lossy(&buf[..n]);
        if text.contains("200 OK") {
            return (
                true,
                "KRİTİK: RTSP 554 şifresiz (Unauthenticated) canlı video akışına izin veriyor!"
                    .to_string(),
            );
        } else if text.contains("WWW-Authenticate: Basic") {
            return (
                true,
                "YÜKSEK RİSK: RTSP 554 şifresiz Basic Auth kullanıyor (Digest Auth zorunlu kılınmalı)"
                    .to_string(),
            );
        } else if text.contains("401 Unauthorized") {
            return (
                true,
                "RTSP 554 aktif (401 Digest kimlik doğrulama yanıtı alındı)".to_string(),
            );
        }
    }
    (true, "RTSP 554 TCP soketi açık".to_string())
}

#[cfg(test)]
mod discovery_tests {
    use super::*;
    #[test]
    fn cidr_boundaries_include_point_to_point_endpoints() {
        let ip = u32::from(Ipv4Addr::new(127, 0, 0, 1));
        assert_eq!(scan_bounds("127.0.0.1/32"), Some((ip, ip)));
        assert_eq!(scan_bounds("127.0.0.1/31"), Some((ip - 1, ip)));
        assert_eq!(scan_bounds("127.0.0.1/30"), Some((ip, ip + 1)));
        assert!(scan_bounds("0.0.0.0/0").is_none());
        assert!(scan_bounds("garbage/24").is_none());
    }
    #[test]
    fn arp_entries_are_scoped_to_active_interface() {
        let text="Interface: 10.1.0.1 --- 0x12\n10.1.0.2 aa-bb-cc-dd-ee-ff dynamic\nInterface: 10.2.0.1 --- 0x13\n10.2.0.2 00-11-22-33-44-55 dynamic";
        let records = parse_arp(text, Some("10.1.0.1"));
        assert_eq!(records.len(), 1);
        assert_eq!(records["10.1.0.2"], "AA:BB:CC:DD:EE:FF");
    }
    #[test]
    fn loopback_port_and_icmp_are_real() {
        let listener = std::net::TcpListener::bind(("127.0.0.1", 0)).unwrap();
        let port = listener.local_addr().unwrap().port();
        let open = inspect_ports("127.0.0.1", &[port], 500);
        assert_eq!(open[0].status, "open");
        assert!(open[0].latency_ms.is_some());
        drop(listener);
        let refused = inspect_ports("127.0.0.1", &[port], 3000);
        assert_eq!(refused[0].status, "closed");
        assert!(refused[0].latency_ms.is_none());
        assert!(ping_ipv4(Ipv4Addr::LOCALHOST, 500).is_some());
    }
}
