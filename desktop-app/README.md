# IPscans+ 4.1.0 / Network Intelligence

Monochrome Windows network discovery with exactly two top tabs: **SCAN** and
**NETWORK MAP**. See [v4.1 engineering and release notes](V41_RELEASE.md).

## Run and validate

```bash
pip install -r requirements.txt
python main.py
python -m unittest discover -s tests -v
python main.py --selftest
python benchmarks/scanner_benchmark.py --output benchmark.json
python benchmarks/native_benchmark.py --output native-benchmark.json
```

## Workflow

- Active adapter and range are detected automatically. Enter one IP, a start/end
  range or CIDR when needed. The standard UI has no manual profiles or Settings.
- Adaptive bounded discovery emits results progressively. Stop cancels pending
  work; current socket calls finish within their deadlines.
- Search with `port:443 source:ONVIF`, `ip:192.168.1.0/24`, `type:"IP Camera"`
  or `-type:Unknown`. Table columns sort, move, resize and hide.
- NETWORK MAP uses the workspace canvas with vertical hierarchy, separate
  unresolved devices, grouped large sibling sets, zoom/pan and branch collapse.
- Solid connections show LLDP/CDP evidence; dashed connections show inferred
  gateway/FDB paths. Adjacency does not determine upstream direction.
- Double-click or Enter opens device details, source evidence, safe diagnostic
  tools and explicitly authorized ONVIF/SNMP operations.
- Export CSV, JSON, standalone HTML, SVG or bounded PNG. HTML can print to PDF.
  No scan history is automatically saved. Existing exports remain compatible.
- Ctrl+F searches, F5 starts and Escape stops. The accessible model/view table
  provides the alternative to the visual graph.

IPv4 scans are capped at 65,534 targets and ranges over 4,096 require confirmation.
Manual IPv6 inputs remain bounded to 256 addresses; scoped link-local addresses
and exhaustive IPv6 subnet discovery are unsupported. New explanatory copy uses
English/Turkish with English fallback; existing core labels retain six languages.

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

## Release validation

Windows CI runs unit tests, source and packaged loopback selftests, synthetic
benchmarks, a checksum-verified v4.0 to v4.1 installation upgrade, shortcut,
installed selftest and uninstall checks. SHA-256 hashes and build provenance
are published with installer and portable binaries.

Synthetic results do not establish real-device accuracy or universal speed.
Physical camera, switch and router validation requires an authorized lab.
See V41_RELEASE.md for protocol bounds and limitations.
