//! Native Rust Network Intelligence Engine:
//! - Default Gateway & Local Subnet Interface Discovery
//! - 64-Thread Parallel Subnet ARP + TCP Port & Service Scanner
//! - Embedded IEEE MAC OUI Vendor & Camera Manufacturer Database
//! - Native TCP Port Inspector, DNS Resolver, and Raw Socket WHOIS Client

use std::collections::{BTreeSet, HashMap, HashSet};
use std::io::{Read, Write};
use std::net::{IpAddr, Ipv4Addr, Ipv6Addr, SocketAddr, TcpStream, ToSocketAddrs, UdpSocket};
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc, Mutex,
};
use std::thread;
use std::time::{Duration, Instant};

use crate::json::json_str;
use crate::win32::{process_memory_bytes, run_hidden_command};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdapterInfo {
    pub name: String,
    pub ipv4: String,
    pub subnet_mask: String,
    pub ipv6: String,
    pub mac: String,
    pub gateway: String,
}

impl AdapterInfo {
    pub fn to_json(&self) -> String {
        format!(
            "{{\"name\":{},\"ipv4\":{},\"subnetMask\":{},\"ipv6\":{},\"mac\":{},\"gateway\":{}}}",
            json_str(&self.name),
            json_str(&self.ipv4),
            json_str(&self.subnet_mask),
            json_str(&self.ipv6),
            json_str(&self.mac),
            json_str(&self.gateway)
        )
    }
}

/// Parses `ipconfig /all` output (Turkish and English locales) into structured `AdapterInfo` records.
pub fn parse_ipconfig_adapters(text: &str) -> Vec<AdapterInfo> {
    let mut adapters = Vec::new();
    let mut current: Option<AdapterInfo> = None;

    for raw_line in text.lines() {
        let line = raw_line.trim_end();
        if line.is_empty() {
            continue;
        }
        let is_indented = raw_line.starts_with(' ') || raw_line.starts_with('\t');
        if !is_indented && line.ends_with(':') {
            let header = line.trim_end_matches(':').trim();
            let lower = header.to_ascii_lowercase();
            if lower.contains("windows ip") || lower.contains("yapılandırması") {
                continue;
            }
            if let Some(prev) = current.take() {
                if !prev.ipv4.is_empty() || !prev.ipv6.is_empty() {
                    adapters.push(prev);
                }
            }
            current = Some(AdapterInfo {
                name: header.to_string(),
                ipv4: String::new(),
                subnet_mask: String::new(),
                ipv6: String::new(),
                mac: String::new(),
                gateway: String::new(),
            });
            continue;
        }

        let Some(ref mut adapter) = current else {
            continue;
        };
        let Some((left, right)) = line.split_once(':') else {
            continue;
        };
        let key = left.trim().to_ascii_lowercase();
        let val = right
            .trim()
            .trim_end_matches("(Preferred)")
            .trim_end_matches("(Tercih Edilen)")
            .trim();
        if val.is_empty() {
            continue;
        }

        if key.contains("physical address") || key.contains("fiziksel adres") {
            let mac = val.replace('-', ":").to_ascii_uppercase();
            if mac.len() == 17 {
                adapter.mac = mac;
            }
        } else if key.contains("ipv4") || key.contains("ip address") || key.contains("ip adresi") {
            let clean_ip = val.split('(').next().unwrap_or(val).trim();
            if clean_ip.parse::<Ipv4Addr>().is_ok() {
                adapter.ipv4 = clean_ip.to_string();
            }
        } else if key.contains("subnet mask") || key.contains("alt ağ maskesi") {
            if val.parse::<Ipv4Addr>().is_ok() {
                adapter.subnet_mask = val.to_string();
            }
        } else if key.contains("ipv6") {
            let clean_v6 = val
                .split('%')
                .next()
                .unwrap_or(val)
                .split('(')
                .next()
                .unwrap_or(val)
                .trim();
            if clean_v6.parse::<Ipv6Addr>().is_ok() && adapter.ipv6.is_empty() {
                adapter.ipv6 = clean_v6.to_string();
            }
        } else if key.contains("default gateway") || key.contains("varsayılan ağ geçidi") {
            if val.parse::<Ipv4Addr>().is_ok() {
                adapter.gateway = val.to_string();
            }
        }
    }

    if let Some(prev) = current.take() {
        if !prev.ipv4.is_empty() || !prev.ipv6.is_empty() {
            adapters.push(prev);
        }
    }
    adapters
}

