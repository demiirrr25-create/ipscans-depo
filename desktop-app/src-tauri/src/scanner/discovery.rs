use std::net::Ipv4Addr;
use std::time::Duration;

use surge_ping::{Client, Config, PingIdentifier, PingSequence};

/// Sweeps every host address in the given /24 (or narrower) subnet with a
/// short-timeout ICMP echo. This is the fast "who's alive" pass; ARP-level
/// MAC resolution happens separately via the OS neighbor/ARP table, since
/// raw ARP frames require elevated privileges that we'd rather not demand
/// just to enumerate hosts.
pub async fn ping_sweep(network: Ipv4Addr, prefix_len: u8) -> Vec<Ipv4Addr> {
    let hosts = host_addresses(network, prefix_len);
    let client = match Client::new(&Config::default()) {
        Ok(c) => c,
        Err(_) => return Vec::new(),
    };

    let mut tasks = Vec::with_capacity(hosts.len());
    for (i, ip) in hosts.into_iter().enumerate() {
        let client = client.clone();
        tasks.push(tokio::spawn(async move {
            let mut pinger = client
                .pinger(ip.into(), PingIdentifier(i as u16))
                .await;
            pinger.timeout(Duration::from_millis(400));
            match pinger.ping(PingSequence(0), &[0u8; 8]).await {
                Ok(_) => Some(ip),
                Err(_) => None,
            }
        }));
    }

    let mut alive = Vec::new();
    for task in tasks {
        if let Ok(Some(ip)) = task.await {
            alive.push(ip);
        }
    }
    alive
}

/// Reads the OS's ARP/neighbor table (already populated by the ping sweep)
/// to resolve IPv4 -> MAC without needing raw-socket privileges.
/// Linux/macOS: parses `ip neigh` / `arp -a`. Windows: parses `arp -a`.
pub fn resolve_mac(ip: Ipv4Addr) -> Option<String> {
    #[cfg(target_os = "windows")]
    let output = std::process::Command::new("arp").arg("-a").arg(ip.to_string()).output();
    #[cfg(not(target_os = "windows"))]
    let output = std::process::Command::new("arp").arg("-n").arg(ip.to_string()).output();

    let output = output.ok()?;
    let text = String::from_utf8_lossy(&output.stdout);
    // Match a MAC in either aa:bb:cc:dd:ee:ff or aa-bb-cc-dd-ee-ff form.
    for token in text.split_whitespace() {
        let normalized = token.replace('-', ":");
        if normalized.matches(':').count() == 5 && normalized.len() == 17 {
            return Some(normalized.to_lowercase());
        }
    }
    None
}

fn host_addresses(network: Ipv4Addr, prefix_len: u8) -> Vec<Ipv4Addr> {
    let mask_bits = 32u32.saturating_sub(prefix_len as u32);
    if mask_bits == 0 || mask_bits > 16 {
        // Keep scans bounded to /16 at most to avoid accidentally sweeping huge ranges.
        return Vec::new();
    }
    let base = u32::from(network) & (u32::MAX << mask_bits);
    let count = 1u32 << mask_bits;
    (1..count.saturating_sub(1))
        .map(|host| Ipv4Addr::from(base + host))
        .collect()
}
