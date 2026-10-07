"""Scan -> discover -> map -> manage in one responsive workspace."""
from __future__ import annotations

from dataclasses import replace
from pathlib import Path
import time

from PyQt6.QtCore import Qt, QTimer
from PyQt6.QtGui import QAction, QKeySequence, QShortcut
from PyQt6.QtWidgets import (
    QCheckBox, QComboBox, QFileDialog, QFormLayout, QHBoxLayout, QHeaderView, QLabel,
    QLineEdit, QListWidget, QMenu, QMessageBox, QProgressBar, QPushButton, QSpinBox,
    QStackedWidget, QTableView, QTextEdit, QVBoxLayout, QWidget,
)

from app.core import history, network_utils
from app.core.adapters import ChangeResult
from app.core.models import Device
from app.core.registry import DeviceRegistry
from app.core.scanner import ScanOptions
from app.core.topology import build_topology
from app.i18n import DEFAULT_LANGUAGE, t
from app.ui.device_panel import DeviceControlPanel
from app.ui.network_map import NetworkMap
from app.ui.styles import DARK_QSS
from app.ui.widgets import DeviceFilterProxyModel, DeviceTableModel, TargetInput
from app.workers.scan_worker import ScanWorker
from app.workers.task_worker import TaskWorker
from app.workers.vendor_update_worker import VendorUpdateWorker


