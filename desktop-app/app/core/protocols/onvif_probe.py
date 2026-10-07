"""Unauthenticated ONVIF WS-Discovery announcements on the local network."""
from __future__ import annotations

import ipaddress
import logging
import socket
import uuid
from defusedxml import ElementTree as ET
from defusedxml.common import DefusedXmlException
from dataclasses import dataclass
from urllib.parse import unquote, urlsplit

_LOG = logging.getLogger(__name__)
_NS = "{http://schemas.xmlsoap.org/ws/2005/04/discovery}"


@dataclass(frozen=True)
class OnvifResult:
    ip: str
    endpoint: str | None
    scopes: tuple[str, ...]
    name: str | None = None
    manufacturer: str | None = None
    model: str | None = None
    types: tuple[str, ...] = ()
    discovery_id: str | None = None


def _scope(scopes: tuple[str, ...], key: str) -> str | None:
    prefix = f"onvif://www.onvif.org/{key}/"
    return next((unquote(scope[len(prefix):]) for scope in scopes
                 if scope.startswith(prefix) and scope[len(prefix):]), None)


def parse_response(payload: bytes, address: str) -> OnvifResult | None:
    if len(payload) > 65535:
        return None
    try:
        ip = str(ipaddress.IPv4Address(address))
        root = ET.fromstring(payload)
    except (ValueError, ET.ParseError, DefusedXmlException):
        _LOG.debug("Discarded invalid ONVIF announcement from %s", address)
        return None
    match = root.find(f".//{_NS}ProbeMatch")
    if match is None:
        return None
    types = match.findtext(f"{_NS}Types", default="").split()
    scopes = tuple(match.findtext(f"{_NS}Scopes", default="").split())
    supported = {"NetworkVideoTransmitter", "NetworkVideoStorage", "Device"}
    if not any(value.rsplit(":", 1)[-1] in supported for value in types):
        return None
    xaddrs = match.findtext(f"{_NS}XAddrs", default="").split()
    endpoints = []
    for url in xaddrs:
        try:
            parsed = urlsplit(url)
            if (parsed.scheme in ("http", "https") and parsed.hostname == ip
                    and not parsed.username and not parsed.password and not parsed.fragment):
                endpoints.append(url)
        except ValueError:
            _LOG.debug("Discarded invalid ONVIF endpoint from %s", address)
    endpoint = next((url for url in endpoints if url.startswith("https://")), None)
    endpoint = endpoint or next(iter(endpoints), None)
    if not endpoint:
        return None
    return OnvifResult(ip, endpoint, scopes, _scope(scopes, "name"),
                       _scope(scopes, "manufacturer"), _scope(scopes, "model"), tuple(types),
                       match.findtext(".//{http://schemas.xmlsoap.org/ws/2004/08/addressing}Address"))


def discover(timeout: float = 2.0, should_stop=None, interface_ip: str | None = None) -> dict[str, OnvifResult]:
    probe = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope" '
        'xmlns:a="http://schemas.xmlsoap.org/ws/2004/08/addressing" '
        'xmlns:d="http://schemas.xmlsoap.org/ws/2005/04/discovery" '
        'xmlns:dn="http://www.onvif.org/ver10/network/wsdl">'
        '<s:Header><a:Action>http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe</a:Action>'
        f'<a:MessageID>uuid:{uuid.uuid4()}</a:MessageID>'
        '<a:To>urn:schemas-xmlsoap-org:ws:2005:04:discovery</a:To></s:Header>'
        '<s:Body><d:Probe/></s:Body>'
        '</s:Envelope>'
    ).encode()
    results: dict[str, OnvifResult] = {}
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
            if interface_ip:
                sock.bind((interface_ip, 0))
                sock.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_IF, socket.inet_aton(interface_ip))
            sock.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_TTL, 1)
            sock.settimeout(0.2)
            sock.sendto(probe, ("239.255.255.250", 3702))
            import time
            deadline = time.monotonic() + timeout
            while time.monotonic() < deadline:
                if should_stop and should_stop():
                    break
                try:
                    payload, (address, _) = sock.recvfrom(65535)
                except socket.timeout:
                    continue
                result = parse_response(payload, address)
                if result:
                    results[result.ip] = result
    except OSError as exc:
        _LOG.warning("ONVIF discovery unavailable: %s", exc)
    return results
