"""Custom widgets: the device table model and the scan-target input group."""
from __future__ import annotations

from PyQt6.QtCore import Qt, QAbstractTableModel, QModelIndex, QSortFilterProxyModel
from PyQt6.QtWidgets import (
    QComboBox,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QWidget,
)

from app.core.models import Device

COLUMNS = ["IP", "MAC", "Üretici", "Hostname", "Açık Portlar", "Seri No", "Kaynak"]


class DeviceTableModel(QAbstractTableModel):
    def __init__(self) -> None:
        super().__init__()
        self._devices: list[Device] = []

    def add_device(self, device: Device) -> None:
        row = len(self._devices)
        self.beginInsertRows(QModelIndex(), row, row)
        self._devices.append(device)
        self.endInsertRows()

    def clear(self) -> None:
        self.beginResetModel()
        self._devices = []
        self.endResetModel()

    def device_at(self, row: int) -> Device | None:
        if 0 <= row < len(self._devices):
            return self._devices[row]
        return None

    # --- QAbstractTableModel overrides -------------------------------------
    def rowCount(self, parent: QModelIndex = QModelIndex()) -> int:  # noqa: N802
        return 0 if parent.isValid() else len(self._devices)

    def columnCount(self, parent: QModelIndex = QModelIndex()) -> int:  # noqa: N802
        return 0 if parent.isValid() else len(COLUMNS)

    def headerData(self, section, orientation, role=Qt.ItemDataRole.DisplayRole):  # noqa: N802
        if orientation == Qt.Orientation.Horizontal and role == Qt.ItemDataRole.DisplayRole:
            return COLUMNS[section]
        return None

    def data(self, index: QModelIndex, role: int = Qt.ItemDataRole.DisplayRole):
        if not index.isValid() or role != Qt.ItemDataRole.DisplayRole:
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
        return None


class DeviceFilterProxyModel(QSortFilterProxyModel):
    """Live text filter across IP / vendor / MAC (points 4's search bar)."""

    def __init__(self) -> None:
        super().__init__()
        self._needle = ""

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
        haystack = " ".join(
            filter(None, [device.ip, device.mac, device.vendor, device.hostname])
        ).lower()
        return self._needle in haystack


class TargetInput(QWidget):
    """Single IP / IP range / CIDR selector — returns a spec string that
    `network_utils.parse_targets` understands.
    """

    MODES = ("Tek IP", "IP Aralığı", "CIDR")

    def __init__(self, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        layout = QHBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(8)

        self.mode_box = QComboBox()
        self.mode_box.addItems(self.MODES)
        self.mode_box.currentIndexChanged.connect(self._update_placeholder)

        self.value_edit = QLineEdit()
        self._update_placeholder()

        layout.addWidget(self.mode_box)
        layout.addWidget(self.value_edit, stretch=1)

    def _update_placeholder(self) -> None:
        mode = self.mode_box.currentText()
        examples = {
            "Tek IP": "192.168.1.50",
            "IP Aralığı": "192.168.1.10-192.168.1.150",
            "CIDR": "192.168.1.0/24",
        }
        self.value_edit.setPlaceholderText(examples[mode])

    def spec(self) -> str:
        return self.value_edit.text().strip()


def section_label(text: str) -> QLabel:
    label = QLabel(text)
    label.setObjectName("SectionLabel")
    return label
