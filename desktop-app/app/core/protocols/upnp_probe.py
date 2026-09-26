"""UPnP/SSDP discovery — routers, NAS boxes, smart TVs, some NVRs announce
themselves this way. A single multicast search finds every device on the
LAN at once; results are then matched back to the scanned host list by IP.
"""
from __future__ import annotations

from dataclasses import dataclass
from urllib.parse import urlparse

try:
    import upnpclient

    _HAS_UPNPCLIENT = True
except ImportError:
    _HAS_UPNPCLIENT = False


@dataclass
class UpnpResult:
    friendly_name: str | None
    device_type: str | None


def discover(timeout: float = 3.0) -> dict[str, UpnpResult]:
    if not _HAS_UPNPCLIENT:
        return {}
    try:
        devices = upnpclient.discover(timeout=timeout)
    except Exception:
        return {}

    by_ip: dict[str, UpnpResult] = {}
    for device in devices:
        host = urlparse(device.location).hostname
        if not host:
            continue
        by_ip[host] = UpnpResult(
            friendly_name=getattr(device, "friendly_name", None),
            device_type=getattr(device, "device_type", None),
        )
    return by_ip