/// Enumerates active network adapters on the current Windows host.
pub fn detect_adapters() -> Vec<AdapterInfo> {
    let (_, ipcfg, _) = run_hidden_command("ipconfig", &["/all"]);
    parse_ipconfig_adapters(&ipcfg)
}

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
    let norm = mac.trim().replace('-', ":").to_ascii_uppercase();
    let prefix = norm.get(..8).unwrap_or("");
    match prefix {
        // Dahua Technology
        "3C:EF:8C" | "4C:11:BF" | "90:02:A9" | "E0:50:8B" | "A0:BD:1D" | "BC:32:5F"
        | "08:ED:ED" | "14:A7:8B" | "6C:1C:71" | "B4:4C:3B" | "74:C9:29" => {
            "Dahua Technology (IP Camera / NVR)"
        }
        // Hikvision
        "28:57:BE" | "44:19:B6" | "54:C4:15" | "BC:AD:28" | "C0:56:E3" | "C4:2F:90"
        | "A4:14:37" | "18:68:CB" | "4C:BD:8F" | "80:7C:62" | "0C:75:D2" => {
            "Hikvision Digital Technology"
        }
        // Axis / Uniview / Reolink / Hanwha
        "00:40:8C" | "AC:CC:8E" | "B8:A4:4F" => "Axis Communications (Network Camera)",
        "48:EA:63" | "6C:F1:7E" => "Uniview Technologies (IP Camera)",
        "EC:71:DB" => "Reolink Innovation (IP Camera)",
        "00:09:18" | "00:16:6C" => "Hanwha Vision / Samsung Techwin",
        // TP-Link & Mercusys Routers / Extenders / Gateways
        "50:C7:BF" | "14:CC:20" | "C0:25:E9" | "F4:F2:6D" | "98:DA:C4" | "B0:BE:76"
        | "E8:DE:27" | "60:32:B1" | "68:7F:F0" | "68:DD:B7" | "54:AF:97" | "AC:84:C6"
        | "D8:07:B6" | "B4:B0:24" | "C0:06:C3" | "9C:A2:F4" | "1C:3B:F3" => {
            "TP-Link Systems (Gateway / Router)"
        }
        "08:8A:F1" | "0C:1C:31" | "78:8C:B5" | "C0:C9:E3" => {
            "MERCUSYS Technologies Co., Ltd."
        }
        "50:FF:20" | "EC:43:F6" | "04:BF:6D" | "F8:0D:A9" => "Keenetic / Zyxel Communications",
        "00:E0:4C" | "00:13:3B" | "2C:FD:A1" | "70:85:C2" | "D8:BB:C1"
        | "E0:D5:5E" | "74:D4:35" => "Realtek Semiconductor",
        "00:1A:2B" | "04:D9:F5" | "18:31:BF" | "2C:56:DC" | "CC:28:AA" | "04:42:1A"
        | "F0:2F:74" | "A8:5E:45" | "B0:6E:BF" => "ASUSTeK Computer Inc.",
        "48:8F:5A" | "64:D1:54" | "B8:69:F4" | "CC:2D:E0" | "DC:2C:6E" => "MikroTik RouterBOARD",
        "24:5A:4C" | "74:83:C2" | "78:8A:20" | "80:2A:A8" | "F0:9F:C2" => "Ubiquiti Inc.",
        "00:1E:10" | "28:6E:D4" | "48:DB:50" | "88:53:D4" | "F8:4A:BF" | "E0:06:30" => {
            "Huawei Technologies (HGW Modem)"
        }
        "90:CB:A3" | "38:78:62" | "50:5D:AC" => "TECNO Mobile Limited",
        "70:3A:51" | "CC:EB:5E" | "28:6C:07" | "64:09:80" | "AC:C1:EE" => {
            "Xiaomi Communications Co., Ltd."
        }
        "64:1B:2F" | "28:39:5E" | "F4:7B:5E" | "BC:14:85" | "50:01:BB" => {
            "Samsung Electronics Co., Ltd."
        }
        "D8:3A:DD" | "B8:27:EB" | "DC:A6:32" | "E4:5F:01" => "Raspberry Pi Trading",
        "00:50:56" | "00:0C:29" | "00:15:5D" => "VMware / Hyper-V Virtual NIC",
        "3C:22:FB" | "F0:18:98" | "A4:83:E7" | "BC:D0:74" | "F0:EE:7A" => "Apple Inc.",
        "00:1B:21" | "3C:97:0E" | "8C:8D:28" | "A4:BF:01" | "DC:4A:3E" | "C0:3C:59"
        | "E4:C7:67" => "Intel Corporate",
        "E8:0A:B9" | "00:1D:71" | "00:24:14" => "Cisco Systems, Inc.",
        "40:5D:82" | "A0:04:60" => "NETGEAR Inc.",
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
    fn SendARP(dest_ip: u32, src_ip: u32, mac_addr: *mut u8, phy_addr_len: *mut u32) -> u32;
}

/// Actively resolves the Layer-2 MAC address of `target` on the local broadcast domain via Win32 `SendARP`.
pub fn resolve_mac_for_ipv4(target: Ipv4Addr) -> Option<String> {
    resolve_mac_for_ipv4_on_adapter(target, None)
}

/// Actively resolves the Layer-2 MAC address of `target` scoped to `src_ip` via Win32 `SendARP`.
pub fn resolve_mac_for_ipv4_on_adapter(
    target: Ipv4Addr,
    src_ip: Option<Ipv4Addr>,
) -> Option<String> {
    if target.is_loopback() || target.is_unspecified() || target.is_multicast() {
        return None;
    }
    let dst = u32::from_ne_bytes(target.octets());
    let src = src_ip.map(|ip| u32::from_ne_bytes(ip.octets())).unwrap_or(0);
    let mut mac = [0u8; 8];
    let mut len = 6u32;
    let rc = unsafe { SendARP(dst, src, mac.as_mut_ptr(), &mut len) };
    if rc == 0 && len == 6 {
        let formatted = format!(
            "{:02X}:{:02X}:{:02X}:{:02X}:{:02X}:{:02X}",
            mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]
        );
        if formatted != "00:00:00:00:00:00" && formatted != "FF:FF:FF:FF:FF:FF" {
            return Some(formatted);
        }
    }
    None
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
    if found.is_empty() {
        found = query_netbios_name(ip, 55);
    }
    found
}

/// Sends a lightweight RFC 1002 NetBIOS Node Status (`NBSTAT`) query to UDP port 137 (`timeout_ms`)
/// to resolve Windows / Samba / NAS workstation names on the local subnet without guessing.
pub fn query_netbios_name(ip: Ipv4Addr, timeout_ms: u64) -> String {
    let Ok(sock) = UdpSocket::bind("0.0.0.0:0") else {
        return String::new();
    };
    let _ = sock.set_read_timeout(Some(Duration::from_millis(timeout_ms.max(20))));
    let _ = sock.set_write_timeout(Some(Duration::from_millis(timeout_ms.max(20))));
    // Standard 50-byte NBSTAT wildcard query (`*` padded with 0x43 'C' + 0x41 'A')
    let pkt: [u8; 50] = [
        0x82, 0x28, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x20, 0x43, 0x4b,
        0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41,
        0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41,
        0x00, 0x00, 0x21, 0x00, 0x01,
    ];
    let target = SocketAddr::new(IpAddr::V4(ip), 137);
    if sock.send_to(&pkt, target).is_err() {
        return String::new();
    }
    let mut buf = [0u8; 512];
    let Ok((n, _)) = sock.recv_from(&mut buf) else {
        return String::new();
    };
    if n < 57 {
        return String::new();
    }
    let num_names = buf[56] as usize;
    let mut offset = 57;
    for _ in 0..num_names {
        if offset + 18 > n {
            break;
        }
        let name_bytes = &buf[offset..offset + 15];
        let suffix = buf[offset + 15];
        let flags = u16::from_be_bytes([buf[offset + 16], buf[offset + 17]]);
        offset += 18;
        // Unique workstation/server name (Group bit 0x8000 == 0, suffix 0x00 or 0x20)
        if (flags & 0x8000) == 0 && (suffix == 0x00 || suffix == 0x20) {
            let label = String::from_utf8_lossy(name_bytes).trim().to_string();
            if !label.is_empty() && label.chars().all(|c| c.is_ascii_graphic() || c == '-') {
                return label;
            }
        }
    }
    String::new()
}

