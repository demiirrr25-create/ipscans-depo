use std::collections::HashMap;
use std::net::Ipv4Addr;
use std::time::Duration;

use tokio::net::UdpSocket;
use tokio::time::timeout;

use super::types::OnvifInfo;

const WS_DISCOVERY_MULTICAST: &str = "239.255.255.250:3702";

const PROBE_MESSAGE: &str = r#"<?xml version="1.0" encoding="UTF-8"?>
<e:Envelope xmlns:e="http://www.w3.org/2003/05/soap-envelope"
            xmlns:w="http://schemas.xmlsoap.org/ws/2004/08/addressing"
            xmlns:d="http://schemas.xmlsoap.org/ws/2005/04/discovery"
            xmlns:dn="http://www.onvif.org/ver10/network/wsdl">
  <e:Header>
    <w:MessageID>uuid:ipscans-probe-0001</w:MessageID>
    <w:To e:mustUnderstand="1">urn:schemas-xmlsoap-org:ws:2005:04:discovery</w:To>
    <w:Action e:mustUnderstand="1">http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe</w:Action>
  </e:Header>
  <e:Body>
    <d:Probe>
      <d:Types>dn:NetworkVideoTransmitter</d:Types>
    </d:Probe>
  </e:Body>
</e:Envelope>"#;

/// Broadcasts a WS-Discovery Probe (the mechanism ONVIF cameras/NVRs use to
/// announce themselves) and collects XAddrs of every device that answers.
/// Returns a map of IP -> raw discovery XML; deeper info (manufacturer,
/// serial number) requires a follow-up GetDeviceInformation SOAP call to
/// each XAddr, which is intentionally out of scope for this discovery pass.
pub async fn discover(timeout_ms: u64) -> HashMap<Ipv4Addr, OnvifInfo> {
    let mut found = HashMap::new();

    let socket = match UdpSocket::bind("0.0.0.0:0").await {
        Ok(s) => s,
        Err(_) => return found,
    };
    if socket.send_to(PROBE_MESSAGE.as_bytes(), WS_DISCOVERY_MULTICAST).await.is_err() {
        return found;
    }

    let mut buf = [0u8; 8192];
    let deadline = Duration::from_millis(timeout_ms);
    loop {
        match timeout(deadline, socket.recv_from(&mut buf)).await {
            Ok(Ok((len, src))) => {
                let ip = match src.ip() {
                    std::net::IpAddr::V4(v4) => v4,
                    _ => continue,
                };
                let body = String::from_utf8_lossy(&buf[..len]);
                found.insert(ip, parse_probe_match(&body));
            }
            _ => break, // timed out or errored — done collecting responses
        }
    }
    found
}

/// Very small, dependency-free extraction of a couple of fields from the
/// ProbeMatch XML. A production build should use a real XML parser (e.g. `quick-xml`);
/// kept naive here to keep the scaffold's dependency list minimal.
fn parse_probe_match(xml: &str) -> OnvifInfo {
    OnvifInfo {
        manufacturer: extract_between(xml, "<d:Scopes>", "</d:Scopes>")
            .and_then(|s| s.split("onvif://www.onvif.org/name/").nth(1).map(|s| s.split_whitespace().next().unwrap_or("").to_string())),
        model: None,
        firmware_version: None,
        serial_number: None,
    }
}

fn extract_between<'a>(haystack: &'a str, start: &str, end: &str) -> Option<&'a str> {
    let start_idx = haystack.find(start)? + start.len();
    let end_idx = haystack[start_idx..].find(end)? + start_idx;
    Some(&haystack[start_idx..end_idx])
}
