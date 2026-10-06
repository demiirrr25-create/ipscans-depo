"""Main application window: a normal, resizable/maximizable OS window with
a dark theme applied throughout — houses the target selector, live filter
bar and the device results table.
"""
from __future__ import annotations

import webbrowser
import logging

from PyQt6.QtCore import QPropertyAnimation, Qt, QTimer
from PyQt6.QtWidgets import (
    QCheckBox, QComboBox, QFileDialog, QProgressBar, QTabWidget,
    QFrame,
    QHBoxLayout,
    QHeaderView,
    QLabel,
    QLineEdit,
    QMessageBox,
    QPushButton,
    QTableView,
    QVBoxLayout,
    QWidget,
)

from app.core import network_utils
from app.core import history
from app.core.models import Device
from app.core.network_utils import InvalidTargetError
from app.core.scanner import ScanOptions
from app.i18n import DEFAULT_LANGUAGE, t
from app.ui.resources import load_logo_pixmap
from app.ui.ip_tree import IpTree
from app.ui.spinner import Spinner
from app.ui.styles import DARK_QSS
from app.ui.widgets import DeviceFilterProxyModel, DeviceTableModel, TargetInput, section_label
from app.workers.scan_worker import ScanWorker
from app.workers.vendor_update_worker import VendorUpdateWorker


