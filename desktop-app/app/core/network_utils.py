"""Target parsing (single IP / range / CIDR) and the fast host-discovery sweep."""
from __future__ import annotations

import ipaddress
import platform
import re
import socket
import subprocess
from dataclasses import dataclass
from concurrent.futures import FIRST_COMPLETED, ThreadPoolExecutor, wait
from typing import Callable

import psutil

# Ports worth probing while fingerprinting a device — hints at device type
# (camera RTSP/ONVIF, router/switch admin UI, Windows SMB/RDP, etc).
CANDIDATE_PORTS = [21, 22, 23, 80, 81, 443, 554, 3389, 8000, 8080, 8899, 37777]

PING_TIMEOUT_MS = 500
MAX_HOSTS = 65534  # hard cap so a typo like /8 can't lock up the app
MAX_IPV6_HOSTS = 256  # IPv6 /64 sweeps are impractical and potentially abusive
DISCOVERY_PORTS = (80, 443, 22, 554, 445)

# A GUI (--windowed) PyInstaller build has no console of its own, so every
# subprocess.run() would otherwise pop up its own flashing console window on
# Windows — with a 254-host sweep that looked like "dozens of new windows
# opening". CREATE_NO_WINDOW suppresses that; it's a no-op on other OSes.
_IS_WINDOWS = platform.system().lower() == "windows"
_NO_WINDOW_KWARGS = {"creationflags": subprocess.CREATE_NO_WINDOW} if _IS_WINDOWS else {}

# Reverse DNS lookups have no per-call timeout in the socket module; without
# a default, a single unreachable DNS server could stall a host for a long
# time. This bounds every blocking socket call made from this module.
socket.setdefaulttimeout(1.5)


class InvalidTargetError(ValueError):
    pass


@dataclass(frozen=True)
class NetworkAdapter:
    name: str
    ip: str
    netmask: str
    network: str
    gateway: str | None
    dns: tuple[str, ...]
    mac: str | None
    speed_mbps: int | None


def _windows_network_details() -> tuple[dict[str, str], dict[str, tuple[str, ...]]]:
    if not _IS_WINDOWS:
        return {}, {}
    try:
        result = subprocess.run(
            ["ipconfig", "/all"], capture_output=True, text=True, timeout=5, **_NO_WINDOW_KWARGS
        )
    except (OSError, subprocess.TimeoutExpired):
        return {}, {}
    gateways: dict[str, str] = {}
    dns_by_interface: dict[str, set[str]] = {}
    current: str | None = None
    reading_dns = False
    for line in result.stdout.splitlines():
        if line and not line.startswith(" ") and line.endswith(":"):
            current = line.split("adapter ", 1)[-1].rstrip(":")
            reading_dns = False
        elif "Default Gateway" in line and ":" in line and current:
            reading_dns = False
            value = line.split(":", 1)[1].strip()
            try:
                gateways[current] = str(ipaddress.IPv4Address(value))
            except ipaddress.AddressValueError:
                continue
        elif current and ("DNS Servers" in line or reading_dns):
            if "DNS Servers" in line and ":" in line:
                value = line.split(":", 1)[1].strip()
                reading_dns = True
            elif ":" not in line and line.strip():
                value = line.strip()
            else:
                reading_dns = False
                continue
            try:
                dns_by_interface.setdefault(current, set()).add(str(ipaddress.IPv4Address(value)))
            except ipaddress.AddressValueError:
                reading_dns = False
    return gateways, {name: tuple(sorted(values)) for name, values in dns_by_interface.items()}


def _windows_gateway_by_ip() -> dict[str, str]:
    if not _IS_WINDOWS:
        return {}
    try:
        output = subprocess.run(["route", "print", "-4"], capture_output=True, text=True,
                                timeout=5, **_NO_WINDOW_KWARGS).stdout
    except (OSError, subprocess.TimeoutExpired):
        return {}
    result: dict[str, str] = {}
    for line in output.splitlines():
        fields = line.split()
        if len(fields) < 4 or fields[:2] != ["0.0.0.0", "0.0.0.0"]:
            continue
        try:
            gateway = str(ipaddress.IPv4Address(fields[2]))
            local_ip = str(ipaddress.IPv4Address(fields[3]))
        except ipaddress.AddressValueError:
            continue
        result[local_ip] = gateway
    return result


