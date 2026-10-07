# IPscans+ 3.0.0 / Next Generation

Status: release candidate; production downloads remain at verified 2.0.2
until the new Windows artifacts pass all gates.

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
3. On an authorized test device, validate HTTPS trust, role gating, read-back,
   collision refusal, a static-IP change, DHCP rediscovery and pending reboot.
   Record actual device/firmware support rather than asserting universal support.
4. Publish the validated versioned GitHub release, then update the scanner
   release metadata and product copy on the website, including limitations.
5. Run website lint/type/tests/production build, deploy through the existing
   Vercel project and verify EN/TR product pages, installer/portable downloads
   and the legacy scanner redirect. Do not point production to a candidate
   artifact or a missing binary.
