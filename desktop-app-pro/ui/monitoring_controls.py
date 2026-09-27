"""Monitoring controls tab (spec items 8 and 20): interval + scan-mode
selection and start/stop, feeding the MonitorWorker owned by ProMainWindow.
"""
from __future__ import annotations

from PyQt6.QtWidgets import (
    QComboBox,
    QFormLayout,
    QFrame,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QPushButton,
    QVBoxLayout,
    QWidget,
)

INTERVAL_OPTIONS = [
    ("10 seconds", 10),
    ("30 seconds", 30),
    ("60 seconds", 60),
    ("5 minutes", 300),
    ("Custom...", None),
]

SCAN_MODES = ["Quick Scan", "Full Scan", "Health Scan", "Conflict Scan", "Continuous Monitoring"]


class MonitoringControlsWidget(QWidget):
    def __init__(self, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        outer = QVBoxLayout(self)
        outer.setContentsMargins(4, 4, 4, 4)
        outer.setSpacing(14)

        card = QFrame(objectName="OptionsCard")
        form = QFormLayout(card)
        form.setContentsMargins(18, 16, 18, 16)
        form.setSpacing(10)

        self.mode_combo = QComboBox()
        self.mode_combo.addItems(SCAN_MODES)
        form.addRow(QLabel("Scan Mode"), self.mode_combo)

        self.interval_combo = QComboBox()
        self.interval_combo.addItems([label for label, _ in INTERVAL_OPTIONS])
        self.interval_combo.currentIndexChanged.connect(self._on_interval_changed)
        form.addRow(QLabel("Monitoring Interval"), self.interval_combo)

        self.custom_interval_edit = QLineEdit()
        self.custom_interval_edit.setPlaceholderText("Custom interval in seconds")
        self.custom_interval_edit.setEnabled(False)
        form.addRow(QLabel("Custom (sec)"), self.custom_interval_edit)

        outer.addWidget(card)

        btn_row = QHBoxLayout()
        self.start_btn = QPushButton("▶  Start Monitoring", objectName="PrimaryButton")
        self.stop_btn = QPushButton("■  Stop", objectName="GhostButton")
        self.stop_btn.setEnabled(False)
        btn_row.addWidget(self.start_btn)
        btn_row.addWidget(self.stop_btn)
        outer.addLayout(btn_row)

        self.status_label = QLabel("Monitoring stopped.", objectName="StatusLabel")
        outer.addWidget(self.status_label)
        outer.addStretch(1)

    def _on_interval_changed(self, index: int) -> None:
        _, seconds = INTERVAL_OPTIONS[index]
        self.custom_interval_edit.setEnabled(seconds is None)

    def interval_seconds(self) -> int:
        index = self.interval_combo.currentIndex()
        _, seconds = INTERVAL_OPTIONS[index]
        if seconds is not None:
            return seconds
        try:
            return max(5, int(self.custom_interval_edit.text().strip()))
        except ValueError:
            return 60

    def set_running(self, running: bool) -> None:
        self.start_btn.setEnabled(not running)
        self.stop_btn.setEnabled(running)
        self.mode_combo.setEnabled(not running)
        self.interval_combo.setEnabled(not running)
        self.custom_interval_edit.setEnabled(not running and self.interval_combo.currentIndex() == len(INTERVAL_OPTIONS) - 1)
        self.status_label.setText("Monitoring running..." if running else "Monitoring stopped.")
