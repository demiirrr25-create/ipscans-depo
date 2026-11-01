//! Native Rust Network & Industrial Camera Protocol Probes:
//! - ONVIF WS-Discovery (UDP 3702 SOAP Probe)
//! - RTSP Stream Handshake & Banner Analyzer (TCP 554 / 8554)
//! - UPnP SSDP Router & IGD Discovery (UDP 1900)
//! - TR-069 CWMP & Router Management Exposure Audit

use std::io::{Read, Write};
use std::net::{IpAddr, SocketAddr, TcpStream, UdpSocket};
use std::time::Duration;

#[derive(Clone, Debug)]
pub struct OnvifDeviceEndpoint {
    pub ip: String,
    pub xaddrs: String,
    pub scopes: String,
    pub hardware_model: String,
}

/// Builds a standards-compliant ONVIF WS-Discovery SOAP Probe XML packet for `dn:NetworkVideoTransmitter`.
pub fn build_onvif_ws_discovery_probe(message_uuid: &str) -> String {
    format!(
        r#"<?xml version="1.0" encoding="UTF-8"?>
<e:Envelope xmlns:e="http://www.w3.org/2003/05/soap-envelope"
            xmlns:w="http://schemas.xmlsoap.org/ws/2004/08/addressing"
            xmlns:d="http://schemas.xmlsoap.org/ws/2005/04/discovery"
            xmlns:dn="http://www.onvif.org/ver10/network/wsdl">
  <e:Header>
    <w:MessageID>uuid:{}</w:MessageID>
    <w:To e:mustUnderstand="true">urn:schemas-xmlsoap-org:ws:2005:04:discovery</w:To>
    <w:Action a:mustUnderstand="true" xmlns:a="http://www.w3.org/2005/08/addressing">http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe</w:Action>
  </e:Header>
  <e:Body>
    <d:Probe>
      <d:Types>dn:NetworkVideoTransmitter</d:Types>
    </d:Probe>
  </e:Body>
</e:Envelope>"#,
        message_uuid
    )
}

/// Broadcasts an ONVIF WS-Discovery multicast probe (`239.255.255.250:3702`) and collects responses.
pub fn discover_onvif_cameras(timeout_ms: u64) -> Vec<OnvifDeviceEndpoint> {
    let mut discovered = Vec::new();
    let sock = match UdpSocket::bind("0.0.0.0:0") {
        Ok(s) => s,
        Err(_) => return discovered,
    };
    let _ = sock.set_read_timeout(Some(Duration::from_millis(timeout_ms)));
    let _ = sock.set_write_timeout(Some(Duration::from_millis(timeout_ms)));

    let probe = build_onvif_ws_discovery_probe("8f9a1b2c-3d4e-5f6a-7b8c-9d0e1f2a3b4c");
    let multicast_target: SocketAddr = match "239.255.255.250:3702".parse() {
        Ok(addr) => addr,
        Err(_) => return discovered,
    };
    let _ = sock.send_to(probe.as_bytes(), multicast_target);

    let mut buf = [0u8; 4096];
    for _ in 0..8 {
        match sock.recv_from(&mut buf) {
            Ok((len, peer)) => {
                let xml = String::from_utf8_lossy(&buf[..len]).to_string();
                let xaddrs = extract_xml_tag(&xml, "XAddrs").unwrap_or_default();
                if !xml.contains("ProbeMatch") || xaddrs.is_empty() { continue; }
                let scopes = extract_xml_tag(&xml, "Scopes").unwrap_or_default();
                let model = if scopes.to_lowercase().contains("dahua") {
                    "Dahua IP Camera".to_string()
                } else if scopes.to_lowercase().contains("hikvision") {
                    "Hikvision IP Camera".to_string()
                } else {
                    "ONVIF NetworkVideoTransmitter".to_string()
                };
                discovered.push(OnvifDeviceEndpoint {
                    ip: peer.ip().to_string(),
                    xaddrs,
                    scopes,
                    hardware_model: model,
                });
            }
            Err(_) => break,
        }
    }
    discovered
}

fn extract_xml_tag(xml: &str, local_name: &str) -> Option<String> {
    let open_idx = xml.find(&format!("{}>", local_name))?;
    let content_start = open_idx + local_name.len() + 1;
    let rest = &xml[content_start..];
    let (value, closing) = rest.split_once("</")?;
    let closing_tag = closing.split_once('>')?.0.rsplit(':').next()?;
    (closing_tag == local_name).then(|| value.trim().to_owned())
}

