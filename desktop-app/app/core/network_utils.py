"""Target parsing (single IP / range / CIDR) and the fast host-discovery sweep."""
from __future__ import annotations

import ipaddress
import platform
import re
import socket
import subprocess
from concurrent.futures import ThreadPoolExecutor, as_completed

# Ports worth probing while fingerprinting a device — hints at device type
# (camera RTSP/ONVIF, router/switch admin UI, Windows SMB/RDP, etc).
CANDIDATE_PORTS = [21, 22, 23, 80, 81, 443, 554, 3389, 8000, 8080, 8899, 37777]

PING_TIMEOUT_MS = 500
MAX_HOSTS = 65534  # hard cap so a typo like /8 can't lock up the app


class InvalidTargetError(ValueError):
    pass


def parse_targets(spec: str) -> list[str]:
    """Accepts a single IP ("192.168.1.50"), a range ("192.168.1.10-192.168.1.150"
    or "192.168.1.10-150"), or CIDR ("192.168.1.0/24") and returns the list of
    host IPs to scan.
    """
    spec = spec.strip()

    if "/" in spec:
        try:
            network = ipaddress.ip_network(spec, strict=False)
        except ValueError as e:
            raise InvalidTargetError(f"Geçersiz CIDR: {spec}") from e
        hosts = [str(h) for h in network.hosts()]
        if len(hosts) > MAX_HOSTS:
            raise InvalidTargetError("Bu aralık çok geniş (en fazla /16 destekleniyor).")
        return hosts

    if "-" in spec:
        start_str, end_str = (p.strip() for p in spec.split("-", 1))
        try:
            start = ipaddress.ip_address(start_str)
        except ValueError as e:
            raise InvalidTargetError(f"Geçersiz başlangıç IP: {start_str}") from e

        # Allow the short form "192.168.1.10-150" (only the last octet changes).
        if re.fullmatch(r"\d{1,3}", end_str):
            octets = start_str.split(".")
            octets[-1] = end_str
            end_str = ".".join(octets)
        try:
            end = ipaddress.ip_address(end_str)
        except ValueError as e:
            raise InvalidTargetError(f"Geçersiz bitiş IP: {end_str}") from e

        if int(end) < int(start):
            raise InvalidTargetError("Bitiş IP, başlangıçtan küçük olamaz.")
        if int(end) - int(start) > MAX_HOSTS:
            raise InvalidTargetError("Bu aralık çok geniş.")
        return [str(ipaddress.ip_address(i)) for i in range(int(start), int(end) + 1)]

    try:
        return [str(ipaddress.ip_address(spec))]
    except ValueError as e:
        raise InvalidTargetError(f"Geçersiz IP adresi: {spec}") from e


def _ping_once(ip: str) -> bool:
    """Shells out to the OS ping command — no raw sockets, so no admin/root needed."""
    system = platform.system().lower()
    if system == "windows":
        cmd = ["ping", "-n", "1", "-w", str(PING_TIMEOUT_MS), ip]
    else:
        cmd = ["ping", "-c", "1", "-W", str(max(1, PING_TIMEOUT_MS // 1000)), ip]
    try:
        result = subprocess.run(
            cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=2
        )
        return result.returncode == 0
    except (subprocess.TimeoutExpired, OSError):
        return False


def _read_arp_table() -> dict[str, str]:
    """Reads the OS's already-populated ARP/neighbor cache (post-ping) for MACs."""
    system = platform.system().lower()
    cmd = ["arp", "-a"]
    try:
        output = subprocess.run(
            cmd, capture_output=True, text=True, timeout=5
        ).stdout
    except OSError:
        return {}

    mac_by_ip: dict[str, str] = {}
    ip_re = re.compile(r"(\d{1,3}(?:\.\d{1,3}){3})")
    mac_re = re.compile(r"([0-9A-Fa-f]{2}([:-][0-9A-Fa-f]{2}){5})")
    for line in output.splitlines():
        ip_match = ip_re.search(line)
        mac_match = mac_re.search(line)
        if ip_match and mac_match:
            mac_by_ip[ip_match.group(1)] = mac_match.group(1).replace("-", ":").lower()
    del system  # (kept for clarity that both platforms use `arp -a`)
    return mac_by_ip


def ping_sweep(targets: list[str], max_workers: int = 128) -> list[str]:
    """Pings every target concurrently and returns the ones that answered."""
    alive: list[str] = []
    with ThreadPoolExecutor(max_workers=max_workers) as pool:
        futures = {pool.submit(_ping_once, ip): ip for ip in targets}
        for future in as_completed(futures):
            ip = futures[future]
            if future.result():
                alive.append(ip)
    return alive


def resolve_hostname(ip: str) -> str | None:
    try:
        return socket.gethostbyaddr(ip)[0]
    except (socket.herror, socket.gaierror, OSError):
        return None


def scan_ports(ip: str, ports: list[int] | None = None, timeout: float = 0.3) -> list[int]:
    ports = ports or CANDIDATE_PORTS

    def _check(port: int) -> int | None:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.settimeout(timeout)
            return port if sock.connect_ex((ip, port)) == 0 else None

    # Ports for a single host are checked concurrently too — with 11
    # candidate ports at up to 0.3s each, a serial loop could take ~3.3s per
    # host; in parallel it's bounded by the single slowest port instead.
    with ThreadPoolExecutor(max_workers=len(ports)) as pool:
        results = pool.map(_check, ports)
    return sorted(p for p in results if p is not None)


def resolve_macs(ips: list[str]) -> dict[str, str]:
    return {ip: mac for ip, mac in _read_arp_table().items() if ip in ips}


def detect_local_network(prefix_len: int = 24) -> ipaddress.IPv4Network | None:
    """Finds the machine's own local IPv4 address (via a connect-less UDP
    "connect", which never actually sends a packet) and derives the /24
    network it likely belongs to — used to prefill the scan target on launch.
    """
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
            sock.connect(("8.8.8.8", 80))
            local_ip = sock.getsockname()[0]
        return ipaddress.ip_network(f"{local_ip}/{prefix_len}", strict=False)
    except OSError:
        return None


def suggest_range_spec() -> str | None:
    """Returns a ready-to-scan "start-end" string for the detected local network."""
    network = detect_local_network()
    if network is None:
        return None
    hosts = list(network.hosts())
    if not hosts:
        return None
    return f"{hosts[0]}-{hosts[-1]}"
