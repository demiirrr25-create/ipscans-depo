"""mDNS service announcements; no credentials or invasive probes."""
from __future__ import annotations

import ipaddress
import logging
import time
from dataclasses import dataclass, field
from threading import Lock

from zeroconf import ServiceBrowser, ServiceListener, Zeroconf

_LOG = logging.getLogger(__name__)
_SERVICE_TYPES = (
    "_http._tcp.local.", "_rtsp._tcp.local.", "_workstation._tcp.local.",
    "_printer._tcp.local.", "_device-info._tcp.local.",
)


@dataclass
class MdnsResult:
    hostname: str | None = None
    service_types: set[str] = field(default_factory=set)


class _Listener(ServiceListener):
    def __init__(self, zc: Zeroconf) -> None:
        self.zc = zc
        self.results: dict[str, MdnsResult] = {}
        self.lock = Lock()

    def add_service(self, zc: Zeroconf, type_: str, name: str) -> None:
        info = zc.get_service_info(type_, name, timeout=250)
        if not info:
            return
        for address in info.parsed_addresses():
            try:
                ip = str(ipaddress.IPv4Address(address))
            except ipaddress.AddressValueError:
                continue
            with self.lock:
                result = self.results.setdefault(ip, MdnsResult())
                result.hostname = result.hostname or (info.server.rstrip(".") if info.server else None)
                result.service_types.add(type_)

    def update_service(self, zc: Zeroconf, type_: str, name: str) -> None:
        self.add_service(zc, type_, name)

    def remove_service(self, zc: Zeroconf, type_: str, name: str) -> None:
        _LOG.debug("mDNS service withdrawn during discovery")


def discover(timeout: float = 2.0, should_stop=None, interface_ip: str | None = None) -> dict[str, MdnsResult]:
    try:
        with Zeroconf(**({"interfaces": [interface_ip]} if interface_ip else {})) as zc:
            listener = _Listener(zc)
            browsers = [ServiceBrowser(zc, service, listener) for service in _SERVICE_TYPES]
            try:
                deadline = time.monotonic() + timeout
                while time.monotonic() < deadline and not (should_stop and should_stop()):
                    time.sleep(min(0.1, max(0, deadline - time.monotonic())))
            finally:
                for browser in browsers:
                    browser.cancel()
            with listener.lock:
                return {ip: MdnsResult(result.hostname, set(result.service_types))
                        for ip, result in listener.results.items()}
    except OSError as exc:
        _LOG.warning("mDNS discovery unavailable: %s", exc)
        return {}
