"""Target parsing (single IP / range / CIDR) and the fast host-discovery sweep."""
from __future__ import annotations

import ipaddress
import platform
import re
import socket
import subprocess
import logging
import time
import json
from pathlib import Path
from dataclasses import dataclass
from concurrent.futures import FIRST_COMPLETED, ThreadPoolExecutor, wait
from typing import Callable

import psutil
import dns.resolver
import dns.reversename

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
_LOG = logging.getLogger(__name__)


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
            ["powershell", "-NoProfile", "-NonInteractive", "-Command",
             "Get-NetIPConfiguration | Select-Object "
             "InterfaceAlias,IPv4DefaultGateway,DNSServer | ConvertTo-Json -Depth 4 -Compress"],
            capture_output=True, text=True, timeout=5, **_NO_WINDOW_KWARGS
        )
        if result.returncode:
            raise OSError("Windows network configuration query failed")
        data = json.loads(result.stdout or "[]")
    except (OSError, subprocess.TimeoutExpired, ValueError) as exc:
        _LOG.warning("Cannot read adapter gateway/DNS metadata (%s)", type(exc).__name__)
        return {}, {}
    gateways: dict[str, str] = {}
    dns_by_interface: dict[str, tuple[str, ...]] = {}
    for entry in ([data] if isinstance(data, dict) else data):
        name = entry["InterfaceAlias"]
        gateway = entry.get("IPv4DefaultGateway")
        if gateway:
            try:
                gateways[name] = str(ipaddress.IPv4Address(gateway["NextHop"]))
            except ipaddress.AddressValueError:
                _LOG.debug("Ignored non-IPv4 gateway on %s", name)
        servers = entry.get("DNSServer") or []
        if isinstance(servers, dict):
            servers = [servers]
        values = []
        for server in servers:
            for value in server.get("ServerAddresses", []):
                try:
                    values.append(str(ipaddress.ip_address(value)))
                except ValueError:
                    _LOG.debug("Ignored invalid DNS address on %s", name)
        dns_by_interface[name] = tuple(values)
    return gateways, dns_by_interface


def _windows_gateway_by_ip() -> dict[str, str]:
    if not _IS_WINDOWS:
        return {}
    try:
        output = subprocess.run(["route", "print", "-4"], capture_output=True, text=True,
                                timeout=5, **_NO_WINDOW_KWARGS).stdout
    except (OSError, subprocess.TimeoutExpired) as exc:
        _LOG.warning("Cannot read Windows default routes (%s)", type(exc).__name__)
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


def _linux_network_details() -> tuple[dict[str, str], tuple[str, ...]]:
    gateways: dict[str, str] = {}
    servers: list[str] = []
    if platform.system() != "Linux":
        return gateways, ()
    try:
        for line in Path("/proc/net/route").read_text().splitlines()[1:]:
            fields = line.split()
            if len(fields) >= 8 and fields[1] == "00000000" and int(fields[3], 16) & 2:
                gateways[fields[0]] = socket.inet_ntoa(bytes.fromhex(fields[2])[::-1])
        for line in Path("/etc/resolv.conf").read_text().splitlines():
            fields = line.split()
            if len(fields) >= 2 and fields[0] == "nameserver":
                servers.append(str(ipaddress.ip_address(fields[1])))
    except (OSError, ValueError) as exc:
        _LOG.warning("Cannot read Linux default route/DNS (%s)", type(exc).__name__)
    return gateways, tuple(servers)


def detect_adapters() -> list[NetworkAdapter]:
    gateways, dns_by_interface = _windows_network_details()
    gateway_by_ip = _windows_gateway_by_ip()
    linux_gateways, linux_dns = _linux_network_details()
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
                                           gateway_by_ip.get(str(ip)) or gateways.get(name) or linux_gateways.get(name),
                                           dns_by_interface.get(name, linux_dns),
                                           mac, status.speed if status.speed > 0 else None))
    return sorted(adapters, key=lambda adapter: adapter.gateway is None)


def parse_targets(spec: str) -> list[str]:
    """Accepts a single IP ("192.168.1.50"), a range ("192.168.1.10-192.168.1.150"
    or "192.168.1.10-150"), or CIDR ("192.168.1.0/24") and returns the list of
    host IPs to scan.
    """
    spec = spec.strip()

    def valid_host(address: ipaddress.IPv4Address | ipaddress.IPv6Address) -> str:
        if address.is_multicast or address.is_unspecified:
            raise InvalidTargetError("Multicast and unspecified addresses cannot be scanned as devices.")
        if address.version == 6 and address.is_link_local:
            raise InvalidTargetError("IPv6 link-local targets need an interface scope.")
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
        return [valid_host(ipaddress.ip_address(i)) for i in range(int(start), int(end) + 1)]

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


