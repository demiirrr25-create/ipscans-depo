"""Bounded SSDP discovery; description URLs must match the responding peer."""
from __future__ import annotations

from concurrent.futures import FIRST_COMPLETED, ThreadPoolExecutor, wait
from dataclasses import dataclass
import ipaddress
import logging
import socket
import time
from urllib.parse import urlsplit

import requests
from defusedxml import ElementTree
from defusedxml.common import DefusedXmlException

_LOG = logging.getLogger(__name__)
_NS = "{urn:schemas-upnp-org:device-1-0}"


@dataclass
class UpnpResult:
    friendly_name: str | None
    device_type: str | None


def _description(location: str, peer: str) -> UpnpResult | None:
    try:
        parsed = urlsplit(location)
    except ValueError:
        _LOG.debug("Rejected malformed SSDP description URL")
        return None
    if (parsed.scheme not in ("http", "https") or parsed.hostname != peer
            or parsed.username or parsed.password or parsed.fragment):
        _LOG.debug("Rejected SSDP description URL not bound to its peer")
        return None
    try:
        with requests.Session() as session:
            session.trust_env = False
            with session.get(location, timeout=(0.5, 0.5), allow_redirects=False, stream=True) as response:
                if response.status_code != 200:
                    _LOG.debug("UPnP description returned HTTP %s", response.status_code)
                    return None
                content = bytearray()
                deadline = time.monotonic() + 1.5
                for chunk in response.iter_content(1):
                    if time.monotonic() > deadline or len(content) + len(chunk) > 131072:
                        _LOG.debug("UPnP description exceeded time/size bounds")
                        return None
                    content.extend(chunk)
        root = ElementTree.fromstring(bytes(content))
        device = root.find(f"{_NS}device")
        if device is None:
            return None
        return UpnpResult(device.findtext(f"{_NS}friendlyName"), device.findtext(f"{_NS}deviceType"))
    except (requests.RequestException, ElementTree.ParseError, DefusedXmlException, ValueError) as exc:
        _LOG.debug("UPnP description unavailable for %s (%s)", peer, type(exc).__name__)
        return None


def discover(timeout: float = 2.0, should_stop=None, interface_ip: str | None = None) -> dict[str, UpnpResult]:
    stopped = should_stop or (lambda: False)
    locations: dict[str, str] = {}
    request = (
        'M-SEARCH * HTTP/1.1\r\nHOST: 239.255.255.250:1900\r\n'
        'MAN: "ssdp:discover"\r\nMX: 1\r\nST: upnp:rootdevice\r\n\r\n'
    ).encode("ascii")
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
            if interface_ip:
                sock.bind((interface_ip, 0))
                sock.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_IF, socket.inet_aton(interface_ip))
            sock.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_TTL, 1)
            sock.settimeout(0.1)
            sock.sendto(request, ("239.255.255.250", 1900))
            deadline = time.monotonic() + timeout
            while time.monotonic() < deadline and not stopped():
                try:
                    payload, (peer, _) = sock.recvfrom(8192)
                except socket.timeout:
                    continue
                ipaddress.IPv4Address(peer)
                headers = {}
                for line in payload.decode("iso-8859-1").splitlines()[1:]:
                    key, separator, value = line.partition(":")
                    if separator:
                        headers[key.strip().lower()] = value.strip()
                if len(locations) < 256 and headers.get("location"):
                    locations.setdefault(peer, headers["location"])
    except (OSError, ValueError) as exc:
        _LOG.warning("SSDP discovery unavailable (%s)", type(exc).__name__)
        return {}
    results: dict[str, UpnpResult] = {}
    iterator = iter(locations.items())
    with ThreadPoolExecutor(max_workers=4) as pool:
        pending = {}
        deadline = time.monotonic() + 3
        while not stopped() and time.monotonic() < deadline:
            while len(pending) < 8 and (entry := next(iterator, None)):
                peer, location = entry
                pending[pool.submit(_description, location, peer)] = peer
            if not pending:
                break
            done, _ = wait(pending, timeout=0.1, return_when=FIRST_COMPLETED)
            for future in done:
                peer = pending.pop(future)
                result = future.result()
                if result:
                    results[peer] = result
        for future in pending:
            future.cancel()
    if len(results) < len(locations):
        _LOG.debug("SSDP descriptions resolved: %d/%d; remaining responses unclassified", len(results), len(locations))
    return results