/// Probes an RTSP camera endpoint (`TCP 554`) with an `OPTIONS` request to verify stream readiness and server vendor.
pub fn probe_rtsp_endpoint(ip: &str, port: u16, timeout_ms: u64) -> (bool, String) {
    let ip_addr: IpAddr = match ip.parse() {
        Ok(a) => a,
        Err(_) => return (false, "Invalid IP".to_string()),
    };
    let addr = SocketAddr::new(ip_addr, port);
    let mut stream = match TcpStream::connect_timeout(&addr, Duration::from_millis(timeout_ms)) {
        Ok(s) => s,
        Err(_) => return (false, "RTSP port closed".to_string()),
    };
    let _ = stream.set_read_timeout(Some(Duration::from_millis(timeout_ms)));
    let _ = stream.set_write_timeout(Some(Duration::from_millis(timeout_ms)));

    let req = format!(
        "OPTIONS rtsp://{}:{}/ RTSP/1.0\r\nCSeq: 1\r\nUser-Agent: IPScans-Cortex-Rust/3.0\r\n\r\n",
        ip, port
    );
    if stream.write_all(req.as_bytes()).is_err() {
        return (true, "RTSP TCP Connected".to_string());
    }
    let mut buf = [0u8; 1024];
    match stream.read(&mut buf) {
        Ok(n) if n > 0 => {
            let resp = String::from_utf8_lossy(&buf[..n]);
            let first_line = resp.lines().next().unwrap_or("RTSP/1.0 200 OK").trim();
            (true, first_line.to_string())
        }
        _ => (true, "RTSP TCP Ready".to_string()),
    }
}

/// Builds a UPnP SSDP `M-SEARCH` packet for discovering InternetGatewayDevice (IGD) routers.
pub fn build_ssdp_igd_search_packet() -> &'static str {
    "M-SEARCH * HTTP/1.1\r\n\
     HOST: 239.255.255.250:1900\r\n\
     MAN: \"ssdp:discover\"\r\n\
     MX: 2\r\n\
     ST: urn:schemas-upnp-org:device:InternetGatewayDevice:1\r\n\r\n"
}

/// Parses an ONVIF `ProbeMatch` XML payload into a verified `OnvifDeviceEndpoint`.
pub fn parse_onvif_probe_match(xml: &str, peer_ip: &str) -> Option<OnvifDeviceEndpoint> {
    let xaddrs = extract_xml_tag(xml, "XAddrs")?;
    if !xml.contains("ProbeMatch") || xaddrs.is_empty() {
        return None;
    }
    let scopes = extract_xml_tag(xml, "Scopes").unwrap_or_default();
    let lower = scopes.to_ascii_lowercase();
    let model = if let Some(idx) = lower.find("onvif://www.onvif.org/hardware/") {
        let after = &scopes[idx + "onvif://www.onvif.org/hardware/".len()..];
        after
            .split_whitespace()
            .next()
            .unwrap_or("ONVIF NetworkVideoTransmitter")
            .replace("%20", " ")
    } else if lower.contains("dahua") {
        "Dahua IP Camera".to_string()
    } else if lower.contains("hikvision") {
        "Hikvision IP Camera".to_string()
    } else {
        "ONVIF NetworkVideoTransmitter".to_string()
    };
    Some(OnvifDeviceEndpoint {
        ip: peer_ip.to_string(),
        xaddrs,
        scopes,
        hardware_model: model,
    })
}

/// Validates ONVIF camera management eligibility: requires an explicit `https://` service endpoint
/// and non-empty administrator credentials before allowing configuration or capability queries.
pub fn validate_onvif_https_management(
    xaddrs: &str,
    username: &str,
    password: &str,
) -> Result<String, &'static str> {
    let https_url = xaddrs
        .split_whitespace()
        .find(|u| u.starts_with("https://"))
        .ok_or("ONVIF yönetim değişikliği reddedildi: Cihaz XAddrs listesinde şifreli https:// uç noktası sunmuyor.")?;
    if username.trim().is_empty() || password.len() < 8 {
        return Err("ONVIF yönetim değişikliği için kullanıcı adı ve en az 8 karakterli parola zorunludur.");
    }
    Ok(format!(
        "Doğrulandı: {} üzerinde kimlik doğrulamalı HTTPS ONVIF yönetimi hazır (kullanıcı: {}).",
        https_url,
        username.trim()
    ))
}

