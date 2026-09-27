"""ProMainWindow: wraps the free app's exact MainWindow as the first tab
(untouched, unmodified — product rule #1), and adds the new Network Health
Pro screens as additional tabs sharing the same dark theme.

Also owns the system tray icon, which is what makes "stay continuously on"
possible: closing the window hides it instead of quitting, monitoring keeps
running, and problem notifications pop up from the tray (spec items 8, 25).
"""
from __future__ import annotations

from PyQt6.QtGui import QCloseEvent
from PyQt6.QtWidgets import (
    QFileDialog,
    QFrame,
    QHBoxLayout,
    QLabel,
    QMenu,
    QMessageBox,
    QSystemTrayIcon,
    QTabWidget,
    QVBoxLayout,
    QWidget,
)

from app.ui.main_window import MainWindow

from pro import startup
from pro.database import Database
from pro.export import export_devices_csv
from pro.license import RemoteLicenseProvider
from pro.monitor import MonitorWorker, detect_default_targets
from pro.pro_content import DEFAULT_LANGUAGE, t

from ui.conflict_dialog import show_conflict_alert, show_new_device_alert
from ui.dashboard_widget import DashboardWidget
from ui.device_history_dialog import DeviceHistoryDialog
from ui.event_log_widget import EventLogWidget
from ui.inventory_widget import InventoryWidget
from ui.notifications_bridge import notification_for_event
from ui.pro_resources import load_pro_app_icon, load_pro_logo_pixmap
from ui.settings_widget import SettingsWidget


