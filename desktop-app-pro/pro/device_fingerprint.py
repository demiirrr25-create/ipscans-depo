"""Extra, Pro-only device fingerprinting the free app's scanner doesn't do.

UPnP and SNMP (the free scanner's existing enrichment) are enterprise-
networking conventions — most consumer/pro IP cameras and NVRs don't run
either one. What they almost always DO have is a web admin UI (port 80/
8080/443) and/or an RTSP server (port 554), and both routinely identify the
device by name in ways a plain banner grab picks up for free: an HTTP
"Server:" header or <title>, or an RTSP "Server:" header from an OPTIONS
request. This is what actually lets a plain IP camera show a real
vendor/model in Inventory instead of "Unknown" — the app's whole reason for
existing is IP-camera conflict prevention, so this matters more here than
it would for a generic network scanner.

No extra dependency: raw urllib + a plain TCP socket, both already in the
stdlib, both with short timeouts so a single unresponsive host can't stall
a monitoring tick.
"""
from __future__ import annotations

import re
import socket
import urllib.request

_TIMEOUT_SEC = 1.2
_TITLE_RE = re.compile(rb"<title[^>]*>(.*?)</title>", re.IGNORECASE | re.DOTALL)
_MAX_BODY_BYTES = 4096


def http_banner(ip: str, open_ports: list[int]) -> str | None:
    """Best-effort HTTP <title>/Server header from this host's web UI, if
    it has one. Tries the most common camera/NVR web ports in order.
    """
    candidate_ports = [p for p in (80, 8080, 8000, 8899, 443) if p in open_ports]
    for port in candidate_ports:
        scheme = "https" if port == 443 else "http"
        url = f"{scheme}://{ip}:{port}/"
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "ipscans-network-health"})
            with urllib.request.urlopen(req, timeout=_TIMEOUT_SEC) as resp:  # noqa: S310 (LAN device, not user input)
                server = resp.headers.get("Server")
                body = resp.read(_MAX_BODY_BYTES)
        except Exception:
            continue
        match = _TITLE_RE.search(body)
        if match:
            title = match.group(1).decode("utf-8", "ignore").strip()
            if title:
                return title
        if server:
            return server
    return None


def rtsp_banner(ip: str, open_ports: list[int]) -> str | None:
    """Best-effort RTSP "Server:" header — very commonly present on IP
    cameras/NVRs even when they have no web UI at all.
    """
    if 554 not in open_ports:
        return None
    try:
        with socket.create_connection((ip, 554), timeout=_TIMEOUT_SEC) as sock:
            sock.sendall(f"OPTIONS rtsp://{ip}/ RTSP/1.0\r\nCSeq: 1\r\n\r\n".encode("ascii"))
            sock.settimeout(_TIMEOUT_SEC)
            data = sock.recv(1024).decode("utf-8", "ignore")
    except Exception:
        return None
    for line in data.splitlines():
        if line.lower().startswith("server:"):
            return line.split(":", 1)[1].strip()
    return None
