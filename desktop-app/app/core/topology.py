"""Logical gateway paths. Never claim a physical switch port without LLDP/FDB evidence."""
from __future__ import annotations

from dataclasses import dataclass
import ipaddress

from app.core.models import Device


@dataclass(frozen=True)
class TopologyLink:
    parent: str
    child: str
    confidence: int
    evidence: str
    confirmed: bool


def build_topology(devices: list[Device], gateway: str | None,
                   local_network: str | None = None) -> list[TopologyLink]:
    by_ip = {device.ip: device for device in devices}
    by_mac = {device.mac: device for device in devices if device.mac}
    links: dict[str, TopologyLink] = {}
    for parent in devices:
        for mac in parent.lldp_neighbor_macs:
            child = by_mac.get(mac)
            if not child or child.ip == parent.ip:
                continue
            # LLDP is symmetric on neighboring switches; orient away from
            # the gateway where known, otherwise use deterministic IP order.
            if child.ip == gateway or (parent.ip != gateway and child.lldp_neighbor_macs
                                        and parent.mac in child.lldp_neighbor_macs
                                        and parent.ip > child.ip):
                continue
            links[child.ip] = TopologyLink(parent.ip, child.ip, 90,
                                           "Authorized SNMP LLDP neighbor chassis ID", True)
    subnet = ipaddress.IPv4Network(local_network) if local_network else None
    if gateway and gateway in by_ip and subnet and ipaddress.IPv4Address(gateway) in subnet:
        for child in devices:
            if (child.ip != gateway and child.ip not in links
                    and ipaddress.IPv4Address(child.ip) in subnet):
                links[child.ip] = TopologyLink(gateway, child.ip, 35,
                                                "Shared IP subnet and configured gateway; physical path unknown",
                                                False)
    return list(links.values())
