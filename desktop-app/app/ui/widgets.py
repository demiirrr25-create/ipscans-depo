"""Custom widgets: the device table model and the scan-target input group."""
from __future__ import annotations

import ipaddress

from PyQt6.QtCore import Qt, QAbstractTableModel, QModelIndex, QSortFilterProxyModel
from PyQt6.QtWidgets import (
    QButtonGroup,
    QFrame,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QPushButton,
    QVBoxLayout,
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
]


class DeviceTableModel(QAbstractTableModel):
    def __init__(self, lang: str = "en") -> None:
        super().__init__()
        self._devices: list[Device] = []
        self._columns = [t(lang, key) for key in COLUMN_KEYS]

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
        return 0 if parent.isValid() else len(self._columns)

    def headerData(self, section, orientation, role=Qt.ItemDataRole.DisplayRole):  # noqa: N802
        if orientation == Qt.Orientation.Horizontal and role == Qt.ItemDataRole.DisplayRole:
            return self._columns[section]
        return None

    def data(self, index: QModelIndex, role: int = Qt.ItemDataRole.DisplayRole):
        if not index.isValid():
            return None
        if role == Qt.ItemDataRole.DecorationRole and index.column() == 7:
            return icon_for_type(self._devices[index.row()].device_type)
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
            return f"{device.device_type} ({device.confidence}%)" if device.confidence else device.device_type
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
            filter(None, [device.ip, device.mac, device.vendor, device.hostname,
                          device.device_type, device.onvif_model])
        ).lower()
        return self._needle in haystack

    def lessThan(self, left: QModelIndex, right: QModelIndex) -> bool:  # noqa: N802
        # The IP column needs a numeric comparison — plain string sort would
        # put "192.168.1.10" before "192.168.1.2", which users clicking the
        # column header to sort low-to-high would immediately notice as wrong.
        if left.column() == 0:
            model: DeviceTableModel = self.sourceModel()  # type: ignore[assignment]
            left_device = model.device_at(left.row())
            right_device = model.device_at(right.row())
            if left_device is not None and right_device is not None:
                try:
                    return int(ipaddress.ip_address(left_device.ip)) < int(
                        ipaddress.ip_address(right_device.ip)
                    )
                except ValueError:
                    pass
        return super().lessThan(left, right)


class TargetInput(QWidget):
    """Single IP / IP range / CIDR selector — returns a spec string that
    `network_utils.parse_targets` understands. Presented as a modern segmented
    control (pill-shaped, single-row) so the active mode is always visible at
    a glance without the visual weight of classic radio buttons.
    Defaults to "IP Range" mode, per product requirement.
    """

    MODE_KEYS = ("mode_range", "mode_single", "mode_cidr")
    PLACEHOLDERS = {
        "mode_single": "192.168.1.50",
        "mode_range": "192.168.1.10-192.168.1.150",
        "mode_cidr": "192.168.1.0/24",
    }

    def __init__(self, lang: str = "en", parent: QWidget | None = None) -> None:
        super().__init__(parent)
        outer = QVBoxLayout(self)
        outer.setContentsMargins(0, 0, 0, 0)
        outer.setSpacing(10)

        self.value_edit = QLineEdit()

        segment_bar = QFrame(objectName="SegmentBar")
        segment_layout = QHBoxLayout(segment_bar)
        segment_layout.setContentsMargins(4, 4, 4, 4)
        segment_layout.setSpacing(4)

        self.mode_group = QButtonGroup(self)
        self.mode_group.setExclusive(True)
        self._buttons: dict[str, QPushButton] = {}
        for key in self.MODE_KEYS:
            btn = QPushButton(t(lang, key), objectName="SegmentButton")
            btn.setCheckable(True)
            self.mode_group.addButton(btn)
            self._buttons[key] = btn
            segment_layout.addWidget(btn, stretch=1)
        self._buttons["mode_range"].setChecked(True)
        self.mode_group.buttonToggled.connect(self._on_mode_toggled)

        self._update_placeholder()

        outer.addWidget(segment_bar)
        outer.addWidget(self.value_edit)

    def _on_mode_toggled(self, button: QPushButton, checked: bool) -> None:
        if checked:
            self._update_placeholder()

    def _update_placeholder(self) -> None:
        self.value_edit.setPlaceholderText(self.PLACEHOLDERS[self.current_mode_key()])

    def current_mode_key(self) -> str:
        for key, btn in self._buttons.items():
            if btn.isChecked():
                return key
        return "mode_range"

    def set_value(self, text: str) -> None:
        self.value_edit.setText(text)

    def spec(self) -> str:
        return self.value_edit.text().strip()


def section_label(text: str) -> QLabel:
    label = QLabel(text)
    label.setObjectName("SectionLabel")
    return label
