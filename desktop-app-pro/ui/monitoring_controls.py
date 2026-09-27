"""Monitoring controls tab (spec items 8 and 20): interval + scan-mode
selection and start/stop, feeding the MonitorWorker owned by ProMainWindow.
"""
from __future__ import annotations

from PyQt6.QtCore import QTime
from PyQt6.QtWidgets import (
    QCheckBox,
    QComboBox,
    QFormLayout,
    QFrame,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QPushButton,
    QTimeEdit,
    QVBoxLayout,
    QWidget,
)

from pro import startup
from pro.pro_content import t

INTERVAL_SECONDS = [10, 30, 60, 300, None]


class MonitoringControlsWidget(QWidget):
    def __init__(self, lang: str = "en", show_buttons: bool = True, parent: QWidget | None = None) -> None:
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

        quiet_card = QFrame(objectName="OptionsCard")
        quiet_layout = QVBoxLayout(quiet_card)
        quiet_layout.setContentsMargins(18, 16, 18, 16)
        quiet_layout.setSpacing(8)
        quiet_layout.addWidget(QLabel(t(lang, "quiet_hours"), objectName="SectionLabel"))
        self.quiet_hours_checkbox = QCheckBox(t(lang, "quiet_hours_enable"))
        quiet_layout.addWidget(self.quiet_hours_checkbox)
        time_row = QHBoxLayout()
        time_row.addWidget(QLabel(t(lang, "quiet_hours_from")))
        self.quiet_from_edit = QTimeEdit(QTime(22, 0))
        time_row.addWidget(self.quiet_from_edit)
        time_row.addWidget(QLabel(t(lang, "quiet_hours_to")))
        self.quiet_to_edit = QTimeEdit(QTime(7, 0))
        time_row.addWidget(self.quiet_to_edit)
        time_row.addStretch(1)
        quiet_layout.addLayout(time_row)
        outer.addWidget(quiet_card)

        btn_row = QHBoxLayout()
        self.start_btn = QPushButton(f"▶  {t(lang, 'start_monitoring')}", objectName="PrimaryButton")
        self.stop_btn = QPushButton(f"■  {t(lang, 'stop_monitoring')}", objectName="GhostButton")
        self.stop_btn.setEnabled(False)
        btn_row.addWidget(self.start_btn)
        btn_row.addWidget(self.stop_btn)
        self.status_label = QLabel(t(lang, "monitoring_stopped"), objectName="StatusLabel")
        # Dashboard is the single place Start/Stop lives now (spec: fewer
        # tabs, monitoring starts from the panel) — Settings only shows
        # configuration. The buttons still exist and stay wired so existing
        # signal connections keep working either way.
        if show_buttons:
            outer.addLayout(btn_row)
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

    def is_quiet_hours_now(self) -> bool:
        if not self.quiet_hours_checkbox.isChecked():
            return False
        now = QTime.currentTime()
        start = self.quiet_from_edit.time()
        end = self.quiet_to_edit.time()
        if start <= end:
            return start <= now <= end
        return now >= start or now <= end  # window spans midnight, e.g. 22:00-07:00

    def set_running(self, running: bool) -> None:
        self.start_btn.setEnabled(not running)
        self.stop_btn.setEnabled(running)
        self.mode_combo.setEnabled(not running)
        self.interval_combo.setEnabled(not running)
        self.custom_interval_edit.setEnabled(not running and self.interval_combo.currentIndex() == len(INTERVAL_SECONDS) - 1)
        self.status_label.setText(t(self.lang, "monitoring_running") if running else t(self.lang, "monitoring_stopped"))