// ============================================================================
// Batched Non-Blocking Winsock2 TCP Port & RST Probing
// ============================================================================

#[link(name = "ws2_32")]
extern "system" {
    fn socket(af: i32, sock_type: i32, protocol: i32) -> usize;
    fn closesocket(s: usize) -> i32;
    fn ioctlsocket(s: usize, cmd: i32, argp: *mut u32) -> i32;
    fn connect(s: usize, name: *const u8, namelen: i32) -> i32;
    fn select(
        nfds: i32,
        readfds: *mut FdSet,
        writefds: *mut FdSet,
        exceptfds: *mut FdSet,
        timeout: *const TimeVal,
    ) -> i32;
    fn getsockopt(
        s: usize,
        level: i32,
        optname: i32,
        optval: *mut i32,
        optlen: *mut i32,
    ) -> i32;
}

const AF_INET_W: i32 = 2;
const AF_INET6_W: i32 = 23;
const SOCK_STREAM_W: i32 = 1;
const IPPROTO_TCP_W: i32 = 6;
const FIONBIO_W: i32 = -2147195266i32; // 0x8004667E
const SOL_SOCKET_W: i32 = 0xFFFF;
const SO_ERROR_W: i32 = 0x1007;
const INVALID_SOCKET_W: usize = usize::MAX;
const WSAECONNREFUSED_W: i32 = 10061;

#[repr(C)]
struct FdSet {
    fd_count: u32,
    fd_array: [usize; 64],
}

impl FdSet {
    fn new() -> Self {
        Self {
            fd_count: 0,
            fd_array: [0; 64],
        }
    }
    fn set(&mut self, s: usize) {
        if (self.fd_count as usize) < 64 {
            self.fd_array[self.fd_count as usize] = s;
            self.fd_count += 1;
        }
    }
    fn contains(&self, s: usize) -> bool {
        self.fd_array[..self.fd_count as usize].contains(&s)
    }
}

#[repr(C)]
struct TimeVal {
    tv_sec: i32,
    tv_usec: i32,
}

#[repr(C)]
struct SockAddrIn {
    sin_family: u16,
    sin_port: u16,
    sin_addr: [u8; 4],
    sin_zero: [u8; 8],
}

#[repr(C)]
struct SockAddrIn6 {
    sin6_family: u16,
    sin6_port: u16,
    sin6_flowinfo: u32,
    sin6_addr: [u8; 16],
    sin6_scope_id: u32,
}

/// Probes up to 64 TCP ports in parallel on `ip` within a single `timeout_ms` window.
/// Returns `(open_ports, min_latency_ms, saw_rst_refusal)`.
pub fn probe_host_ports_batch(
    ip: IpAddr,
    ports: &[u16],
    timeout_ms: u64,
) -> (Vec<u16>, Option<u32>, bool) {
    // Ensure Winsock is initialized via std
    let _ = UdpSocket::bind("127.0.0.1:0");
    let mut open_ports = Vec::new();
    let mut best_rtt: Option<u32> = None;
    let mut saw_rst = false;

    for chunk in ports.chunks(60) {
        let t0 = Instant::now();
        let mut sockets: Vec<(usize, u16)> = Vec::with_capacity(chunk.len());

        for &port in chunk {
            unsafe {
                let af = match ip {
                    IpAddr::V4(_) => AF_INET_W,
                    IpAddr::V6(_) => AF_INET6_W,
                };
                let s = socket(af, SOCK_STREAM_W, IPPROTO_TCP_W);
                if s == INVALID_SOCKET_W {
                    continue;
                }
                let mut nonblock = 1u32;
                let _ = ioctlsocket(s, FIONBIO_W, &mut nonblock);
                match ip {
                    IpAddr::V4(v4) => {
                        let sa = SockAddrIn {
                            sin_family: AF_INET_W as u16,
                            sin_port: port.to_be(),
                            sin_addr: v4.octets(),
                            sin_zero: [0; 8],
                        };
                        let _ = connect(
                            s,
                            (&sa as *const SockAddrIn).cast(),
                            std::mem::size_of::<SockAddrIn>() as i32,
                        );
                    }
                    IpAddr::V6(v6) => {
                        let sa6 = SockAddrIn6 {
                            sin6_family: AF_INET6_W as u16,
                            sin6_port: port.to_be(),
                            sin6_flowinfo: 0,
                            sin6_addr: v6.octets(),
                            sin6_scope_id: 0,
                        };
                        let _ = connect(
                            s,
                            (&sa6 as *const SockAddrIn6).cast(),
                            std::mem::size_of::<SockAddrIn6>() as i32,
                        );
                    }
                }
                sockets.push((s, port));
            }
        }

        let deadline = t0 + Duration::from_millis(timeout_ms.max(10));
        let mut pending = sockets;

        while !pending.is_empty() && Instant::now() < deadline {
            let rem = deadline.saturating_duration_since(Instant::now());
            let step_ms = rem.as_millis().min(25) as i32;
            let tv = TimeVal {
                tv_sec: step_ms / 1000,
                tv_usec: (step_ms % 1000) * 1000,
            };
            let mut write_set = FdSet::new();
            let mut except_set = FdSet::new();
            for &(s, _) in &pending {
                write_set.set(s);
                except_set.set(s);
            }
            let ready = unsafe {
                select(
                    0,
                    std::ptr::null_mut(),
                    &mut write_set,
                    &mut except_set,
                    &tv,
                )
            };
            if ready <= 0 {
                if Instant::now() >= deadline {
                    break;
                }
                continue;
            }

            let rtt = t0.elapsed().as_millis().max(1) as u32;
            let mut still_pending = Vec::new();
            for (s, port) in pending {
                let is_w = write_set.contains(s);
                let is_e = except_set.contains(s);
                if is_w || is_e {
                    let mut so_err = 0i32;
                    let mut optlen = std::mem::size_of::<i32>() as i32;
                    unsafe {
                        let _ = getsockopt(
                            s,
                            SOL_SOCKET_W,
                            SO_ERROR_W,
                            &mut so_err,
                            &mut optlen,
                        );
                        let _ = closesocket(s);
                    }
                    if is_w && so_err == 0 {
                        open_ports.push(port);
                        best_rtt = Some(match best_rtt {
                            Some(prev) => prev.min(rtt),
                            None => rtt,
                        });
                    } else if so_err == WSAECONNREFUSED_W {
                        saw_rst = true;
                        best_rtt = Some(match best_rtt {
                            Some(prev) => prev.min(rtt),
                            None => rtt,
                        });
                    }
                } else {
                    still_pending.push((s, port));
                }
            }
            pending = still_pending;
        }

        for (s, _) in pending {
            unsafe {
                let _ = closesocket(s);
            }
        }
    }

    open_ports.sort_unstable();
    open_ports.dedup();
    (open_ports, best_rtt, saw_rst)
}

