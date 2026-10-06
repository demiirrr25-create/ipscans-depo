"""Unauthenticated ONVIF WS-Discovery announcements on the local network."""
from __future__ import annotations

import ipaddress
import logging
import socket
import uuid
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from urllib.parse import unquote

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


def _scope(scopes: tuple[str, ...], key: str) -> str | None:
    prefix = f"onvif://www.onvif.org/{key}/"
    return next((unquote(scope[len(prefix):]).replace("+", " ") for scope in scopes
                 if scope.startswith(prefix) and scope[len(prefix):]), None)


def parse_response(payload: bytes, address: str) -> OnvifResult | None:
    if len(payload) > 65535:
        return None
    try:
        ip = str(ipaddress.IPv4Address(address))
        root = ET.fromstring(payload)
    except (ValueError, ET.ParseError):
        return None
    match = root.find(f".//{_NS}ProbeMatch")
    if match is None:
        return None
    types = match.findtext(f"{_NS}Types", default="")
    scopes = tuple(match.findtext(f"{_NS}Scopes", default="").split())
    if "NetworkVideoTransmitter" not in types and not any("onvif.org" in scope for scope in scopes):
        return None
    xaddrs = match.findtext(f"{_NS}XAddrs", default="").split()
    endpoint = next((url for url in xaddrs if url.startswith(("http://", "https://"))), None)
    return OnvifResult(ip, endpoint, scopes, _scope(scopes, "name"),
                       _scope(scopes, "manufacturer"), _scope(scopes, "model"))


def discover(timeout: float = 2.0, should_stop=None) -> dict[str, OnvifResult]:
    probe = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope" '
        'xmlns:a="http://schemas.xmlsoap.org/ws/2004/08/addressing" '
        'xmlns:d="http://schemas.xmlsoap.org/ws/2005/04/discovery" '
        'xmlns:dn="http://www.onvif.org/ver10/network/wsdl">'
        '<s:Header><a:Action>http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe</a:Action>'
        f'<a:MessageID>uuid:{uuid.uuid4()}</a:MessageID>'
        '<a:To>urn:schemas-xmlsoap-org:ws:2005:04:discovery</a:To></s:Header>'
        '<s:Body><d:Probe><d:Types>dn:NetworkVideoTransmitter</d:Types></d:Probe></s:Body>'
        '</s:Envelope>'
    ).encode()
    results: dict[str, OnvifResult] = {}
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
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
