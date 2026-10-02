# IPCast delivery roadmap

This roadmap tracks the requested product work. A phase is complete only after its exit checks
pass; a UI control alone does not count as an implemented feature. Production publishing is gated
on the release and acceptance phases below.

## Architecture audit

- Desktop client: .NET 10, Avalonia, MVVM (`src/IPCast.Client`).
- Transport: UDP LAN discovery, TCP sessions, length-prefixed JSON control messages, TLS, explicit
  device-certificate fingerprint approval, and a configured WSS relay fallback
  (`src/IPCast.Network`, `src/IPCast.Server`).
- Remote desktop: Windows GDI capture and Win32 input injection, with JPEG frames and permission
  checks (`src/IPCast.RemoteDesktop`).
- Existing user features: persisted device ID, favorites/history, interactive permissions,
  opt-in unattended access with PBKDF2 password storage and rate limiting, text clipboard sync,
  and chunked file transfer (`src/IPCast.Client`, `src/IPCast.Security`, `src/IPCast.FileTransfer`).
- Release surfaces: GitHub Actions builds/tests Windows and Linux, publishes an unsigned Windows
  executable and an Inno Setup installer; the Next.js site keeps localized release metadata in
  `src/content/applications.ts` and serves localized IPCast routes.
- Acceptance limits: physical Windows screen/input, separate-network relay behavior, updater and
  signing are not fully verified; multi-monitor, advanced session tools, file-manager UX,
  adaptive video encoding, and audit diagnostics are not complete.

## Phases

| Phase | Work | Exit check | Status |
|---|---|---|---|
| 1. Architecture audit | Map the client, protocol, security, relay, website, release workflow, current tests, and unsupported claims. | Architecture and verified feature limits documented. | Complete |
| 2. Security hardening | Fix high-priority authentication, rate-limit, relay, transfer, logging, and validation defects with regression tests. | Security-sensitive flows have bounded inputs, explicit trust, and passing tests. | In progress |
| 3. Design system | Apply the IPCast monochrome system to the desktop shell and supported dialogs/views; preserve keyboard access, focus and scaling behavior. | Views build and launch; accessibility and DPI checks pass on Windows. | In progress |
| 4. Dashboard | Complete ID validation, connect/history/favorite flows, and real device status/discovery affordances. | Actions work against real stored/network data; no fake controls. | In progress |
| 5. Remote sessions | Improve session toolbar, lifecycle, display modes, monitor selection, keyboard/input handling, and diagnostics where the transport supports them. | Session behavior passes protocol and Windows interactive acceptance. | Not started |
| 6. Transfer and clipboard | Complete file-transfer UX and clipboard settings; preserve permission checks and asynchronous responsiveness. | Large-file, cancellation, integrity, and permission tests pass. | Not started |
| 7. Access controls | Verify incoming approval, per-capability permissions, unattended-access opt-in, password policy and abuse limits. | Negative and positive authentication/permission tests pass. | Not started |
| 8. Diagnostics | Add structured, privacy-safe logs, error details and diagnostics export. | Automated checks show no credentials or clipboard/file content in logs. | Not started |
| 9. Performance | Measure frame pipeline, encoding, bandwidth, CPU and UI responsiveness; optimize only from measurements. | Repeatable benchmark results meet agreed targets without regressions. | Not started |
| 10. Windows packaging and updates | Validate installer/startup/uninstall; implement signed update verification only when signing infrastructure exists. | Windows install/uninstall and update integrity checks pass. | Not started |
| 11. Windows and network acceptance | Run Windows builds, screen/input tests, relay/separate-network checks, reconnect and long-session tests. | Windows 10/11 smoke tests and physical-device acceptance are recorded. | Not started |
| 12. Website integration | Align localized product pages, real capabilities, release metadata and every download URL. | Localized route and download/checksum checks pass. | Not started |
| 13. Release pipeline | Gate publishing on tests, Windows packaging, installer verification, version and checksum generation. | A failed release stage cannot replace the published artifact. | Not started |
| 14. Production deployment | Publish the verified product and website release with rollback available. | Production page, artifact version, checksum, and download all match. | Not started |
| 15. Post-deployment acceptance | Test the downloaded installer and supported workflows on clean Windows 10/11 devices. | Production artifact and supported user journeys are verified; remaining limits are disclosed. | Not started |

## Current security work

Unattended-access failures were previously rate-limited by the peer's claimed IPCast ID, which a
caller could change. Attempts are now reserved atomically by the TCP source IP before password
verification, so concurrent guesses cannot race the limit. Tracking is bounded to 4,096 active
source keys and fails closed when full. This is defense in depth, not a substitute for relay-level
quotas or protection against distributed attacks.

## Production release gates

Do not deploy a new production IPCast release until all of the following are available and pass:

1. Windows 10/11 packaging, startup, install, uninstall and interactive screen/input checks.
2. Two physical devices on separate networks, covering approval, refusal, relay, reconnect and
   transfer integrity.
3. Signed binaries and a verified update path before describing releases as signed or automatic.
4. A tested release artifact, version, file size and SHA-256 that match the website download.
5. Authorized production deployment access, post-deployment download verification and rollback.

The current development environment has no authenticated GitHub CLI session and is not a physical
Windows test device. GitHub Releases are the configured artifact host, so a Vercel Blob token is
not required. Vercel CLI access is already available for the website. Missing GitHub write access
and Windows acceptance are release blockers, not checks that can be replaced by a local build.
