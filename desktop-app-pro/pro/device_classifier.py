"""Best-effort device-type classification from open ports / vendor string
(spec item 10) — deliberately conservative: falls back to "Unknown" rather
than guessing, since an overconfident wrong label is worse than none
(matches the product's "never overstate confidence" principle, spec #45/56).
"""
from __future__ import annotations

_CAMERA_PORTS = {554, 8899}  # RTSP, ONVIF
_NVR_PORTS = {37777, 8000}  # common Dahua/Hikvision NVR admin ports
_PRINTER_PORTS = {631, 9100}  # IPP, JetDirect
_REMOTE_ADMIN_PORTS = {3389, 445}  # RDP, SMB -> likely a Windows computer
_SSH_PORT = 22


def classify_device_type(open_ports: list[int], vendor: str | None, hostname: str | None) -> str:
    ports = set(open_ports)

    if ports & _NVR_PORTS:
        return "NVR"
    if ports & _CAMERA_PORTS:
        return "IP Camera"
    if ports & _PRINTER_PORTS:
        return "Printer"
    if ports & _REMOTE_ADMIN_PORTS:
        return "Computer"

    vendor_lower = (vendor or "").lower()
    if any(name in vendor_lower for name in ("cisco", "tp-link", "netgear", "mikrotik", "ubiquiti", "d-link")):
        # Networking-gear vendors without a camera/printer/RDP port open are
        # most often the router/switch/AP itself.
        if 80 in ports or 443 in ports:
            return "Router"

    if _SSH_PORT in ports and (80 in ports or 443 in ports):
        return "Server"

    hostname_lower = (hostname or "").lower()
    if any(term in hostname_lower for term in ("cam", "nvr", "dvr")):
        return "IP Camera"

    return "Unknown"
