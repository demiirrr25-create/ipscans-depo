# v4.1.0

See [v4.1 release notes](V41_RELEASE.md): automatic adaptive discovery, two-tab monochrome UI, vertical grouped map, multi-source identity, authorized CDP/FDB evidence, and verified upgrade packaging.

# IPscans+ 4.0.0 / Network Observatory

- Native Windows IPv4 ICMP engine with checked reply status and identity.
- Parallel TCP discovery, including responding hosts with closed ports.
- Quick, Balanced, Detailed and Sensitive network profiles.
- Up to 256 custom service ports; multi-subnet plans and explicit exclusions.
- Live discovery metrics, refreshed workspace and shared structured search.
- Escaped, script-free HTML reports with complete/partial scan metadata.
- Preserved selected view and reduced idle UI work.
- Windows source, packaged, installer and uninstall validation passed.

All 91 desktop tests passed in the [Windows release build](https://github.com/demiirrr25-create/ipscans-depo/actions/runs/37950820894)
for commit `3b3cffe101c8fb27701fd05d96589cad21b6a43d`.
The CI loopback benchmark measured median ICMP invocation cost of 17.9543 ms
for subprocess ping and 0.636 ms for native ICMP (28.23× lower call overhead).
This measures local invocation overhead, not real LAN or competitor speed.
Both packages are unsigned; SHA-256 sidecars and a build manifest are provided.

See [research and measurement scope](V4_RESEARCH.md). Existing v3.0.0
packages remain available under their original release tag.

---

# IPscans+ 3.0.0 / Next Generation

Windows release: source, packaged application, installed application,
installer/shortcut/uninstall, protocol tests and performance gates must
pass before publication. Previous 2.0.2 assets are retained.

All automated Windows gates passed for commit
`4d67f67001dc395a5fbe8fcdccd6fec3133fa7b4`, including **77 tests**,
source/packaged/installed smoke tests and the EXE version check.
[Verified Windows build](https://github.com/demiirrr25-create/ipscans-depo/actions/runs/37675287323).
The release includes both binaries, SHA-256 sidecars, the build manifest
and the measured synthetic benchmark report.

- Progressive, bounded multi-layer discovery with concurrent enrichment.
- Adapter-bound ONVIF, mDNS and SSDP providers; ICMP/TCP fallback.
- Deduplicated updates, source-backed classification and qualitative confidence.
- Unified Network Map workspace with virtualized table, node graph, shared
  search, zoom/pan/fit, branch controls and SVG/PNG export.
- Device Control Panel with session-only credentials and authenticated
  ONVIF IPv4 configuration over verified HTTPS.
- Collision/identity/configuration checks, explicit confirmation, partial
  failure reporting, rediscovery and authenticated read-back.
- Potential IP conflict evidence, without claiming cache changes prove
  duplicate devices.
- Twenty-scan bounded local history, matching-range comparisons and
  CSV/JSON export.
- Simplified primary workflow, keyboard controls, background local I/O
  and secret-free rotating diagnostics.
- Engine, protocol, adapter, management safety, table, graph and UI tests;
  synthetic `/24`, `/22`, `/20` and 10,000-row performance gates.
- Route-aware adapter selection, localized Windows metadata handling,
  progress throttling and port probes that preserve slower responses.
- Expanded packaged selftest checks all workspace views, actual adapter
  startup, a real loopback TCP connection and unsupported management gating.

## Validation scope

Automated tests cover discovery, IP/subnet/range parsing, duplicate updates,
potential conflicts, vendor evidence, authenticated adapter operations,
configuration validation, collision refusal, partial writes, identity
read-back, graph/table/history behavior and UI smoke tests. Network
protocol tests use test doubles and real loopback sockets; physical camera
interoperability and real-network identification accuracy have not been
measured. No universal hardware compatibility or flawless operation is claimed.

These binaries are unsigned. SHA-256 verifies integrity, not publisher
identity; Windows SmartScreen may display a warning.

## Compatibility and unsupported operations

The existing installer ID, optional desktop shortcut, onboarding,
languages, IPv4 target parser, bounded manual IPv6 and authorized SNMP/LLDP
are preserved. Live Monitoring is removed from the main scanner screen,
not from the separate Pro product. The legacy IP TREE source remains for
compatibility, but there is no separate Devices/IP TREE navigation.
Existing users accept the updated privacy policy once; previous language
and terms acceptance remain saved.

Direct management requires a verified HTTPS ONVIF endpoint, stable serial,
unambiguous IPv4 interface and verifiable administrator permission.
HTTP-only devices and proprietary vendor configuration protocols remain
unsupported in-app. No automatic reboot, rollback, password persistence
or physical topology guessing is introduced. Real device performance and
accuracy are not represented by synthetic benchmark timings.

## Release checklist

1. Pass desktop tests, syntax check, source/packaged/installed UI selftests,
   performance gates, installation/shortcut and uninstall checks on Windows.
2. Verify installer/portable sizes and SHA-256 against downloaded bytes;
   retain the previous 2.0.2 assets. Keep candidate binaries separate.
3. For device commissioning, on an authorized test device validate HTTPS trust, role gating, read-back,
   collision refusal, a static-IP change, DHCP rediscovery and pending reboot.
   Record actual device/firmware support rather than asserting universal support.
   This is recommended commissioning validation, not a test performed here.
4. Publish the validated versioned GitHub release, then update the scanner
   release metadata and product copy on the website, including limitations.
5. Run website lint/type/tests/production build, deploy through the existing
   Vercel project and verify EN/TR product pages, installer/portable downloads
   and the legacy scanner redirect. Do not point production to a candidate
   artifact or a missing binary.
