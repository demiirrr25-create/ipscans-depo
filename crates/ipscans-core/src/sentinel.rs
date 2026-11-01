//! IPScans Sentinel — Autonomous Cybersecurity, Main Modem Gateway Controller,
//! Dahua/Hikvision/ONVIF Camera Defense & Ollama Cyber Agent (`ipscans-cyber-agent:latest`).

use std::io::{Read, Write};
use std::net::{Ipv4Addr, SocketAddr, TcpStream};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use crate::json::{extract_json_bool, extract_json_string, extract_json_u64, json_str};
use crate::network::{
    discover_gateway_context, lookup_mac_vendor, probe_dahua_dvrip_37777, probe_host_ports,
    probe_rtsp_security, GatewayContext,
};
use crate::win32::{app_data_dir, run_hidden_command};

#[derive(Debug, Clone)]
pub struct QuarantineEntry {
    pub ip: String,
    pub mac: String,
    pub vendor: String,
    pub status: String, // "QUARANTINED" | "REMEDIATED_AND_RESTORED"
    pub reason: String,
    pub timestamp_sec: u64,
    pub firewall_rule_in: String,
    pub firewall_rule_out: String,
    pub modem_upnp_purged: bool,
}

impl QuarantineEntry {
    pub fn to_json(&self) -> String {
        format!(
            "{{\"ip\":{},\"mac\":{},\"vendor\":{},\"status\":{},\"reason\":{},\"timestampSec\":{},\"firewallRuleIn\":{},\"firewallRuleOut\":{},\"modemUpnpPurged\":{}}}",
            json_str(&self.ip),
            json_str(&self.mac),
            json_str(&self.vendor),
            json_str(&self.status),
            json_str(&self.reason),
            self.timestamp_sec,
            json_str(&self.firewall_rule_in),
            json_str(&self.firewall_rule_out),
            self.modem_upnp_purged
        )
    }
}

fn now_unix_sec() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

/// Checks installed Ollama models on `127.0.0.1:11434/api/tags`.
pub fn check_ollama_status() -> (bool, Vec<String>, bool) {
    let addr: SocketAddr = "127.0.0.1:11434".parse().unwrap();
    let Ok(mut stream) = TcpStream::connect_timeout(&addr, Duration::from_millis(350)) else {
        return (false, Vec::new(), false);
    };
    let _ = stream.set_read_timeout(Some(Duration::from_millis(800)));
    let _ = stream.set_write_timeout(Some(Duration::from_millis(500)));
    let req = "GET /api/tags HTTP/1.1\r\nHost: 127.0.0.1:11434\r\nConnection: close\r\n\r\n";
    if stream.write_all(req.as_bytes()).is_err() {
        return (false, Vec::new(), false);
    }
    let mut buf = Vec::new();
    let _ = stream.read_to_end(&mut buf);
    let text = String::from_utf8_lossy(&buf);
    if !text
        .lines()
        .next()
        .is_some_and(|line| line.split_whitespace().nth(1) == Some("200"))
    {
        return (false, Vec::new(), false);
    }
    let mut models = Vec::new();
    let mut search_idx = 0;
    while let Some(rel) = text[search_idx..].find("\"name\":\"") {
        let start = search_idx + rel + 8;
        if let Some(end) = text[start..].find('"') {
            let name = text[start..start + end].to_string();
            if !models.contains(&name) {
                models.push(name);
            }
            search_idx = start + end + 1;
        } else {
            break;
        }
    }
    let has_cyber_agent = models.iter().any(|m| m.starts_with("ipscans-cyber-agent"));
    (true, models, has_cyber_agent)
}