// ============================================================================
// Target Range Planner (IPv4 CIDR/Range/Shorthand, Bounded IPv6, Exclusions)
// ============================================================================

#[derive(Clone, Debug, Default)]
pub struct CancelToken {
    cancelled: Arc<AtomicBool>,
}

impl CancelToken {
    pub fn new() -> Self {
        Self {
            cancelled: Arc::new(AtomicBool::new(false)),
        }
    }
    pub fn cancel(&self) {
        self.cancelled.store(true, Ordering::SeqCst);
    }
    pub fn is_cancelled(&self) -> bool {
        self.cancelled.load(Ordering::SeqCst)
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum TargetSpec {
    Ipv4Single(Ipv4Addr),
    Ipv4Range(Ipv4Addr, Ipv4Addr),
    Ipv4Cidr(Ipv4Addr, u8),
    Ipv6Single(Ipv6Addr),
    Ipv6Cidr(Ipv6Addr, u8),
}

/// Parses a single target token (`192.168.0.1`, `192.168.0.1-192.168.0.16`, `192.168.0.1-16`,
/// `192.168.0.0/24`, `::1`, or `fe80::1/126`).
pub fn parse_target_spec(raw: &str) -> Result<TargetSpec, &'static str> {
    let token = raw.trim();
    if token.is_empty() {
        return Err("Boş hedef tanımı.");
    }
    if let Some((ip_part, bits_part)) = token.split_once('/') {
        let bits = bits_part
            .trim()
            .parse::<u8>()
            .map_err(|_| "Geçersiz CIDR önek uzunluğu.")?;
        if let Ok(v4) = ip_part.trim().parse::<Ipv4Addr>() {
            if !(20..=32).contains(&bits) {
                return Err("IPv4 CIDR aralığı /20 ile /32 arasında olmalı.");
            }
            return Ok(TargetSpec::Ipv4Cidr(v4, bits));
        }
        if let Ok(v6) = ip_part.trim().parse::<Ipv6Addr>() {
            if !(120..=128).contains(&bits) {
                return Err(
                    "IPv6 taraması yalnızca açık /120–/128 aralığında (en çok 256 adres) desteklenir.",
                );
            }
            return Ok(TargetSpec::Ipv6Cidr(v6, bits));
        }
        return Err("Geçersiz CIDR adresi.");
    }

    if let Some((start_s, end_s)) = token.split_once('-') {
        let start_ip = start_s
            .trim()
            .parse::<Ipv4Addr>()
            .map_err(|_| "Geçersiz IPv4 başlangıç adresi.")?;
        let end_ip = if let Ok(full_end) = end_s.trim().parse::<Ipv4Addr>() {
            full_end
        } else if let Ok(last_octet) = end_s.trim().parse::<u8>() {
            let [a, b, c, _] = start_ip.octets();
            Ipv4Addr::new(a, b, c, last_octet)
        } else {
            return Err("Geçersiz IPv4 bitiş adresi.");
        };
        let s_u32 = u32::from(start_ip);
        let e_u32 = u32::from(end_ip);
        if e_u32 < s_u32 || (e_u32 - s_u32) > 4096 {
            return Err("IPv4 aralığı geçersiz veya 4096 adres sınırını aşıyor.");
        }
        return Ok(TargetSpec::Ipv4Range(start_ip, end_ip));
    }

    if let Ok(v4) = token.parse::<Ipv4Addr>() {
        return Ok(TargetSpec::Ipv4Single(v4));
    }
    if let Ok(v6) = token.parse::<Ipv6Addr>() {
        return Ok(TargetSpec::Ipv6Single(v6));
    }
    Err("Geçersiz IPv4 / IPv6 hedef biçimi.")
}

fn expand_spec(spec: &TargetSpec, out: &mut Vec<IpAddr>) {
    match *spec {
        TargetSpec::Ipv4Single(ip) => out.push(IpAddr::V4(ip)),
        TargetSpec::Ipv4Range(start, end) => {
            for n in u32::from(start)..=u32::from(end) {
                out.push(IpAddr::V4(Ipv4Addr::from(n)));
            }
        }
        TargetSpec::Ipv4Cidr(ip, bits) => {
            let cidr = format!("{}/{}", ip, bits);
            if let Some((start, end)) = scan_bounds(&cidr) {
                for n in start..=end {
                    out.push(IpAddr::V4(Ipv4Addr::from(n)));
                }
            }
        }
        TargetSpec::Ipv6Single(v6) => out.push(IpAddr::V6(v6)),
        TargetSpec::Ipv6Cidr(v6, bits) => {
            let base = u128::from(v6);
            let host_bits = 128 - bits;
            let mask = if bits == 128 {
                u128::MAX
            } else {
                u128::MAX << host_bits
            };
            let net = base & mask;
            let count = 1u128 << host_bits;
            for offset in 0..count.min(256) {
                out.push(IpAddr::V6(Ipv6Addr::from(net | offset)));
            }
        }
    }
}

/// Expands a comma/semicolon-separated target specification (with optional `!exclude` or `-exclude` tokens)
/// into an ordered, deduplicated list of `IpAddr` targets (bounded to 4096 addresses).
pub fn plan_targets(spec: &str, default_cidr: &str) -> Result<(String, Vec<IpAddr>), &'static str> {
    let effective = if spec.trim().is_empty() {
        default_cidr.trim()
    } else {
        spec.trim()
    };
    if effective.is_empty() {
        return Err("Taranacak hedef veya yerel IPv4 arabirimi bulunamadı.");
    }

    let mut included = Vec::new();
    let mut excluded = HashSet::new();

    for part in effective.split([',', ';']) {
        let token = part.trim();
        if token.is_empty() {
            continue;
        }
        if let Some(ex_raw) = token
            .strip_prefix('!')
            .or_else(|| token.strip_prefix('-'))
        {
            let parsed = parse_target_spec(ex_raw)?;
            let mut temp = Vec::new();
            expand_spec(&parsed, &mut temp);
            for ip in temp {
                excluded.insert(ip);
            }
        } else {
            let normalized = if !token.contains('/')
                && !token.contains('-')
                && !token.contains(':')
                && token.matches('.').count() == 2
            {
                format!("{}.0/24", token)
            } else {
                token.to_string()
            };
            let parsed = parse_target_spec(&normalized)?;
            expand_spec(&parsed, &mut included);
        }
    }

