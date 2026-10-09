# IPscans+ 4.0.0 / Network Observatory

Native Windows ICMP, parallel TCP discovery, four scan profiles, custom TCP
ports, multiple subnets/exclusions, structured search, live metrics and
standalone HTML reports. See [v4 engineering notes](V4_RESEARCH.md).

Use Settings for additional ranges, exclusions and service ports. Search
with `port:443 source:ONVIF`, `ip:192.168.1.0/24`, `type:"IP Camera"` or
`-type:Unknown`. HTML reports can be printed to PDF from a browser.

PyQt6 desktop network discovery and authorized management. Windows releases
are published only after the source, packaged application, installer and
uninstaller pass CI. The previous 2.0.2 assets remain available; downloads
are never replaced with untested binaries or fabricated hashes.

## Run and validate

```bash
python -m venv .venv
source .venv/bin/activate # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python main.py
QT_QPA_PLATFORM=offscreen python -m unittest discover -s tests -v
QT_QPA_PLATFORM=offscreen python main.py --selftest
QT_QPA_PLATFORM=offscreen python benchmarks/scanner_benchmark.py --output benchmark.json
python -m compileall -q app tests benchmarks
```

On Windows omit `QT_QPA_PLATFORM=offscreen` or set it through the shell's
environment mechanism. The Windows workflow runs engine, adapter, graph and
UI tests, benchmarks, a packaged executable selftest, installer/shortcut
checks, an installed executable selftest and uninstall checks, and uploads
SHA-256 hashes separately. PyInstaller on Linux cannot create a Windows EXE.

## Workflow

- Sidebar: Scan, Network Map, History, Settings.
- Detect active IPv4 adapters with their actual masks and gateway/DNS
  metadata. Windows metadata is obtained without parsing localized
  `ipconfig` labels. Adapter polling and history I/O run outside the GUI.
- Start/end IP fields replace Single IP / CIDR modes. Pasted single IPs
  and CIDRs still work. IPv4 targets are capped at 65,534; scans exceeding
  4,096 addresses require confirmation. IPv6 remains manually bounded
  to 256 addresses; scoped link-local targets are unsupported.
- A single workspace switches between a virtualized model/view device
  table and a node graph, with one shared search. Table columns are
  sortable, movable, resizable and hideable through the header context
  menu. Hidden legacy columns preserve port/serial/source information.
- The graph supports zoom, pan, fit, search, branch collapse/expand,
  context menus, device refresh, details and SVG/PNG export. Raster
  export is limited to 250 visible devices and 4,096 pixels per dimension.
- Double-click or Enter opens the Device Control Panel. Web access,
  copy IP and ICMP/TCP tests are available without device authentication.
- History stores at most 20 completed scans, bounded to 32 MiB. Only
  matching ranges are compared. Cancelled/failed scans do not replace
  a complete baseline. Missing responses are **not proof of offline status**.
- SNMP credentials and OUI updates are advanced Settings operations, not
  primary scan modes. Live Monitoring is no longer a main-screen feature;
  the separately maintained Pro product still owns its monitoring engine.
- `Ctrl+F` focuses search, `F5` scans, Escape stops. A model/view table is
  the screen-reader alternative to the visual graph.

## Architecture

| Module | Responsibility |
| --- | --- |
| `app/core/network_utils.py` | Validated targets, active interfaces, bounded ICMP/TCP probes, nonblocking ports, time-limited reverse DNS |
| `app/core/scanner.py` | Progressive discovery and enrichment, cancellation, protocol scheduling and warning callbacks |
| `app/core/providers.py` | Independent ONVIF, mDNS and SSDP providers; vendor integrations do not belong in the scanner |
| `app/core/registry.py` | Deduplicated observations and within-scan potential IP conflicts |
| `app/core/intelligence.py` | Conservative classification with source evidence and qualitative confidence |
| `app/core/topology.py` | Confirmed LLDP adjacency and separately labelled inferred L3 routes |
| `app/core/adapters.py` | DeviceAdapter contract, verified-TLS ONVIF operations and safe configuration workflow |
| `app/core/history.py` | Validated, atomically saved bounded history and CSV/JSON export |
| `app/ui/network_map.py` | Viewport-culled QGraphicsScene graph; no fabricated physical parents |
| `app/ui/widgets.py` | Virtualized table, batched IP upserts, one-pass sorting and range input |
| `app/ui/device_panel.py` | Capability-driven authenticated control panel |
| `app/workers/` | QThread boundaries for scanning, management and local I/O |

The worker budget (2-128, default 64) is divided between probing and
enrichment. Each pool queues at most twice its worker count. Three fixed
protocol slots run concurrently. Discovery results are emitted before the
full sweep ends and enrichment becomes an upsert, not a duplicate row.
UI delivery batches at most 256 upserts every 100 ms; graph rebuilds are
limited to once per second during scanning. Source sorting avoids a
Qt/Python comparator call for every pair of rows.
Progress delivery is limited to 20 updates per second, with completion
always emitted. Port probes continue waiting for pending connections after
an early refusal rather than dropping slower successful connections.