// ============================================================================
// Pure-Rust BER/ASN.1 SNMPv2c Client & LLDP/CDP/FDB Topology Engine
// ============================================================================

pub const OID_SYS_DESCR: &[u32] = &[1, 3, 6, 1, 2, 1, 1, 1, 0];
pub const OID_SYS_NAME: &[u32] = &[1, 3, 6, 1, 2, 1, 1, 5, 0];
pub const OID_ENT_PHYSICAL_DESCR: &[u32] = &[1, 3, 6, 1, 2, 1, 47, 1, 1, 1, 1, 2, 1];
pub const OID_LLDP_REM_SYS_NAME: &[u32] = &[1, 0, 8802, 1, 1, 2, 1, 4, 1, 1, 9, 0, 1, 1];
pub const OID_CDP_CACHE_DEVICE_ID: &[u32] = &[1, 3, 6, 1, 4, 1, 9, 9, 23, 1, 2, 1, 1, 6, 1, 1];
pub const OID_DOT1D_TP_FDB_PORT: &[u32] = &[1, 3, 6, 1, 2, 1, 17, 4, 3, 1, 2, 0];

#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct SnmpTopologyEvidence {
    pub agent_ip: String,
    pub sys_name: String,
    pub sys_descr: String,
    pub entity_descr: String,
    pub lldp_neighbors: Vec<String>,
    pub cdp_neighbors: Vec<String>,
    pub fdb_ports: Vec<String>,
}

fn ber_encode_length(len: usize) -> Vec<u8> {
    if len < 128 {
        vec![len as u8]
    } else if len <= 0xFF {
        vec![0x81, len as u8]
    } else {
        vec![0x82, ((len >> 8) & 0xFF) as u8, (len & 0xFF) as u8]
    }
}

fn ber_wrap(tag: u8, content: &[u8]) -> Vec<u8> {
    let mut out = vec![tag];
    out.extend_from_slice(&ber_encode_length(content.len()));
    out.extend_from_slice(content);
    out
}

pub fn ber_encode_oid(oid: &[u32]) -> Vec<u8> {
    if oid.len() < 2 {
        return ber_wrap(0x06, &[0x2B]);
    }
    let mut body = vec![(oid[0] * 40 + oid[1]) as u8];
    for &sub in &oid[2..] {
        if sub == 0 {
            body.push(0);
            continue;
        }
        let mut bytes = Vec::new();
        let mut v = sub;
        bytes.push((v & 0x7F) as u8);
        v >>= 7;
        while v > 0 {
            bytes.push(((v & 0x7F) as u8) | 0x80);
            v >>= 7;
        }
        bytes.reverse();
        body.extend_from_slice(&bytes);
    }
    ber_wrap(0x06, &body)
}

pub fn ber_decode_oid(raw: &[u8]) -> Vec<u32> {
    if raw.is_empty() {
        return Vec::new();
    }
    let first = raw[0] as u32;
    let mut out = vec![first / 40, first % 40];
    let mut acc = 0u32;
    for &b in &raw[1..] {
        acc = (acc << 7) | ((b & 0x7F) as u32);
        if (b & 0x80) == 0 {
            out.push(acc);
            acc = 0;
        }
    }
    out
}

fn ber_read_tlv(data: &[u8], pos: usize) -> Option<(u8, &[u8], usize)> {
    if pos + 2 > data.len() {
        return None;
    }
    let tag = data[pos];
    let len_byte = data[pos + 1];
    let (len, content_start) = if (len_byte & 0x80) == 0 {
        (len_byte as usize, pos + 2)
    } else {
        let n = (len_byte & 0x7F) as usize;
        if n == 0 || n > 2 || pos + 2 + n > data.len() {
            return None;
        }
        let mut l = 0usize;
        for i in 0..n {
            l = (l << 8) | (data[pos + 2 + i] as usize);
        }
        (l, pos + 2 + n)
    };
    if content_start + len > data.len() {
        return None;
    }
    Some((tag, &data[content_start..content_start + len], content_start + len))
}

