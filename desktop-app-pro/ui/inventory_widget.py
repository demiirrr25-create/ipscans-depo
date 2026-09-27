"""Device Inventory tab (spec items 15-16, 38-40): every device the engine
has ever seen, with user-editable custom name/notes, search, and sort.
"""
from __future__ import annotations

from PyQt6.QtCore import Qt
from PyQt6.QtWidgets import (
    QHBoxLayout,
    QHeaderView,
    QLineEdit,
    QPushButton,
    QTableWidget,
    QTableWidgetItem,
    QVBoxLayout,
    QWidget,
)

COLUMNS = [
    "IP", "MAC", "Name", "Vendor", "Status", "Latency", "Packet Loss", "Last Seen",
]


class InventoryWidget(QWidget):
    rename_requested = None  # set by owner to a callable(identity_key, name)

    def __init__(self, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        outer = QVBoxLayout(self)
        outer.setContentsMargins(4, 4, 4, 4)
        outer.setSpacing(10)

        top_row = QHBoxLayout()
        self.search_edit = QLineEdit()
        self.search_edit.setPlaceholderText("Search by IP, MAC, hostname, vendor or name...")
        self.search_edit.textChanged.connect(self._apply_filter)
        self.export_csv_btn = QPushButton("Export CSV", objectName="GhostButton")
        top_row.addWidget(self.search_edit, stretch=1)
        top_row.addWidget(self.export_csv_btn)
        outer.addLayout(top_row)

        self.table = QTableWidget(0, len(COLUMNS))
        self.table.setHorizontalHeaderLabels(COLUMNS)
        self.table.horizontalHeader().setStretchLastSection(True)
        self.table.horizontalHeader().setSectionResizeMode(
            0, QHeaderView.ResizeMode.ResizeToContents
        )
        self.table.verticalHeader().setVisible(False)
        self.table.setSortingEnabled(True)
        self.table.itemChanged.connect(self._on_item_changed)
        outer.addWidget(self.table)

        self._identity_keys: list[str] = []
        self._suspend_signals = False

    def _apply_filter(self, text: str) -> None:
        needle = text.strip().lower()
        for row in range(self.table.rowCount()):
            haystack = " ".join(
                self.table.item(row, col).text().lower()
                for col in range(self.table.columnCount())
                if self.table.item(row, col)
            )
            self.table.setRowHidden(row, bool(needle) and needle not in haystack)

    def refresh(self, devices) -> None:
        self._suspend_signals = True
        self.table.setSortingEnabled(False)
        self.table.setRowCount(0)
        self._identity_keys = []
        for device in devices:
            row = self.table.rowCount()
            self.table.insertRow(row)
            self._identity_keys.append(device["identity_key"])
            display_name = device["custom_name"] or device["hostname"] or "—"
            values = [
                device["ip"], device["mac"] or "—", display_name, device["vendor"] or "Unknown",
                device["status"], f"{device['last_latency_ms']:.0f} ms" if device["last_latency_ms"] else "—",
                f"{device['last_packet_loss_pct']:.0f}%" if device["last_packet_loss_pct"] is not None else "—",
                device["last_seen"],
            ]
            for col, value in enumerate(values):
                item = QTableWidgetItem(str(value))
                if col != 2:  # only the "Name" column is user-editable
                    item.setFlags(item.flags() & ~Qt.ItemFlag.ItemIsEditable)
                self.table.setItem(row, col, item)
        self.table.setSortingEnabled(True)
        self._suspend_signals = False

    def _on_item_changed(self, item: QTableWidgetItem) -> None:
        if self._suspend_signals or item.column() != 2:
            return
        row = item.row()
        if row < len(self._identity_keys) and self.rename_requested:
            self.rename_requested(self._identity_keys[row], item.text())
