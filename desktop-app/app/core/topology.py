"""Logical display paths with undirected LLDP adjacency evidence."""
from __future__ import annotations

from dataclasses import dataclass
import ipaddress
from collections import Counter, deque

from app.core.models import Device


@dataclass(frozen=True)
class TopologyLink:
    parent: str
    child: str
    evidence: str
    confirmed: bool


def build_topology(devices: list[Device], gateway: str | None,
                   local_network: str | None = None) -> list[TopologyLink]:
    by_ip = {device.ip: device for device in devices}
    counts = Counter(device.mac for device in devices if device.mac)
    by_mac = {device.mac: device for device in devices if device.mac and counts[device.mac] == 1}
    adjacent: dict[str, set[str]] = {ip: set() for ip in by_ip}
    for device in devices:
        for ip in device.cdp_neighbor_ips:
            if ip in by_ip and ip != device.ip:
                adjacent[device.ip].add(ip)
                adjacent[ip].add(device.ip)
        for mac in device.lldp_neighbor_macs:
            peer = by_mac.get(mac)
            if peer and peer.ip != device.ip:
                adjacent[device.ip].add(peer.ip)
                adjacent[peer.ip].add(device.ip)

    links: dict[str, TopologyLink] = {}
    visited: set[str] = set()
    # Layout orientation is arbitrary without port/route evidence. Starting
    # with the known gateway improves navigation, not the physical claim.
    roots = sorted(by_ip, key=lambda ip: (ip != gateway, ipaddress.ip_address(ip).version,
                                          int(ipaddress.ip_address(ip))))
    for root in roots:
        if root in visited:
            continue
        visited.add(root)
        queue = deque([root])
        while queue:
            parent = queue.popleft()
            for child in sorted(adjacent[parent], key=lambda ip: (ipaddress.ip_address(ip).version,
                                                                   int(ipaddress.ip_address(ip)))):
                if child in visited:
                    continue
                visited.add(child)
                links[child] = TopologyLink(parent, child,
                                             "Authorized SNMP LLDP/CDP adjacency; display direction is arbitrary",
                                             True)
                queue.append(child)

    for child in devices:
        if child.ip in links or child.ip == gateway or not child.mac or counts[child.mac] != 1:
            continue
        candidates = [(d.ip, entry.split('@', 1)[1]) for d in devices if d.ip != child.ip
                      for entry in d.bridge_fdb if entry.startswith(child.mac + '@')]
        if len(candidates) == 1:
            parent, port = candidates[0]
            chain, seen = parent, {child.ip}
            while chain in links and chain not in seen:
                seen.add(chain)
                chain = links[chain].parent
            if chain not in seen:
                links[child.ip] = TopologyLink(parent, child.ip,
                    f'SNMP bridge forwarding port {port}; intervening devices possible', False)
    subnet = ipaddress.IPv4Network(local_network) if local_network else None
    if gateway and gateway in by_ip and subnet and ipaddress.IPv4Address(gateway) in subnet:
        for child in devices:
            if (child.ip != gateway and child.ip not in links
                    and not adjacent[child.ip]
                    and ipaddress.ip_address(child.ip) in subnet):
                links[child.ip] = TopologyLink(gateway, child.ip,
                                                "Shared IP subnet and configured gateway; physical path unknown",
                                                False)
    return list(links.values())
