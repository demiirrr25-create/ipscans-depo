"""Merge independent observations without discarding conflicting identities."""
from __future__ import annotations

from dataclasses import dataclass, fields, replace
from datetime import datetime, timezone

from app.core.models import Device
from app.core.network_utils import normalize_mac
from app.core.vendor_lookup import lookup_vendor


@dataclass(frozen=True)
class PotentialConflict:
    ip: str
    macs: tuple[str, ...]
    vendors: tuple[str, ...]
    detected_at: str
    confidence: str = "Low"
    reason: str = (
        "Different MAC addresses were observed for this IP during one scan. "
        "Neighbor-cache changes can also result from replacement, failover or proxy ARP; "
        "this is a potential conflict, not proof of simultaneous devices."
    )


class DeviceRegistry:
    def __init__(self) -> None:
        self.devices: dict[str, Device] = {}
        self._macs: dict[str, set[str]] = {}
        self._conflicts: dict[str, PotentialConflict] = {}

    @property
    def conflicts(self) -> list[PotentialConflict]:
        return list(self._conflicts.values())

    def merge(self, observation: Device) -> Device:
        old = self.devices.get(observation.ip)
        result = replace(old) if old else replace(observation)
        for field in fields(Device):
            value = getattr(observation, field.name)
            if isinstance(value, list):
                setattr(result, field.name, sorted(set(getattr(result, field.name)) | set(value)))
            elif field.name == "first_seen":
                if value:
                    result.first_seen = min(filter(None, (result.first_seen, value)))
            elif field.name == "classification_confidence":
                ranks = {"Low": 0, "Medium": 1, "High": 2}
                if ranks[value] > ranks[result.classification_confidence]:
                    result.classification_confidence = value
            elif field.name == "device_type":
                if value != "Unknown":
                    result.device_type = value
            elif value is not None:
                setattr(result, field.name, value)
        if observation.mac and (mac := normalize_mac(observation.mac)):
            result.mac = mac
            observed = self._macs.setdefault(observation.ip, set())
            observed.add(mac)
            if len(observed) > 1:
                previous = self._conflicts.get(observation.ip)
                self._conflicts[observation.ip] = PotentialConflict(
                    observation.ip, tuple(sorted(observed)),
                    tuple(lookup_vendor(value) or "Unknown" for value in sorted(observed)),
                    previous.detected_at if previous else datetime.now(timezone.utc).isoformat(),
                )
        self.devices[result.ip] = result
        if result.ip in self._conflicts:
            result.reachability = "Potential conflict"
            result.classification_confidence = "Low"
            result.classification_evidence = "Potential IP conflict; device identity is ambiguous"
        return result