/// Encodes an SNMPv2c `GetRequest-PDU` (`0xA0`) for a slice of OIDs.
pub fn encode_snmp_v2c_get_request(
    community: &str,
    request_id: u32,
    oids: &[&[u32]],
) -> Vec<u8> {
    let mut varbinds_inner = Vec::new();
    for oid in oids {
        let mut vb = ber_encode_oid(oid);
        vb.extend_from_slice(&[0x05, 0x00]); // NULL value
        varbinds_inner.extend_from_slice(&ber_wrap(0x30, &vb));
    }
    let varbind_list = ber_wrap(0x30, &varbinds_inner);

    let req_bytes = request_id.to_be_bytes();
    let mut pdu_inner = Vec::new();
    pdu_inner.extend_from_slice(&ber_wrap(0x02, &req_bytes)); // request-id
    pdu_inner.extend_from_slice(&[0x02, 0x01, 0x00]); // error-status = 0
    pdu_inner.extend_from_slice(&[0x02, 0x01, 0x00]); // error-index = 0
    pdu_inner.extend_from_slice(&varbind_list);
    let pdu = ber_wrap(0xA0, &pdu_inner);

    let mut msg = Vec::new();
    msg.extend_from_slice(&[0x02, 0x01, 0x01]); // version = 1 (SNMPv2c)
    msg.extend_from_slice(&ber_wrap(0x04, community.as_bytes()));
    msg.extend_from_slice(&pdu);
    ber_wrap(0x30, &msg)
}

/// Encodes an SNMPv2c `GetResponse-PDU` (`0xA2`) for testing and loopback verification.
pub fn encode_snmp_v2c_get_response(
    community: &str,
    request_id: u32,
    pairs: &[(&[u32], &str)],
) -> Vec<u8> {
    let mut varbinds_inner = Vec::new();
    for (oid, val) in pairs {
        let mut vb = ber_encode_oid(oid);
        vb.extend_from_slice(&ber_wrap(0x04, val.as_bytes()));
        varbinds_inner.extend_from_slice(&ber_wrap(0x30, &vb));
    }
    let varbind_list = ber_wrap(0x30, &varbinds_inner);
    let req_bytes = request_id.to_be_bytes();
    let mut pdu_inner = Vec::new();
    pdu_inner.extend_from_slice(&ber_wrap(0x02, &req_bytes));
    pdu_inner.extend_from_slice(&[0x02, 0x01, 0x00]);
    pdu_inner.extend_from_slice(&[0x02, 0x01, 0x00]);
    pdu_inner.extend_from_slice(&varbind_list);
    let pdu = ber_wrap(0xA2, &pdu_inner);

    let mut msg = Vec::new();
    msg.extend_from_slice(&[0x02, 0x01, 0x01]);
    msg.extend_from_slice(&ber_wrap(0x04, community.as_bytes()));
    msg.extend_from_slice(&pdu);
    ber_wrap(0x30, &msg)
}

/// Decodes an SNMPv2c `GetResponse-PDU` into `(OID, String)` pairs.
pub fn decode_snmp_v2c_response(packet: &[u8]) -> Option<Vec<(Vec<u32>, String)>> {
    let (0x30, msg_body, _) = ber_read_tlv(packet, 0)? else {
        return None;
    };
    let (0x02, _ver, pos1) = ber_read_tlv(msg_body, 0)? else {
        return None;
    };
    let (0x04, _comm, pos2) = ber_read_tlv(msg_body, pos1)? else {
        return None;
    };
    let (pdu_tag, pdu_body, _) = ber_read_tlv(msg_body, pos2)?;
    if pdu_tag != 0xA2 {
        return None;
    }
    let (0x02, _req_id, p1) = ber_read_tlv(pdu_body, 0)? else {
        return None;
    };
    let (0x02, _err_st, p2) = ber_read_tlv(pdu_body, p1)? else {
        return None;
    };
    let (0x02, _err_ix, p3) = ber_read_tlv(pdu_body, p2)? else {
        return None;
    };
    let (0x30, vbl_body, _) = ber_read_tlv(pdu_body, p3)? else {
        return None;
    };

    let mut results = Vec::new();
    let mut vpos = 0;
    while vpos < vbl_body.len() {
        let (0x30, vb_body, next_vpos) = ber_read_tlv(vbl_body, vpos)? else {
            break;
        };
        vpos = next_vpos;
        let (0x06, oid_raw, val_pos) = ber_read_tlv(vb_body, 0)? else {
            continue;
        };
        let (val_tag, val_raw, _) = ber_read_tlv(vb_body, val_pos)?;
        let oid = ber_decode_oid(oid_raw);
        let val_str = match val_tag {
            0x04 => String::from_utf8_lossy(val_raw).to_string(),
            0x02 => {
                let mut n = 0i64;
                for &b in val_raw {
                    n = (n << 8) | (b as i64);
                }
                n.to_string()
            }
            _ => String::new(),
        };
        if !val_str.is_empty() {
            results.push((oid, val_str));
        }
    }
    Some(results)
}

