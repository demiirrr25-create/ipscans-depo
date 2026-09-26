use std::collections::HashMap;
use std::net::Ipv4Addr;
use std::time::Duration;

use ssdp_client::SearchTarget;
use super::types::UpnpInfo;

/// SSDP M-SEARCH discovery for UPnP devices (routers, NAS boxes, smart TVs,
/// some NVRs). Returns friendly device metadata keyed by IP; resolving the
/// `LOCATION` URL's device description XML for `<friendlyName>` is the
/// standard follow-up step, done here via a plain HTTP GET.
pub async fn discover(timeout_ms: u64) -> HashMap<Ipv4Addr, UpnpInfo> {
    let mut found = HashMap::new();

    let responses = match ssdp_client::search(
        &SearchTarget::RootDevice,
        Duration::from_millis(timeout_ms),
        2,
        None,
    )
    .await
    {
        Ok(stream) => stream,
        Err(_) => return found,
    };

    tokio::pin!(responses);
    use futures_util::StreamExt;
    while let Some(Ok(response)) = responses.next().await {
        let location = response.location().to_string();
        let Some(ip) = extract_ipv4(&location) else { continue };
        let friendly_name = fetch_friendly_name(&location).await;
        found.insert(
            ip,
            UpnpInfo {
                friendly_name,
                device_type: Some(response.search_target().to_string()),
            },
        );
    }

    found
}

fn extract_ipv4(location_url: &str) -> Option<Ipv4Addr> {
    let after_scheme = location_url.split("://").nth(1)?;
    let host = after_scheme.split(['/', ':']).next()?;
    host.parse().ok()
}

async fn fetch_friendly_name(location_url: &str) -> Option<String> {
    let body = reqwest::get(location_url).await.ok()?.text().await.ok()?;
    let start = body.find("<friendlyName>")? + "<friendlyName>".len();
    let end = body[start..].find("</friendlyName>")? + start;
    Some(body[start..end].to_string())
}
