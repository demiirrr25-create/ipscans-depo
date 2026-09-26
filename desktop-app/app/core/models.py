"""Data model shared by every discovery protocol."""
from __future__ import annotations

from dataclasses import dataclass, field


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

    @property
    def preferred_url_scheme(self) -> str:
        """https if a secure web port is open, otherwise plain http."""
        return "https" if 443 in self.open_ports else "http"

    @property
    def url(self) -> str:
        return f"{self.preferred_url_scheme}://{self.ip}"
