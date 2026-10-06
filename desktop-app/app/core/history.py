"""Local, size-bounded scan snapshots and evidence-based changes."""
from __future__ import annotations

import csv
import ipaddress
import json
import os
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path

from app.core.models import Device

HISTORY_PATH = (Path(os.environ.get("LOCALAPPDATA", Path.home() / ".local" / "share"))
                / "IPscans+" / "history.json")


@dataclass(frozen=True)
class ScanChange:
    added: int
    missing: int
    ip_changes: int
    mac_changes: int = 0


def compare(previous: list[Device], current: list[Device]) -> ScanChange:
    old_by_ip = {device.ip: device for device in previous}
    new_by_ip = {device.ip: device for device in current}
    old_mac = {device.mac: device.ip for device in previous if device.mac}
    new_mac = {device.mac: device.ip for device in current if device.mac}
    moved_macs = {mac for mac in old_mac.keys() & new_mac.keys() if old_mac[mac] != new_mac[mac]}
    moved_old = {old_mac[mac] for mac in moved_macs}
    moved_new = {new_mac[mac] for mac in moved_macs}
    changed_at_ip = sum(
        bool(previous.mac and current_device.mac and previous.mac != current_device.mac)
        for ip, previous in old_by_ip.items() if (current_device := new_by_ip.get(ip))
    )
    return ScanChange(len(new_by_ip.keys() - old_by_ip.keys() - moved_new),
                      len(old_by_ip.keys() - new_by_ip.keys() - moved_old),
                      len(moved_macs), changed_at_ip)


def load_latest(path: Path = HISTORY_PATH) -> list[Device]:
    if not path.exists():
        return []
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict) or not isinstance(data.get("devices"), list):
        raise ValueError("Invalid scan history format")
    valid_keys = set(Device.__dataclass_fields__)
    devices: list[Device] = []
    for entry in data["devices"]:
        if not isinstance(entry, dict) or not isinstance(entry.get("ip"), str):
            raise ValueError("Invalid device in scan history")
        try:
            ipaddress.ip_address(entry["ip"])
        except ipaddress.AddressValueError as exc:
            raise ValueError("Invalid IP in scan history") from exc
        if not isinstance(entry.get("open_ports", []), list) or not isinstance(entry.get("sources", []), list):
            raise ValueError("Invalid ports or sources in scan history")
        devices.append(Device(**{key: value for key, value in entry.items() if key in valid_keys}))
    return devices


def save_snapshot(devices: list[Device], path: Path = HISTORY_PATH) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    data = {"scanned_at": datetime.now(timezone.utc).isoformat(),
            "devices": [asdict(device) for device in devices]}
    temporary = path.with_suffix(".tmp")
    temporary.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    temporary.replace(path)


def export_results(devices: list[Device], path: Path) -> None:
    if path.suffix.lower() == ".json":
        path.write_text(json.dumps([asdict(device) for device in devices], ensure_ascii=False, indent=2), encoding="utf-8")
    elif path.suffix.lower() == ".csv":
        columns = ("ip", "mac", "hostname", "vendor", "device_type", "classification_evidence", "serial_number",
                   "onvif_model", "onvif_firmware", "open_ports", "sources", "first_seen", "last_seen")
        with path.open("w", encoding="utf-8-sig", newline="") as file:
            writer = csv.DictWriter(file, fieldnames=columns)
            writer.writeheader()
            for device in devices:
                row = asdict(device)
                writer.writerow({key: ", ".join(map(str, row[key])) if isinstance(row[key], list) else row[key]
                                 for key in columns})
    else:
        raise ValueError("Export format must be .csv or .json")