Selected adapters bind multicast ONVIF, SSDP and mDNS discovery. ARP data
is identity evidence, not proof of current reachability. ICMP failures
fall back to TCP and protocol announcements. No default SNMP community,
device passwords or authentication bypass are attempted. ONVIF
NetworkVideoStorage is distinguished from transmitters; a generic ONVIF
Device is not automatically called a camera. Vendor/OUI or a single port
alone does not establish a device type.

LLDP links confirm **adjacency only**, not upstream/downstream direction.
Inferred gateway lines indicate a logical subnet route, not cable/port
order. An unknown parent remains unknown. The old IP TREE module remains
only for compatibility/tests, not as a separate navigation surface.

## Authorized management and limitations

The adapter uses standard ONVIF Device Management operations:
GetDeviceInformation, GetNetworkInterfaces, GetNetworkDefaultGateway,
GetDNS, GetUsers, SetDNS, SetNetworkDefaultGateway and SetNetworkInterfaces.
The [official ONVIF WSDL](https://www.onvif.org/ver10/device/wsdl/devicemgmt.wsdl)
defines their shapes and reboot semantics.

- Only an advertised HTTPS endpoint on the discovered device's literal
  IP is accepted. TLS verification is never disabled. A private device
  CA can be supplied; the certificate must still cover that IP.
- HTTP-only devices are discovery-only in the app. Use their vendor web
  interface to enable HTTPS. No invented HTTPS endpoint or undocumented
  Hikvision configuration API is probed.
- Credentials stay in session memory, are not stored in QSettings/history,
  and are cleared on session close. No credential persistence is offered;
  therefore no plaintext credential file or insecure keyring fallback exists.
  Python cannot guarantee physical erasure of immutable strings from RAM.
- SOAP WS-Security UsernameToken digest and HTTP Digest use only user-supplied
  credentials. Responses are size/time-bounded; XML entities and redirects
  are rejected. Logs never record SOAP payloads, passwords or tokens.
- Writes require a stable authenticated serial, an unambiguous active IPv4
  interface and a confirmed Administrator role from GetUsers. Unsupported
  reads or unverified roles leave the panel read-only.
- IPv4 validation checks mask, host/broadcast addresses, gateway, DNS and
  local-adapter reachability. Known scan identities, neighbor cache,
  ICMP and TCP are checked before assigning a different static IP.
  Silence **cannot prove an IP is unused**, so this limitation appears
  in confirmation.
- The device identity is rechecked before writing. Changes are never
  automatically retried. DNS/gateway/interface writes are not atomic:
  partial success is explicitly reported, with instructions to read back
  before retrying. No unsupported rollback or automatic reboot is claimed.
- A reboot-required response is pending, not success. Otherwise, matching
  serial/manufacturer/model and the actual network configuration are
  authenticated at the new IP before the map is moved. A timed-out write
  can already have applied and is reported as unverified.
- DHCP-mode changes require a stable WS-Discovery endpoint identity so
  rediscovery does not send credentials to unrelated devices.
- Multiple manual addresses, multiple/IPv6 gateways and mixed IPv6 DNS
  require the vendor interface. Direct IPv6 configuration is unsupported.
- Configuration changes are disabled during scans. Reopen the panel after
  stopping to manage a device. Scan and local I/O errors remain visible.

Potential conflicts require different MAC observations for one IP within
one scan. They are low-confidence warnings with MACs, vendors, time and
reason: failover, replacement and proxy ARP are alternative explanations.
A MAC change between scans is an identity change, **not** a confirmed
duplicate-IP conflict. Potentially conflicting addresses are not writable.

## Performance and release gates

The benchmark makes **no network calls**: `/24`, `/22` and `/20` use mocked
transport to measure bounded scheduling, first result, CPU seconds, RSS
and false positives/negatives against known fixtures. It also measures
10,000 table rows and 1,000 graph nodes with an actual Qt event loop.
The gates are zero synthetic discovery errors/unsubstantiated
classifications, at most 200 ms between UI events and at most 1 second
to construct the 1,000-node graph. Real identification accuracy is `null`,
not an invented percentage. Real hardware timing/accuracy needs a labelled
authorized network and cannot be inferred from these mocks.

WMI enriches only the local Windows host; optional Nmap requires an
installed binary. Linux gateway/DNS metadata is supported; other OSes
may have incomplete gateway metadata. There is no MAC/IP reassignment
through proprietary Hikvision SADP/ISAPI, CDP/FDB topology, password guessing,
cloud management, image streaming or automatic credential persistence.
New vendor providers/adapters must add protocol-specific tests before
their capabilities are enabled.
Automated protocol tests use test doubles and real loopback sockets.
Physical camera/firmware interoperability and real-network timing have
not been measured in this environment; advertised protocol support does
not guarantee compatibility with every model.

Diagnostics rotate at 2 MiB with three backups. `--debug` enables DEBUG;
normal logs include INFO/WARNING/ERROR without third-party HTTP debug logs.
The first-run language and terms flow remains intact. Upgrading asks users
to accept privacy policy v2, which discloses the expanded local history.
Navigation and core controls retain six languages; full new explanatory
copy is provided in English/Turkish, with the existing English fallback
for other languages and technical protocol errors.

See [release notes](RELEASE_NOTES.md) for changes and the release checklist.
