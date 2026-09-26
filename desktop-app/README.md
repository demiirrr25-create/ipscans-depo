# ipscans Network Scanner (desktop)

Hybrid deep network scanner: Tauri (Rust backend + system webview) with a
plain TypeScript/Vite frontend, matching the ipscans.com black/white/gray
design language.

## Why Tauri over Electron

- Rust backend gives direct, typed access to raw sockets, ICMP, SNMP and UDP
  multicast (WS-Discovery/SSDP) without shelling out to native tools.
- Ships a native installer (~10-20 MB) using the OS's own WebView2 runtime on
  Windows, instead of bundling a full Chromium (~150 MB+ with Electron).
- Rust's `tokio` async runtime scans hundreds of hosts concurrently with a
  fraction of Electron/Node's memory footprint.

## Architecture

```
src-tauri/src/
  main.rs            Tauri commands: scan_network, open_ip_in_browser
  scanner/
    discovery.rs      ICMP sweep + ARP/neighbor-table MAC resolution
    ports.rs          Common-port TCP connect probe (80/443/554/RTSP/etc.)
    snmp.rs           SNMP v2c GET (sysDescr, sysName, entPhysicalSerialNum)
    onvif.rs          WS-Discovery UDP multicast probe (ONVIF cameras/NVRs)
    upnp.rs           SSDP M-SEARCH + device description fetch
    wmi_probe.rs      Windows-only: local-machine WMI (Win32_OperatingSystem, Win32_BIOS)
    types.rs          Shared `Device` model merged from all of the above
```

`scanner::run_full_scan()` runs the ICMP sweep first, fires the two
network-wide multicast discoveries (ONVIF, UPnP) in parallel, then per host
does a port probe + SNMP GET. Whichever protocol answers first contributes
its fields to the same `Device` record, keyed by IP.

## Known limitations of this scaffold

- **Remote WMI** (querying *other* Windows PCs, not just the host machine)
  needs DCOM + admin credentials on the target and is off by default on
  modern Windows — `wmi_probe.rs` only enriches the local machine today.
- **ONVIF** device info (manufacturer/model/serial) requires a second SOAP
  call (`GetDeviceInformation`) to each responder's `XAddr`; only the
  WS-Discovery probe/match step is implemented here.
- The manual XML field extraction in `onvif.rs`/`upnp.rs` is intentionally
  minimal (no external XML parser dependency) — swap in `quick-xml` for a
  production build.
- Raw ARP requests (rather than reading the OS ARP cache) need elevated
  privileges on most OSes; `discovery.rs` deliberately avoids that so the
  app doesn't need to run as admin/root just to list hosts.

## Building

```bash
npm install
npm run tauri dev     # local development
npm run tauri build    # produces an NSIS/MSI installer for Windows
```

Requires the Rust toolchain (`rustup`) and, for Windows builds, the
`x86_64-pc-windows-msvc` target plus the Tauri Windows prerequisites
(WebView2 runtime, MSVC build tools).
