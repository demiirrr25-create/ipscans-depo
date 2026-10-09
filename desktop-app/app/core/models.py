"""Data model shared by every discovery protocol."""
from __future__ import annotations

from dataclasses import dataclass, field
import ipaddress


@dataclass
class Device:
    ip: str
    mac: str | None = None
    vendor: str | None = None
    hostname: str | None = None
    open_ports: list[int] = field(default_factory=list)

    # Populated by whichever protocol successfully answered — see scanner.py
    snmp_sys_descr: str | None = None
    snmp_sys_name: str | None = None
    wmi_os_caption: str | None = None
    wmi_computer_name: str | None = None
    upnp_friendly_name: str | None = None
    upnp_device_type: str | None = None
    nmap_os_guess: str | None = None
    nmap_services: list[str] = field(default_factory=list)

    serial_number: str | None = None
    sources: list[str] = field(default_factory=list)
    device_type: str = "Unknown"
    classification_evidence: str | None = None
    onvif_manufacturer: str | None = None
    onvif_model: str | None = None
    onvif_firmware: str | None = None
    onvif_endpoint: str | None = None
    first_seen: str | None = None
    last_seen: str | None = None
    latency_ms: float | None = None
    lldp_neighbor_macs: list[str] = field(default_factory=list)
    mdns_services: list[str] = field(default_factory=list)
    classification_confidence: str = "Low"
    reachability: str = "Online"
    parent_ip: str | None = None
    connection_evidence: str | None = None
    onvif_types: list[str] = field(default_factory=list)
    discovery_id: str | None = None
    http_title: str | None = None
    http_server: str | None = None
    rtsp_server: str | None = None
    model: str | None = None
    identification_score: int = 0
    cdp_neighbor_ips: list[str] = field(default_factory=list)
    bridge_fdb: list[str] = field(default_factory=list)
    custom_name: str | None = None

    @property
    def display_name(self) -> str:
        return self.custom_name or self.upnp_friendly_name or self.onvif_model or self.hostname or self.device_type

    @property
    def preferred_url_scheme(self) -> str:
        """https if a secure web port is open, otherwise plain http."""
        return "https" if 443 in self.open_ports or (8443 in self.open_ports and 80 not in self.open_ports) else "http"

    @property
    def url(self) -> str:
        host = f"[{self.ip}]" if ipaddress.ip_address(self.ip).version == 6 else self.ip
        scheme = self.preferred_url_scheme
        port = ':8443' if scheme == 'https' and 443 not in self.open_ports else (
            ':8080' if scheme == 'http' and 80 not in self.open_ports and 8080 in self.open_ports else '')
        return f"{scheme}://{host}{port}"