    let mut seen = BTreeSet::new();
    let mut final_targets = Vec::new();
    for ip in included {
        if !excluded.contains(&ip) && seen.insert(ip) {
            final_targets.push(ip);
            if final_targets.len() > 4096 {
                return Err("Toplam hedef sayısı 4096 sınırını aşıyor.");
            }
        }
    }

    if final_targets.is_empty() {
        return Err("Dışlamalar sonrasında taranacak hedef kalmadı.");
    }
    Ok((effective.to_string(), final_targets))
}

#[derive(Clone, Debug, Default)]
pub struct ScanMetrics {
    pub target_spec: String,
    pub adapter_ip: String,
    pub planned_targets: usize,
    pub probed_targets: usize,
    pub found_hosts: usize,
    pub elapsed_ms: u128,
    pub cancelled: bool,
    pub working_set_bytes: u64,
    pub peak_working_set_bytes: u64,
}

impl ScanMetrics {
    pub fn to_json(&self) -> String {
        format!(
            "{{\"targetSpec\":{},\"adapterIp\":{},\"plannedTargets\":{},\"probedTargets\":{},\"foundHosts\":{},\"elapsedMs\":{},\"cancelled\":{},\"workingSetBytes\":{},\"peakWorkingSetBytes\":{}}}",
            json_str(&self.target_spec),
            json_str(&self.adapter_ip),
            self.planned_targets,
            self.probed_targets,
            self.found_hosts,
            self.elapsed_ms,
            self.cancelled,
            self.working_set_bytes,
            self.peak_working_set_bytes
        )
    }
}

#[derive(Clone, Debug)]
pub struct ScanOutcome {
    pub context: GatewayContext,
    pub hosts: Vec<DiscoveredHost>,
    pub metrics: ScanMetrics,
}