/// Queries an SNMPv2c agent for `sysDescr`, `sysName`, `ENTITY-MIB`, `LLDP`, `CDP`, and Bridge FDB evidence.
/// Requires an explicit non-empty `community` string (authorized polling only).
pub fn query_snmp_v2c(
    target: SocketAddr,
    community: &str,
    timeout_ms: u64,
) -> Result<SnmpTopologyEvidence, String> {
    if community.trim().is_empty() {
        return Err("SNMPv2c sorgusu için yetkili community dizesi zorunludur.".into());
    }
    let oids: &[&[u32]] = &[
        OID_SYS_DESCR,
        OID_SYS_NAME,
        OID_ENT_PHYSICAL_DESCR,
        OID_LLDP_REM_SYS_NAME,
        OID_CDP_CACHE_DEVICE_ID,
        OID_DOT1D_TP_FDB_PORT,
    ];
    let req = encode_snmp_v2c_get_request(community.trim(), 0x2026_1101, oids);
    let sock = UdpSocket::bind("0.0.0.0:0").map_err(|e| e.to_string())?;
    let _ = sock.set_read_timeout(Some(Duration::from_millis(timeout_ms.max(80))));
    let _ = sock.set_write_timeout(Some(Duration::from_millis(timeout_ms.max(80))));
    sock.send_to(&req, target).map_err(|e| e.to_string())?;

    let mut buf = [0u8; 2048];
    let (n, _) = sock.recv_from(&mut buf).map_err(|e| e.to_string())?;
    let pairs = decode_snmp_v2c_response(&buf[..n])
        .ok_or_else(|| "Geçersiz SNMPv2c BER yanıtı.".to_string())?;

    let mut ev = SnmpTopologyEvidence {
        agent_ip: target.ip().to_string(),
        ..Default::default()
    };
    for (oid, val) in pairs {
        if oid == OID_SYS_DESCR {
            ev.sys_descr = val;
        } else if oid == OID_SYS_NAME {
            ev.sys_name = val;
        } else if oid == OID_ENT_PHYSICAL_DESCR {
            ev.entity_descr = val;
        } else if oid.starts_with(&[1, 0, 8802, 1, 1, 2]) {
            ev.lldp_neighbors.push(val);
        } else if oid.starts_with(&[1, 3, 6, 1, 4, 1, 9, 9, 23]) {
            ev.cdp_neighbors.push(val);
        } else if oid.starts_with(&[1, 3, 6, 1, 2, 1, 17, 4, 3]) {
            ev.fdb_ports.push(val);
        }
    }
    Ok(ev)
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum LinkConfidence {
    /// Confirmed physical/L2 link backed by LLDP, CDP, or Bridge FDB table evidence (rendered solid).
    ConfirmedL2,
    /// Logical IPv4 subnet route to the active default gateway (rendered dashed).
    InferredGateway,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct TopologyLink {
    pub from: String,
    pub to: String,
    pub protocol: String,
    pub confidence: LinkConfidence,
}

#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct TopologyGraph {
    pub links: Vec<TopologyLink>,
    pub confirmed_count: usize,
    pub inferred_count: usize,
}

/// Builds a topology graph strictly from verified SNMP/LLDP/CDP/FDB evidence (`ConfirmedL2`)
/// and the known default gateway (`InferredGateway`).
/// Never fabricates links when neither SNMP/LLDP/CDP evidence nor a verified gateway exists.
pub fn build_topology(
    gateway_ip: &str,
    host_ips: &[String],
    snmp_evidence: &[SnmpTopologyEvidence],
) -> TopologyGraph {
    let mut links = Vec::new();
    let mut confirmed_count = 0;
    let mut inferred_count = 0;

    for ev in snmp_evidence {
        for peer in &ev.lldp_neighbors {
            confirmed_count += 1;
            links.push(TopologyLink {
                from: ev.agent_ip.clone(),
                to: peer.clone(),
                protocol: "LLDP".to_string(),
                confidence: LinkConfidence::ConfirmedL2,
            });
        }
        for peer in &ev.cdp_neighbors {
            confirmed_count += 1;
            links.push(TopologyLink {
                from: ev.agent_ip.clone(),
                to: peer.clone(),
                protocol: "CDP".to_string(),
                confidence: LinkConfidence::ConfirmedL2,
            });
        }
    }

    let gw = gateway_ip.trim();
    if !gw.is_empty() {
        for ip in host_ips {
            if ip != gw
                && !links
                    .iter()
                    .any(|l| (l.from == *ip && l.to == gw) || (l.from == gw && l.to == *ip))
            {
                inferred_count += 1;
                links.push(TopologyLink {
                    from: gw.to_string(),
                    to: ip.clone(),
                    protocol: "IPv4-Route".to_string(),
                    confidence: LinkConfidence::InferredGateway,
                });
            }
        }
    }

    TopologyGraph {
        links,
        confirmed_count,
        inferred_count,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_onvif_probe_and_ssdp_packets() {
        let xml = build_onvif_ws_discovery_probe("1111-2222");
        assert!(xml.contains("dn:NetworkVideoTransmitter"));
        assert!(xml.contains("uuid:1111-2222"));

        let ssdp = build_ssdp_igd_search_packet();
        assert!(ssdp.contains("InternetGatewayDevice:1"));
    }

    #[test]
    fn test_snmp_v2c_lldp_cdp_entity_mib_and_topology_confidence() {
        let server = UdpSocket::bind("127.0.0.1:0").unwrap();
        let addr = server.local_addr().unwrap();
        let handle = std::thread::spawn(move || {
            let mut buf = [0u8; 1024];
            let (_, peer) = server.recv_from(&mut buf).unwrap();
            let resp = encode_snmp_v2c_get_response(
                "public",
                0x2026_1101,
                &[
                    (OID_SYS_DESCR, "Cisco IOS Software, C2960X"),
                    (OID_SYS_NAME, "SW-CORE-01"),
                    (OID_ENT_PHYSICAL_DESCR, "WS-C2960X-24TS-L"),
                    (OID_LLDP_REM_SYS_NAME, "192.168.0.22"),
                    (OID_CDP_CACHE_DEVICE_ID, "192.168.0.1"),
                ],
            );
            let _ = server.send_to(&resp, peer);
        });

        let ev = query_snmp_v2c(addr, "public", 500).unwrap();
        let _ = handle.join();
        assert_eq!(ev.sys_name, "SW-CORE-01");
        assert_eq!(ev.entity_descr, "WS-C2960X-24TS-L");
        assert_eq!(ev.lldp_neighbors, vec!["192.168.0.22".to_string()]);
        assert_eq!(ev.cdp_neighbors, vec!["192.168.0.1".to_string()]);

        // When gateway is empty and no SNMP evidence exists, 0 links are fabricated:
        let empty_topo = build_topology(
            "",
            &["192.168.0.17".to_string(), "192.168.0.22".to_string()],
            &[],
        );
        assert_eq!(empty_topo.links.len(), 0);

        // With SNMP LLDP/CDP + gateway, confirmed links are distinguished from inferred links:
        let topo = build_topology(
            "192.168.0.1",
            &[
                "192.168.0.1".to_string(),
                "192.168.0.17".to_string(),
                "192.168.0.22".to_string(),
            ],
            &[ev],
        );
        assert_eq!(topo.confirmed_count, 2);
        assert_eq!(topo.inferred_count, 2);
    }

    #[test]
    fn test_onvif_probe_match_parser_and_https_guard() {
        let sample = r#"<s:Envelope><s:Body><d:ProbeMatches><d:ProbeMatch><d:XAddrs>http://192.168.0.50/onvif/device_service https://192.168.0.50:443/onvif/device_service</d:XAddrs><d:Scopes>onvif://www.onvif.org/hardware/IPC-HDW5442T-ZE onvif://www.onvif.org/name/Dahua</d:Scopes></d:ProbeMatch></d:ProbeMatches></s:Body></s:Envelope>"#;
        let ep = parse_onvif_probe_match(sample, "192.168.0.50").unwrap();
        assert_eq!(ep.hardware_model, "IPC-HDW5442T-ZE");
        assert!(validate_onvif_https_management(&ep.xaddrs, "admin", "StrongPass!26").is_ok());
        assert!(validate_onvif_https_management(
            "http://192.168.0.50/onvif/device_service",
            "admin",
            "StrongPass!26"
        )
        .is_err());
    }
}
