# IPScans+ 4.2.0

- New monochrome S+ icon, packaged at 16–256 px for Windows and used throughout the app.
- Rounded scan surface, segmented navigation, taller result rows and a quieter status area.
- Removed hosts/second, elapsed-time and service-count cards. Discovery metrics remain internal to exported reports and benchmarks.
- Native animated progress follows completed discovery targets. Identification and topology phases show indeterminate activity, not misleading completion percentages. Animation stops while hidden/minimized and respects Windows animation effects when the scan starts.
- Double-click or Enter on a device opens its literal IP in the default browser. The map uses the same behavior. Known HTTPS/HTTP ports 443, 80, 8443 and 8080 are supported; devices without an observed web port use HTTP.
- Removed the device configuration panel from the shipped app. IP, mask, gateway, DNS and DHCP writes are no longer offered. Legacy protocol implementation/tests remain in source but are not imported by the application entry point.
- Preserved version-specific installation directories to avoid replacing a running previous EXE. CI upgrades a checksum-verified, locked v4.1.1 installation, validates shortcuts and installed startup, checks locked/unlocked repair and uninstall.

Validation includes source tests, actual Qt previews, loopback scan smoke tests, packaged EXE smoke tests, installer regression and package SHA-256 verification. Synthetic benchmarks are not claims of real-network speed or device accuracy. Executables remain unsigned.

Implementation references: [Qt default browser dispatch](https://doc.qt.io/qt-6/qdesktopservices.html#openUrl), [Qt animation framework](https://doc.qt.io/qt-6/qvariantanimation.html).
