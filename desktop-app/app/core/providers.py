"""Protocol-specific discovery providers; orchestration is vendor independent."""
from __future__ import annotations

from typing import Callable, Protocol

from app.core.models import Device
from app.core.protocols import mdns_probe, onvif_probe, upnp_probe

StopCheck = Callable[[], bool]


class DeviceProvider(Protocol):
    name: str

    def discover(self, should_stop: StopCheck) -> list[Device]: ...


class ONVIFProvider:
    name = "ONVIF"

    def __init__(self, interface_ip: str | None = None) -> None:
        self.interface_ip = interface_ip

    def discover(self, should_stop: StopCheck) -> list[Device]:
        return [
            Device(ip=result.ip, sources=[self.name], onvif_endpoint=result.endpoint,
                   onvif_manufacturer=result.manufacturer, onvif_model=result.model,
                   onvif_types=list(result.types), upnp_friendly_name=result.name,
                   discovery_id=result.discovery_id)
            for result in onvif_probe.discover(should_stop=should_stop, interface_ip=self.interface_ip).values()
        ]


class MDNSProvider:
    name = "mDNS"

    def __init__(self, interface_ip: str | None = None) -> None:
        self.interface_ip = interface_ip

    def discover(self, should_stop: StopCheck) -> list[Device]:
        return [Device(ip=ip, hostname=result.hostname, sources=[self.name],
                       mdns_services=sorted(result.service_types))
                for ip, result in mdns_probe.discover(should_stop=should_stop, interface_ip=self.interface_ip).items()]


class UPnPProvider:
    name = "UPnP"

    def __init__(self, interface_ip: str | None = None) -> None:
        self.interface_ip = interface_ip

    def discover(self, should_stop: StopCheck) -> list[Device]:
        if should_stop():
            return []
        return [Device(ip=ip, sources=[self.name], upnp_friendly_name=result.friendly_name,
                       upnp_device_type=result.device_type)
                for ip, result in upnp_probe.discover(should_stop=should_stop, interface_ip=self.interface_ip).items()]
