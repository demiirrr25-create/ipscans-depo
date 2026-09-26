use serde::Serialize;

/// One discovered network device, progressively enriched by each protocol
/// module. Every field beyond `ip` is best-effort: a home router will answer
/// ARP/ICMP but not SNMP; an ONVIF camera will answer WS-Discovery and often
/// SNMP is disabled; a Windows PC only answers WMI when credentials + remote
/// WMI access are available. The scanner merges whatever it can get.
#[derive(Debug, Clone, Serialize)]
pub struct Device {
    pub ip: String,
    pub mac: Option<String>,
    pub vendor: Option<String>,
    pub hostname: Option<String>,
    pub open_ports: Vec<u16>,
    pub snmp: Option<SnmpInfo>,
    pub onvif: Option<OnvifInfo>,
    pub upnp: Option<UpnpInfo>,
    pub wmi: Option<WmiInfo>,
    /// Best available serial number, in priority order: WMI > ONVIF > SNMP.
    pub serial_number: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct SnmpInfo {
    pub sys_descr: Option<String>,
    pub sys_name: Option<String>,
    pub serial_number: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct OnvifInfo {
    pub manufacturer: Option<String>,
    pub model: Option<String>,
    pub firmware_version: Option<String>,
    pub serial_number: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct UpnpInfo {
    pub friendly_name: Option<String>,
    pub device_type: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct WmiInfo {
    pub computer_name: Option<String>,
    pub os_caption: Option<String>,
    pub bios_serial_number: Option<String>,
}