/// Queries the local Ollama `ipscans-cyber-agent:latest` model (or `gemma3:4b`) over raw HTTP/1.1.
pub fn query_ollama_cyber_agent(incident_text: &str) -> (String, String, String, Vec<String>) {
    let addr: SocketAddr = "127.0.0.1:11434".parse().unwrap();
    if let Ok(mut stream) = TcpStream::connect_timeout(&addr, Duration::from_millis(400)) {
        let _ = stream.set_read_timeout(Some(Duration::from_millis(4500)));
        let _ = stream.set_write_timeout(Some(Duration::from_millis(1000)));
        let payload = format!(
            "{{\"model\":\"ipscans-cyber-agent:latest\",\"stream\":false,\"format\":\"json\",\"options\":{{\"temperature\":0.1,\"num_predict\":320}},\"messages\":[{{\"role\":\"user\",\"content\":{}}}]}}",
            json_str(incident_text)
        );
        let http_req = format!(
            "POST /api/chat HTTP/1.1\r\nHost: 127.0.0.1:11434\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
            payload.len(),
            payload
        );
        if stream.write_all(http_req.as_bytes()).is_ok() {
            let mut resp_bytes = Vec::new();
            let _ = stream.read_to_end(&mut resp_bytes);
            let resp_str = String::from_utf8_lossy(&resp_bytes);
            if let Some(body_idx) = resp_str.find("\r\n\r\n") {
                let body = &resp_str[body_idx + 4..];
                if let Some(content) = extract_json_string(body, "content") {
                    let summary_tr =
                        extract_json_string(&content, "summary_tr").unwrap_or_else(|| {
                            "Model yapılandırılmış bir Türkçe özet döndürmedi.".to_string()
                        });
                    let threat = extract_json_string(&content, "threat_level")
                        .unwrap_or_else(|| "BELİRLENMEDİ".to_string());
                    let intent = extract_json_string(&content, "detected_intent")
                        .unwrap_or_else(|| "CAMERA_INTRUSION_RESPONSE".to_string());
                    return (threat, intent, summary_tr, Vec::new());
                }
            }
        }
    }

    (
        "BELİRLENMEDİ".into(),
        "LOCAL_INSPECTION".into(),
        "Yerel model yanıt vermedi. Ağ gözlemlerini inceleyin.".into(),
        Vec::new(),
    )
}

pub fn valid_target(ip: &str, ctx: &GatewayContext) -> bool {
    ip.parse::<Ipv4Addr>().is_ok_and(|addr| {
        !addr.is_unspecified()
            && !addr.is_loopback()
            && !addr.is_multicast()
            && !addr.is_broadcast()
            && addr.octets()[0] != 0
            && addr.octets()[0] < 224
            && ip != ctx.local_ip
            && ip != ctx.gateway_ip
    })
}

pub fn purge_modem_upnp_port_mappings(gateway: &str, target: &str) -> (bool, Vec<String>) {
    match (gateway.parse(), target.parse()) {
        (Ok(gateway), Ok(target)) if gateway != target => {
            crate::gateway::remove_camera_mappings(gateway, target)
        }
        _ => (
            false,
            vec!["Geçerli modem ve kamera IP adresleri gerekli.".into()],
        ),
    }
}

/// Apply only this computer's firewall rules for a specific remote IPv4.
pub fn quarantine_device_now(
    target_ip: &str,
    target_mac: &str,
    gateway_ip: &str,
    reason: &str,
) -> (QuarantineEntry, Vec<String>) {
    let mut logs = Vec::new();
    let t0 = Instant::now();

    let rule_in = format!("IPScans_Sentinel_Quarantine_IN_{}", target_ip);
    let rule_out = format!("IPScans_Sentinel_Quarantine_OUT_{}", target_ip);

    let (code_in, _, _) = run_hidden_command(
        "netsh",
        &[
            "advfirewall",
            "firewall",
            "add",
            "rule",
            &format!("name={}", rule_in),
            "dir=in",
            "action=block",
            &format!("remoteip={}", target_ip),
            "enable=yes",
        ],
    );
    let (code_out, _, _) = run_hidden_command(
        "netsh",
        &[
            "advfirewall",
            "firewall",
            "add",
            "rule",
            &format!("name={}", rule_out),
            "dir=out",
            "action=block",
            &format!("remoteip={}", target_ip),
            "enable=yes",
        ],
    );

    let success = code_in == 0 && code_out == 0;
    logs.push(format!(
        "Yerel Windows güvenlik duvarı · gelen kod {code_in}, giden kod {code_out}, {} ms.",
        t0.elapsed().as_millis()
    ));
    let _ = gateway_ip;
    let entry = QuarantineEntry {
        ip: target_ip.to_string(),
        mac: target_mac.to_string(),
        vendor: lookup_mac_vendor(target_mac).to_string(),
        status: if success { "QUARANTINED" } else { "FAILED" }.to_string(),
        reason: reason.to_string(),
        timestamp_sec: now_unix_sec(),
        firewall_rule_in: rule_in,
        firewall_rule_out: rule_out,
        modem_upnp_purged: false,
    };

    save_quarantine_entry(&entry);
    (entry, logs)
}