def detect_adapters() -> list[NetworkAdapter]:
    gateways, dns_by_interface = _windows_network_details()
    gateway_by_ip = _windows_gateway_by_ip()
    adapters: list[NetworkAdapter] = []
    stats = psutil.net_if_stats()
    for name, addresses in psutil.net_if_addrs().items():
        status = stats.get(name)
        if not status or not status.isup:
            continue
        mac = next((a.address for a in addresses if a.family == psutil.AF_LINK), None)
        for address in addresses:
            if address.family != socket.AF_INET or not address.netmask:
                continue
            try:
                ip = ipaddress.IPv4Address(address.address)
                network = ipaddress.IPv4Network(f"{ip}/{address.netmask}", strict=False)
            except (ipaddress.AddressValueError, ipaddress.NetmaskValueError):
                continue
            if ip.is_loopback or ip.is_link_local:
                continue
            adapters.append(NetworkAdapter(name, str(ip), address.netmask, str(network),
                                           gateway_by_ip.get(str(ip)) or gateways.get(name),
                                           dns_by_interface.get(name, ()),
                                           mac, status.speed if status.speed > 0 else None))
    return adapters


def parse_targets(spec: str) -> list[str]:
    """Accepts a single IP ("192.168.1.50"), a range ("192.168.1.10-192.168.1.150"
    or "192.168.1.10-150"), or CIDR ("192.168.1.0/24") and returns the list of
    host IPs to scan.
    """
    spec = spec.strip()

    def valid_host(address: ipaddress.IPv4Address | ipaddress.IPv6Address) -> str:
        if address.version == 6 and (address.is_link_local or address.is_multicast or address.is_unspecified):
            raise InvalidTargetError("Use a routable IPv6 address; link-local targets need an interface scope.")
        return str(address)

    if "/" in spec:
        try:
            network = ipaddress.ip_network(spec, strict=False)
        except ValueError as e:
            raise InvalidTargetError(f"Invalid CIDR: {spec}") from e
        limit = MAX_HOSTS + 2 if network.version == 4 else MAX_IPV6_HOSTS
        if network.num_addresses > limit:
            raise InvalidTargetError(
                "This range is too large (IPv4 max /16; IPv6 max 256 addresses)."
            )
        return [valid_host(h) for h in network.hosts()]

    if "-" in spec:
        start_str, end_str = (p.strip() for p in spec.split("-", 1))
        try:
            start = ipaddress.ip_address(start_str)
        except ValueError as e:
            raise InvalidTargetError(f"Invalid start IP: {start_str}") from e

        # Allow the short form "192.168.1.10-150" (only the last octet changes).
        if re.fullmatch(r"\d{1,3}", end_str):
            octets = start_str.split(".")
            octets[-1] = end_str
            end_str = ".".join(octets)
        try:
            end = ipaddress.ip_address(end_str)
        except ValueError as e:
            raise InvalidTargetError(f"Invalid end IP: {end_str}") from e

        if start.version != 4 or end.version != 4:
            raise InvalidTargetError("IP ranges require IPv4; use a small IPv6 CIDR.")
        if int(end) < int(start):
            raise InvalidTargetError("End IP cannot be smaller than start IP.")
        if int(end) - int(start) >= MAX_HOSTS:
            raise InvalidTargetError("This range is too large.")
        return [str(ipaddress.ip_address(i)) for i in range(int(start), int(end) + 1)]

    try:
        address = ipaddress.ip_address(spec)
    except ValueError as e:
        raise InvalidTargetError(f"Invalid IP address: {spec}") from e
    return [valid_host(address)]