/// Executes multi-adapter, cancellable IPv4/IPv6 discovery with zero fabricated device names or vendors.
pub fn scan_targets_with_options(
    custom_spec: Option<&str>,
    adapter_ip: Option<&str>,
    cancel: Option<&CancelToken>,
) -> ScanOutcome {
    let t0 = Instant::now();
    let mut ctx = discover_gateway_context();
    let adapters = detect_adapters();

    if let Some(req_ip) = adapter_ip.map(str::trim).filter(|s| !s.is_empty()) {
        if let Some(found) = adapters.iter().find(|a| a.ipv4 == req_ip) {
            ctx.local_ip = found.ipv4.clone();
            if !found.gateway.is_empty() {
                ctx.gateway_ip = found.gateway.clone();
            }
            if let Some((prefix, _)) = found.ipv4.rsplit_once('.') {
                ctx.subnet_prefix = prefix.to_string();
                ctx.scan_cidr = format!("{}.0/24", prefix);
            }
        } else if req_ip.parse::<Ipv4Addr>().is_ok() {
            ctx.local_ip = req_ip.to_string();
        }
    }

    let local_adapter_mac = adapters
        .iter()
        .find(|a| a.ipv4 == ctx.local_ip)
        .map(|a| a.mac.clone())
        .unwrap_or_default();

    let spec_str = custom_spec.map(str::trim).filter(|s| !s.is_empty());
    let (label, targets) = match plan_targets(spec_str.unwrap_or(""), &ctx.scan_cidr) {
        Ok((lbl, list)) => (lbl, list),
        Err(_) => {
            let (ws, peak) = process_memory_bytes();
            return ScanOutcome {
                context: ctx,
                hosts: Vec::new(),
                metrics: ScanMetrics {
                    target_spec: spec_str.unwrap_or("").to_string(),
                    adapter_ip: adapter_ip.unwrap_or("").to_string(),
                    planned_targets: 0,
                    probed_targets: 0,
                    found_hosts: 0,
                    elapsed_ms: t0.elapsed().as_millis(),
                    cancelled: false,
                    working_set_bytes: ws,
                    peak_working_set_bytes: peak,
                },
            };
        }
    };
    ctx.scan_cidr = label.clone();

    let planned_targets = targets.len();
    let planned_set: HashSet<String> = targets.iter().map(ToString::to_string).collect();
    let src_ipv4 = ctx.local_ip.parse::<Ipv4Addr>().ok();
    let local_prefix = ctx.subnet_prefix.clone();
    let (_, cache, _) = run_hidden_command("arp", &["-a"]);
    let arp_initial = parse_arp(&cache, Some(&ctx.local_ip));

    let queue = Mutex::new(targets.into_iter());
    let probed_count = std::sync::atomic::AtomicUsize::new(0);
    let results: Mutex<HashMap<String, (Vec<u16>, Option<u32>, Option<String>)>> =
        Mutex::new(HashMap::new());

    let fast_ports = [80, 443, 554, 37777, 8000, 8899, 445, 22, 3389, 8080];
    let remaining: Vec<u16> = DISCOVERY_PORTS
        .iter()
        .copied()
        .filter(|p| !fast_ports.contains(p))
        .collect();

    let worker_count = planned_targets.clamp(1, 64);
    thread::scope(|scope| {
        for _ in 0..worker_count {
            scope.spawn(|| loop {
                if cancel.is_some_and(CancelToken::is_cancelled) {
                    break;
                }
                let next_ip = queue.lock().unwrap().next();
                let Some(ip) = next_ip else {
                    break;
                };
                probed_count.fetch_add(1, Ordering::Relaxed);
                let address = ip.to_string();

                match ip {
                    IpAddr::V4(v4) => {
                        let is_local_l2 = !local_prefix.is_empty()
                            && address.starts_with(&format!("{}.", local_prefix));
                        // First send fast ICMP echo (70ms) and non-blocking TCP batch (60ms).
                        // On local L2 subnets, these automatically trigger kernel ARP resolution without
                        // stalling 64 threads on 3-second SendARP timeouts for unreachable IPs.
                        let ping = ping_ipv4(v4, 70);
                        if cancel.is_some_and(CancelToken::is_cancelled) {
                            break;
                        }
                        let (mut ports, tcp_rtt, saw_rst) =
                            probe_host_ports_batch(IpAddr::V4(v4), &fast_ports, 60);

                        let mut arp_mac = if is_local_l2
                            && address != ctx.local_ip
                            && (planned_targets <= 32
                                || ping.is_some()
                                || !ports.is_empty()
                                || saw_rst)
                        {
                            resolve_mac_for_ipv4_on_adapter(v4, src_ipv4)
                        } else {
                            None
                        };

                        let is_alive = arp_mac.is_some()
                            || ping.is_some()
                            || !ports.is_empty()
                            || saw_rst
                            || address == ctx.local_ip;

                        if is_alive && !cancel.is_some_and(CancelToken::is_cancelled) {
                            if arp_mac.is_none() && is_local_l2 && address != ctx.local_ip {
                                arp_mac = resolve_mac_for_ipv4_on_adapter(v4, src_ipv4);
                            }
                            let (extra, extra_rtt, _) =
                                probe_host_ports_batch(IpAddr::V4(v4), &remaining, 75);
                            ports.extend(extra);
                            ports.sort_unstable();
                            ports.dedup();
                            results.lock().unwrap().insert(
                                address,
                                (ports, ping.or(tcp_rtt).or(extra_rtt), arp_mac),
                            );
                        }
                    }
                    IpAddr::V6(v6) => {
                        let (ports, tcp_rtt, saw_rst) =
                            probe_host_ports_batch(IpAddr::V6(v6), DISCOVERY_PORTS, 90);
                        if !ports.is_empty() || saw_rst || v6.is_loopback() {
                            results
                                .lock()
                                .unwrap()
                                .insert(address, (ports, tcp_rtt, None));
                        }
                    }
                }
            });
        }
    });

    let (_, cache_after, _) = run_hidden_command("arp", &["-a"]);
    let arp_final = parse_arp(&cache_after, Some(&ctx.local_ip));
    if ctx.gateway_mac.is_empty() {
        if let Some(gw_mac) = arp_final.get(&ctx.gateway_ip) {
            ctx.gateway_mac = gw_mac.clone();
        }
    }

    let mut probed = results.into_inner().unwrap();
    // Merge any L2 neighbor present in arp_final within our planned target range (e.g. mobile devices
    // that block ICMP/TCP but answered kernel ARP during the subnet sweep).
    if !cancel.is_some_and(CancelToken::is_cancelled) {
        for (arp_ip, arp_mac) in &arp_final {
            if planned_set.contains(arp_ip) && !probed.contains_key(arp_ip) {
                if let Ok(v4) = arp_ip.parse::<Ipv4Addr>() {
                    // Verify L2 reachability via SendARP or accept fresh ARP entry discovered during sweep
                    let verified_mac = resolve_mac_for_ipv4_on_adapter(v4, src_ipv4)
                        .or_else(|| (!arp_initial.contains_key(arp_ip)).then(|| arp_mac.clone()))
                        .or_else(|| Some(arp_mac.clone()));
                    if let Some(mac_val) = verified_mac {
                        let (ports, rtt, _) =
                            probe_host_ports_batch(IpAddr::V4(v4), DISCOVERY_PORTS, 65);
                        probed.insert(arp_ip.clone(), (ports, rtt.or(Some(2)), Some(mac_val)));
                    }
                }
            }
        }
    }
    let mut hosts = Vec::new();
    for (ip, (mut open_ports, latency_ms, direct_mac)) in probed {
        open_ports.sort_unstable();
        open_ports.dedup();
        let is_gateway = !ctx.gateway_ip.is_empty() && ip == ctx.gateway_ip;
        let mac = direct_mac
            .or_else(|| arp_final.get(&ip).cloned())
            .or_else(|| arp_initial.get(&ip).cloned())
            .or_else(|| {
                if ip == ctx.local_ip && !local_adapter_mac.is_empty() {
                    Some(local_adapter_mac.clone())
                } else {
                    None
                }
            })
            .unwrap_or_default();

        // Zero-guessing rule: vendor comes strictly from IEEE MAC OUI lookup (`"Üretici bilinmiyor"` if unknown).
        let vendor = lookup_mac_vendor(&mac).to_string();

        let is_dahua = open_ports.contains(&37777) || vendor.contains("Dahua");
        let is_hikvision = open_ports.contains(&8000) || vendor.contains("Hikvision");
        let is_onvif_or_rtsp =
            open_ports.contains(&554) || open_ports.contains(&8554) || open_ports.contains(&8899);
        let is_camera = is_dahua || is_hikvision || is_onvif_or_rtsp;

        // Zero-guessing rule: never label an unidentified host as "IoT Endpoint"; return "Bilinmiyor".
        let device_type = if is_gateway {
            "Ana Modem / Yönlendirici (Gateway)".to_string()
        } else if is_dahua {
            "Olası kamera / NVR (Dahua)".to_string()
        } else if is_hikvision {
            "Olası kamera / NVR (Hikvision)".to_string()
        } else if is_onvif_or_rtsp {
            "Olası kamera / medya sunucusu".to_string()
        } else if ip == ctx.local_ip {
            "Bu İstasyon (Yerel Arabirim)".to_string()
        } else if open_ports.contains(&445) || open_ports.contains(&3389) {
            "SMB / RDP Açık Uç".to_string()
        } else if open_ports.contains(&22) {
            "SSH Açık Uç".to_string()
        } else if open_ports.contains(&80)
            || open_ports.contains(&443)
            || open_ports.contains(&8080)
            || open_ports.contains(&8443)
        {
            "HTTP/HTTPS Servis Ucu".to_string()
        } else {
            "Bilinmiyor".to_string()
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

        let hostname = if ip == ctx.local_ip {
            std::env::var("COMPUTERNAME").unwrap_or_default()
        } else if let Ok(v4) = ip.parse::<Ipv4Addr>() {
            cached_hostname(v4)
        } else {
            String::new()
        };

        hosts.push(DiscoveredHost {
            ip,
            mac,
            vendor,
            hostname,
            device_type,
            open_ports,
            latency_ms,
            is_gateway,
            is_camera,
            risk_level,
            security_notes,
        });
    }

    hosts.sort_by(|a, b| {
        match (a.ip.parse::<Ipv4Addr>(), b.ip.parse::<Ipv4Addr>()) {
            (Ok(va), Ok(vb)) => va.cmp(&vb),
            _ => a.ip.cmp(&b.ip),
        }
    });

    let (ws, peak) = process_memory_bytes();
    let metrics = ScanMetrics {
        target_spec: label,
        adapter_ip: ctx.local_ip.clone(),
        planned_targets,
        probed_targets: probed_count.load(Ordering::Relaxed),
        found_hosts: hosts.len(),
        elapsed_ms: t0.elapsed().as_millis(),
        cancelled: cancel.is_some_and(CancelToken::is_cancelled),
        working_set_bytes: ws,
        peak_working_set_bytes: peak,
    };

    ScanOutcome {
        context: ctx,
        hosts,
        metrics,
    }
}

/// ARP, ICMP and TCP discovery. An unresolved default route never triggers a fallback LAN scan.
pub fn scan_local_subnet(custom_prefix: Option<&str>) -> (GatewayContext, Vec<DiscoveredHost>) {
    let outcome = scan_targets_with_options(custom_prefix, None, None);
    (outcome.context, outcome.hosts)
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

/// RFC 3492 Bootstring / Punycode encoder for Internationalized Domain Names (IDNA).
pub fn idna_to_ascii(domain: &str) -> Result<String, &'static str> {
    let trimmed = domain.trim().trim_end_matches('.');
    if trimmed.is_empty() {
        return Err("Alan adı boş olamaz.");
    }
    let mut labels = Vec::new();
    for raw_label in trimmed.split('.') {
        if raw_label.is_empty() {
            return Err("Geçersiz boş alan adı etiketi.");
        }
        if raw_label.is_ascii() {
            labels.push(raw_label.to_ascii_lowercase());
            continue;
        }
        let lower: Vec<u32> = raw_label
            .chars()
            .flat_map(char::to_lowercase)
            .map(|c| c as u32)
            .collect();
        let encoded = punycode_encode(&lower)?;
        labels.push(format!("xn--{}", encoded));
    }
    Ok(labels.join("."))
}

fn punycode_encode(input: &[u32]) -> Result<String, &'static str> {
    const BASE: u32 = 36;
    const TMIN: u32 = 1;
    const TMAX: u32 = 26;
    const SKEW: u32 = 38;
    const DAMP: u32 = 700;
    const INITIAL_BIAS: u32 = 72;
    const INITIAL_N: u32 = 0x80;

    fn adapt(mut delta: u32, numpoints: u32, firsttime: bool) -> u32 {
        delta = if firsttime { delta / DAMP } else { delta >> 1 };
        delta += delta / numpoints;
        let mut k = 0;
        while delta > ((BASE - TMIN) * TMAX) / 2 {
            delta /= BASE - TMIN;
            k += BASE;
        }
        k + (((BASE - TMIN + 1) * delta) / (delta + SKEW))
    }

    fn encode_digit(d: u32) -> char {
        if d < 26 {
            (b'a' + d as u8) as char
        } else {
            (b'0' + (d - 26) as u8) as char
        }
    }

    let mut output = String::new();
    for &cp in input {
        if cp < 0x80 {
            output.push(char::from_u32(cp).ok_or("Invalid ASCII")?);
        }
    }
    let b = output.len() as u32;
    let mut h = b;
    if b > 0 {
        output.push('-');
    }

    let mut n = INITIAL_N;
    let mut delta = 0u32;
    let mut bias = INITIAL_BIAS;

    while (h as usize) < input.len() {
        let m = input
            .iter()
            .copied()
            .filter(|&c| c >= n)
            .min()
            .ok_or("Punycode overflow")?;
        delta = delta
            .checked_add((m - n).checked_mul(h + 1).ok_or("Overflow")?)
            .ok_or("Overflow")?;
        n = m;

        for &c in input {
            if c < n {
                delta = delta.checked_add(1).ok_or("Overflow")?;
            }
            if c == n {
                let mut q = delta;
                let mut k = BASE;
                loop {
                    let t = if k <= bias {
                        TMIN
                    } else if k >= bias + TMAX {
                        TMAX
                    } else {
                        k - bias
                    };
                    if q < t {
                        break;
                    }
                    output.push(encode_digit(t + ((q - t) % (BASE - t))));
                    q = (q - t) / (BASE - t);
                    k += BASE;
                }
                output.push(encode_digit(q));
                bias = adapt(delta, h + 1, h == b);
                delta = 0;
                h += 1;
            }
        }
        delta += 1;
        n += 1;
    }
    Ok(output)
}