class MainWindow(QWidget):
    def __init__(self, lang: str = DEFAULT_LANGUAGE) -> None:
        super().__init__()
        self._worker: ScanWorker | None = None
        self._vendor_worker: VendorUpdateWorker | None = None
        self._close_pending = False
        self._cancelled = False
        self._previous: list[Device] = []
        self._history_error: str | None = None
        self._adapters: list[network_utils.NetworkAdapter] = []
        self._monitor = QTimer(self)
        self._monitor.setInterval(120_000)
        self._monitor.timeout.connect(self._start_scan)
        self._adapter_timer = QTimer(self)
        self._adapter_timer.setInterval(15_000)
        self._adapter_timer.timeout.connect(self._check_adapters)
        self._adapter_timer.start()
        try:
            self._previous = history.load_latest()
        except (OSError, ValueError, TypeError) as exc:
            logging.getLogger(__name__).warning("Cannot read scan history: %s", exc)
            self._history_error = str(exc)
        self.lang = lang

        self.setObjectName("AppRoot")
        self.setWindowTitle(t(lang, "app_title"))
        # A plain, native window: resizable and maximizable out of the box.
        # (A previous frameless/translucent version caused unreadable,
        # partially-unstyled rendering on real Windows and blocked maximize.)
        self.resize(1180, 760)
        self.setMinimumSize(900, 600)
        self.setStyleSheet(DARK_QSS)

        self._build_ui()
        self._wire_signals()
        self._prefill_detected_network()
        if self._history_error:
            self.status_label.setText(f"Scan history unavailable: {self._history_error}")

        self._fade_in = QPropertyAnimation(self, b"windowOpacity")
        self._fade_in.setDuration(320)
        self._fade_in.setStartValue(0.0)
        self._fade_in.setEndValue(1.0)

    def showEvent(self, event) -> None:  # noqa: N802 (Qt override)
        super().showEvent(event)
        self._fade_in.start()

    def closeEvent(self, event) -> None:  # noqa: N802 (Qt override)
        scanning = self._worker is not None and self._worker.isRunning()
        updating = self._vendor_worker is not None and self._vendor_worker.isRunning()
        if scanning or updating:
            self._close_pending = True
            self._monitor.stop()
            if scanning:
                self._cancelled = True
                self._worker.stop()
            self.status_label.setText("Finishing background work before closing…")
            event.ignore()
            return
        super().closeEvent(event)

    def _close_when_idle(self) -> None:
        if self._close_pending:
            self.close()

    # ------------------------------------------------------------------ UI
    def _build_ui(self) -> None:
        outer = QVBoxLayout(self)
        outer.setContentsMargins(20, 20, 20, 20)

        card = QFrame(objectName="RootCard")
        outer.addWidget(card)

        card_layout = QVBoxLayout(card)
        card_layout.setContentsMargins(0, 0, 0, 0)
        card_layout.setSpacing(0)

        card_layout.addWidget(self._build_header())

        body = QVBoxLayout()
        body.setContentsMargins(20, 16, 20, 20)
        body.setSpacing(14)
        card_layout.addLayout(body)

        body.addWidget(self._build_scan_controls())
        body.addWidget(self._build_filter_bar())
        self.tabs = QTabWidget()
        self.tabs.addTab(self._build_table(), "Devices")
        self.ip_tree = IpTree()
        self.tabs.addTab(self.ip_tree, "IP TREE")
        body.addWidget(self.tabs, stretch=1)
        self.summary_label = QLabel("0 devices · 0 cameras · 0 network devices · 0 unknown")
        body.addWidget(self.summary_label)
        body.addLayout(self._build_status_bar())

    def _build_header(self) -> QWidget:
        bar = QFrame(objectName="TitleBar")
        bar.setFixedHeight(60)
        layout = QHBoxLayout(bar)
        layout.setContentsMargins(20, 0, 20, 0)
        layout.setSpacing(12)

        logo = QLabel()
        logo.setPixmap(load_logo_pixmap(32))
        logo.setFixedSize(32, 32)
        layout.addWidget(logo)

        titles = QVBoxLayout()
        titles.setSpacing(0)
        title = QLabel("IPscans+", objectName="TitleText")
        subtitle = QLabel(t(self.lang, "app_subtitle"), objectName="SubtitleText")
        titles.addWidget(title)
        titles.addWidget(subtitle)
        layout.addLayout(titles)

        layout.addStretch(1)
        return bar

    def _build_scan_controls(self) -> QWidget:
        card = QFrame(objectName="OptionsCard")
        layout = QVBoxLayout(card)
        layout.setContentsMargins(18, 16, 18, 16)
        layout.setSpacing(10)

        layout.addWidget(section_label(t(self.lang, "scan_target")))

        adapter_row = QHBoxLayout()
        self.adapter_select = QComboBox()
        self.adapter_select.setToolTip("Active local network interface")
        adapter_row.addWidget(self.adapter_select, stretch=1)
        refresh = QPushButton("Refresh interfaces")
        refresh.clicked.connect(self._check_adapters)
        adapter_row.addWidget(refresh)
        self.adapter_details = QLabel("No network adapter detected · Enter an IPv4 target manually")
        self.adapter_details.setWordWrap(True)
        adapter_row.addWidget(self.adapter_details, stretch=2)
        layout.addLayout(adapter_row)

        row = QHBoxLayout()
        row.setSpacing(10)
        self.target_input = TargetInput(self.lang)
        row.addWidget(self.target_input, stretch=1)

        self.scan_btn = QPushButton(f"▶  {t(self.lang, 'start_scan')}", objectName="PrimaryButton")
        self.stop_btn = QPushButton(f"■  {t(self.lang, 'stop_scan')}", objectName="GhostButton")
        self.stop_btn.setEnabled(False)
        row.addWidget(self.scan_btn)
        row.addWidget(self.stop_btn)
        layout.addLayout(row)
        snmp_row = QHBoxLayout()
        self.snmp_toggle = QCheckBox("Use authorized SNMP community (optional)")
        self.snmp_secret = QLineEdit()
        self.snmp_secret.setEchoMode(QLineEdit.EchoMode.Password)
        self.snmp_secret.setPlaceholderText("SNMPv2c community · never saved")
        self.snmp_secret.setEnabled(False)
        self.snmp_toggle.toggled.connect(self.snmp_secret.setEnabled)
        snmp_row.addWidget(self.snmp_toggle)
        snmp_row.addWidget(self.snmp_secret, stretch=1)
        layout.addLayout(snmp_row)
        extra = QHBoxLayout()
        self.monitor_toggle = QCheckBox("Live monitoring · rescan every 2 minutes")
        extra.addWidget(self.monitor_toggle)
        self.export_btn = QPushButton("Export CSV / JSON")
        extra.addWidget(self.export_btn)
        self.update_vendor_btn = QPushButton("Update OUI database")
        self.update_vendor_btn.setToolTip("Download the current IEEE OUI vendor list")
        extra.addWidget(self.update_vendor_btn)
        layout.addLayout(extra)

        return card

    def _build_filter_bar(self) -> QWidget:
        wrap = QWidget()
        layout = QHBoxLayout(wrap)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(8)

        self.filter_edit = QLineEdit()
        self.filter_edit.setPlaceholderText(t(self.lang, "search_placeholder"))
        layout.addWidget(self.filter_edit, stretch=1)
        return wrap

    def _build_table(self) -> QTableView:
        self.table = QTableView()
        self.table.setAlternatingRowColors(True)
        self.table.setSelectionBehavior(QTableView.SelectionBehavior.SelectRows)
        self.table.setEditTriggers(QTableView.EditTrigger.NoEditTriggers)
        self.table.horizontalHeader().setSectionResizeMode(
            0, QHeaderView.ResizeMode.ResizeToContents
        )
        self.table.horizontalHeader().setSectionResizeMode(
            1, QHeaderView.ResizeMode.ResizeToContents
        )
        self.table.horizontalHeader().setMinimumSectionSize(90)
        self.table.horizontalHeader().setStretchLastSection(True)
        self.table.verticalHeader().setVisible(False)
        # Clicking a column header sorts by it — the IP column sorts
        # numerically low-to-high (see DeviceFilterProxyModel.lessThan)
        # instead of as plain text, which is the whole point of the feature.
        self.table.setSortingEnabled(True)
        self.table.horizontalHeader().setSortIndicator(0, Qt.SortOrder.AscendingOrder)

        self.model = DeviceTableModel(self.lang)
        self.proxy = DeviceFilterProxyModel()
        self.proxy.setSourceModel(self.model)
        self.proxy.sort(0, Qt.SortOrder.AscendingOrder)
        self.table.setModel(self.proxy)
        self.table.doubleClicked.connect(self._on_row_double_clicked)
        return self.table

    def _build_status_bar(self) -> QHBoxLayout:
        layout = QHBoxLayout()
        self.status_label = QLabel(t(self.lang, "status_ready"), objectName="StatusLabel")
        # A single circular spinner is the only progress indicator while a
        # scan runs — it doubles for both the discovery and enrichment
        # phases instead of switching to a separate percentage bar.
        self.spinner = Spinner(18)
        self.spinner.hide()
        layout.addWidget(self.status_label, stretch=1)
        self.progress_bar = QProgressBar()
        self.progress_bar.setMinimumWidth(150)
        self.progress_bar.setMaximumWidth(260)
        self.progress_bar.setVisible(False)
        layout.addWidget(self.progress_bar)
        layout.addWidget(self.spinner)
        return layout

    # --------------------------------------------------------------- wiring
    def _wire_signals(self) -> None:
        self.scan_btn.clicked.connect(self._start_scan)
        self.stop_btn.clicked.connect(self._stop_scan)
        self.filter_edit.textChanged.connect(self.proxy.set_filter_text)
        self.adapter_select.currentIndexChanged.connect(self._adapter_changed)
        self.monitor_toggle.toggled.connect(self._toggle_monitor)
        self.export_btn.clicked.connect(self._export)
        self.update_vendor_btn.clicked.connect(self._update_vendors)

    def _prefill_detected_network(self) -> None:
        """Auto-detects the machine's local /24 and writes a ready-to-scan
        range into the target field, so most users can just press Start.
        """
        self._adapters = network_utils.detect_adapters()
        self.adapter_select.clear()
        for adapter in self._adapters:
            self.adapter_select.addItem(f"{adapter.name} · {adapter.ip}/{adapter.netmask}", adapter)
        if self._adapters:
            network = network_utils.detect_local_network()
            preferred = next((index for index, adapter in enumerate(self._adapters)
                              if str(network) == adapter.network), 0)
            self.adapter_select.setCurrentIndex(preferred)
            self._adapter_changed(preferred)

    def _check_adapters(self) -> None:
        adapters = network_utils.detect_adapters()
        if adapters == self._adapters:
            return
        old = self.adapter_select.currentData()
        using_detected_range = old is not None and self.target_input.spec() == old.network
        self._adapters = adapters
        self.adapter_select.blockSignals(True)
        self.adapter_select.clear()
        for adapter in adapters:
            self.adapter_select.addItem(f"{adapter.name} · {adapter.ip}/{adapter.netmask}", adapter)
        preferred = next((i for i, adapter in enumerate(adapters) if old and adapter.ip == old.ip), 0)
        if adapters:
            self.adapter_select.setCurrentIndex(preferred)
        self.adapter_select.blockSignals(False)
        if adapters:
            if using_detected_range:
                self._adapter_changed(preferred)
            else:
                adapter = adapters[preferred]
                self.adapter_details.setText(
                    f"Active: {adapter.name} · {adapter.ip} · Gateway {adapter.gateway or 'Unknown'}"
                )
        else:
            self.adapter_details.setText("No active IPv4 interface · Enter an authorized target manually")
            if self.monitor_toggle.isChecked():
                self.monitor_toggle.setChecked(False)
                self.status_label.setText("Monitoring paused: network interface disconnected")

    def _adapter_changed(self, index: int) -> None:
        if index < 0 or index >= len(self._adapters):
            return
        adapter = self._adapters[index]
        self.adapter_details.setText(
            f"IP {adapter.ip} · Network {adapter.network} · Gateway {adapter.gateway or 'Unknown'} · "
            f"DNS {', '.join(adapter.dns) or 'Unknown'} · MAC {adapter.mac or 'Unknown'} · "
            f"Speed {str(adapter.speed_mbps) + ' Mbps' if adapter.speed_mbps else 'Unknown'}"
        )
        self.target_input._buttons["mode_cidr"].setChecked(True)
        self.target_input.set_value(adapter.network)
        self.status_label.setText(t(self.lang, "status_detected", value=adapter.network))

    def _toggle_monitor(self, enabled: bool) -> None:
        if enabled:
            self._monitor.start()
        else:
            self._monitor.stop()

    def _export(self) -> None:
        if not self.model._devices:
            QMessageBox.information(self, "IPscans+", "Scan a network before exporting.")
            return
        path, chosen_filter = QFileDialog.getSaveFileName(
            self, "Export scan results", "IPscans-plus-scan.csv",
            "CSV (*.csv);;JSON (*.json)")
        if not path:
            return
        from pathlib import Path
        target = Path(path)
        if target.suffix.lower() not in (".csv", ".json"):
            target = target.with_suffix(".json" if "JSON" in chosen_filter else ".csv")
        try:
            history.export_results(self.model._devices, target)
        except (OSError, ValueError) as exc:
            QMessageBox.critical(self, "Export failed", str(exc))
        else:
            self.status_label.setText(f"Saved {len(self.model._devices)} devices to {target}")

    def _update_vendors(self) -> None:
        if self._vendor_worker and self._vendor_worker.isRunning():
            return
        self.update_vendor_btn.setEnabled(False)
        self.status_label.setText("Updating IEEE OUI database…")
        self._vendor_worker = VendorUpdateWorker(self)
        self._vendor_worker.completed.connect(self._vendor_update_done)
        self._vendor_worker.failed.connect(self._vendor_update_failed)
        self._vendor_worker.finished.connect(self._close_when_idle)
        self._vendor_worker.start()

    def _vendor_update_done(self) -> None:
        self.update_vendor_btn.setEnabled(True)
        self.status_label.setText("IEEE OUI database updated. Rescan to refresh vendor names.")

    def _vendor_update_failed(self, error: str) -> None:
        self.update_vendor_btn.setEnabled(True)
        QMessageBox.warning(self, "Vendor update failed", error)
        self.status_label.setText("Vendor update failed; offline database remains available.")

    # ------------------------------------------------------------- actions
    def _start_scan(self) -> None:
        if self._worker and self._worker.isRunning():
            return
        spec = self.target_input.spec()
        try:
            targets = network_utils.parse_targets(spec)
        except InvalidTargetError as exc:
            QMessageBox.warning(self, t(self.lang, "invalid_target_title"), str(exc))
            return

        self.model.clear()
        self._cancelled = False
        self.ip_tree.refresh([])
        self.spinner.start()
        self.progress_bar.setVisible(True)
        self.progress_bar.setRange(0, len(targets))
        self.progress_bar.setValue(0)
        self.status_label.setText(t(self.lang, "status_discovering", count=len(targets)))
        self.scan_btn.setEnabled(False)
        self.stop_btn.setEnabled(True)

        # Every enrichment protocol (SNMP/UPnP/WMI) runs with its sensible
        # default — there's no per-protocol UI toggle to keep the scan
        # screen simple; Nmap stays opt-in-only since it's noticeably slower.
        if self.snmp_toggle.isChecked() and not self.snmp_secret.text():
            self.spinner.stop()
            self.scan_btn.setEnabled(True)
            self.stop_btn.setEnabled(False)
            self.progress_bar.setVisible(False)
            QMessageBox.warning(self, "SNMP", "Enter your authorized SNMP community, or disable SNMP.")
            return
        options = ScanOptions(enable_snmp=self.snmp_toggle.isChecked(),
                              snmp_community=self.snmp_secret.text() if self.snmp_toggle.isChecked() else None)

        self._worker = ScanWorker(targets, options)
        self._worker.device_found.connect(self._on_device_found)
        self._worker.progress.connect(self._on_progress)
        self._worker.phase_changed.connect(self._on_phase_changed)
        self._worker.finished_ok.connect(self._on_scan_finished)
        self._worker.failed.connect(self._on_scan_failed)
        self._worker.finished.connect(self._close_when_idle)
        self._worker.start()

    def _stop_scan(self) -> None:
        self._cancelled = True
        if self._worker:
            self._worker.stop()
        self.status_label.setText(t(self.lang, "status_stopping"))

    def _on_device_found(self, device: Device) -> None:
        self.model.add_device(device)

    def _on_phase_changed(self, phase: str) -> None:
        # The comet-trail spinner keeps spinning across both phases — it
        # is the only "a scan is running" indicator, so there's nothing to
        # toggle here beyond the status text (set elsewhere).
        self.status_label.setText(f"{phase.title()} · {self.model.rowCount()} devices found")

    def _on_progress(self, done: int, total: int) -> None:
        self.progress_bar.setRange(0, max(total, 1))
        self.progress_bar.setValue(done)
        self.status_label.setText(
            t(self.lang, "status_scanning", done=done, total=total, found=self.model.rowCount())
        )

    def _on_scan_finished(self) -> None:
        self.spinner.stop()
        self.progress_bar.setVisible(False)
        self.scan_btn.setEnabled(True)
        self.stop_btn.setEnabled(False)
        if self._cancelled:
            self.status_label.setText(f"Scan stopped · {self.model.rowCount()} devices found")
            return
        devices = self.model._devices
        previous_by_mac = {device.mac: device for device in self._previous if device.mac}
        for device in devices:
            if device.mac in previous_by_mac:
                device.first_seen = previous_by_mac[device.mac].first_seen or device.first_seen
        change = history.compare(self._previous, devices)
        try:
            history.save_snapshot(devices)
        except OSError as exc:
            QMessageBox.warning(self, "Scan history", f"Could not save scan history: {exc}")
        self._previous = list(devices)
        adapter = self.adapter_select.currentData()
        self.ip_tree.refresh(devices, adapter.gateway if adapter else None)
        cameras = sum(device.device_type == "IP Camera" for device in devices)
        network = sum(device.device_type in ("Router", "Switch", "PoE Switch", "Access Point") for device in devices)
        unknown = sum(device.device_type == "Unknown" for device in devices)
        self.summary_label.setText(
            f"{len(devices)} devices · {cameras} cameras · {network} network devices · {unknown} unknown  /  "
            f"+{change.added} new · {change.missing} missing · {change.ip_changes} IP changes · "
            f"{change.mac_changes} IP/MAC identity changes (not confirmed conflicts)"
        )
        self.status_label.setText(t(self.lang, "status_done", count=self.model.rowCount()))
        self.tabs.setCurrentWidget(self.ip_tree)

    def _on_scan_failed(self, message: str) -> None:
        self.spinner.stop()
        self.progress_bar.setVisible(False)
        self.scan_btn.setEnabled(True)
        self.stop_btn.setEnabled(False)
        error_title = t(self.lang, "status_error")
        self.status_label.setText(error_title)
        QMessageBox.critical(self, error_title, message)

    def _on_row_double_clicked(self, proxy_index) -> None:
        source_index = self.proxy.mapToSource(proxy_index)
        device = self.model.device_at(source_index.row())
        if device:
            # The "clickable IP" feature: opens the device's web UI in the
            # user's default browser (https if a secure port is open).
            webbrowser.open(device.url)