def _ping_once(ip: str) -> bool:
    """Shells out to the OS ping command — no raw sockets, so no admin/root needed."""
    ipv6 = ipaddress.ip_address(ip).version == 6
    if _IS_WINDOWS:
        cmd = ["ping", *(["-6"] if ipv6 else []), "-n", "1", "-w", str(PING_TIMEOUT_MS), ip]
    else:
        cmd = ["ping", *(["-6"] if ipv6 else []), "-c", "1", "-W",
               str(max(1, PING_TIMEOUT_MS // 1000)), ip]
    try:
        result = subprocess.run(
            cmd,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            timeout=2,
            **_NO_WINDOW_KWARGS,
        )
        return result.returncode == 0
    except (subprocess.TimeoutExpired, OSError):
        return False


def _read_arp_table() -> dict[str, str]:
    """Reads the OS's already-populated ARP/neighbor cache (post-ping) for MACs."""
    try:
        output = subprocess.run(
            ["arp", "-a"],
            capture_output=True,
            text=True,
            timeout=5,
            **_NO_WINDOW_KWARGS,
        ).stdout
    except (OSError, subprocess.TimeoutExpired):
        return {}

    return parse_arp_table(output)


def normalize_mac(value: str) -> str | None:
    digits = re.sub(r"[^0-9a-fA-F]", "", value)
    if len(digits) != 12 or set(digits) == {"0"}:
        return None
    return ":".join(digits[i:i + 2].lower() for i in range(0, 12, 2))


def parse_arp_table(output: str) -> dict[str, str]:
    mac_by_ip: dict[str, str] = {}
    ip_re = re.compile(r"\b(\d{1,3}(?:\.\d{1,3}){3})\b")
    mac_re = re.compile(r"\b([0-9A-Fa-f]{2}(?:[:-][0-9A-Fa-f]{2}){5})\b")
    for line in output.splitlines():
        ip_match = ip_re.search(line)
        mac_match = mac_re.search(line)
        if ip_match and mac_match:
            try:
                ip = str(ipaddress.IPv4Address(ip_match.group(1)))
            except ipaddress.AddressValueError:
                continue
            mac = normalize_mac(mac_match.group(1))
            if mac:
                mac_by_ip[ip] = mac
    return mac_by_ip


def ping_once(ip: str) -> bool:
    """Public wrapper for a single ping — used by the Pro app's real-time
    conflict re-verification (a burst of several quick individual checks),
    as opposed to `ping_sweep`'s one-shot concurrent sweep of many hosts.
    """
    return _ping_once(ip)


def read_arp_entry(ip: str) -> str | None:
    """Whatever MAC the OS's ARP cache currently associates with `ip`, if
    any — a single read can only ever reflect ONE answer (the OS's own
    cache has no concept of "two devices replied"), which is exactly why
    a real conflict can only be caught by comparing several reads taken
    moments apart (see pro/live_probe.py).
    """
    return _read_arp_table().get(ip)


def clear_arp_entry(ip: str) -> None:
    """Best-effort: asks the OS to drop its cached ARP entry for `ip` so the
    next ping is forced to resolve the MAC fresh instead of reusing a
    (possibly stale) cached reply. Silently does nothing if this process
    lacks the privilege to do so (e.g. `arp -d` needs an elevated prompt on
    Windows) — callers should treat this purely as an attempt to improve
    the odds of a live re-check, never as something they depend on.
    """
    try:
        subprocess.run(
            ["arp", "-d", ip],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            timeout=2,
            **_NO_WINDOW_KWARGS,
        )
    except OSError:
        pass


def _tcp_alive(ip: str) -> bool:
    for port in DISCOVERY_PORTS:
        try:
            with socket.create_connection((ip, port), timeout=0.18):
                return True
        except (OSError, TimeoutError):
            continue
    return False


def ping_sweep(targets: list[str], max_workers: int = 64,
               should_stop: Callable[[], bool] | None = None,
               on_probe: Callable[[int, int], None] | None = None) -> list[str]:
    """Bounded active ICMP/TCP sweep; stale ARP entries alone do not prove liveness."""
    candidates = list(targets)
    alive = _probe_targets(candidates, _ping_once, max_workers, should_stop, on_probe)
    if should_stop and should_stop():
        return alive
    alive_set = set(alive)
    remaining = [ip for ip in candidates if ip not in alive_set]
    alive_set.update(_probe_targets(remaining, _tcp_alive, max_workers, should_stop))
    return sorted(alive_set, key=lambda ip: (ipaddress.ip_address(ip).version,
                                             int(ipaddress.ip_address(ip))))


def _probe_targets(targets: list[str], probe: Callable[[str], bool], max_workers: int,
                   should_stop: Callable[[], bool] | None,
                   on_probe: Callable[[int, int], None] | None = None) -> list[str]:
    if not targets:
        return []
    if max_workers < 1:
        raise ValueError("Scan concurrency must be at least one worker")
    found: list[str] = []
    completed = 0
    iterator = iter(targets)
    with ThreadPoolExecutor(max_workers=max_workers) as pool:
        pending = {pool.submit(probe, ip): ip for ip in
                   [next(iterator, None) for _ in range(min(len(targets), max_workers * 2))]
                   if ip is not None}
        while pending:
            if should_stop and should_stop():
                for future in pending:
                    future.cancel()
                break
            finished, _ = wait(pending, timeout=0.1, return_when=FIRST_COMPLETED)
            for future in finished:
                ip = pending.pop(future)
                completed += 1
                if on_probe:
                    on_probe(completed, len(targets))
                try:
                    if future.result():
                        found.append(ip)
                except Exception:
                    pass
                next_ip = next(iterator, None)
                if next_ip is not None and not (should_stop and should_stop()):
                    pending[pool.submit(probe, next_ip)] = next_ip
    return found


def resolve_hostname(ip: str) -> str | None:
    try:
        return socket.gethostbyaddr(ip)[0]
    except (socket.herror, socket.gaierror, OSError):
        return None


def scan_ports(ip: str, ports: list[int] | None = None, timeout: float = 0.3) -> list[int]:
    ports = CANDIDATE_PORTS if ports is None else ports
    import select
    waiting: dict[socket.socket, int] = {}
    open_ports: list[int] = []
    try:
        for port in ports:
            family = socket.AF_INET6 if ipaddress.ip_address(ip).version == 6 else socket.AF_INET
            sock = socket.socket(family, socket.SOCK_STREAM)
            sock.setblocking(False)
            try:
                error = sock.connect_ex((ip, port))
                if error == 0:
                    open_ports.append(port)
                    sock.close()
                else:
                    waiting[sock] = port
            except OSError:
                sock.close()
        if waiting:
            _, writable, _ = select.select([], list(waiting), [], timeout)
            for sock in writable:
                if sock.getsockopt(socket.SOL_SOCKET, socket.SO_ERROR) == 0:
                    open_ports.append(waiting[sock])
    finally:
        for sock in waiting:
            sock.close()
    return sorted(open_ports)


def resolve_macs(ips: list[str]) -> dict[str, str]:
    return {ip: mac for ip, mac in _read_arp_table().items() if ip in ips}


def detect_local_network() -> ipaddress.IPv4Network | None:
    """Match the preferred local IPv4 address to its actual interface netmask."""
    adapters = detect_adapters()
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
            sock.connect(("8.8.8.8", 80))
            local_ip = sock.getsockname()[0]
        selected = next((adapter for adapter in adapters if adapter.ip == local_ip), None)
        return ipaddress.ip_network(selected.network) if selected else None
    except OSError:
        return ipaddress.ip_network(adapters[0].network) if len(adapters) == 1 else None


def suggest_range_spec() -> str | None:
    """Returns a ready-to-scan "start-end" string for the detected local network."""
    network = detect_local_network()
    if network is None:
        return None
    first = next(network.hosts(), None)
    if first is None:
        return None
    last = network.broadcast_address if network.prefixlen >= 31 else network.broadcast_address - 1
    return f"{first}-{last}"
