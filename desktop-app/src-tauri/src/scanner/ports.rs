use std::net::{IpAddr, SocketAddr};
use std::time::Duration;

use tokio::net::TcpStream;

/// Ports worth checking during device fingerprinting — not a full 65535 scan,
/// just the ones that hint at device type (router admin UI, RTSP camera
/// stream, ONVIF service port, SMB/RDP for Windows hosts, etc).
const CANDIDATE_PORTS: &[u16] = &[21, 22, 23, 80, 443, 554, 3389, 8000, 8080, 8899, 37777];

pub async fn scan_open_ports(ip: IpAddr) -> Vec<u16> {
    let mut tasks = Vec::with_capacity(CANDIDATE_PORTS.len());
    for &port in CANDIDATE_PORTS {
        tasks.push(tokio::spawn(async move {
            let addr = SocketAddr::new(ip, port);
            let connect = TcpStream::connect(addr);
            match tokio::time::timeout(Duration::from_millis(300), connect).await {
                Ok(Ok(_)) => Some(port),
                _ => None,
            }
        }));
    }

    let mut open = Vec::new();
    for task in tasks {
        if let Ok(Some(port)) = task.await {
            open.push(port);
        }
    }
    open
}
