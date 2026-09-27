"""Device Inventory tab (spec items 15-16, 38-40): every device the engine
has ever seen, with user-editable custom name/notes/tags, a critical flag,
search, sort, group filter, and drill-down history (innovative ideas 4-5, 7).
"""
from __future__ import annotations

from PyQt6.QtCore import Qt
from PyQt6.QtWidgets import (
    QComboBox,
    QHBoxLayout,
    QHeaderView,
    QLineEdit,
    QPushButton,
    QTableWidget,
    QTableWidgetItem,
    QVBoxLayout,
    QWidget,
)

from pro.pro_content import t
from pro.timeutil import to_local_display

# Column indices — named so the rest of the class (and callers) don't have
# to track raw integers.
(
    COL_IP, COL_MAC, COL_NAME, COL_TAGS, COL_VENDOR, COL_MODEL, COL_SERIAL,
    COL_STATUS, COL_CRITICAL, COL_LATENCY, COL_LOSS, COL_LAST_SEEN,
) = range(12)


class _IPSortItem(QTableWidgetItem):
    """Sorts the IP column numerically (octet by octet) instead of as a
    plain string — a plain string sort puts "192.168.1.10" before
    "192.168.1.2", which is wrong and was reported as a bug.
    """

    def __lt__(self, other: object) -> bool:
        try:
            a = tuple(int(p) for p in self.text().split("."))
            b = tuple(int(p) for p in other.text().split("."))  # type: ignore[attr-defined]
            return a < b
        except (ValueError, AttributeError):
            return super().__lt__(other)


