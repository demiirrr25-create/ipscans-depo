# IPCast

A from-scratch, free, AnyDesk-style remote desktop app for Windows — original name, UI, code,
and protocol design (no AnyDesk code, assets, or branding are used anywhere in this project).

Read [Roadmap](#roadmap) before assuming any feature exists — per the project's own development
rule, nothing here pretends to work if it doesn't yet. As of this writing: the app shell, the LAN
connection layer (discovery, TLS-encrypted handshake, permissions), clipboard sync, and file
transfer are real and verified. Actual screen viewing/remote control, internet (non-LAN)
connections, and unattended access are **not** implemented yet.

## 1. Technology choice (and why)

| Concern | Choice | Why |
|---|---|---|
| Runtime | .NET 10 (current LTS) | Matches the SDK already installed in this environment; modern GC/JIT, small self-contained publish size, first-class async networking for later phases. |
| UI framework | **Avalonia UI** (not WPF/WinUI) | This workspace's dev container runs **Linux**. WPF and WinUI can only be *compiled* on Windows (the .NET SDK hard-blocks it with `NETSDK1100`), so no phase could ever be built or verified here. Avalonia is a mature, MIT-licensed, WPF-like XAML/MVVM framework that builds and runs on Linux, macOS *and* Windows, and cross-publishes a genuine native Windows EXE (verified below). If you later move development to a Windows machine, switching to WPF is possible but not necessary — Avalonia's `IPCast.exe` is indistinguishable from a native Windows app to end users. |
| MVVM | CommunityToolkit.Mvvm | Standard, source-generator-based, no boilerplate `INotifyPropertyChanged`. |
| ID generation | `System.Security.Cryptography.RandomNumberGenerator` | Cryptographically secure and unbiased (rejection-sampled), unlike `System.Random` — required so device IDs can't be guessed or enumerated by an attacker. |
| Tests | xUnit | Already the SDK's default test template; nothing exotic needed. |

Everything not covered by the phases marked done below (real-time screen streaming, input
injection, internet/NAT-traversal connections, a deployed relay server, unattended access,
certificate pinning) is **not implemented yet** — see the [Roadmap](#roadmap).

## 2. Project structure

```
ipcast/
├── IPCast.sln
├── src/
│   ├── IPCast.Shared/        Cross-cutting types used by every other project (DeviceId, app paths).
│   ├── IPCast.Security/      Secure ID + TLS certificate generation, persisted to disk.
│   ├── IPCast.Network/       Phase 2/8/10: LAN discovery, TLS handshake, permissions, session loop, clipboard sync.
│   ├── IPCast.FileTransfer/  Phase 7: chunked file send/receive over an established session.
│   ├── IPCast.RemoteDesktop/ Phase 3: screen capture, JPEG encode/decode, input injection, session orchestration.
│   └── IPCast.Client/        The Avalonia desktop app (what becomes IPCast.exe).
└── tests/
    └── IPCast.Tests/         xUnit tests for every project above.
```

Later phases add `IPCast.Server` (internet signaling/relay) as its own project, matching the
layout originally requested — it isn't
created yet because empty placeholder projects with no real code would just be clutter.

## 3. What actually works right now

**Phase 1 — UI shell + persistent ID:**
- A dark-themed desktop window with the sidebar (Home / My Devices / Recent Connections /
  Settings / Help) and the "Your ID" / "Connect to Remote Device" cards from the spec.
- **Real** cryptographically-secure 9-digit device ID generation, persisted to disk
  (Windows: `%APPDATA%\IPCast\device-identity.json`) and reloaded on every launch.
- **Real** clipboard copy for "Copy ID".

**Phase 2 — local network connections (`IPCast.Network`):**
- **Real** UDP broadcast discovery: type just the 9-digit ID, no IP address needed, as long as
  both devices are on the same LAN (`LanDiscoveryService`).
- **Real** length-prefixed JSON handshake protocol over TCP (`MessageStream`, `IPCastHost`,
  `IPCastConnector`): Hello → ConnectionRequest → ConnectionDecision.
- **Real** incoming-connection dialog with the exact permission checklist from spec §10
  (View Screen / Control Mouse / Control Keyboard / Clipboard / File Transfer / System
  Information / Remote Restart) — the remote user picks exactly what to grant.

**Phase 10 (partial) — transport encryption (`IPCastHost`/`IPCastConnector`):**
- **Real** TLS via `SslStream`, using a self-signed certificate generated once per device and
  persisted (`DeviceCertificateStore`, `%APPDATA%\IPCast\device-cert.pfx`). Every byte after the
  raw TCP connect is encrypted.
- Honest limitation, stated in the UI itself: there's no PKI yet, so any certificate is currently
  accepted (`TlsPolicy.AcceptAnyCertificate`). This stops a **passive** eavesdropper on the LAN;
  it does not yet stop an **active** man-in-the-middle. Certificate pinning tied to a trusted
  introduction is the natural next hardening step, not yet built.

**Phase 8 — clipboard sync (`SessionMessageLoop`, wired into the Client):**
- **Real** bidirectional text clipboard sync for any session granted the Clipboard permission:
  the Client polls its own OS clipboard once a second and pushes changes over the encrypted
  session; the peer applies incoming text straight to its own OS clipboard.
- Settings toggle to disable this per spec §8 is not built yet (always on when granted).

**Phase 7 — file transfer (`IPCast.FileTransfer`):**
- **Real** chunked file transfer over an established session: `FileSender`/`FileReceiver`
  negotiate an offer/accept handshake, stream the file in 256 KiB chunks with progress reporting,
  and are gated by the FileTransfer permission.
- A two-panel file-manager UI, drag & drop, pause/cancel, and transfer history (spec §7/§17) are
  not built yet — the underlying transfer engine is real, but nothing in the Client UI exposes it
  to the user yet.

**Phase 9 — unattended access (`UnattendedAccessStore`, `UnattendedAccessPolicy`):**
- **Real** password-based connections: Settings → Security → Unattended Access lets the user set
  a password (PBKDF2-SHA256 hashed, 210k iterations, unique salt — never stored or compared in
  plaintext). A device connecting with the correct ID + password is accepted **immediately**,
  bypassing the interactive Accept dialog entirely — verified with two real running instances:
  no dialog window ever appeared on the host side.
- **Real** rate limiting: 5 failed attempts per 9-digit ID per 5-minute window, then further
  attempts are rejected outright regardless of the password.
- The Home screen and Settings both visibly show "Unattended access is ON" per spec §9 — it's
  never silently active.

**Phase 3 — screen viewing + remote control (`IPCast.RemoteDesktop`):**
- **Real** JPEG-based screen streaming and input forwarding pipeline: capture → encode → send over
  the TLS session → decode → render, and viewer mouse/keyboard input → send → apply on the shared
  side, all gated per-action by the exact granted permission (ViewScreen/ControlMouse/
  ControlKeyboard). A `RemoteScreenWindow` opens automatically for the viewer.
- **Real, verified in this sandbox**: ran two full instances with a cross-platform test-pattern
  capture source (`IPCAST_FAKE_CAPTURE=1`, never used on a real Windows install) standing in for
  actual screen capture — instance A genuinely received and rendered a live, animated JPEG stream
  from instance B over the encrypted session, and pointer/keyboard events on the viewer window
  dispatched without error.
- **Honest limitation**: the actual OS integration — `GdiScreenCapturer` (GDI BitBlt) and
  `SendInputInjector` (`user32.dll` SendInput) — is Win32-only P/Invoke code that cannot run in
  this Linux dev sandbox at all. It's written correctly per the documented API contract and
  compiles, but is only really verified by this repo's `windows-latest` CI job
  (`.github/workflows/build-ipcast.yml`), not by hand here. Treat it as "needs confirming on a
  real Windows machine" until that job is green.
- No video compression beyond per-frame JPEG yet (no H.264/delta-frame encoding, so bandwidth use
  is higher than a production remote-desktop tool) — that's Phase 13 (performance).

**Phase 11 — history + favorites (`Persistence/ConnectionHistoryStore`, `Persistence/FavoriteDevicesStore`):**
- **Real** Recent Connections: every outgoing attempt (connected/rejected/failed) and every
  accepted incoming connection is persisted (last 50) with timestamp, direction, and status, with
  a working "Clear History" button.
- **Real** My Devices: save a name + ID, one-click Connect from the list, remove, and a genuinely
  persisted "last connected" timestamp that updates on every successful connect.
- Verified with real UI interaction in this sandbox: saved a favorite, connected through it,
  confirmed the resulting history entry and updated "last connected" timestamp both survived an
  app restart.

**Not implemented yet, and the UI says so instead of pretending:**
- No internet (non-LAN) connections — discovery only works when both devices share a broadcast
  domain; reaching a device on a different network needs a relay/signaling server (Phase 4-6).
- Settings' general/display options and the Help section still show a plain, honest "coming in a
  later phase" message rather than dead or fake buttons.

Verified end-to-end in this environment (not just unit tests) by running two independent,
fully-isolated instances of the app side by side under separate virtual displays: instance A
found instance B by ID alone, B's real accept dialog popped up showing the exact requested
permissions, and after clicking Accept a live JPEG screen stream and clipboard sync both worked
across the encrypted session. Also covered by 49 automated tests, including a real multi-chunk
file transfer with SHA-256 verification and a full screen-share+input round trip over a real
TLS-encrypted TCP session.

## 4. How to build it yourself

Open a terminal **in the `ipcast/` folder** (not the repo root) for every command below.

### Build

```bash
dotnet build
```

### Run the tests

```bash
dotnet test
```

### Run the app (works on Linux/macOS for development; identical code runs natively on Windows)

```bash
dotnet run --project src/IPCast.Client
```

Screen sharing needs real Windows APIs, so it won't work if you run this on Linux/macOS unless
you opt into the animated test pattern instead of real capture:

```bash
IPCAST_FAKE_CAPTURE=1 dotnet run --project src/IPCast.Client
```

Never set this on a real end-user install - it's for developing/demoing the streaming pipeline
without a Windows machine to hand, nothing else.

### Produce the actual `IPCast.exe` (portable, self-contained, single file, Windows x64)

This is the one you'd hand to someone on Windows — no .NET install required on their end:

```bash
dotnet publish src/IPCast.Client/IPCast.Client.csproj \
  -c Release -r win-x64 --self-contained true \
  -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true \
  -o publish/win-x64
```

The result, `publish/win-x64/IPCast.exe`, has already been built once from this environment to
confirm the command works (a genuine Windows PE32+ GUI executable, ~99 MB because it bundles the
whole self-contained .NET + UI runtime — later phases can add trimming to shrink this). It is not
committed to the repo; regenerate it with the command above whenever you need it.

> Running/clicking through the actual `.exe` still needs to happen on a real Windows machine —
> this dev container can build it but has no Windows to execute it on.

## 5. Roadmap

Status of the 13 phases from the original spec:

- [x] **Phase 1** — Windows UI + persistent IPCast ID
- [x] **Phase 2** — Local network connection layer: LAN discovery, handshake, permissions dialog
- [~] **Phase 3 (mostly done)** — Screen capture/streaming + input control: the pipeline (capture
      → JPEG encode → TLS transport → decode → render, and input forwarding) is real and tested;
      only the Win32 GDI/SendInput pieces are unverified outside CI (see below)
- [ ] Phase 4 — Internet connections
- [ ] Phase 5 — Signaling + NAT traversal
- [ ] Phase 6 — Relay server
- [x] **Phase 7** — File transfer (engine real and tested; no file-manager UI yet)
- [x] **Phase 8** — Clipboard sync (text only; no on/off setting yet)
- [x] **Phase 9** — Unattended access: PBKDF2 password hashing, rate-limited (5 attempts/5 min),
      bypasses the interactive Accept prompt entirely on a correct password
- [~] **Phase 10 (partial)** — TLS transport encryption + rate limiting are real; certificate pinning, and audit
      logging are not done
- [x] **Phase 11** — Recent Connections history + My Devices/favorites, both persisted and with
      real UI (no unattended-access-style "off by default" needed; Settings general/display
      options still pending)
- [ ] Phase 12 — Installer + portable EXE
- [ ] Phase 13 — Performance optimization (adaptive quality/bitrate, delta-frame or hardware
      video encoding instead of per-frame JPEG)

**Why the remaining phases aren't "just build them faster":** several need resources this
sandbox genuinely doesn't have, not just more time:
- Phase 3's `GdiScreenCapturer`/`SendInputInjector` are Win32-only APIs that cannot be executed on
  this Linux dev container - only this repo's `windows-latest` CI job
  (`.github/workflows/build-ipcast.yml`) can actually exercise them; a real human clicking through
  a real Windows machine is still the only way to verify the *experience* end to end.
- Phase 4-6 need an actual deployed server (a domain/IP, TURN/relay hosting, ongoing cost) - that's
  an infrastructure decision for you to make, not something to silently provision.
- Phase 12's installer needs either a Windows machine or a CI runner to actually produce and test
  a `.exe` installer (Inno Setup doesn't run on Linux).

**CI already caught a real, would-have-shipped-broken Windows-only bug:** every TLS-dependent test
failed on `windows-latest` with an unexplained handshake EOF, while the identical code passed on
`ubuntu-latest`. Root cause: `CertificateRequest.CreateSelfSigned()` produces a certificate backed
by an *ephemeral* in-memory private key. Linux's OpenSSL-backed `SslStream` accepts that for a TLS
server certificate; Windows' SChannel does not, and fails the handshake without a clear error.
Fixed by round-tripping the generated certificate through a PKCS#12 export/import
(`DeviceCertificateStore`/`TestCertificateFactory`), which forces a real, persistable key. Without
this repo's `windows-latest` CI job, IPCast's TLS encryption would have silently never worked on
an actual end-user's Windows machine despite passing every test in this Linux dev sandbox - exactly
the class of bug this CI setup exists to catch. After the fix: **all 49 tests pass, and the
self-contained `IPCast.exe` builds successfully, on a real Windows machine.**

## 6. Security notes

- Device IDs are generated with a CSPRNG, not `System.Random`.
- No passwords or secrets exist yet, so there is nothing to hash yet — that lands in Phase 9
  (unattended access), and will use proper password hashing (never plaintext) per the spec.
- **The connection is TLS-encrypted, but not yet identity-verified.** Every session is wrapped in
  `SslStream` with a real, per-device self-signed certificate — a passive eavesdropper on the LAN
  can no longer read the traffic. But since there's no PKI yet, either side currently accepts any
  certificate the peer presents, so an **active** man-in-the-middle isn't ruled out. This is
  deliberately called out in the UI itself (the incoming-connection dialog says so) rather than
  hidden. Certificate pinning (trust a device's certificate the first time, like SSH host keys,
  and flag if it ever changes) is the natural next step and isn't built yet.
- Discovery only responds to a request for a device's own exact ID; it never broadcasts or leaks
  the ID list of other devices.
- A connection still requires the local user to explicitly click Accept and choose which
  permissions to grant — nothing connects or controls anything without that.
