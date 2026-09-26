use crate::scanner::types::Device;
use tauri_plugin_opener::OpenerExt;

mod scanner;

#[tauri::command]
async fn scan_network(subnet_cidr: String) -> Result<Vec<Device>, String> {
    scanner::run_full_scan(&subnet_cidr)
        .await
        .map_err(|e| e.to_string())
}

/// Opens `http://<ip>` (or `https://` if the caller already included a scheme)
/// in the user's default system browser — the "clickable IP" feature.
#[tauri::command]
fn open_ip_in_browser(app: tauri::AppHandle, ip: String) -> Result<(), String> {
    let url = if ip.starts_with("http://") || ip.starts_with("https://") {
        ip
    } else {
        format!("http://{ip}")
    };
    app.opener()
        .open_url(url, None::<&str>)
        .map_err(|e| e.to_string())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![scan_network, open_ip_in_browser])
        .run(tauri::generate_context!())
        .expect("error while running ipscans network scanner");
}
