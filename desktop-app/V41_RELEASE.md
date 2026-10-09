# IPscans+ 4.1.0 — Network Intelligence

Two top tabs, SCAN and NETWORK MAP, replace the previous sidebar. The default
scan automatically adapts bounded concurrency and timeouts. History, Settings
and manual profiles are removed from the standard application's UI. Existing
export files remain readable; no legacy data is deleted.

## Discovery and identity

- Native Windows ICMP, bounded TCP fallback, one relaxed echo retry, ARP cache,
  DNS, ONVIF discovery, mDNS and SSDP feed progressive results.
- Response timing controls an 8-worker starting budget, up to 32 workers,
  with 400–1200 ms adaptive echo timeouts and a bounded retry. Silence does
  not establish packet loss, congestion or offline status.
- HTTP title/server and RTSP OPTIONS enrich evidence without password guessing.
  HTTP redirects and environment proxies are disabled; TLS remains verified.
- Classification combines independent protocol evidence, exposes its source
  and evidence score, and keeps ambiguous identities Unknown. The score is
  not a measured accuracy percentage. Ports and vendor names alone never
  establish device type. Model and serial are never manufactured.
- Authorized per-device SNMPv2c reads system identity, chassis identity at
  ENTITY-MIB index 1, LLDP, IPv4 CDP neighbors and bounded bridge forwarding
  entries. Optional table walks have separate deadlines. Community values are
  entered for the current operation only; no default community or persistence.

## Vertical map

Confirmed LLDP/CDP adjacency is solid; orientation is a presentation choice,
not proof of upstream direction. A uniquely observed bridge forwarding path
is dashed because intervening devices may exist. Logical subnet/gateway paths
are also dashed. Unresolved devices have a separate group. Peers must already
be discovered; duplicated identities and ambiguous FDB paths are not resolved
by guessing. Sibling groups over 24 nodes can expand on demand. Search retains
ancestors. Zoom, pan, branch collapse, selection, refresh and SVG/PNG export
remain available. Large image exports are bounded to prevent memory exhaustion.

## Verification and scope

`python -m unittest discover -s tests -v` covers cancellation, retry, bounds,
conflicting identity, CDP address type, inferred FDB paths, 1,100-deep trees,
large maps, malformed discovery data, adapters and existing device management.
`python main.py --selftest` runs real native ICMP, loopback TCP and the adaptive
ScanWorker through the actual Qt window. CI repeats this on the packaged EXE
and installed application. It installs the checksum-verified v4.0 release,
upgrades it to 4.1, checks version, shortcut and retained unrelated file, then
uninstalls. The portable EXE is checked separately.

The scheduling benchmark uses simulated responses: it is not a real-subnet
speed or identification-accuracy test. The feedback scheduler adds bookkeeping
and retry overhead; it is not claimed to beat the old scheduler in zero-latency
simulation. Physical camera/switch/router compatibility has not been validated
on a user-authorized device lab. No universal accuracy or world-fastest claim.
SNMPv3, exhaustive ENTITY-MIB enumeration, authenticated large-FDB pagination,
and comprehensive IPv6 discovery are not part of this release.

## Website and speed test

Shared monochrome layout, navigation, footer, typography and interaction styles
cover the existing localized routes. The home page adds a lightweight SVG
network exploration; product screenshots are labeled example data. No WebGL
runtime or decorative video payload is required. Motion respects reduced-motion.

The speed test measures HTTP idle and loaded RTT, jitter, download and upload
against Cloudflare's anycast endpoint. Eight idle samples discard a first
connection warmup. Four connections use a one-second warmup and up to eight
seconds of measurement per direction, capped at 256 MB per direction. Download
counts received bytes; upload final totals count successful requests. Live
upload progress can differ from the final confirmed rate. Users can stop,
copy a summary and export JSON. HTTP failures are not presented as packet loss.
True UDP packet-loss measurement needs a configured TURN service and is not
available. No location or server-city claim is invented.

## Research basis

- [Nmap timing and performance](https://nmap.org/book/man-performance.html)
- [Nmap host discovery](https://nmap.org/book/man-host-discovery.html)
- [Cloudflare speed-test methodology and TURN requirements](https://github.com/cloudflare/speedtest)
- [WCAG 2.2 target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum)

The release uses each technology where it supplies evidence, rather than
adding unrelated dependencies. See the published release manifest for exact
source SHA, Windows CI run, package sizes and SHA-256 hashes.
