//! Target-scoped UPnP changes for directly attached gateways.
//! Only delete a mapping after the router reports the requested target as its internal client.
use std::{
    io::{Read, Write},
    net::{Ipv4Addr, SocketAddr, TcpStream},
    time::Duration,
};

const SERVICE: &str = "urn:schemas-upnp-org:service:WANIPConnection:1";

fn soap(
    gateway: Ipv4Addr,
    port: u16,
    path: &str,
    action: &str,
    fields: &str,
) -> Result<String, ()> {
    let address = SocketAddr::from((gateway, port));
    let mut stream =
        TcpStream::connect_timeout(&address, Duration::from_millis(220)).map_err(|_| ())?;
    stream
        .set_read_timeout(Some(Duration::from_millis(500)))
        .map_err(|_| ())?;
    stream
        .set_write_timeout(Some(Duration::from_millis(400)))
        .map_err(|_| ())?;
    let body = format!(
        r#"<?xml version="1.0"?><s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/"><s:Body><u:{action} xmlns:u="{SERVICE}">{fields}</u:{action}></s:Body></s:Envelope>"#
    );
    write!(stream,"POST {path} HTTP/1.0\r\nHost: {address}\r\nContent-Type: text/xml; charset=utf-8\r\nSOAPAction: \"{SERVICE}#{action}\"\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}", body.len()).map_err(|_|())?;
    let mut raw = String::new();
    stream
        .take(65536)
        .read_to_string(&mut raw)
        .map_err(|_| ())?;
    let (headers, body) = raw.split_once("\r\n\r\n").ok_or(())?;
    if headers
        .lines()
        .next()
        .and_then(|s| s.split_whitespace().nth(1))
        != Some("200")
        || !body.contains(&format!("{action}Response"))
    {
        return Err(());
    }
    Ok(body.to_owned())
}

pub fn remove_camera_mappings(gateway: Ipv4Addr, target: Ipv4Addr) -> (bool, Vec<String>) {
    let mut logs = Vec::new();
    let mut found = false;
    let mut complete = true;
    for (external, protocol) in [
        (37777, "TCP"),
        (37778, "UDP"),
        (554, "TCP"),
        (8554, "TCP"),
        (8000, "TCP"),
        (8899, "TCP"),
        (9530, "UDP"),
    ] {
        let fields = format!("<NewRemoteHost></NewRemoteHost><NewExternalPort>{external}</NewExternalPort><NewProtocol>{protocol}</NewProtocol>");
        for (port, path) in [
            (1900, "/ctl/IPConn"),
            (5000, "/ctl/IPConn"),
            (49000, "/upnp/control/WANIPConn1"),
            (80, "/ctl/IPConn"),
        ] {
            let Ok(mapping) = soap(gateway, port, path, "GetSpecificPortMappingEntry", &fields)
            else {
                continue;
            };
            let owner = mapping
                .split_once("<NewInternalClient>")
                .and_then(|(_, s)| s.split_once("</NewInternalClient>"))
                .and_then(|(ip, _)| ip.trim().parse::<Ipv4Addr>().ok());
            if owner == Some(target) {
                found = true;
                let deleted = soap(gateway, port, path, "DeletePortMapping", &fields).is_ok();
                complete &= deleted;
                logs.push(format!(
                    "{external}/{protocol} · {}",
                    if deleted {
                        "Silme isteğini modem onayladı."
                    } else {
                        "Modem silme işlemini onaylamadı."
                    }
                ));
            }
            break;
        }
    }
    if !found {
        logs.push(
            "Desteklenen modem uçlarında hedefe ait port yönlendirmesi doğrulanamadı.".into(),
        );
    }
    (found && complete, logs)
}