/// Remove only firewall rules created by this application for this address.
pub fn restore_device_access(target_ip: &str) -> (bool, Vec<String>) {
    let mut logs = Vec::new();
    let mut ok = true;
    let mut entry = load_quarantine_ledger_raw()
        .into_iter()
        .find(|e| e.ip == target_ip);
    for direction in ["IN", "OUT"] {
        let name = format!("name=IPScans_Sentinel_Quarantine_{direction}_{target_ip}");
        let (code, out, err) = run_hidden_command(
            "netsh",
            &["advfirewall", "firewall", "delete", "rule", &name],
        );
        logs.push(format!("{direction} · {code} {out} {err}"));
        ok &= code == 0;
    }
    if let Some(item) = entry.as_mut() {
        item.status = if ok { "RESTORED" } else { "FAILED" }.into();
        item.timestamp_sec = now_unix_sec();
        save_quarantine_entry(item);
    }
    (ok, logs)
}

pub fn save_quarantine_entry(entry: &QuarantineEntry) {
    let dir = app_data_dir("sentinel");
    let path = dir.join("quarantine_ledger.json");
    static LOCK: std::sync::Mutex<()> = std::sync::Mutex::new(());
    let _guard = LOCK.lock().unwrap_or_else(|e| e.into_inner());
    let mut entries = load_quarantine_ledger_raw();
    entries.retain(|e| e.ip != entry.ip);
    entries.insert(0, entry.clone());
    let items: Vec<String> = entries.iter().map(|e| e.to_json()).collect();
    let json = format!("[{}]", items.join(","));
    let staged = dir.join(format!("ledger-{}.tmp", std::process::id()));
    if std::fs::write(&staged, json).is_ok() {
        let _ = std::fs::rename(staged, path);
    }
}

pub fn load_quarantine_ledger_raw() -> Vec<QuarantineEntry> {
    let dir = app_data_dir("sentinel");
    let path = dir.join("quarantine_ledger.json");
    let Ok(content) = std::fs::read_to_string(path) else {
        return Vec::new();
    };
    let mut list = Vec::new();
    for chunk in content.split("},{") {
        let obj = if chunk.starts_with('{') {
            chunk.to_string()
        } else {
            format!(
                "{{{}}}",
                chunk.trim_matches(|c| c == '[' || c == ']' || c == '{' || c == '}')
            )
        };
        if let Some(ip) = extract_json_string(&obj, "ip") {
            list.push(QuarantineEntry {
                ip,
                mac: extract_json_string(&obj, "mac").unwrap_or_default(),
                vendor: extract_json_string(&obj, "vendor").unwrap_or_default(),
                status: extract_json_string(&obj, "status").unwrap_or_default(),
                reason: extract_json_string(&obj, "reason").unwrap_or_default(),
                timestamp_sec: extract_json_u64(&obj, "timestampSec").unwrap_or(0),
                firewall_rule_in: extract_json_string(&obj, "firewallRuleIn").unwrap_or_default(),
                firewall_rule_out: extract_json_string(&obj, "firewallRuleOut").unwrap_or_default(),
                modem_upnp_purged: extract_json_bool(&obj, "modemUpnpPurged").unwrap_or(false),
            });
        }
    }
    list
}

/// Read-only incident review. Explicit operator actions control firewall and modem changes.
pub fn execute_autonomous_incident_pipeline(
    incident_prompt: &str,
    explicit_target_ip: Option<&str>,
    auto_restore: bool,
) -> String {
    let total_t0 = Instant::now();
    let Some(ip) = explicit_target_ip.filter(|s| !s.trim().is_empty()) else {
        return r#"{"ok":false,"error":"Hedef IPv4 adresini belirtin."}"#.into();
    };
    let ctx = discover_gateway_context();
    if !valid_target(ip, &ctx) {
        return r#"{"ok":false,"error":"Geçersiz hedef."}"#.into();
    }
    let (level, intent, summary, _) = query_ollama_cyber_agent(incident_prompt);
    let (ports, _) = probe_host_ports(ip, &[80, 443, 554, 8000, 8554, 8899, 37777], 120);
    let (_, dvr) = probe_dahua_dvrip_37777(ip);
    let (_, rtsp) = probe_rtsp_security(ip);
    // Inspection never changes hardware configuration. The operator chooses a remediation action separately.
    let _ = auto_restore;
    let ports = ports
        .iter()
        .map(u16::to_string)
        .collect::<Vec<_>>()
        .join(",");
    format!(
        r#"{{"ok":true,"target":{},"intent":{},"threatLevel":{},"summary":{},"openPorts":[{}],"dvripProbe":{},"rtspProbe":{},"totalDurationMs":{}}}"#,
        json_str(ip),
        json_str(&intent),
        json_str(&level),
        json_str(&summary),
        ports,
        json_str(&dvr),
        json_str(&rtsp),
        total_t0.elapsed().as_millis()
    )
}
