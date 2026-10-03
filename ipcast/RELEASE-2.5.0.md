# IPCast 2.5.0

The desktop client now uses a compact workspace with top navigation, an always-available connection bar, device cards and categorized settings. Both light and dark themes, including the app mark, use a monochrome palette.

## Added

- Address book groups, tags and private notes; search across all metadata; name/ID/recent-use sorting; double-click connection; direct file-transfer launch; address copying; import/export. Imports validate every record before writing, preserve existing devices and reject oversized inputs.
- Live stream quality selection (Auto, Balanced, Speed, Quality) with host acknowledgement. Both endpoints need 2.5 for this new command; older hosts produce an explicit timeout notice.
- Two-factor unattended authentication with RFC 6238 SHA-1, six digits, 30-second codes. Enrollment verifies a code before enabling, consumed time steps are persisted to reject replay, and the secret is encrypted using the local device certificate. The existing password requirement and rate limiter remain in force. Add the setup key manually to an authenticator. The local password can disable 2FA; losing the device key requires local reconfiguration. Protect the entire IPCast profile, including its certificate/private key.
- Stream screenshot export to PNG; temporary viewer-only control pause; chat transcript export; session history CSV export with spreadsheet-formula neutralization.
- Interactive access policies (always prompt, prompt only with a visible window, or require unattended credentials), optional idle-viewer disconnect, and temporary display sleep prevention while viewing.
- Dark/light/system appearance, startup address-book preference, Ctrl+L address focus, Ctrl+B address book, recordings folder shortcut, compact grouped session toolbar, and a two-column incoming permission dialog.
- Permission-profile switching now clears advanced permissions when moving to a more restrictive profile.

## Validation

- Windows: 153 unit/integration tests passed, including real local TLS, TOTP RFC vectors, replay rejection, handshake transmission, address-book migration/import, and live-quality frame resizing.
- Release build: zero warnings, zero errors.
- Headless Avalonia rendering and behavior checks for all settings categories, light/dark themes, 880px window width, address-book filtering/sorting, incoming permissions, and the session toolbar.
- A native Windows window was inspected using accessibility and screenshots.

## Compatibility and remaining gaps

Existing profiles and saved devices migrate without resetting the device ID. New 2FA and live-quality features require a 2.5 connecting client. Standard sessions retain the 2.2 protocol. No server deployment is required for these additions because the relay forwards TLS traffic.

This is not complete AnyDesk feature parity or a pixel-exact clone. Remaining work includes simultaneous remote sessions, side switching, a Windows service for secure desktop/UAC/Ctrl+Alt+Del, a privacy-screen driver, virtual printing, file clipboard integration, remote whiteboard display, online/cloud address-book synchronization, aliases/accounts/SSO, remote shell, and custom proxy administration. Existing recording limitations (silent MJPEG, resolution-change and file-size boundaries), single active connection and LAN-only Wake-on-LAN remain. No two-physical-device, separate-network or long-duration hardware acceptance test has been completed for this build. Executable signing requires the publisher's signing certificate; local builds are unsigned.

## Reference material

Reviewed official AnyDesk documentation and UI images: [client settings](https://support.anydesk.com/docs/settings), [session toolbar](https://support.anydesk.com/docs/session-settings), [address book](https://support.anydesk.com/docs/address-book), [feature overview](https://www.anydesk.com/en/features), and [quick start](https://support.anydesk.com/docs/quick-start-guide). Authentication uses the algorithm defined in [RFC 6238](https://www.rfc-editor.org/rfc/rfc6238).