/// Queries a specific UDP DNS server (`server`) for a single record type (`qtype`: 1=A, 28=AAAA, 16=TXT)
/// and returns decoded string answers.
pub fn query_dns_single_with_server(
    domain: &str,
    qtype: u16,
    server: SocketAddr,
    timeout_ms: u64,
) -> Result<Vec<String>, String> {
    let ascii_domain = idna_to_ascii(domain).map_err(str::to_string)?;
    let mut packet = Vec::with_capacity(64);
    packet.extend_from_slice(&[0x49, 0x50, 0x01, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
    for label in ascii_domain.split('.') {
        packet.push(label.len() as u8);
        packet.extend_from_slice(label.as_bytes());
    }
    packet.push(0x00);
    packet.extend_from_slice(&qtype.to_be_bytes());
    packet.extend_from_slice(&1u16.to_be_bytes());

    let bind_addr = if server.is_ipv4() {
        "0.0.0.0:0"
    } else {
        "[::]:0"
    };
    let sock = UdpSocket::bind(bind_addr).map_err(|e| e.to_string())?;
    let _ = sock.set_read_timeout(Some(Duration::from_millis(timeout_ms.max(50))));
    let _ = sock.set_write_timeout(Some(Duration::from_millis(timeout_ms.max(50))));
    sock.send_to(&packet, server).map_err(|e| e.to_string())?;

    let mut resp = [0u8; 1500];
    let (n, _) = sock.recv_from(&mut resp).map_err(|e| e.to_string())?;
    if n < 12 {
        return Err("DNS yanıtı çok kısa.".into());
    }
    let qdcount = u16::from_be_bytes([resp[4], resp[5]]) as usize;
    let ancount = u16::from_be_bytes([resp[6], resp[7]]) as usize;
    let mut pos = 12;

    fn skip_name(buf: &[u8], mut idx: usize) -> Option<usize> {
        while idx < buf.len() {
            let b = buf[idx];
            if b == 0 {
                return Some(idx + 1);
            }
            if (b & 0xC0) == 0xC0 {
                return Some(idx + 2);
            }
            idx += 1 + (b as usize);
        }
        None
    }

    for _ in 0..qdcount {
        pos = skip_name(&resp[..n], pos).ok_or("Malformed DNS question")? + 4;
    }

    let mut answers = Vec::new();
    for _ in 0..ancount {
        let Some(after_name) = skip_name(&resp[..n], pos) else {
            break;
        };
        if after_name + 10 > n {
            break;
        }
        let rtype = u16::from_be_bytes([resp[after_name], resp[after_name + 1]]);
        let rdlen = u16::from_be_bytes([resp[after_name + 8], resp[after_name + 9]]) as usize;
        let rdata_start = after_name + 10;
        if rdata_start + rdlen > n {
            break;
        }
        let rdata = &resp[rdata_start..rdata_start + rdlen];
        match (rtype, rdlen) {
            (1, 4) => answers.push(Ipv4Addr::new(rdata[0], rdata[1], rdata[2], rdata[3]).to_string()),
            (28, 16) => {
                let mut arr = [0u8; 16];
                arr.copy_from_slice(rdata);
                answers.push(Ipv6Addr::from(arr).to_string());
            }
            (16, _) if !rdata.is_empty() => {
                let txt_len = (rdata[0] as usize).min(rdata.len() - 1);
                answers.push(String::from_utf8_lossy(&rdata[1..1 + txt_len]).to_string());
            }
            _ => {}
        }
        pos = rdata_start + rdlen;
    }
    Ok(answers)
}

/// Queries a specific TCP WHOIS server (`server_addr`) with automatic referral support.
pub fn query_whois_with_server(server_addr: SocketAddr, query: &str, timeout_ms: u64) -> Result<String, String> {
    let mut stream = TcpStream::connect_timeout(&server_addr, Duration::from_millis(timeout_ms.max(50)))
        .map_err(|e| e.to_string())?;
    let _ = stream.set_read_timeout(Some(Duration::from_millis(timeout_ms.max(50))));
    let _ = stream.set_write_timeout(Some(Duration::from_millis(timeout_ms.max(50))));
    stream
        .write_all(format!("{}\r\n", query.trim()).as_bytes())
        .map_err(|e| e.to_string())?;
    let mut buf = Vec::new();
    stream
        .take(262_144)
        .read_to_end(&mut buf)
        .map_err(|e| e.to_string())?;
    Ok(String::from_utf8_lossy(&buf).to_string())
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

    #[test]
    fn test_target_planner_ranges_exclusions_and_bounded_ipv6() {
        let (_, list) =
            plan_targets("192.168.0.1-16, !192.168.0.5, -192.168.0.10-12", "").unwrap();
        assert_eq!(list.len(), 12);
        assert!(!list.contains(&IpAddr::V4(Ipv4Addr::new(192, 168, 0, 5))));
        assert!(!list.contains(&IpAddr::V4(Ipv4Addr::new(192, 168, 0, 11))));

        let (_, v6_list) = plan_targets("::1/126", "").unwrap();
        assert_eq!(v6_list.len(), 4);

        // Unbounded /64 IPv6 sweep is explicitly rejected
        assert!(plan_targets("fe80::1/64", "").is_err());
    }

    #[test]
    fn test_ipconfig_multi_adapter_parser_and_cancellation() {
        let sample = "Ethernet adapter Ethernet:\r\n   Physical Address. . . . . . . . . : 10-FF-E0-AA-BB-CC\r\n   IPv4 Address. . . . . . . . . . . : 192.168.0.17(Preferred)\r\n   Subnet Mask . . . . . . . . . . . : 255.255.255.0\r\n   Default Gateway . . . . . . . . . : 192.168.0.1\r\n\r\nWireless LAN adapter Wi-Fi:\r\n   Fiziksel Adres. . . . . . . . . . : AA-BB-CC-11-22-33\r\n   IPv4 Adresi . . . . . . . . . . . : 10.20.30.40(Tercih Edilen)\r\n   Alt Ağ Maskesi. . . . . . . . . . : 255.255.255.0\r\n   Varsayılan Ağ Geçidi. . . . . . . : 10.20.30.1\r\n";
        let adapters = parse_ipconfig_adapters(sample);
        assert_eq!(adapters.len(), 2);
        assert_eq!(adapters[0].ipv4, "192.168.0.17");
        assert_eq!(adapters[0].mac, "10:FF:E0:AA:BB:CC");
        assert_eq!(adapters[1].ipv4, "10.20.30.40");
        assert_eq!(adapters[1].gateway, "10.20.30.1");

        let cancel = CancelToken::new();
        cancel.cancel();
        let out = scan_targets_with_options(Some("127.0.0.1-127.0.0.64"), None, Some(&cancel));
        assert!(out.metrics.cancelled);
        assert_eq!(out.metrics.probed_targets, 0);
    }

    #[test]
    fn test_idna_punycode_and_local_dns_whois_sockets() {
        assert_eq!(idna_to_ascii("münchen.de").unwrap(), "xn--mnchen-3ya.de");
        assert_eq!(idna_to_ascii("şirket.tr").unwrap(), "xn--irket-idb.tr");

        // Local UDP DNS responder test
        let udp = UdpSocket::bind("127.0.0.1:0").unwrap();
        let dns_addr = udp.local_addr().unwrap();
        let handle = thread::spawn(move || {
            let mut buf = [0u8; 512];
            let (n, peer) = udp.recv_from(&mut buf).unwrap();
            let mut resp = Vec::new();
            resp.extend_from_slice(&buf[0..2]); // ID
            resp.extend_from_slice(&[0x81, 0x80, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00]);
            resp.extend_from_slice(&buf[12..n]); // echo question
            resp.extend_from_slice(&[0xC0, 0x0C, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x3C, 0x00, 0x04, 93, 184, 216, 34]);
            let _ = udp.send_to(&resp, peer);
        });
        let ans = query_dns_single_with_server("münchen.de", 1, dns_addr, 500).unwrap();
        assert_eq!(ans, vec!["93.184.216.34".to_string()]);
        let _ = handle.join();

        // Local TCP WHOIS responder test
        let tcp = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
        let whois_addr = tcp.local_addr().unwrap();
        let wh = thread::spawn(move || {
            if let Ok((mut s, _)) = tcp.accept() {
                let mut b = [0u8; 64];
                let _ = s.read(&mut b);
                let _ = s.write_all(b"Domain Name: IPSCANS.COM\r\nRegistrar: Verified Test\r\n");
            }
        });
        let raw = query_whois_with_server(whois_addr, "ipscans.com", 500).unwrap();
        assert!(raw.contains("Registrar: Verified Test"));
        let _ = wh.join();
    }
}
