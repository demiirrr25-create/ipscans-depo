"""Inspectable logical IP TREE; unknown physical links remain ungrouped."""
from __future__ import annotations

import ipaddress

from PyQt6.QtCore import QEvent, QPoint, Qt
from PyQt6.QtGui import QFont
from PyQt6.QtWidgets import (
    QHBoxLayout, QLabel, QLineEdit, QPushButton, QSplitter,
    QTextEdit, QTreeWidget, QTreeWidgetItem, QVBoxLayout, QWidget,
)

from app.core.models import Device
from app.core.topology import build_topology
from app.ui.device_icons import icon_for_type


class IpTree(QWidget):
    def __init__(self, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self.devices: list[Device] = []
        self.gateway: str | None = None
        self._font_size = 12
        self._pan_from: QPoint | None = None
        layout = QVBoxLayout(self)
        heading = QLabel("IP TREE  /  Logical paths only · Physical connections require verified neighbor evidence")
        heading.setWordWrap(True)
        layout.addWidget(heading)
        actions = QHBoxLayout()
        self.search = QLineEdit()
        self.search.setPlaceholderText("Find IP, MAC, hostname or vendor")
        self.search.textChanged.connect(self._filter)
        actions.addWidget(self.search, stretch=1)
        self.category = QLineEdit()
        self.category.setPlaceholderText("Filter device type")
        self.category.textChanged.connect(self._filter)
        actions.addWidget(self.category)
        for label, step in (("−", -1), ("+", 1)):
            button = QPushButton(label)
            button.setToolTip("Zoom tree")
            button.clicked.connect(lambda _checked=False, amount=step: self._zoom(amount))
            actions.addWidget(button)
        layout.addLayout(actions)
        splitter = QSplitter()
        self.tree = QTreeWidget()
        self.tree.setHeaderLabels(["Device / evidence"])
        self.tree.itemSelectionChanged.connect(self._inspect)
        self.tree.viewport().installEventFilter(self)
        self.inspector = QTextEdit()
        self.inspector.setReadOnly(True)
        self.inspector.setPlaceholderText("Select a device to inspect its recorded evidence.")
        splitter.addWidget(self.tree)
        splitter.addWidget(self.inspector)
        splitter.setStretchFactor(0, 3)
        splitter.setStretchFactor(1, 2)
        layout.addWidget(splitter, stretch=1)

    def eventFilter(self, watched, event) -> bool:  # noqa: N802 (Qt override)
        if watched is self.tree.viewport():
            if event.type() == QEvent.Type.Wheel and event.modifiers() & Qt.KeyboardModifier.ControlModifier:
                self._zoom(1 if event.angleDelta().y() > 0 else -1)
                return True
            if event.type() == QEvent.Type.MouseButtonPress and event.button() == Qt.MouseButton.MiddleButton:
                self._pan_from = event.position().toPoint()
                self.tree.viewport().setCursor(Qt.CursorShape.ClosedHandCursor)
                return True
            if event.type() == QEvent.Type.MouseMove and self._pan_from is not None:
                position = event.position().toPoint()
                delta = position - self._pan_from
                self.tree.horizontalScrollBar().setValue(self.tree.horizontalScrollBar().value() - delta.x())
                self.tree.verticalScrollBar().setValue(self.tree.verticalScrollBar().value() - delta.y())
                self._pan_from = position
                return True
            if event.type() == QEvent.Type.MouseButtonRelease and self._pan_from is not None:
                self._pan_from = None
                self.tree.viewport().unsetCursor()
                return True
        return super().eventFilter(watched, event)

    def refresh(self, devices: list[Device], gateway: str | None = None) -> None:
        self.devices = list(devices)
        self.gateway = gateway
        self._filter()

    def _zoom(self, step: int) -> None:
        self._font_size = max(9, min(22, self._font_size + step))
        font = QFont(self.tree.font())
        font.setPointSize(self._font_size)
        self.tree.setFont(font)

    def _filter(self, *_args) -> None:
        self.tree.clear()
        self.inspector.clear()
        needle = self.search.text().lower()
        category = self.category.text().lower()
        devices = [device for device in self.devices
                   if needle in " ".join(filter(None, (device.ip, device.mac, device.hostname,
                                                        device.vendor, device.onvif_model))).lower()
                   and category in device.device_type.lower()]
        by_ip = {device.ip: device for device in devices}
        links = build_topology(devices, self.gateway)
        children = {link.child: link for link in links if link.parent in by_ip}
        by_parent: dict[str, list] = {}
        for link in children.values():
            by_parent.setdefault(link.parent, []).append(link)
        visited: set[str] = set()

        def append_children(item: QTreeWidgetItem, ip: str) -> None:
            for link in by_parent.get(ip, []):
                if link.child in visited:
                    continue
                visited.add(link.child)
                evidence = ("Confirmed LLDP neighbor" if link.confirmed
                            else f"Inferred L3 route ({link.confidence}%) · physical path unknown")
                child = self._item(by_ip[link.child], evidence)
                item.addChild(child)
                append_children(child, link.child)

        roots = [device for device in devices if device.ip not in children]
        gateway_device = by_ip.get(self.gateway) if self.gateway else None
        if gateway_device in roots:
            roots.remove(gateway_device)
            roots.insert(0, gateway_device)
        unmapped = QTreeWidgetItem(["Unmapped physical connections"])
        for device in sorted(roots, key=lambda entry: int(ipaddress.ip_address(entry.ip))):
            if device.ip in visited:
                continue
            visited.add(device.ip)
            root_item = self._item(
                device, "Gateway address · physical role unverified" if device is gateway_device else "Parent unknown")
            if device is gateway_device:
                self.tree.addTopLevelItem(root_item)
            else:
                unmapped.addChild(root_item)
            append_children(root_item, device.ip)
        if unmapped.childCount():
            unmapped.setText(0, f"Unmapped physical connections ({unmapped.childCount()})")
            self.tree.addTopLevelItem(unmapped)
        self.tree.expandAll()

    def _item(self, device: Device, evidence: str) -> QTreeWidgetItem:
        label = f"{device.hostname or device.ip}  ·  {device.device_type}  ·  {evidence}"
        item = QTreeWidgetItem([label])
        item.setIcon(0, icon_for_type(device.device_type))
        item.setData(0, Qt.ItemDataRole.UserRole, device.ip)
        item.setToolTip(0, device.ip)
        return item

    def _inspect(self) -> None:
        selected = self.tree.selectedItems()
        if not selected:
            return
        ip = selected[0].data(0, Qt.ItemDataRole.UserRole)
        device = next((candidate for candidate in self.devices if candidate.ip == ip), None)
        if not device:
            return
        link = next((edge for edge in build_topology(self.devices, self.gateway) if edge.child == ip), None)
        fields = {
            "IP": device.ip, "MAC": device.mac, "Hostname": device.hostname,
            "Vendor (MAC OUI)": device.vendor, "ONVIF manufacturer": device.onvif_manufacturer,
            "Type": device.device_type,
            "Classification confidence": f"{device.confidence}%" if device.confidence else None,
            "ONVIF endpoint": device.onvif_endpoint, "Model": device.onvif_model,
            "Firmware": device.onvif_firmware, "Serial": device.serial_number,
            "Operating system": device.wmi_os_caption or device.nmap_os_guess,
            "Open ports": ", ".join(map(str, device.open_ports)) or None,
            "Discovery": ", ".join(device.sources), "First seen": device.first_seen,
            "mDNS services": ", ".join(device.mdns_services),
            "Last seen": device.last_seen,
            "Connection path": f"{link.parent} → {ip} (Inferred; {link.evidence})" if link else None,
        }
        self.inspector.setPlainText("\n\n".join(f"{key}\n{value or 'Unknown'}" for key, value in fields.items()))
