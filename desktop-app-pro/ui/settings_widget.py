"""Settings tab: every configuration surface in one place, under labeled
sections — Monitoring, License, Sites — instead of separate top-level tabs.
Monitoring/starting is done from the Dashboard; this tab is configuration
only (per product feedback: fewer top-level tabs, Dashboard drives start/
stop, Settings holds everything else).
"""
from __future__ import annotations

from PyQt6.QtWidgets import QLabel, QScrollArea, QVBoxLayout, QWidget

from pro.license import LicenseProvider
from pro.pro_content import t

from ui.license_panel import LicensePanel
from ui.monitoring_controls import MonitoringControlsWidget
from ui.my_sites_widget import MySitesWidget


def _section(title: str, content: QWidget) -> QWidget:
    wrap = QWidget()
    layout = QVBoxLayout(wrap)
    layout.setContentsMargins(0, 0, 0, 0)
    layout.setSpacing(8)
    heading = QLabel(title, objectName="SectionLabel")
    layout.addWidget(heading)
    layout.addWidget(content)
    return wrap


class SettingsWidget(QWidget):
    def __init__(self, license_provider: LicenseProvider, lang: str = "en", parent: QWidget | None = None) -> None:
        super().__init__(parent)

        outer = QVBoxLayout(self)
        outer.setContentsMargins(0, 0, 0, 0)

        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setFrameShape(QScrollArea.Shape.NoFrame)
        outer.addWidget(scroll)

        inner = QWidget()
        inner_layout = QVBoxLayout(inner)
        inner_layout.setContentsMargins(4, 4, 4, 4)
        inner_layout.setSpacing(22)

        self.monitoring = MonitoringControlsWidget(lang, show_buttons=False)
        inner_layout.addWidget(_section(t(lang, "settings_monitoring"), self.monitoring))

        self.license = LicensePanel(license_provider, lang)
        inner_layout.addWidget(_section(t(lang, "settings_license"), self.license))

        self.my_sites = MySitesWidget(license_provider, lang)
        inner_layout.addWidget(_section(t(lang, "settings_sites"), self.my_sites))

        inner_layout.addStretch(1)
        scroll.setWidget(inner)
