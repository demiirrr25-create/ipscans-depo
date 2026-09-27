"""ProMainWindow: wraps the free app's exact MainWindow as the first tab
(untouched, unmodified — product rule #1), and adds the new Network Health
Pro screens as additional tabs sharing the same dark theme.
"""
from __future__ import annotations

from PyQt6.QtWidgets import QFrame, QHBoxLayout, QLabel, QMessageBox, QTabWidget, QVBoxLayout, QWidget

from app.i18n import DEFAULT_LANGUAGE
from app.ui.main_window import MainWindow

from pro.conflict_engine import identity_key_for
from pro.database import Database
from pro.export import export_devices_csv
from pro.license import RemoteLicenseProvider
from pro.models import HealthBreakdown
from pro.monitor import MonitorWorker, detect_default_targets

from ui.conflict_dialog import show_conflict_alert, show_new_device_alert
from ui.dashboard_widget import DashboardWidget
from ui.event_log_widget import EventLogWidget
from ui.inventory_widget import InventoryWidget
from ui.license_panel import LicensePanel
from ui.monitoring_controls import MonitoringControlsWidget
from ui.notifications_bridge import notify_for_event
from ui.pro_resources import load_pro_logo_pixmap


class ProMainWindow(QWidget):
    def __init__(self, lang: str = DEFAULT_LANGUAGE) -> None:
        super().__init__()
        self.lang = lang
        self.db = Database()
        self.license_provider = RemoteLicenseProvider(self.db)
        self._monitor: MonitorWorker | None = None

        self.setObjectName("AppRoot")
        self.setWindowTitle("ipscans Network Health Pro")
        self.resize(1280, 820)
        self.setMinimumSize(1000, 680)

        outer = QVBoxLayout(self)
        outer.setContentsMargins(20, 20, 20, 20)
        outer.setSpacing(14)

        outer.addWidget(self._build_header())

        self.tabs = QTabWidget()
        outer.addWidget(self.tabs)

        # Tab 1: the exact free-app scanner screen, unmodified.
        self.scanner_tab = MainWindow(lang)
        self.tabs.addTab(self.scanner_tab, "Scanner")

        self.dashboard_tab = DashboardWidget()
        self.tabs.addTab(self.dashboard_tab, "Dashboard")

        self.monitoring_tab = MonitoringControlsWidget()
        self.tabs.addTab(self.monitoring_tab, "Monitoring")

        self.event_log_tab = EventLogWidget()
        self.tabs.addTab(self.event_log_tab, "Event Log")

        self.inventory_tab = InventoryWidget()
        self.inventory_tab.rename_requested = self._on_rename_requested
        self.inventory_tab.export_csv_btn.clicked.connect(self._on_export_csv)
        self.tabs.addTab(self.inventory_tab, "Inventory")

        self.license_tab = LicensePanel(self.license_provider)
        self.tabs.addTab(self.license_tab, "License")

        self.monitoring_tab.start_btn.clicked.connect(self._start_monitoring)
        self.monitoring_tab.stop_btn.clicked.connect(self._stop_monitoring)
        self.dashboard_tab.start_monitoring_btn.clicked.connect(self._start_monitoring)
        self.dashboard_tab.stop_monitoring_btn.clicked.connect(self._stop_monitoring)

        self._refresh_inventory()

    # -------------------------------------------------------------- header
    def _build_header(self) -> QWidget:
        bar = QFrame(objectName="TitleBar")
        bar.setFixedHeight(60)
        layout = QHBoxLayout(bar)
        layout.setContentsMargins(20, 0, 20, 0)
        layout.setSpacing(12)

        logo = QLabel()
        logo.setPixmap(load_pro_logo_pixmap(32))
        logo.setFixedSize(32, 32)
        layout.addWidget(logo)

        titles = QVBoxLayout()
        titles.setSpacing(0)
        title = QLabel("ipscans", objectName="TitleText")
        subtitle = QLabel("Network Health Pro", objectName="SubtitleText")
        titles.addWidget(title)
        titles.addWidget(subtitle)
        layout.addLayout(titles)
        layout.addStretch(1)
        return bar

    # ------------------------------------------------------------- actions
    def _start_monitoring(self) -> None:
        if self._monitor is not None:
            return
        if not self.license_provider.get_status().has_feature("continuous_monitoring"):
            QMessageBox.information(
                self,
                "PRO feature",
                "Continuous Monitoring requires an active PRO license.\n\n"
                "Activate a license in the License tab to enable it.",
            )
            self.tabs.setCurrentWidget(self.license_tab)
            return
        targets = detect_default_targets()
        interval = self.monitoring_tab.interval_seconds()
        self._monitor = MonitorWorker(
            self.db, targets, interval,
            site_name=self.monitoring_tab.site_name(),
            license_provider=self.license_provider,
        )
        self._monitor.event_created.connect(self._on_event_created)
        self._monitor.health_updated.connect(self.dashboard_tab.update_health)
        self._monitor.health_updated.connect(lambda _: self._refresh_inventory())
        self._monitor.failed.connect(self._on_monitor_failed)
        self._monitor.start()
        self.monitoring_tab.set_running(True)
        self.dashboard_tab.start_monitoring_btn.setEnabled(False)
        self.dashboard_tab.stop_monitoring_btn.setEnabled(True)

    def _stop_monitoring(self) -> None:
        if self._monitor is not None:
            self._monitor.stop()
            self._monitor = None
        self.monitoring_tab.set_running(False)
        self.dashboard_tab.start_monitoring_btn.setEnabled(True)
        self.dashboard_tab.stop_monitoring_btn.setEnabled(False)

    def _on_monitor_failed(self, message: str) -> None:
        self._stop_monitoring()

    def _on_event_created(self, event) -> None:
        self.event_log_tab.add_event(event)
        notify_for_event(event)
        event_type = event.type.value if hasattr(event.type, "value") else event.type
        if event_type == "ip_conflict":
            show_conflict_alert(self, event)
        elif event_type == "new_device":
            show_new_device_alert(self, event)

    def _on_rename_requested(self, identity_key: str, name: str) -> None:
        self.db.set_custom_name(identity_key, name)

    def _on_export_csv(self) -> None:
        from PyQt6.QtWidgets import QFileDialog

        path, _ = QFileDialog.getSaveFileName(self, "Export Devices", "devices.csv", "CSV Files (*.csv)")
        if path:
            export_devices_csv(self.db.all_devices(), path)

    def _refresh_inventory(self) -> None:
        self.inventory_tab.refresh(self.db.all_devices())
