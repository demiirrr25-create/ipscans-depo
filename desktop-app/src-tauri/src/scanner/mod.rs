pub mod discovery;
pub mod onvif;
pub mod ports;
pub mod snmp;
pub mod types;
pub mod upnp;

#[cfg(target_os = "windows")]
pub mod wmi_probe;

use std::net::Ipv4Addr;

use types::Device;

/// Full hybrid scan pipeline:
/// 1. ICMP sweep to find live hosts on the given subnet (fast, no privileges).
/// 2. Per-host: MAC/vendor resolution + common-port probe.
/// 3. Network-wide: ONVIF WS-Discovery and UPnP/SSDP multicast probes, whose
///    results are merged into the matching host by IP.
/// 4. Per-host (best-effort): SNMP GET for sysDescr/sysName/serial number.
/// 5. Windows-only: local-machine WMI enrichment for whichever entry is "self".
pub async fn run_full_scan(subnet_cidr: &str) -> anyhow::Result<Vec<Device>> {
    let (network, prefix_len) = parse_cidr(subnet_cidr)?;

    let alive_hosts = discovery::ping_sweep(network, prefix_len).await;

    // Network-wide multicast discovery runs once, in parallel with per-host work.
    let (onvif_devices, upnp_devices) =
        tokio::join!(onvif::discover(3000), upnp::discover(3000));

    let mut devices = Vec::with_capacity(alive_hosts.len());
    for ip in alive_hosts {
        let mac = discovery::resolve_mac(ip);
        let vendor = mac.as_deref().and_then(lookup_vendor);
        let open_ports = ports::scan_open_ports(ip.into()).await;
        let snmp_info = snmp::query(ip, "public").await;
        let onvif_info = onvif_devices.get(&ip).cloned();
        let upnp_info = upnp_devices.get(&ip).cloned();

        let serial_number = onvif_info
            .as_ref()
            .and_then(|o| o.serial_number.clone())
            .or_else(|| snmp_info.as_ref().and_then(|s| s.serial_number.clone()));

        devices.push(Device {
            ip: ip.to_string(),
            mac,
            vendor,
            hostname: None,
            open_ports,
            snmp: snmp_info,
            onvif: onvif_info,
            upnp: upnp_info,
            wmi: local_wmi_info(),
            serial_number,
        });
    }

    Ok(devices)
}

fn parse_cidr(cidr: &str) -> anyhow::Result<(Ipv4Addr, u8)> {
    let (ip_part, prefix_part) = cidr
        .split_once('/')
        .ok_or_else(|| anyhow::anyhow!("expected CIDR like 192.168.1.0/24"))?;
    Ok((ip_part.parse()?, prefix_part.parse()?))
}

fn lookup_vendor(mac: &str) -> Option<String> {
    mac_oui::Vendor::from_mac(mac).map(|v| v.name.to_string())
}

#[cfg(target_os = "windows")]
fn local_wmi_info() -> Option<types::WmiInfo> {
    wmi_probe::query_local_machine()
}

#[cfg(not(target_os = "windows"))]
fn local_wmi_info() -> Option<types::WmiInfo> {
    None
}
