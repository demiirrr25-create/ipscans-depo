"""Monitoring controls tab (spec items 8 and 20): interval + scan-mode
selection and start/stop, feeding the MonitorWorker owned by ProMainWindow.
"""
from __future__ import annotations

from PyQt6.QtWidgets import (
    QCheckBox,
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

from pro import startup
from pro.pro_content import t

INTERVAL_SECONDS = [10, 30, 60, 300, None]


class MonitoringControlsWidget(QWidget):
    def __init__(self, lang: str = "en", parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self.lang = lang
        outer = QVBoxLayout(self)
        outer.setContentsMargins(4, 4, 4, 4)
        outer.setSpacing(14)

        card = QFrame(objectName="OptionsCard")
        form = QFormLayout(card)
        form.setContentsMargins(18, 16, 18, 16)
        form.setSpacing(10)

        self.mode_combo = QComboBox()
        self.mode_combo.addItems([
            t(lang, "mode_quick"), t(lang, "mode_full"), t(lang, "mode_health"),
            t(lang, "mode_conflict"), t(lang, "mode_continuous"),
        ])
        form.addRow(QLabel(t(lang, "scan_mode")), self.mode_combo)

        self.site_name_edit = QLineEdit()
        self.site_name_edit.setPlaceholderText(t(lang, "site_name_placeholder"))
        form.addRow(QLabel(t(lang, "site_name")), self.site_name_edit)

        self.interval_combo = QComboBox()
        self.interval_combo.addItems([
            t(lang, "interval_10s"), t(lang, "interval_30s"), t(lang, "interval_60s"),
            t(lang, "interval_5m"), t(lang, "interval_custom"),
        ])
        self.interval_combo.currentIndexChanged.connect(self._on_interval_changed)
        form.addRow(QLabel(t(lang, "monitoring_interval")), self.interval_combo)

        self.custom_interval_edit = QLineEdit()
        self.custom_interval_edit.setPlaceholderText(t(lang, "custom_interval_placeholder"))
        self.custom_interval_edit.setEnabled(False)
        form.addRow(QLabel(t(lang, "custom_interval")), self.custom_interval_edit)

        outer.addWidget(card)

        self.startup_checkbox = QCheckBox(t(lang, "run_at_startup"))
        self.startup_checkbox.setChecked(startup.is_enabled())
        self.startup_checkbox.toggled.connect(startup.set_enabled)
        outer.addWidget(self.startup_checkbox)

        btn_row = QHBoxLayout()
        self.start_btn = QPushButton(f"▶  {t(lang, 'start_monitoring')}", objectName="PrimaryButton")
        self.stop_btn = QPushButton(f"■  {t(lang, 'stop_monitoring')}", objectName="GhostButton")
        self.stop_btn.setEnabled(False)
        btn_row.addWidget(self.start_btn)
        btn_row.addWidget(self.stop_btn)
        outer.addLayout(btn_row)

        self.status_label = QLabel(t(lang, "monitoring_stopped"), objectName="StatusLabel")
        outer.addWidget(self.status_label)
        outer.addStretch(1)

    def _on_interval_changed(self, index: int) -> None:
        self.custom_interval_edit.setEnabled(INTERVAL_SECONDS[index] is None)

    def interval_seconds(self) -> int:
        index = self.interval_combo.currentIndex()
        seconds = INTERVAL_SECONDS[index]
        if seconds is not None:
            return seconds
        try:
            return max(5, int(self.custom_interval_edit.text().strip()))
        except ValueError:
            return 60

    def site_name(self) -> str:
        return self.site_name_edit.text().strip() or "Default Site"

    def set_running(self, running: bool) -> None:
        self.start_btn.setEnabled(not running)
        self.stop_btn.setEnabled(running)
        self.mode_combo.setEnabled(not running)
        self.interval_combo.setEnabled(not running)
        self.custom_interval_edit.setEnabled(not running and self.interval_combo.currentIndex() == len(INTERVAL_SECONDS) - 1)
        self.status_label.setText(t(self.lang, "monitoring_running") if running else t(self.lang, "monitoring_stopped"))