class ProMainWindow(QWidget):
    def __init__(self, lang: str = DEFAULT_LANGUAGE) -> None:
        super().__init__()
        self.lang = lang
        self.db = Database()
        self.license_provider = RemoteLicenseProvider(self.db)
        self._monitor: MonitorWorker | None = None
        self._really_quit = False

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
        self.tabs.addTab(self.scanner_tab, t(lang, "tab_scanner"))

        self.dashboard_tab = DashboardWidget(lang)
        self.tabs.addTab(self.dashboard_tab, t(lang, "tab_dashboard"))

        self.event_log_tab = EventLogWidget(lang)
        self.tabs.addTab(self.event_log_tab, t(lang, "tab_event_log"))

        self.inventory_tab = InventoryWidget(lang)
        self.inventory_tab.rename_requested = self._on_rename_requested
        self.inventory_tab.tags_requested = self._on_tags_requested
        self.inventory_tab.critical_toggled = self._on_critical_toggled
        self.inventory_tab.history_requested = self._on_history_requested
        self.inventory_tab.export_csv_btn.clicked.connect(self._on_export_csv)
        self.tabs.addTab(self.inventory_tab, t(lang, "tab_inventory"))

        self.settings_tab = SettingsWidget(self.license_provider, lang)
        self.monitoring_tab = self.settings_tab.monitoring  # kept as an alias: same widget, old name
        self.tabs.addTab(self.settings_tab, t(lang, "tab_settings"))

        self.monitoring_tab.start_btn.clicked.connect(self._start_monitoring)
        self.monitoring_tab.stop_btn.clicked.connect(self._stop_monitoring)
        self.dashboard_tab.start_monitoring_btn.clicked.connect(self._start_monitoring)
        self.dashboard_tab.stop_monitoring_btn.clicked.connect(self._stop_monitoring)

        self._refresh_inventory()
        self._build_tray_icon()
        self._maybe_resume_monitoring()

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

    # ------------------------------------------------------------ system tray
    def _build_tray_icon(self) -> None:
        self.tray: QSystemTrayIcon | None = None
        if not QSystemTrayIcon.isSystemTrayAvailable():
            return  # headless/offscreen test environments, some Linux setups

        self.tray = QSystemTrayIcon(load_pro_app_icon(), self)
        self.tray.setToolTip("ipscans Network Health Pro")

        menu = QMenu()
        show_action = menu.addAction(t(self.lang, "tray_show"))
        show_action.triggered.connect(self._show_from_tray)
        self._tray_start_action = menu.addAction(t(self.lang, "tray_start_monitoring"))
        self._tray_start_action.triggered.connect(self._start_monitoring)
        self._tray_stop_action = menu.addAction(t(self.lang, "tray_stop_monitoring"))
        self._tray_stop_action.triggered.connect(self._stop_monitoring)
        self._tray_stop_action.setEnabled(False)
        menu.addSeparator()
        quit_action = menu.addAction(t(self.lang, "tray_quit"))
        quit_action.triggered.connect(self._quit_from_tray)

        self.tray.setContextMenu(menu)
        self.tray.activated.connect(
            lambda reason: self._show_from_tray()
            if reason == QSystemTrayIcon.ActivationReason.Trigger
            else None
        )
        self.tray.show()

    def _show_from_tray(self) -> None:
        self.showNormal()
        self.activateWindow()

    def _quit_from_tray(self) -> None:
        self._really_quit = True
        self.close()

    def closeEvent(self, event: QCloseEvent) -> None:  # noqa: N802 (Qt override)
        if self._monitor is not None and self.tray is not None and not self._really_quit:
            event.ignore()
            self.hide()
            self.tray.showMessage(
                t(self.lang, "minimized_title"), t(self.lang, "minimized_body"),
                QSystemTrayIcon.MessageIcon.Information, 5000,
            )
            return
        if self._monitor is not None:
            self._monitor.stop()
        super().closeEvent(event)

    # ---------------------------------------------------------- persistence
    def _maybe_resume_monitoring(self) -> None:
        """Resumes continuous monitoring automatically if it was running the
        last time the app closed (spec item 8's "keep going" intent) — only
        if the license is still active, so an expired trial doesn't loop
        showing the PRO-feature prompt on every launch.

        Uses the cached license status (no network call) so a slow/offline
        connection can never delay app startup — the monitor itself will
        re-validate the license against the server on its own schedule.
        """
        cached_status = self.license_provider.get_status_from_cache_only()
        if self.db.get_setting("monitoring_enabled") == "1" and cached_status.has_feature("continuous_monitoring"):
            self._start_monitoring()

    def _ask_permission_if_needed(self) -> bool:
        if self.db.get_setting("permission_asked") == "1":
            return True
        self.db.set_setting("permission_asked", "1")
        box = QMessageBox(self)
        box.setWindowTitle(t(self.lang, "permission_title"))
        box.setIcon(QMessageBox.Icon.Question)
        box.setText(t(self.lang, "permission_body"))
        allow_btn = box.addButton(t(self.lang, "permission_allow"), QMessageBox.ButtonRole.AcceptRole)
        box.addButton(t(self.lang, "permission_deny"), QMessageBox.ButtonRole.RejectRole)
        box.exec()
        allowed = box.clickedButton() is allow_btn
        if allowed:
            startup.set_enabled(True)
            self.monitoring_tab.startup_checkbox.setChecked(startup.is_enabled())
        return True  # monitoring itself is never blocked by this dialog

    # ------------------------------------------------------------- actions
    def _start_monitoring(self) -> None:
        if self._monitor is not None:
            return
        if not self.license_provider.get_status().has_feature("continuous_monitoring"):
            QMessageBox.information(self, t(self.lang, "pro_feature_title"), t(self.lang, "pro_feature_body"))
            self.tabs.setCurrentWidget(self.settings_tab)
            return
        self._ask_permission_if_needed()

        targets = detect_default_targets()
        interval = self.monitoring_tab.interval_seconds()
        self._monitor = MonitorWorker(
            self.db, targets, interval,
            site_name=self.monitoring_tab.site_name(),
            license_provider=self.license_provider,
            lang=self.lang,
        )
        self._monitor.event_created.connect(self._on_event_created)
        self._monitor.health_updated.connect(self.dashboard_tab.update_health)
        self._monitor.health_updated.connect(lambda _: self._refresh_inventory())
        self._monitor.failed.connect(self._on_monitor_failed)
        self._monitor.start()
        self.db.set_setting("monitoring_enabled", "1")
        self.monitoring_tab.set_running(True)
        self.dashboard_tab.start_monitoring_btn.setEnabled(False)
        self.dashboard_tab.stop_monitoring_btn.setEnabled(True)
        if self.tray is not None:
            self._tray_start_action.setEnabled(False)
            self._tray_stop_action.setEnabled(True)

    def _stop_monitoring(self) -> None:
        if self._monitor is not None:
            self._monitor.stop()
            self._monitor = None
        self.db.set_setting("monitoring_enabled", "0")
        self.monitoring_tab.set_running(False)
        self.dashboard_tab.start_monitoring_btn.setEnabled(True)
        self.dashboard_tab.stop_monitoring_btn.setEnabled(False)
        if self.tray is not None:
            self._tray_start_action.setEnabled(True)
            self._tray_stop_action.setEnabled(False)

    def _on_monitor_failed(self, message: str) -> None:
        self._stop_monitoring()

    def _on_event_created(self, event) -> None:
        self.event_log_tab.add_event(event)
        quiet = self.monitoring_tab.is_quiet_hours_now()
        if self.tray is not None and not quiet:
            popup = notification_for_event(event, self.lang)
            if popup:
                title, message = popup
                severity = event.severity.value if hasattr(event.severity, "value") else event.severity
                icon = (
                    QSystemTrayIcon.MessageIcon.Warning
                    if severity in ("warning", "critical")
                    else QSystemTrayIcon.MessageIcon.Information
                )
                self.tray.showMessage(title, message, icon, 8000)
        if quiet:
            return  # still logged above — quiet hours only suppresses popups (innovative idea #3)
        event_type = event.type.value if hasattr(event.type, "value") else event.type
        if event_type == "ip_conflict":
            show_conflict_alert(self, event, self.lang)
        elif event_type == "new_device":
            show_new_device_alert(self, event, self.lang)

    def _on_rename_requested(self, identity_key: str, name: str) -> None:
        self.db.set_custom_name(identity_key, name)

    def _on_tags_requested(self, identity_key: str, tags: str) -> None:
        self.db.set_tags(identity_key, tags)
        self.inventory_tab.set_groups(self.db.distinct_tags())

    def _on_critical_toggled(self, identity_key: str, critical: bool) -> None:
        self.db.set_critical(identity_key, critical)

    def _on_history_requested(self, identity_key: str, label: str) -> None:
        rows = self.db.metrics_for_device(identity_key)
        dialog = DeviceHistoryDialog(label, rows, self.lang, self)
        dialog.exec()

    def _on_export_csv(self) -> None:
        path, _ = QFileDialog.getSaveFileName(self, t(self.lang, "export_csv"), "devices.csv", "CSV Files (*.csv)")
        if path:
            export_devices_csv(self.db.all_devices(), path)

    def _refresh_inventory(self) -> None:
        devices = self.db.all_devices()
        self.inventory_tab.set_groups(self.db.distinct_tags())
        self.inventory_tab.refresh(devices)
