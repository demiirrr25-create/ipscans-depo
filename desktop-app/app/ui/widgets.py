"""Custom widgets: the device table model and the scan-target input group."""
from __future__ import annotations

import ipaddress

from PyQt6.QtCore import Qt, QAbstractTableModel, QModelIndex, QSortFilterProxyModel, QTimer
from PyQt6.QtWidgets import (
    QApplication,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QVBoxLayout,
    QStyle,
    QWidget,
)

from app.core.models import Device
from app.i18n import t
from app.ui.device_icons import icon_for_type

COLUMN_KEYS = [
    "col_ip",
    "col_mac",
    "col_vendor",
    "col_hostname",
    "col_ports",
    "col_serial",
    "col_source",
    "col_device_type",
    "col_status",
    "col_parent",
    "col_latency",
    "col_confidence",
    "col_device",
]


def matches_device(device: Device, needle: str) -> bool:
    return needle in " ".join(filter(None, (
        device.ip, device.mac, device.vendor, device.hostname, device.device_type,
        device.onvif_model, device.onvif_manufacturer, device.upnp_friendly_name,
    ))).lower()


class DeviceTableModel(QAbstractTableModel):
    def __init__(self, lang: str = "en") -> None:
        super().__init__()
        self._devices: list[Device] = []
        self._rows_by_ip: dict[str, int] = {}
        self._ip_sort_keys: dict[str, str] = {}
        self._columns = [t(lang, key) for key in COLUMN_KEYS]

    def add_device(self, device: Device) -> None:
        existing = self._rows_by_ip.get(device.ip)
        if existing is not None:
            self._devices[existing] = device
            self.dataChanged.emit(self.index(existing, 0), self.index(existing, len(self._columns) - 1))
            return
        row = len(self._devices)
        self.beginInsertRows(QModelIndex(), row, row)
        self._devices.append(device)
        self._rows_by_ip[device.ip] = row
        address = ipaddress.ip_address(device.ip)
        self._ip_sort_keys[device.ip] = f"{address.version}:{int(address):032x}"
        self.endInsertRows()

    def clear(self) -> None:
        self.beginResetModel()
        self._devices = []
        self._rows_by_ip.clear()
        self._ip_sort_keys.clear()
        self.endResetModel()

    def add_devices(self, devices: list[Device]) -> None:
        new_devices = []
        updated = []
        for device in {device.ip: device for device in devices}.values():
            row = self._rows_by_ip.get(device.ip)
            if row is not None:
                self._devices[row] = device
                updated.append(row)
            else:
                self._rows_by_ip[device.ip] = len(self._devices) + len(new_devices)
                address = ipaddress.ip_address(device.ip)
                self._ip_sort_keys[device.ip] = f"{address.version}:{int(address):032x}"
                new_devices.append(device)
        if new_devices:
            first = len(self._devices)
            self.beginInsertRows(QModelIndex(), first, first + len(new_devices) - 1)
            self._devices.extend(new_devices)
            self.endInsertRows()
        if updated:
            self.dataChanged.emit(self.index(min(updated), 0), self.index(max(updated), len(self._columns) - 1))

    def device_at(self, row: int) -> Device | None:
        if 0 <= row < len(self._devices):
            return self._devices[row]
        return None

    def sort(self, column: int, order=Qt.SortOrder.AscendingOrder) -> None:
        if not 0 <= column < len(COLUMN_KEYS):
            return
        def sort_key(device: Device):
            values = (
                self._ip_sort_keys[device.ip], device.mac or "", device.vendor or "",
                device.hostname or "", ", ".join(map(str, device.open_ports)), device.serial_number or "",
                ", ".join(device.sources), device.device_type, device.reachability, device.parent_ip or "",
                device.latency_ms if device.latency_ms is not None else float("inf"),
                {"Low": 0, "Medium": 1, "High": 2}[device.classification_confidence],
                device.upnp_friendly_name or device.onvif_model or device.hostname or "",
            )
            return values[column]
        ordered = sorted(self._devices, key=sort_key, reverse=order == Qt.SortOrder.DescendingOrder)
        if all(a is b for a, b in zip(ordered, self._devices)):
            return
        self.beginResetModel()
        self._devices = ordered
        self._rows_by_ip = {device.ip: row for row, device in enumerate(ordered)}
        self.endResetModel()

    # --- QAbstractTableModel overrides -------------------------------------
    def rowCount(self, parent: QModelIndex = QModelIndex()) -> int:  # noqa: N802
        return 0 if parent.isValid() else len(self._devices)

    def columnCount(self, parent: QModelIndex = QModelIndex()) -> int:  # noqa: N802
        return 0 if parent.isValid() else len(self._columns)

    def headerData(self, section, orientation, role=Qt.ItemDataRole.DisplayRole):  # noqa: N802
        if orientation == Qt.Orientation.Horizontal and role == Qt.ItemDataRole.DisplayRole:
            return self._columns[section]
        return None

    def data(self, index: QModelIndex, role: int = Qt.ItemDataRole.DisplayRole):
        if not index.isValid():
            return None
        if role == Qt.ItemDataRole.UserRole:
            device = self._devices[index.row()]
            if index.column() == 0:
                return self._ip_sort_keys[device.ip]
            if index.column() == 10:
                return device.latency_ms if device.latency_ms is not None else float("inf")
            if index.column() == 11:
                return {"Low": 0, "Medium": 1, "High": 2}[device.classification_confidence]
            return self.data(index, Qt.ItemDataRole.DisplayRole)
        if role == Qt.ItemDataRole.DecorationRole and index.column() == 7:
            return icon_for_type(self._devices[index.row()].device_type)
        if role == Qt.ItemDataRole.DecorationRole and index.column() == 8:
            symbol = (QStyle.StandardPixmap.SP_DialogApplyButton
                      if self._devices[index.row()].reachability == "Online"
                      else QStyle.StandardPixmap.SP_MessageBoxWarning)
            return QApplication.style().standardIcon(symbol)
        if role != Qt.ItemDataRole.DisplayRole:
            return None
        device = self._devices[index.row()]
        column = index.column()
        if column == 0:
            return device.ip
        if column == 1:
            return device.mac or "—"
        if column == 2:
            return device.vendor or "—"
        if column == 3:
            return device.hostname or "—"
        if column == 4:
            return ", ".join(str(p) for p in device.open_ports) or "—"
        if column == 5:
            return device.serial_number or "—"
        if column == 6:
            return ", ".join(device.sources) or "—"
        if column == 7:
            return device.device_type
        if column == 8:
            return device.reachability
        if column == 9:
            return device.parent_ip or "—"
        if column == 10:
            return f"{device.latency_ms:.1f} ms (TCP)" if device.latency_ms is not None else "—"
        if column == 11:
            return device.classification_confidence
        if column == 12:
            return device.upnp_friendly_name or device.onvif_model or device.hostname or "—"
        return None