class MainWindow(QWidget):
    def __init__(self, lang: str = DEFAULT_LANGUAGE) -> None:
        super().__init__()
        self.lang = lang
        self._worker: ScanWorker | None = None
        self._node_worker: ScanWorker | None = None
        self._node_observed: set[str] = set()
        self._vendor_worker: VendorUpdateWorker | None = None
        self._jobs: set[TaskWorker] = set()
        self._panels: list[DeviceControlPanel] = []
        self._adapters: list[network_utils.NetworkAdapter] = []
        self._snapshots: list[history.ScanSnapshot] = []
        self._pending: dict[str, Device] = {}
        self._observations = DeviceRegistry()
        self._conflicts = []
        self._cancelled = False
        self._close_pending = False
        self._scan_started = 0.0
        self._scan_target = ""
        self._scan_adapter: network_utils.NetworkAdapter | None = None
        self._last_suggested = ""
        self._warnings: set[str] = set()
        self._map_dirty = False
        self.setObjectName("AppRoot")
        self.setWindowTitle("IPscans+ / Next Generation")
        self.resize(1380, 850)
        self.setMinimumSize(1000, 650)
        self.setStyleSheet(DARK_QSS)
        self._build_ui()
        self._batch_timer = QTimer(self)
        self._batch_timer.setInterval(100)
        self._batch_timer.timeout.connect(self._flush_results)
        self._batch_timer.start()
        self._map_timer = QTimer(self)
        self._map_timer.setInterval(1000)
        self._map_timer.timeout.connect(self._refresh_map)
        self._map_timer.start()
        self._adapter_timer = QTimer(self)
        self._adapter_timer.setInterval(15000)
        self._adapter_timer.timeout.connect(self._refresh_adapters)
        self._adapter_timer.start()
        self._range_timer = QTimer(self)
        self._range_timer.setSingleShot(True)
        self._range_timer.setInterval(300)
        self._range_timer.timeout.connect(self._estimate_range)
        self.target_input.start_edit.textChanged.connect(lambda: self._range_timer.start())
        self.target_input.end_edit.textChanged.connect(lambda: self._range_timer.start())
        QTimer.singleShot(0, self._refresh_adapters)
        QTimer.singleShot(0, self._load_history)
        QShortcut(QKeySequence("Ctrl+F"), self, activated=self.filter_edit.setFocus)
        QShortcut(QKeySequence("F5"), self, activated=self._start_scan)
        QShortcut(QKeySequence("Escape"), self, activated=self._stop_scan)

    def _build_ui(self) -> None:
        outer = QHBoxLayout(self)
        self.navigation = QListWidget()
        self.navigation.setFixedWidth(150)
        self.navigation.setAccessibleName(t(self.lang, "navigation"))
        self.navigation.addItems([t(self.lang, key) for key in ("scan", "network_map", "history", "settings")])
        outer.addWidget(self.navigation)
        body = QVBoxLayout()
        outer.addLayout(body, stretch=1)
        heading = QHBoxLayout()
        heading.addWidget(QLabel("IPscans+ / Next Generation", objectName="TitleText"))
        self.adapter_select = QComboBox()
        self.adapter_select.setAccessibleName(t(self.lang, "current_adapter"))
        self.adapter_select.currentIndexChanged.connect(self._adapter_changed)
        heading.addWidget(self.adapter_select, stretch=1)
        refresh = QPushButton(t(self.lang, "refresh_adapters"))
        refresh.clicked.connect(self._refresh_adapters)
        heading.addWidget(refresh)
        body.addLayout(heading)
        self.adapter_details = QLabel(t(self.lang, "detecting_adapter"))
        self.adapter_details.setWordWrap(True)
        body.addWidget(self.adapter_details)
        row = QHBoxLayout()
        self.target_input = TargetInput(self.lang)
        row.addWidget(self.target_input, stretch=1)
        self.scan_btn = QPushButton(t(self.lang, "start_scan"), objectName="PrimaryButton")
        self.stop_btn = QPushButton(t(self.lang, "stop_scan"))
        self.scan_btn.clicked.connect(self._start_scan)
        self.stop_btn.clicked.connect(self._stop_scan)
        self.stop_btn.setEnabled(False)
        row.addWidget(self.scan_btn)
        row.addWidget(self.stop_btn)
        body.addLayout(row)
        self.range_estimate = QLabel(t(self.lang, "range_hint"))
        body.addWidget(self.range_estimate)
        self.pages = QStackedWidget()
        body.addWidget(self.pages, stretch=1)
        self.workspace = QWidget()
        workspace = QVBoxLayout(self.workspace)
        workspace.setContentsMargins(0, 0, 0, 0)
        self.summary_label = QLabel()
        self.summary_label.setWordWrap(True)
        workspace.addWidget(self.summary_label)
        filters = QHBoxLayout()
        self.filter_edit = QLineEdit()
        self.filter_edit.setPlaceholderText(t(self.lang, "search_placeholder"))
        self.filter_edit.setAccessibleName(t(self.lang, "search_placeholder"))
        self.filter_edit.textChanged.connect(self._filter)
        filters.addWidget(self.filter_edit, stretch=1)
        self.view_select = QComboBox()
        self.view_select.addItems([t(self.lang, "view_table"), t(self.lang, "view_graph")])
        self.view_select.setAccessibleName(t(self.lang, "workspace_view"))
        self.view_select.currentIndexChanged.connect(self._view_changed)
        filters.addWidget(self.view_select)
        columns = QPushButton(t(self.lang, "columns"))
        columns.clicked.connect(lambda: self._column_menu(self.table.horizontalHeader().rect().bottomLeft()))
        filters.addWidget(columns)
        self.conflicts_button = QPushButton(t(self.lang, "conflicts"))
        self.conflicts_button.clicked.connect(self._show_conflicts)
        filters.addWidget(self.conflicts_button)
        export = QPushButton(t(self.lang, "export_results"))
        export.clicked.connect(self._export)
        filters.addWidget(export)
        workspace.addLayout(filters)
        self.views = QStackedWidget()
        self.table = self._build_table()
        self.network_map = NetworkMap(self.lang)
        self.network_map.device_activated.connect(self._open_panel)
        self.network_map.refresh_requested.connect(self._refresh_node)
        self.views.addWidget(self.table)
        self.views.addWidget(self.network_map)
        workspace.addWidget(self.views, stretch=1)
        self.pages.addWidget(self.workspace)
        self.pages.addWidget(self._build_history())
        self.pages.addWidget(self._build_settings())
        self.progress_bar = QProgressBar()
        self.progress_bar.setVisible(False)
        body.addWidget(self.progress_bar)
        self.status_label = QLabel(t(self.lang, "status_ready"))
        self.status_label.setWordWrap(True)
        body.addWidget(self.status_label)
        self.warning_label = QLabel()
        self.warning_label.setWordWrap(True)
        body.addWidget(self.warning_label)
        self.navigation.currentRowChanged.connect(self._navigate)
        self.navigation.setCurrentRow(0)
        self._update_summary()

    def _build_table(self) -> QTableView:
        table = QTableView()
        table.setAccessibleName(t(self.lang, "view_table"))
        self.model = DeviceTableModel(self.lang)
        self.proxy = DeviceFilterProxyModel()
        self.proxy.setSourceModel(self.model)
        table.setModel(self.proxy)
        table.setAlternatingRowColors(True)
        table.setSelectionBehavior(QTableView.SelectionBehavior.SelectRows)
        table.setEditTriggers(QTableView.EditTrigger.NoEditTriggers)
        table.setSortingEnabled(True)
        table.sortByColumn(0, Qt.SortOrder.AscendingOrder)
        table.verticalHeader().setVisible(False)
        header = table.horizontalHeader()
        header.setSectionResizeMode(QHeaderView.ResizeMode.Interactive)
        header.setSectionsMovable(True)
        header.setDefaultSectionSize(130)
        for position, column in enumerate((8, 0, 12, 3, 1, 2, 7, 9, 10, 11, 4, 5, 6)):
            header.moveSection(header.visualIndex(column), position)
        header.setContextMenuPolicy(Qt.ContextMenuPolicy.CustomContextMenu)
        header.customContextMenuRequested.connect(self._column_menu)
        for column in (4, 5, 6):
            table.setColumnHidden(column, True)
        table.doubleClicked.connect(self._on_row_double_clicked)
        enter = QShortcut(QKeySequence("Return"), table,
                          activated=lambda: self._on_row_double_clicked(table.currentIndex()))
        enter.setContext(Qt.ShortcutContext.WidgetWithChildrenShortcut)
        return table

    def _column_menu(self, position) -> None:
        menu = QMenu(self)
        for column in range(self.model.columnCount()):
            action = QAction(str(self.model.headerData(column, Qt.Orientation.Horizontal)), menu)
            action.setCheckable(True)
            action.setChecked(not self.table.isColumnHidden(column))
            action.setEnabled(column != 0)
            action.toggled.connect(lambda visible, col=column: self.table.setColumnHidden(col, not visible))
            menu.addAction(action)
        menu.exec(self.table.horizontalHeader().mapToGlobal(position))

    def _build_history(self) -> QWidget:
        page = QWidget()
        layout = QVBoxLayout(page)
        layout.addWidget(QLabel(t(self.lang, "history_notice")))
        self.history_select = QComboBox()
        self.history_select.setAccessibleName(t(self.lang, "history"))
        self.history_select.currentIndexChanged.connect(self._inspect_history)
        layout.addWidget(self.history_select)
        self.history_details = QTextEdit()
        self.history_details.setReadOnly(True)
        layout.addWidget(self.history_details)
        return page

    def _build_settings(self) -> QWidget:
        page = QWidget()
        layout = QVBoxLayout(page)
        layout.addWidget(QLabel(t(self.lang, "authorized_networks")))
        form = QFormLayout()
        self.concurrency = QSpinBox()
        self.concurrency.setRange(2, 128)
        self.concurrency.setValue(64)
        form.addRow(t(self.lang, "worker_budget"), self.concurrency)
        self.snmp_secret = QLineEdit()
        self.snmp_secret.setEchoMode(QLineEdit.EchoMode.Password)
        self.snmp_secret.setPlaceholderText(t(self.lang, "snmp_notice"))
        form.addRow("SNMPv2c / LLDP", self.snmp_secret)
        layout.addLayout(form)
        layout.addWidget(QLabel(t(self.lang, "credentials_notice")))
        self.update_vendor_btn = QPushButton(t(self.lang, "update_vendors"))
        self.update_vendor_btn.clicked.connect(self._update_vendors)
        layout.addWidget(self.update_vendor_btn)
        layout.addStretch()
        return page

    def _background(self, operation, completed, failed=None) -> None:
        worker = TaskWorker(operation, self)
        self._jobs.add(worker)
        worker.completed.connect(completed)
        worker.failed.connect(failed or self._warning)
        worker.finished.connect(lambda: self._job_finished(worker))
        worker.start()

    def _job_finished(self, worker: TaskWorker) -> None:
        self._jobs.discard(worker)
        worker.deleteLater()
        self._close_when_idle()

    def _refresh_adapters(self) -> None:
        if getattr(self, "_adapter_loading", False):
            return
        self._adapter_loading = True
        def done(adapters):
            self._adapter_loading = False
            self._adapters_loaded(adapters)
        def failed(message):
            self._adapter_loading = False
            self._warning(message)
        self._background(network_utils.detect_adapters, done, failed)

    def _adapters_loaded(self, adapters: list[network_utils.NetworkAdapter]) -> None:
        old = self.adapter_select.currentData()
        if self._worker and self._worker.isRunning() and self._scan_adapter and self._scan_adapter not in adapters:
            self._stop_scan()
            self._warning(t(self.lang, "network_changed"))
        if adapters == self._adapters:
            return
        self._adapters = adapters
        self.adapter_select.blockSignals(True)
        self.adapter_select.clear()
        for adapter in adapters:
            self.adapter_select.addItem(f"{adapter.name} / {adapter.ip}", adapter)
        selected = next((i for i, adapter in enumerate(adapters) if old and adapter.ip == old.ip), 0)
        self.adapter_select.setCurrentIndex(selected if adapters else -1)
        self.adapter_select.blockSignals(False)
        self._adapter_changed(selected if adapters else -1)

    def _adapter_changed(self, index: int) -> None:
        if not 0 <= index < len(self._adapters):
            self.adapter_details.setText(t(self.lang, "no_adapter"))
            return
        adapter = self._adapters[index]
        self.adapter_details.setText(
            f"{adapter.name} / IP {adapter.ip} / {t(self.lang, 'subnet_mask')} {adapter.netmask} / "
            f"{t(self.lang, 'gateway')} {adapter.gateway or 'Unknown'} / {adapter.network}")
        if not self.target_input.spec() or self.target_input.spec() == self._last_suggested:
            self.target_input.set_value(adapter.network)
            self._last_suggested = self.target_input.spec()

    def _estimate_range(self) -> None:
        try:
            count = len(network_utils.parse_targets(self.target_input.spec()))
        except network_utils.InvalidTargetError as exc:
            self.range_estimate.setText(str(exc))
            return
        self.range_estimate.setText(t(self.lang, "range_estimate", count=count))

    def _load_history(self) -> None:
        self._background(history.load_snapshots, self._history_loaded)

    def _history_loaded(self, snapshots: list[history.ScanSnapshot]) -> None:
        self._snapshots = snapshots
        self.history_select.clear()
        for snapshot in reversed(snapshots):
            self.history_select.addItem(f"{snapshot.scanned_at} / {snapshot.target} / {len(snapshot.devices)}", snapshot)

    def _inspect_history(self, _index: int) -> None:
        scan = self.history_select.currentData()
        if not scan:
            self.history_details.clear()
            return
        peers = [candidate for candidate in self._snapshots if candidate.target == scan.target
                 and candidate.scanned_at < scan.scanned_at]
        change = history.compare(peers[-1].devices, scan.devices) if peers else None
        summary = (f"+{change.added} new / {change.missing} no longer observed / {change.ip_changes} IP changes / "
                   f"{change.vendor_changes} vendor changes / {change.mac_changes} MAC changes (not proof of conflict)"
                   if change else t(self.lang, "history_baseline"))
        lines = [summary, "", *(f"{device.ip} | {device.mac or 'Unknown'} | {device.hostname or ''} | "
                               f"{device.vendor or ''} | {device.device_type}" for device in scan.devices)]
        self.history_details.setPlainText("\n".join(lines))

    def _navigate(self, index: int) -> None:
        self.pages.setCurrentIndex(0 if index < 2 else index - 1)
        if index < 2:
            self.view_select.setCurrentIndex(index)

    def _view_changed(self, index: int) -> None:
        self.views.setCurrentIndex(index)
        if index == 1:
            self._refresh_map(force=True)

    def _filter(self, text: str) -> None:
        self.proxy.set_filter_text(text)
        self._map_dirty = True
        if self.views.currentIndex() == 1:
            self.network_map.set_filter_text(text)

    def _start_scan(self) -> None:
        if self._worker and self._worker.isRunning() or self._node_worker and self._node_worker.isRunning():
            return
        try:
            targets = network_utils.parse_targets(self.target_input.spec())
            options = ScanOptions(max_workers=self.concurrency.value(),
                                  enable_snmp=bool(self.snmp_secret.text()),
                                  snmp_community=self.snmp_secret.text() or None,
                                  interface_ip=self.adapter_select.currentData().ip
                                  if self.adapter_select.currentData() else None)
        except (network_utils.InvalidTargetError, ValueError) as exc:
            QMessageBox.warning(self, t(self.lang, "invalid_target_title"), str(exc))
            return
        if len(targets) > 4096 and QMessageBox.question(
            self, t(self.lang, "large_range"), t(self.lang, "large_range_notice", count=len(targets)),
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No,
            QMessageBox.StandardButton.No,
        ) != QMessageBox.StandardButton.Yes:
            return
        self.snmp_secret.clear()
        self._cancelled = False
        self._pending.clear()
        self._observations = DeviceRegistry()
        self._conflicts.clear()
        self._warnings.clear()
        self.warning_label.clear()
        self.model.clear()
        self.network_map.collapsed.clear()
        self.network_map.refresh([])
        self._scan_target = self.target_input.spec()
        self._scan_adapter = self.adapter_select.currentData()
        self._scan_started = time.monotonic()
        self._set_scanning(True)
        self.progress_bar.setRange(0, len(targets))
        self.progress_bar.setValue(0)
        self.status_label.setText(t(self.lang, "status_discovering", count=len(targets)))
        self.navigation.setCurrentRow(0)
        self._worker = ScanWorker(targets, options, self)
        self._worker.device_found.connect(self._on_device_found)
        self._worker.progress.connect(self._on_progress)
        self._worker.phase_changed.connect(self._on_phase_changed)
        self._worker.conflicts_found.connect(self._on_conflicts)
        self._worker.warning.connect(self._warning)
        self._worker.finished_ok.connect(self._on_scan_finished)
        self._worker.failed.connect(self._on_scan_failed)
        self._worker.finished.connect(self._close_when_idle)
        self._worker.start()

    def _set_scanning(self, active: bool) -> None:
        self.scan_btn.setEnabled(not active)
        self.stop_btn.setEnabled(active)
        self.target_input.setEnabled(not active)
        self.adapter_select.setEnabled(not active)
        self.concurrency.setEnabled(not active)
        self.progress_bar.setVisible(active)
        self.proxy.setDynamicSortFilter(not active)

    def _stop_scan(self) -> None:
        if self._worker and self._worker.isRunning():
            self._cancelled = True
            self._worker.stop()
            self.status_label.setText(t(self.lang, "status_stopping"))

    def _on_device_found(self, device: Device) -> None:
        self._pending[device.ip] = self._observations.merge(device)
        self._on_conflicts(self._observations.conflicts)

    def _flush_results(self, all_results: bool = False) -> None:
        keys = list(self._pending)[:len(self._pending) if all_results else 256]
        if keys:
            self.model.add_devices([self._pending.pop(ip) for ip in keys])
            self._map_dirty = True
        self._update_summary()

    def _update_summary(self) -> None:
        devices = self.model._devices
        counts = {
            "devices": len(devices), "cameras": sum(d.device_type == "IP Camera" for d in devices),
            "routers": sum(d.device_type in ("Router", "Gateway", "Access Point") for d in devices),
            "switches": sum(d.device_type in ("Switch", "PoE Switch") for d in devices),
            "recorders": sum(d.device_type in ("NVR", "DVR") for d in devices),
            "unknown": sum(d.device_type == "Unknown" for d in devices), "conflicts": len(self._conflicts),
        }
        self.summary_label.setText(t(self.lang, "overview", **counts))
        self.conflicts_button.setText(f"{t(self.lang, 'conflicts')} ({len(self._conflicts)})")

    def _on_conflicts(self, conflicts) -> None:
        self._conflicts = list({conflict.ip: conflict for conflict in (*self._conflicts, *conflicts)}.values())

    def _on_phase_changed(self, phase: str) -> None:
        self.status_label.setText(f"{phase.title()} / {self.model.rowCount()} / "
                                  f"{time.monotonic() - self._scan_started:.1f} s")

    def _on_progress(self, done: int, total: int) -> None:
        self.progress_bar.setRange(0, max(total, 1))
        self.progress_bar.setValue(done)
        self.status_label.setText(t(self.lang, "status_scanning", done=done, total=total,
                                   found=self.model.rowCount()) + f" / {time.monotonic() - self._scan_started:.1f} s")

    def _on_scan_finished(self) -> None:
        self._flush_results(all_results=True)
        self._set_scanning(False)
        self._refresh_map(force=True)
        if self._cancelled:
            self.status_label.setText(t(self.lang, "scan_cancelled", count=self.model.rowCount()))
            return
        previous = next((scan.devices for scan in reversed(self._snapshots)
                         if scan.target == self._scan_target), [])
        by_mac = {device.mac: device for device in previous if device.mac}
        for device in self.model._devices:
            if device.mac and device.mac in by_mac:
                device.first_seen = by_mac[device.mac].first_seen or device.first_seen
        devices = [replace(device) for device in self.model._devices]
        target = self._scan_target
        self._background(lambda: self._save_history(devices, target), self._history_loaded)
        self.status_label.setText(t(self.lang, "status_done", count=len(devices)) +
                                  f" / {time.monotonic() - self._scan_started:.1f} s")
        self.navigation.setCurrentRow(1)
        self.network_map.fit()

    @staticmethod
    def _save_history(devices: list[Device], target: str):
        history.save_snapshot(devices, target=target)
        return history.load_snapshots()

    def _on_scan_failed(self, message: str) -> None:
        self._flush_results(all_results=True)
        self._set_scanning(False)
        self._warning(message)
        self.status_label.setText(t(self.lang, "status_error"))
        QMessageBox.critical(self, t(self.lang, "status_error"), message)

    def _warning(self, message: str) -> None:
        self._warnings.add(message)
        self.warning_label.setText(" / ".join(sorted(self._warnings)))

    def _refresh_map(self, force: bool = False) -> None:
        if not force and (not self._map_dirty or self.views.currentIndex() != 1):
            return
        self._map_dirty = False
        adapter = self._scan_adapter or self.adapter_select.currentData()
        gateway, network = (adapter.gateway, adapter.network) if adapter else (None, None)
        links = {link.child: link for link in build_topology(self.model._devices, gateway, network)}
        for device in self.model._devices:
            link = links.get(device.ip)
            device.parent_ip = link.parent if link else None
            device.connection_evidence = (
                f"{'Confirmed adjacency (direction unknown)' if link.confirmed else 'Inferred logical route'}: {link.evidence}"
                if link else None)
        if self.model.rowCount():
            self.model.dataChanged.emit(self.model.index(0, 9), self.model.index(self.model.rowCount() - 1, 9))
        self.network_map.needle = self.filter_edit.text().strip().lower()
        self.network_map.refresh(self.model._devices, gateway, network)

    def _refresh_node(self, ip: str) -> None:
        if self._worker and self._worker.isRunning() or self._node_worker and self._node_worker.isRunning():
            self._warning(t(self.lang, "scan_busy"))
            return
        adapter = self._scan_adapter or self.adapter_select.currentData()
        self._node_observed.clear()
        self._node_worker = ScanWorker([ip], ScanOptions(interface_ip=adapter.ip if adapter else None), self)
        self._node_worker.device_found.connect(self._on_node_found)
        self._node_worker.failed.connect(self._warning)
        self._node_worker.warning.connect(self._warning)
        self._node_worker.finished_ok.connect(lambda: self._on_node_finished(ip))
        self._node_worker.finished.connect(lambda: self._flush_results(all_results=True))
        self._node_worker.finished.connect(self._close_when_idle)
        self._node_worker.start()

    def _on_node_found(self, device: Device) -> None:
        self._node_observed.add(device.ip)
        self._on_device_found(device)

    def _on_node_finished(self, ip: str) -> None:
        if self._close_pending or ip in self._node_observed:
            return
        device = self._observations.devices.get(ip)
        if device:
            self._on_device_found(replace(device, reachability="No response (offline unconfirmed)"))

    def _on_row_double_clicked(self, index) -> None:
        if index.isValid():
            device = self.model.device_at(self.proxy.mapToSource(index).row())
            if device:
                self._open_panel(device)

    def _open_panel(self, device: Device) -> None:
        adapter = self._scan_adapter or self.adapter_select.currentData()
        panel = DeviceControlPanel(device, list(self.model._devices),
                                   adapter.network if adapter else None, self.lang, self,
                                   allow_changes=not any(worker and worker.isRunning()
                                                         for worker in (self._worker, self._node_worker)))
        self._panels.append(panel)
        panel.device_updated.connect(self._on_device_found)
        panel.configuration_verified.connect(lambda result: self._configuration_verified(device, result))
        panel.finished.connect(lambda: self._panels.remove(panel) if panel in self._panels else None)
        panel.finished.connect(self._close_when_idle)
        panel.show()

    def _configuration_verified(self, device: Device, result: ChangeResult) -> None:
        device = self._pending.get(result.old_ip) or next(
            (entry for entry in self.model._devices if entry.ip == result.old_ip), device)
        devices = [entry for entry in self.model._devices if entry.ip != result.old_ip]
        self._pending.pop(result.old_ip, None)
        self._observations.devices.pop(result.old_ip, None)
        if result.new_ip:
            devices.append(replace(device, ip=result.new_ip, onvif_endpoint=result.endpoint,
                                   parent_ip=None, connection_evidence=None))
        self.model.clear()
        self.model.add_devices(devices)
        for entry in devices:
            self._observations.merge(entry)
        self._map_dirty = True
        self._refresh_map(force=True)
        self.status_label.setText(result.message)
        if result.new_ip:
            self._refresh_node(result.new_ip)

    def _show_conflicts(self) -> None:
        if not self._conflicts:
            QMessageBox.information(self, t(self.lang, "conflicts"), t(self.lang, "no_conflicts"))
            return
        details = "\n\n".join(
            f"POTENTIAL IP CONFLICT / {conflict.ip}\n"
            f"{', '.join(conflict.macs)}\n{', '.join(conflict.vendors)}\n"
            f"{conflict.detected_at} / {conflict.confidence} confidence\n{conflict.reason}"
            for conflict in self._conflicts)
        box = QMessageBox(self)
        box.setWindowTitle(t(self.lang, "conflicts"))
        box.setText(t(self.lang, "potential_conflicts"))
        box.setDetailedText(details)
        box.exec()

    def _export(self) -> None:
        self._flush_results(all_results=True)
        path, selected = QFileDialog.getSaveFileName(
            self, t(self.lang, "export_results"), "IPscans-scan.csv", "CSV (*.csv);;JSON (*.json)")
        if not path:
            return
        target = Path(path)
        if target.suffix.lower() not in (".csv", ".json"):
            target = target.with_suffix(".json" if "JSON" in selected else ".csv")
        devices = [self.model.device_at(self.proxy.mapToSource(self.proxy.index(row, 0)).row())
                   for row in range(self.proxy.rowCount())]
        self._background(lambda: history.export_results([d for d in devices if d], target),
                         lambda _: self.status_label.setText(str(target)))

    def _update_vendors(self) -> None:
        if self._vendor_worker and self._vendor_worker.isRunning():
            return
        self.update_vendor_btn.setEnabled(False)
        self._vendor_worker = VendorUpdateWorker(self)
        self._vendor_worker.completed.connect(lambda: self.update_vendor_btn.setEnabled(True))
        self._vendor_worker.failed.connect(self._warning)
        self._vendor_worker.finished.connect(lambda: self.update_vendor_btn.setEnabled(True))
        self._vendor_worker.finished.connect(self._close_when_idle)
        self._vendor_worker.start()

    def closeEvent(self, event) -> None:
        for panel in list(self._panels):
            panel.close()
        running = any(worker and worker.isRunning() for worker in (
            self._worker, self._node_worker, self._vendor_worker, *self._jobs))
        if running or self._panels:
            self._close_pending = True
            self._adapter_timer.stop()
            self._stop_scan()
            if self._node_worker:
                self._node_worker.stop()
            event.ignore()
            return
        super().closeEvent(event)

    def _close_when_idle(self) -> None:
        if self._close_pending:
            self.close()
