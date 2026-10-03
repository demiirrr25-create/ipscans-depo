# IPCast 2.2.0

## Delivered

- TLS remote desktop with direct LAN discovery and WebSocket relay fallback; certificate fingerprint approval.
- Monochrome dashboard, favorites, history, discovered devices and searchable persistent settings.
- Multi-monitor selection (including virtual desktop), original/fit/stretch/auto scaling, fullscreen and collapsible toolbar.
- Adaptive JPEG quality, idle-frame suppression, input-release cleanup, connection diagnostics and Unicode text input.
- Explicit incoming permissions, opt-in hashed unattended access, session chat and clipboard text.
- Shared-folder file manager: upload/download, create, rename, copy, move, empty-folder/file delete, drag/drop, verified resume.
- Viewer annotations (pen, arrow, rectangle, circle, text, erase, clear).
- Visible MJPEG AVI recording, manual/automatic recording preferences and host REC indicator.
- Permission-gated Windows WASAPI system audio, mute and volume, bounded buffers.
- Consent-gated forward/reverse TCP routes, loopback listeners, port validation and session-bound cleanup.
- Wake-on-LAN, system information, owner-confirmed restart, bounded reconnect attempts.
- System tray, Windows startup, redacted rolling audit logs, diagnostics export and crash restart.
- Update discovery, downgrade rejection, trusted HTTPS source checks and GitHub asset SHA-256 verification.
- Versioned portable EXE + Inno Setup installer, checksums and release manifest; fail-closed Windows/Linux CI gates.

## Explicit support limits

- No Authenticode signing certificate is configured. Packages are **unsigned**. SHA-256 does not authenticate a code-signing publisher.
- This is a user-session application. Secure desktop/UAC/Ctrl+Alt+Del require a trusted service; privacy screen blanking and virtual printer redirection require separate supported drivers. These are not implemented or advertised as working.
- Use Files to transfer a printable document and print locally. Clipboard file lists are not synchronized.
- Annotations exist in the viewer only. They do not alter the host desktop.
- A file owner must explicitly select/share a folder. Reparse points and DOS device names are rejected. Existing files are never overwritten; directory deletion requires an empty directory.
- AVI is MJPEG at 10 fps without audio; recording stops at monitor-resolution changes or 1.8 GB.
- Windows audio is PCM16 stereo at 24 kHz; slower links drop stale audio to cap latency. Physical audio hardware acceptance remains unverified.
- Reconnect creates a new authenticated connection and asks for fresh approval. Passwords/approvals are not silently reused.
- Direct routing discovers LAN endpoints. Internet connections fall back to the managed relay; UDP hole punching is not implemented.
- Proxy behavior follows the system/.NET WebSocket stack. There is no custom proxy credential store.

## Verification

- Unit/integration coverage includes TLS handshake, malicious permissions, clipboard/input gates, frame limits, relay pairing, discovery, file resume/checksum/path boundaries, 32 MiB file transfer, chat, recording container, tunnels, audio protocol and tampered updates.
- Windows CI opens/closes the actual packaged EXE and installs/uninstalls the installer. Linux CI validates protocol and portable logic.
- Local Windows UI checked: main window, version, settings and filtering.
- Two physical Windows 10/11 devices and different-network testing were explicitly waived by the requester. Long-duration field soak, every DPI setting and hardware audio were not independently certified.