class InventoryWidget(QWidget):
    rename_requested = None  # callable(identity_key, name)
    tags_requested = None  # callable(identity_key, tags_csv)
    critical_toggled = None  # callable(identity_key, bool)
    history_requested = None  # callable(identity_key, display_label)

    def __init__(self, lang: str = "en", parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self.lang = lang
        outer = QVBoxLayout(self)
        outer.setContentsMargins(4, 4, 4, 4)
        outer.setSpacing(10)

        top_row = QHBoxLayout()
        self.search_edit = QLineEdit()
        self.search_edit.setPlaceholderText(t(lang, "search_placeholder_inventory"))
        self.search_edit.textChanged.connect(self._apply_filter)
        self.group_combo = QComboBox()
        self.group_combo.addItem(t(lang, "group_filter_all"))
        self.group_combo.currentIndexChanged.connect(self._apply_filter_from_combo)
        self.export_csv_btn = QPushButton(t(lang, "export_csv"), objectName="GhostButton")
        top_row.addWidget(self.search_edit, stretch=1)
        top_row.addWidget(self.group_combo)
        top_row.addWidget(self.export_csv_btn)
        outer.addLayout(top_row)

        columns = [""] * 12
        columns[COL_IP] = t(lang, "col_ip")
        columns[COL_MAC] = t(lang, "col_mac")
        columns[COL_NAME] = t(lang, "col_name")
        columns[COL_TAGS] = t(lang, "col_tags")
        columns[COL_VENDOR] = t(lang, "col_vendor")
        columns[COL_MODEL] = t(lang, "col_model")
        columns[COL_SERIAL] = t(lang, "col_serial")
        columns[COL_STATUS] = t(lang, "col_status")
        columns[COL_CRITICAL] = t(lang, "col_critical")
        columns[COL_LATENCY] = t(lang, "col_latency")
        columns[COL_LOSS] = t(lang, "col_packet_loss")
        columns[COL_LAST_SEEN] = t(lang, "col_last_seen")

        self.table = QTableWidget(0, len(columns))
        self.table.setHorizontalHeaderLabels(columns)
        self.table.horizontalHeader().setStretchLastSection(True)
        self.table.horizontalHeader().setSectionResizeMode(
            COL_IP, QHeaderView.ResizeMode.ResizeToContents
        )
        # Vendor/Model are exactly what a user opens this tab to check
        # (spec ask: "I want to fully see the manufacturer/model") — never
        # let the default equal-width column layout truncate them.
        self.table.horizontalHeader().setSectionResizeMode(
            COL_VENDOR, QHeaderView.ResizeMode.ResizeToContents
        )
        self.table.horizontalHeader().setSectionResizeMode(
            COL_MODEL, QHeaderView.ResizeMode.ResizeToContents
        )
        self.table.horizontalHeader().setSectionResizeMode(
            COL_SERIAL, QHeaderView.ResizeMode.ResizeToContents
        )
        self.table.verticalHeader().setVisible(False)
        self.table.setSortingEnabled(True)
        self.table.itemChanged.connect(self._on_item_changed)
        self.table.itemDoubleClicked.connect(self._on_item_double_clicked)
        outer.addWidget(self.table)

        self._identity_keys: list[str] = []
        self._suspend_signals = False

    def _apply_filter_from_combo(self) -> None:
        self._apply_filter(self.search_edit.text())

    def _apply_filter(self, text: str) -> None:
        needle = text.strip().lower()
        group = self.group_combo.currentText()
        show_all_groups = group == t(self.lang, "group_filter_all")
        for row in range(self.table.rowCount()):
            haystack = " ".join(
                self.table.item(row, col).text().lower()
                for col in range(self.table.columnCount())
                if self.table.item(row, col)
            )
            matches_text = not needle or needle in haystack
            tags_item = self.table.item(row, COL_TAGS)
            tags = [tg.strip().lower() for tg in (tags_item.text() if tags_item else "").split(",") if tg.strip()]
            matches_group = show_all_groups or group.lower() in tags
            self.table.setRowHidden(row, not (matches_text and matches_group))

    def set_groups(self, tags: list[str]) -> None:
        current = self.group_combo.currentText()
        self.group_combo.blockSignals(True)
        self.group_combo.clear()
        self.group_combo.addItem(t(self.lang, "group_filter_all"))
        self.group_combo.addItems(tags)
        index = self.group_combo.findText(current)
        self.group_combo.setCurrentIndex(index if index >= 0 else 0)
        self.group_combo.blockSignals(False)

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
            status_display = t(self.lang, "status_online") if device["status"] == "online" else t(self.lang, "status_offline")
            values = {
                COL_MAC: device["mac"] or "—",
                COL_NAME: display_name,
                COL_TAGS: device["tags"] or "",
                COL_VENDOR: device["vendor"] or "Unknown",
                COL_MODEL: device["model_info"] or "—",
                COL_SERIAL: device["serial_number"] or "—",
                COL_STATUS: status_display,
                COL_LATENCY: f"{device['last_latency_ms']:.0f} ms" if device["last_latency_ms"] else "—",
                COL_LOSS: f"{device['last_packet_loss_pct']:.0f}%" if device["last_packet_loss_pct"] is not None else "—",
                COL_LAST_SEEN: to_local_display(device["last_seen"]),
            }
            ip_item = _IPSortItem(device["ip"])
            ip_item.setFlags(ip_item.flags() & ~Qt.ItemFlag.ItemIsEditable)
            self.table.setItem(row, COL_IP, ip_item)
            for col, value in values.items():
                item = QTableWidgetItem(str(value))
                if col not in (COL_NAME, COL_TAGS):
                    item.setFlags(item.flags() & ~Qt.ItemFlag.ItemIsEditable)
                self.table.setItem(row, col, item)

            critical_item = QTableWidgetItem()
            critical_item.setFlags(
                (critical_item.flags() | Qt.ItemFlag.ItemIsUserCheckable) & ~Qt.ItemFlag.ItemIsEditable
            )
            critical_item.setCheckState(Qt.CheckState.Checked if device["is_critical"] else Qt.CheckState.Unchecked)
            self.table.setItem(row, COL_CRITICAL, critical_item)
        self.table.setSortingEnabled(True)
        self._suspend_signals = False

    def _on_item_changed(self, item: QTableWidgetItem) -> None:
        if self._suspend_signals:
            return
        row = item.row()
        if row >= len(self._identity_keys):
            return
        key = self._identity_keys[row]
        if item.column() == COL_NAME and self.rename_requested:
            self.rename_requested(key, item.text())
        elif item.column() == COL_TAGS and self.tags_requested:
            self.tags_requested(key, item.text())
        elif item.column() == COL_CRITICAL and self.critical_toggled:
            self.critical_toggled(key, item.checkState() == Qt.CheckState.Checked)

    def _on_item_double_clicked(self, item: QTableWidgetItem) -> None:
        row = item.row()
        if row >= len(self._identity_keys) or not self.history_requested:
            return
        name_item = self.table.item(row, COL_NAME)
        ip_item = self.table.item(row, COL_IP)
        label = name_item.text() if name_item else ""
        if ip_item:
            label = f"{label} ({ip_item.text()})" if label and label != "—" else ip_item.text()
        self.history_requested(self._identity_keys[row], label)
