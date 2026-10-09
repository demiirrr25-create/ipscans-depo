# IPscans+ 4.2.0 / Network Intelligence

Monochrome Windows network discovery with exactly two top tabs: **SCAN** and
**NETWORK MAP**. See [v4.2 release notes](V42_RELEASE.md).

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
- Double-click or Enter opens the device IP web interface in your default browser.
  IP/DNS/DHCP configuration is no longer available inside the app.
- Export CSV, JSON, standalone HTML, SVG or bounded PNG. HTML can print to PDF.
  No scan history is automatically saved. Existing exports remain compatible.
- Ctrl+F searches, F5 starts and Escape stops. The accessible model/view table
  provides the alternative to the visual graph.

IPv4 scans are capped at 65,534 targets and ranges over 4,096 require confirmation.
Manual IPv6 inputs remain bounded to 256 addresses; scoped link-local addresses
and exhaustive IPv6 subnet discovery are unsupported. New explanatory copy uses
English/Turkish with English fallback; existing core labels retain six languages.

## Discovery and limitations

The application discovers devices and opens their vendor web interface. It does
not change their IP, mask, gateway, DNS or DHCP configuration. Legacy management
code remains in the repository for reference/tests and is not imported by the app.
Scan only networks you own or are authorized to assess. A device may have no web
interface; browser dispatch is not a guarantee that the page is reachable.

Potential conflicts require different MAC observations for one IP within
one scan. They are low-confidence warnings with MACs, vendors, time and
reason: failover, replacement and proxy ARP are alternative explanations.
A MAC change between scans is an identity change, **not** a confirmed
duplicate-IP conflict. Resolve suspected conflicts through the device vendor interface.

## Release validation

Windows CI runs unit tests, source and packaged loopback selftests, synthetic
benchmarks, a checksum-verified locked v4.1.1 to v4.2.0 installation upgrade, shortcut,
installed selftest and uninstall checks. SHA-256 hashes and build provenance
are published with installer and portable binaries.

Synthetic results do not establish real-device accuracy or universal speed.
Physical camera, switch and router validation requires an authorized lab.
See V42_RELEASE.md for release behavior and validation limits.