def _read_arp_table(interface_ip: str | None = None) -> dict[str, str]:
    """Reads the OS's already-populated ARP/neighbor cache (post-ping) for MACs."""
    try:
        output = subprocess.run(
            ["arp", "-a"],
            capture_output=True,
            text=True,
            timeout=5,
            **_NO_WINDOW_KWARGS,
        ).stdout
    except (OSError, subprocess.TimeoutExpired) as exc:
        _LOG.debug("Neighbor table unavailable (%s)", type(exc).__name__)
        return {}

    return parse_arp_table(output, interface_ip)


def normalize_mac(value: str) -> str | None:
    digits = re.sub(r"[^0-9a-fA-F]", "", value)
    if len(digits) != 12 or set(digits) == {"0"}:
        return None
    return ":".join(digits[i:i + 2].lower() for i in range(0, 12, 2))


def parse_arp_table(output: str, interface_ip: str | None = None) -> dict[str, str]:
    mac_by_ip: dict[str, str] = {}
    ip_re = re.compile(r"\b(\d{1,3}(?:\.\d{1,3}){3})\b")
    mac_re = re.compile(r"\b([0-9A-Fa-f]{2}(?:[:-][0-9A-Fa-f]{2}){5})\b")
    selected = not interface_ip or not _IS_WINDOWS
    for line in output.splitlines():
        if _IS_WINDOWS and interface_ip and "---" in line and ip_re.search(line):
            selected = ip_re.search(line).group(1) == interface_ip
            continue
        if not selected:
            continue
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
    except (OSError, subprocess.TimeoutExpired) as exc:
        _LOG.debug("Could not clear neighbor entry for %s (%s)", ip, type(exc).__name__)


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
               on_probe: Callable[[int, int], None] | None = None,
               on_alive: Callable[[str, str], None] | None = None) -> list[str]:
    """Bounded active ICMP/TCP sweep; stale ARP entries alone do not prove liveness."""
    candidates = list(targets)
    sources: dict[str, str] = {}

    def probe(ip: str) -> bool:
        if should_stop and should_stop():
            return False
        if _ping_once(ip):
            sources[ip] = "ICMP"
            return True
        if not (should_stop and should_stop()) and _tcp_alive(ip):
            sources[ip] = "TCP"
            return True
        return False

    return _probe_targets(candidates, probe, max_workers, should_stop, on_probe,
                          on_found=lambda ip: on_alive(ip, sources[ip]) if on_alive else None)


def _probe_targets(targets: list[str], probe: Callable[[str], bool], max_workers: int,
                   should_stop: Callable[[], bool] | None,
                   on_probe: Callable[[int, int], None] | None = None,
                   on_found: Callable[[str], None] | None = None) -> list[str]:
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
                        if on_found:
                            on_found(ip)
                except (OSError, TimeoutError) as exc:
                    _LOG.warning("Host probe failed for %s (%s)", ip, type(exc).__name__)
                next_ip = next(iterator, None)
                if next_ip is not None and not (should_stop and should_stop()):
                    pending[pool.submit(probe, next_ip)] = next_ip
    return found


def resolve_hostname(ip: str) -> str | None:
    try:
        result = dns.resolver.resolve(dns.reversename.from_address(ip), "PTR", lifetime=1.0)
        return str(result[0]).rstrip(".") if result else None
    except (dns.resolver.NXDOMAIN, dns.resolver.NoAnswer, dns.resolver.NoNameservers,
            dns.resolver.LifetimeTimeout, OSError) as exc:
        _LOG.debug("Reverse DNS unavailable for %s (%s)", ip, type(exc).__name__)
        return None


def scan_ports(ip: str, ports: list[int] | None = None, timeout: float = 0.3,
               on_latency: Callable[[float], None] | None = None) -> list[int]:
    ports = CANDIDATE_PORTS if ports is None else ports
    import select
    waiting: dict[socket.socket, int] = {}
    open_ports: list[int] = []
    started = time.monotonic()
    latencies: list[float] = []
    try:
        for port in ports:
            family = socket.AF_INET6 if ipaddress.ip_address(ip).version == 6 else socket.AF_INET
            sock = socket.socket(family, socket.SOCK_STREAM)
            sock.setblocking(False)
            try:
                error = sock.connect_ex((ip, port))
                if error == 0:
                    open_ports.append(port)
                    latencies.append((time.monotonic() - started) * 1000)
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
                    latencies.append((time.monotonic() - started) * 1000)
    finally:
        for sock in waiting:
            sock.close()
    if latencies and on_latency:
        on_latency(min(latencies))
    return sorted(open_ports)


def resolve_macs(ips: list[str], interface_ip: str | None = None) -> dict[str, str]:
    selected = set(ips)
    return {ip: mac for ip, mac in _read_arp_table(interface_ip).items() if ip in selected}


def detect_local_network() -> ipaddress.IPv4Network | None:
    """Match the preferred local IPv4 address to its actual interface netmask."""
    adapters = detect_adapters()
    selected = next((adapter for adapter in adapters if adapter.gateway), None)
    selected = selected or (adapters[0] if len(adapters) == 1 else None)
    return ipaddress.IPv4Network(selected.network) if selected else None


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
