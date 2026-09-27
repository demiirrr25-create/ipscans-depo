"""Best-effort device-type classification (spec item 10) — deliberately
conservative: falls back to "Unknown" rather than guessing, since an
overconfident wrong label is worse than none (matches the product's "never
overstate confidence" principle, spec #45/56).

Signal priority (most to least reliable):
  1. UPnP device type / friendly name / SNMP sysDescr — these are the
     device *describing itself*, so a hit here is authoritative.
  2. Vendor (MAC OUI) matched against known camera/NVR/networking brands.
  3. Open ports — the weakest signal: flaky right after power-on (a
     just-rebooted camera may not have RTSP/ONVIF listening yet), and
     ports can be shared across device categories.
"""
from __future__ import annotations

_CAMERA_PORTS = {554, 8899}  # RTSP, ONVIF
_NVR_PORTS = {37777, 8000}  # common Dahua/Hikvision NVR admin ports
_PRINTER_PORTS = {631, 9100}  # IPP, JetDirect
_REMOTE_ADMIN_PORTS = {3389, 445}  # RDP, SMB -> likely a Windows computer
_SSH_PORT = 22

# Camera/NVR/DVR manufacturers — checked against the MAC vendor (OUI)
# string, which is far more reliable than ports for identifying purpose-
# built security hardware. Router/AP vendors are checked separately since
# several (e.g. TP-Link) also make cameras.
_CAMERA_NVR_VENDORS = (
    "hikvision", "dahua", "uniview", "cp plus", "cpplus", "axis communications",
    "reolink", "amcrest", "foscam", "swann", "lorex", "annke", "hangzhou hikvision",
    "zhejiang dahua", "tiandy", "vivotek",
)
_NETWORKING_VENDORS = (
    "cisco", "tp-link", "netgear", "mikrotik", "ubiquiti", "d-link", "asus",
    "huawei", "zte", "technicolor", "arris", "sagemcom", "zyxel", "fortinet",
)


def _text_signals_camera(text: str) -> bool:
    return any(term in text for term in ("camera", "ipcam", "webcam", "cam ", "onvif"))


def _text_signals_nvr(text: str) -> bool:
    return any(term in text for term in ("nvr", "dvr", "video recorder"))


def _text_signals_router(text: str) -> bool:
    return any(term in text for term in ("gateway", "router", "internetgatewaydevice", "modem"))


def classify_device_type(
    open_ports: list[int],
    vendor: str | None,
    hostname: str | None,
    upnp_friendly_name: str | None = None,
    upnp_device_type: str | None = None,
    snmp_sys_descr: str | None = None,
) -> str:
    # --- 1. Authoritative: the device describing itself via UPnP/SNMP ---
    self_described = " ".join(
        filter(None, [upnp_friendly_name, upnp_device_type, snmp_sys_descr])
    ).lower()
    if self_described:
        if _text_signals_camera(self_described):
            return "IP Camera"
        if _text_signals_nvr(self_described):
            return "NVR"
        if _text_signals_router(self_described):
            return "Router"
        if "printer" in self_described:
            return "Printer"

    # --- 2. Vendor (MAC OUI) — purpose-built hardware brands ---
    vendor_lower = (vendor or "").lower()
    if any(name in vendor_lower for name in _CAMERA_NVR_VENDORS):
        # A dedicated security-camera vendor's device with an NVR-typical
        # port open is an NVR; otherwise assume camera (their most common
        # product). Ports here refine a vendor hit, they don't override it —
        # unlike a generic "any device with port 554 open" guess, this
        # vendor is SPECIFICALLY in the security-camera business.
        return "NVR" if set(open_ports) & _NVR_PORTS else "IP Camera"

    # --- 3. Ports — weakest signal, used as a fallback only ---
    ports = set(open_ports)
    if ports & _NVR_PORTS:
        return "NVR"
    if ports & _CAMERA_PORTS:
        return "IP Camera"
    if ports & _PRINTER_PORTS:
        return "Printer"
    if ports & _REMOTE_ADMIN_PORTS:
        return "Computer"
    if any(name in vendor_lower for name in _NETWORKING_VENDORS) and (80 in ports or 443 in ports):
        return "Router"
    if _SSH_PORT in ports and (80 in ports or 443 in ports):
        return "Server"

    hostname_lower = (hostname or "").lower()
    if any(term in hostname_lower for term in ("cam", "nvr", "dvr")):
        return "IP Camera"

    return "Unknown"


def build_model_info(
    upnp_friendly_name: str | None,
    upnp_device_type: str | None,
    snmp_sys_descr: str | None,
    vendor: str | None,
    http_banner: str | None = None,
    rtsp_banner: str | None = None,
) -> str | None:
    """A single human-readable "what is this" string for the Inventory
    table — picks the best available signal rather than concatenating
    everything (most of these are redundant when present together).

    UPnP/SNMP rank first (the device describing itself in a structured
    way), but most consumer/pro IP cameras run neither — an HTTP/RTSP
    banner (see pro/device_fingerprint.py) is often the ONLY identifying
    text such a device ever offers, so it ranks above a bare vendor name.
    """
    if upnp_friendly_name:
        return upnp_friendly_name
    if snmp_sys_descr:
        return snmp_sys_descr
    if upnp_device_type:
        return upnp_device_type
    if http_banner:
        return http_banner
    if rtsp_banner:
        return rtsp_banner
    return vendor or None
