"""Local, size-bounded scan snapshots and evidence-based changes."""
from __future__ import annotations

import csv
import ipaddress
import json
import os
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from threading import RLock
import math
import uuid

from app.core.models import Device

HISTORY_PATH = (Path(os.environ.get("LOCALAPPDATA", Path.home() / ".local" / "share"))
                / "IPscans+" / "history.json")
_HISTORY_LOCK = RLock()


@dataclass(frozen=True)
class ScanChange:
    added: int
    missing: int
    ip_changes: int
    mac_changes: int = 0
    vendor_changes: int = 0


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
                      len(moved_macs), changed_at_ip,
                      sum(bool(old_by_ip[ip].vendor and new_by_ip[ip].vendor
                               and old_by_ip[ip].vendor != new_by_ip[ip].vendor)
                          for ip in old_by_ip.keys() & new_by_ip.keys()))


@dataclass(frozen=True)
class ScanSnapshot:
    scanned_at: str
    target: str
    devices: list[Device]


def _read_devices(entries: list) -> list[Device]:
    if len(entries) > 65534:
        raise ValueError("Scan history contains too many devices")
    valid_keys = set(Device.__dataclass_fields__)
    defaults = Device("0.0.0.0")
    devices: list[Device] = []
    for entry in entries:
        if not isinstance(entry, dict) or not isinstance(entry.get("ip"), str):
            raise ValueError("Invalid device in scan history")
        ipaddress.ip_address(entry["ip"])
        for key, value in entry.items():
            if key not in valid_keys:
                continue
            default = getattr(defaults, key)
            if isinstance(default, list):
                if not isinstance(value, list) or any(
                        isinstance(item, bool) or not isinstance(item, int if key == "open_ports" else str)
                        for item in value):
                    raise ValueError(f"Invalid {key} in scan history")
            elif key == 'identification_score':
                if type(value) is not int or not 0 <= value <= 100:
                    raise ValueError('Invalid identification score in scan history')
            elif key == "latency_ms":
                if value is not None and (isinstance(value, bool) or not isinstance(value, (int, float))
                                          or not math.isfinite(value) or value < 0):
                    raise ValueError("Invalid latency in scan history")
            elif isinstance(default, str):
                if not isinstance(value, str):
                    raise ValueError(f"Invalid {key} in scan history")
            elif value is not None and not isinstance(value, str):
                raise ValueError(f"Invalid {key} in scan history")
        if entry.get("classification_confidence", "Low") not in ("Low", "Medium", "High"):
            raise ValueError("Invalid confidence in scan history")
        if any(not 1 <= port <= 65535 for port in entry.get("open_ports", [])):
            raise ValueError("Invalid port in scan history")
        devices.append(Device(**{key: value for key, value in entry.items() if key in valid_keys}))
    return devices


def load_snapshots(path: Path = HISTORY_PATH) -> list[ScanSnapshot]:
    if not path.exists():
        return []
    if path.stat().st_size > 32 * 1024 * 1024:
        raise ValueError("Scan history exceeds the 32 MiB limit")
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict) or not isinstance(data.get("devices"), list):
        raise ValueError("Invalid scan history format")
    scans = data.get("scans", [data])
    if not isinstance(scans, list) or len(scans) > 20:
        raise ValueError("Invalid scan history snapshot count")
    snapshots = []
    for scan in scans:
        if not isinstance(scan, dict) or not isinstance(scan.get("devices"), list):
            raise ValueError("Invalid snapshot")
        timestamp, target = scan.get("scanned_at", ""), scan.get("target", "")
        if not isinstance(timestamp, str) or not isinstance(target, str):
            raise ValueError("Invalid snapshot metadata")
        snapshots.append(ScanSnapshot(timestamp, target, _read_devices(scan["devices"])))
    return snapshots


def load_latest(path: Path = HISTORY_PATH) -> list[Device]:
    scans = load_snapshots(path)
    return scans[-1].devices if scans else []


def save_snapshot(devices: list[Device], path: Path = HISTORY_PATH, *, target: str = "") -> None:
    with _HISTORY_LOCK:
        _save_snapshot(devices, path, target=target)


def _save_snapshot(devices: list[Device], path: Path, *, target: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    scans = [{"scanned_at": scan.scanned_at, "target": scan.target,
              "devices": [asdict(device) for device in scan.devices]}
             for scan in load_snapshots(path)[-19:]]
    data = {"scanned_at": datetime.now(timezone.utc).isoformat(), "target": target,
            "devices": [asdict(device) for device in devices]}
    scans.append(data.copy())
    data["scans"] = scans
    content = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    while len(content.encode("utf-8")) > 32 * 1024 * 1024 and len(scans) > 1:
        scans.pop(0)
        content = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    if len(content.encode("utf-8")) > 32 * 1024 * 1024:
        raise ValueError("This scan is too large for local history; export it instead.")
    temporary = path.with_name(f"{path.name}.{uuid.uuid4().hex}.tmp")
    try:
        temporary.write_text(content, encoding="utf-8")
        temporary.replace(path)
    finally:
        temporary.unlink(missing_ok=True)


def export_results(devices: list[Device], path: Path) -> None:
    if path.suffix.lower() == ".json":
        path.write_text(json.dumps([asdict(device) for device in devices], ensure_ascii=False, indent=2), encoding="utf-8")
    elif path.suffix.lower() == ".csv":
        columns = ("ip", "custom_name", "mac", "hostname", "vendor", "device_type", "classification_evidence",
                   "classification_confidence", "reachability", "parent_ip", "connection_evidence", "latency_ms",
                   "serial_number", "onvif_model", "onvif_firmware", "open_ports", "sources", "first_seen", "last_seen")
        with path.open("w", encoding="utf-8-sig", newline="") as file:
            writer = csv.DictWriter(file, fieldnames=columns)
            writer.writeheader()
            for device in devices:
                row = asdict(device)
                values = {}
                for key in columns:
                    value = ", ".join(map(str, row[key])) if isinstance(row[key], list) else row[key]
                    if isinstance(value, str) and value.startswith(("=", "+", "-", "@", "\t", "\r", "\n")):
                        value = "'" + value
                    values[key] = value
                writer.writerow(values)
    else:
        raise ValueError("Export format must be .csv or .json")
