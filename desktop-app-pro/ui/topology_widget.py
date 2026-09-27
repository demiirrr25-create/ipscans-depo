"""Topology tab (spec item 19): a simple grouped-by-type device tree.

Full automatic L2 topology discovery (which switch port a device hangs off)
needs LLDP/CDP or per-switch SNMP walks this app doesn't attempt yet — the
spec explicitly says that's not required for a first version. This gives a
lightweight, genuinely useful stand-in: devices grouped by their
auto-classified type (pro/device_classifier.py), which is what most users
actually want when they say "show me the network" — "what's a camera, what's
a computer" — without overclaiming real physical topology.
"""
from __future__ import annotations

from PyQt6.QtGui import QColor
from PyQt6.QtWidgets import QTreeWidget, QTreeWidgetItem, QVBoxLayout, QWidget

from pro.pro_content import t

_TYPE_ORDER = [
    "Router", "Switch", "Access Point", "NVR", "IP Camera",
    "Printer", "Computer", "Server", "IoT", "Unknown",
]

_ONLINE_COLOR = QColor("#7ee787")
_OFFLINE_COLOR = QColor("#ff7a7a")


class TopologyWidget(QWidget):
    def __init__(self, lang: str = "en", parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self.lang = lang
        outer = QVBoxLayout(self)
        outer.setContentsMargins(4, 4, 4, 4)

        self.tree = QTreeWidget()
        self.tree.setHeaderHidden(True)
        outer.addWidget(self.tree)

    def refresh(self, devices) -> None:
        self.tree.clear()
        groups: dict[str, list] = {}
        for device in devices:
            groups.setdefault(device["device_type"] or "Unknown", []).append(device)

        if not groups:
            empty = QTreeWidgetItem([t(self.lang, "topology_empty")])
            self.tree.addTopLevelItem(empty)
            return

        ordered_types = [tp for tp in _TYPE_ORDER if tp in groups]
        ordered_types += [tp for tp in groups if tp not in _TYPE_ORDER]

        for device_type in ordered_types:
            group_devices = groups[device_type]
            group_item = QTreeWidgetItem([f"{device_type} ({len(group_devices)})"])
            for device in group_devices:
                name = device["custom_name"] or device["hostname"] or device["ip"]
                is_online = device["status"] == "online"
                status_text = t(self.lang, "status_online") if is_online else t(self.lang, "status_offline")
                child = QTreeWidgetItem([f"{name} — {device['ip']} ({status_text})"])
                child.setForeground(0, _ONLINE_COLOR if is_online else _OFFLINE_COLOR)
                group_item.addChild(child)
            self.tree.addTopLevelItem(group_item)
        self.tree.expandAll()