class DeviceFilterProxyModel(QSortFilterProxyModel):
    """Live text filter across IP / vendor / MAC (points 4's search bar)."""

    def __init__(self) -> None:
        super().__init__()
        self._needle = ""
        self.setSortRole(Qt.ItemDataRole.UserRole)
        self._dynamic_sort = True
        self._sort_column = 0
        self._sort_order = Qt.SortOrder.AscendingOrder
        self._sort_timer = QTimer(self)
        self._sort_timer.setSingleShot(True)
        self._sort_timer.timeout.connect(self._sort_source)
        super().setDynamicSortFilter(False)

    def setSourceModel(self, model) -> None:
        super().setSourceModel(model)
        if model:
            model.rowsInserted.connect(self._schedule_sort)
            model.dataChanged.connect(self._schedule_sort)

    def setDynamicSortFilter(self, enabled: bool) -> None:
        self._dynamic_sort = enabled
        if enabled:
            self._schedule_sort()

    def _schedule_sort(self, *_args) -> None:
        if self._dynamic_sort:
            self._sort_timer.start(0)

    def _sort_source(self) -> None:
        model = self.sourceModel()
        if isinstance(model, DeviceTableModel):
            model.sort(self._sort_column, self._sort_order)

    def sort(self, column: int, order=Qt.SortOrder.AscendingOrder) -> None:
        self._sort_column, self._sort_order = column, order
        # Sorting once in Python avoids tens of thousands of Qt/Python
        # comparator crossings while keeping proxy filtering and virtualization.
        self._sort_source()

    def set_filter_text(self, text: str) -> None:
        self._needle = text.strip().lower()
        self.invalidateRowsFilter()

    def filterAcceptsRow(self, source_row: int, source_parent: QModelIndex) -> bool:  # noqa: N802
        if not self._needle:
            return True
        model: DeviceTableModel = self.sourceModel()  # type: ignore[assignment]
        device = model.device_at(source_row)
        if device is None:
            return False
        return matches_device(device, self._needle)

class TargetInput(QWidget):
    """A simple start/end range; pasted single IPs and CIDRs remain supported."""
    def __init__(self, lang: str = "en", parent: QWidget | None = None) -> None:
        super().__init__(parent)
        outer = QHBoxLayout(self)
        outer.setContentsMargins(0, 0, 0, 0)
        outer.setSpacing(10)

        self.start_edit = QLineEdit()
        self.end_edit = QLineEdit()
        self.start_edit.setPlaceholderText(t(lang, "range_start"))
        self.end_edit.setPlaceholderText(t(lang, "range_end"))
        self.start_edit.setAccessibleName(t(lang, "range_start"))
        self.end_edit.setAccessibleName(t(lang, "range_end"))
        outer.addWidget(self.start_edit)
        outer.addWidget(QLabel("→"))
        outer.addWidget(self.end_edit)

    def set_value(self, text: str) -> None:
        if "/" in text:
            try:
                network = ipaddress.ip_network(text, strict=False)
                if network.version == 4:
                    first = next(network.hosts())
                    last = network.broadcast_address if network.prefixlen >= 31 else network.broadcast_address - 1
                    text = f"{first}-{last}"
            except ValueError:
                pass
        start, separator, end = text.partition("-")
        self.start_edit.setText(start)
        self.end_edit.setText(end if separator else "")

    def spec(self) -> str:
        start, end = self.start_edit.text().strip(), self.end_edit.text().strip()
        return f"{start}-{end}" if end else start


def section_label(text: str) -> QLabel:
    label = QLabel(text)
    label.setObjectName("SectionLabel")
    return label
