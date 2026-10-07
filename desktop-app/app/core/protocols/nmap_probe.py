"""Nmap-backed service/OS fingerprinting (wraps the `nmap` binary via python-nmap).

Requires nmap to be installed and on PATH. OS detection (`-O`) typically
needs admin/root privileges; service detection (`-sV`) usually doesn't and
is what we rely on by default.
"""
from __future__ import annotations

from dataclasses import dataclass, field
import logging

try:
    import nmap

    _HAS_NMAP = True
except ImportError:
    _HAS_NMAP = False


@dataclass
class NmapResult:
    os_guess: str | None = None
    services: list[str] = field(default_factory=list)


def is_available() -> bool:
    if not _HAS_NMAP:
        return False
    try:
        nmap.PortScanner()
        return True
    except nmap.PortScannerError:
        return False


def query(ip: str, with_os_detection: bool = False) -> NmapResult | None:
    if not _HAS_NMAP:
        return None
    arguments = "-sV --version-light -T4" + (" -O" if with_os_detection else "")
    try:
        scanner = nmap.PortScanner()  # raises if the `nmap` binary isn't on PATH
        scanner.scan(hosts=ip, arguments=arguments, timeout=20)
    except Exception as exc:
        logging.getLogger(__name__).warning("Optional Nmap probe unavailable (%s)", type(exc).__name__)
        return None

    if ip not in scanner.all_hosts():
        return None
    host_data = scanner[ip]

    services: list[str] = []
    for proto in host_data.all_protocols():
        for port, info in host_data[proto].items():
            name = info.get("name") or "?"
            product = info.get("product") or ""
            version = info.get("version") or ""
            label = f"{port}/{name}"
            if product:
                label += f" ({product} {version})".rstrip()
            services.append(label)

    os_guess = None
    os_matches = host_data.get("osmatch") or []
    if os_matches:
        os_guess = os_matches[0].get("name")

    if not services and not os_guess:
        return None
    return NmapResult(os_guess=os_guess, services=services)
