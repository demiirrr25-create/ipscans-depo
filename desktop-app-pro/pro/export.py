"""CSV/JSON export (spec item 23). PDF/Excel are deferred to a later phase —
they need extra dependencies (reportlab/openpyxl) that add real weight to
the PyInstaller build for a feature that isn't in the Phase-1 priority list.
"""
from __future__ import annotations

import csv
import json
import sqlite3
from pathlib import Path


def export_devices_csv(devices: list[sqlite3.Row], path: str | Path) -> None:
    fieldnames = [
        "ip", "mac", "vendor", "hostname", "device_type", "custom_name",
        "status", "last_latency_ms", "last_packet_loss_pct", "first_seen", "last_seen",
    ]
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in devices:
            writer.writerow({key: row[key] for key in fieldnames})


def export_devices_json(devices: list[sqlite3.Row], path: str | Path) -> None:
    data = [dict(row) for row in devices]
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def export_events_csv(events: list[sqlite3.Row], path: str | Path) -> None:
    fieldnames = ["ts", "severity", "type", "ip", "mac", "message", "confidence"]
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in events:
            writer.writerow({key: row[key] for key in fieldnames})
