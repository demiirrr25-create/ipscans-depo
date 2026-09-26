#![cfg(target_os = "windows")]
//! Local-machine WMI enrichment. Remote WMI (querying *other* PCs on the
//! network) requires DCOM + admin credentials on the target and is disabled
//! by default on modern Windows/firewalls — realistically this module only
//! reliably enriches the machine the scanner itself runs on. It's kept
//! separate so a future build can add an (optional, explicit) remote
//! credential prompt for domain-joined environments.

use serde::Deserialize;
use wmi::{COMLibrary, WMIConnection};

use super::types::WmiInfo;

#[derive(Deserialize, Debug)]
struct Win32OperatingSystem {
    #[serde(rename = "Caption")]
    caption: String,
    #[serde(rename = "CSName")]
    computer_name: String,
}

#[derive(Deserialize, Debug)]
struct Win32Bios {
    #[serde(rename = "SerialNumber")]
    serial_number: String,
}

pub fn query_local_machine() -> Option<WmiInfo> {
    let com_con = COMLibrary::new().ok()?;
    let wmi_con = WMIConnection::new(com_con).ok()?;

    let os_results: Vec<Win32OperatingSystem> =
        wmi_con.query().ok().unwrap_or_default();
    let bios_results: Vec<Win32Bios> = wmi_con.query().ok().unwrap_or_default();

    let os = os_results.into_iter().next();
    let bios = bios_results.into_iter().next();

    if os.is_none() && bios.is_none() {
        return None;
    }

    Some(WmiInfo {
        computer_name: os.as_ref().map(|o| o.computer_name.clone()),
        os_caption: os.map(|o| o.caption),
        bios_serial_number: bios.map(|b| b.serial_number),
    })
}
