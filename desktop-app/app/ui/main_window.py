"""Scan -> discover -> map -> open device web interface in one responsive workspace."""
from __future__ import annotations

from dataclasses import replace
from pathlib import Path
import time

from PyQt6.QtCore import Qt, QTimer, QUrl
from PyQt6.QtGui import QAction, QDesktopServices, QKeySequence, QShortcut
from PyQt6.QtWidgets import (
    QComboBox, QFileDialog, QFrame, QHBoxLayout, QHeaderView, QLabel,
    QInputDialog, QLineEdit, QTabBar, QMenu, QMessageBox, QPushButton,
    QStackedWidget, QTableView, QVBoxLayout, QWidget,
)

from app.core import history, network_utils
from app.core.models import Device
from app.core.device_names import DeviceNames
from app.core.pdf_report import write_pdf
from app.core.registry import DeviceRegistry
from app.core.scanner import ScanOptions
from app.core.report import render_report
from app.core.targets import plan_targets
from app.core.topology import build_topology
from app.i18n import DEFAULT_LANGUAGE, t
from app.ui.scan_progress import ScanProgress
from app.ui.resources import load_logo_pixmap
from app.ui.network_map import NetworkMap
from app.ui.styles import DARK_QSS
from app.ui.widgets import DeviceFilterProxyModel, DeviceTableModel, TargetInput
from app.workers.scan_worker import ScanWorker
from app.workers.task_worker import TaskWorker


class MainWindow(QWidget):
    def __init__(self, lang: str = DEFAULT_LANGUAGE) -> None:
        super().__init__()
        self.lang = lang
        self.device_names = DeviceNames()
        self._worker: ScanWorker | None = None
        self._node_worker: ScanWorker | None = None
        self._node_observed: set[str] = set()
        self._jobs: set[TaskWorker] = set()
        self._adapters: list[network_utils.NetworkAdapter] = []
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
        self._metrics = {}
        self._scan_complete = False
        self.setObjectName("AppRoot")
        self.setWindowTitle("IPscans+ 4.3.0 / Network Intelligence")
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
        QShortcut(QKeySequence("Ctrl+F"), self, activated=self.filter_edit.setFocus)
        QShortcut(QKeySequence("F5"), self, activated=self._start_scan)
        QShortcut(QKeySequence("Escape"), self, activated=self._stop_scan)

    def _build_ui(self) -> None:
        body = QVBoxLayout(self)
        body.setContentsMargins(24, 20, 24, 16)
        body.setSpacing(16)
        heading = QHBoxLayout()
        logo = QLabel()
        logo.setPixmap(load_logo_pixmap(52))
        logo.setFixedSize(52, 52)
        heading.addWidget(logo)
        heading.addSpacing(6)
        heading.addWidget(QLabel("IPscans+", objectName="TitleText"))
        heading.addWidget(QLabel("4.3.0 / NETWORK INTELLIGENCE", objectName="VersionBadge"))
        heading.addStretch()
        self.navigation = QTabBar()
        self.navigation.setDrawBase(False)
        self.navigation.setAccessibleName(t(self.lang, "navigation"))
        self.navigation.addTab(self._v4("Scan", "Tara"))
        self.navigation.addTab(t(self.lang, "network_map"))
        heading.addWidget(self.navigation)
        body.addLayout(heading)
        self.scan_controls = QFrame(objectName="ScanCard")
        scan = QVBoxLayout(self.scan_controls)
        scan.setContentsMargins(20, 18, 20, 18)
        scan.setSpacing(12)
        heading = QHBoxLayout()
        self.adapter_select = QComboBox()
        self.adapter_select.setAccessibleName(t(self.lang, "current_adapter"))
        self.adapter_select.currentIndexChanged.connect(self._adapter_changed)
        heading.addWidget(self.adapter_select, stretch=1)
        refresh = QPushButton(t(self.lang, "refresh_adapters"))
        refresh.clicked.connect(self._refresh_adapters)
        heading.addWidget(refresh)
        scan.addLayout(heading)
        self.adapter_details = QLabel(t(self.lang, "detecting_adapter"))
        self.adapter_details.setWordWrap(True)
        scan.addWidget(self.adapter_details)
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
        scan.addLayout(row)
        self.range_estimate = QLabel(t(self.lang, "range_hint"))
        scan.addWidget(self.range_estimate)
        scan.addWidget(QLabel(self._v4('Automatic discovery · Scan only networks you own or are authorized to assess.',
            'Otomatik keşif · Yalnızca sahibi olduğunuz veya tarama yetkiniz olan ağları tarayın.')))
        body.addWidget(self.scan_controls)
        self.pages = QStackedWidget()
        body.addWidget(self.pages, stretch=1)
        self.workspace = QWidget()
        workspace = QVBoxLayout(self.workspace)
        workspace.setContentsMargins(0, 0, 0, 0)
        self.summary_label = QLabel(objectName="ResultsHeading")
        self.summary_label.setWordWrap(True)
        workspace.addWidget(self.summary_label)
        filters = QHBoxLayout()
        self.filter_edit = QLineEdit()
        self.filter_edit.setPlaceholderText(t(self.lang, "search_placeholder"))
        self.filter_edit.setAccessibleName(t(self.lang, "search_placeholder"))
        self.filter_edit.setPlaceholderText(self._v4('Search devices…  port:443  source:ONVIF  -type:Unknown',
            'Cihaz ara…  port:443  source:ONVIF  -type:Unknown'))
        self.filter_edit.setToolTip('ip:192.168.1.0/24  port:443  vendor:Axis  type:"IP Camera"  source:ONVIF  -type:Unknown')
        self.filter_edit.textChanged.connect(self._filter)
        filters.addWidget(self.filter_edit, stretch=1)
        columns = QPushButton(t(self.lang, "columns"))
        columns.clicked.connect(lambda: self._column_menu(self.table.horizontalHeader().rect().bottomLeft()))
        filters.addWidget(columns)
        self.columns_button = columns
        self.conflicts_button = QPushButton(t(self.lang, "conflicts"))
        self.conflicts_button.clicked.connect(self._show_conflicts)
        filters.addWidget(self.conflicts_button)
        export = QPushButton(self._v4('Export report', 'Raporu dışa aktar'))
        self.export_button = export
        export.setToolTip(self._v4('Save a PDF with your device names', 'Cihaz isimlerinizi içeren PDF raporu kaydedin'))
        export.clicked.connect(self._export)
        filters.addWidget(export)
        workspace.addLayout(filters)
        self.views = QStackedWidget()
        self.table = self._build_table()
        self.network_map = NetworkMap(self.lang)
        self.network_map.device_activated.connect(self._open_device)
        self.network_map.rename_requested.connect(self._rename_device, Qt.ConnectionType.QueuedConnection)
        self.network_map.refresh_requested.connect(self._refresh_node)
        self.views.addWidget(self.table)
        self.views.addWidget(self.network_map)
        workspace.addWidget(self.views, stretch=1)
        self.pages.addWidget(self.workspace)
        self.progress_bar = ScanProgress(self)
        self.progress_bar.setAccessibleName(self._v4("Scan progress", "Tarama ilerlemesi"))
        self.progress_bar.setVisible(False)
        body.addWidget(self.progress_bar)
        self.status_label = QLabel(t(self.lang, "status_ready"), objectName="StatusLabel")
        self.status_label.setWordWrap(True)
        body.addWidget(self.status_label)
        self.warning_label = QLabel()
        self.warning_label.setWordWrap(True)
        self.warning_label.setVisible(False)
        body.addWidget(self.warning_label)
        self.navigation.currentChanged.connect(self._navigate)
        self.navigation.setCurrentIndex(0)
        self._update_summary()

    def _v4(self, en: str, tr: str) -> str:
        return tr if self.lang == 'tr' else en

    def _on_metrics(self, metrics: dict) -> None:
        self._metrics = dict(metrics)

    def _build_table(self) -> QTableView:
        table = QTableView()
        table.setAccessibleName(t(self.lang, "view_table"))
        self.model = DeviceTableModel(self.lang)
        self.proxy = DeviceFilterProxyModel()
        self.proxy.setSourceModel(self.model)
        table.setModel(self.proxy)
        table.setAlternatingRowColors(True)
        table.setShowGrid(False)
        table.verticalHeader().setDefaultSectionSize(46)
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
        table.setContextMenuPolicy(Qt.ContextMenuPolicy.CustomContextMenu)
        table.customContextMenuRequested.connect(self._device_menu)
        QShortcut(QKeySequence('F2'), table, activated=self._rename_selected)
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
            count = len(self._planned_targets())
        except network_utils.InvalidTargetError as exc:
            self.range_estimate.setText(str(exc))
            return
        self.range_estimate.setText(t(self.lang, "range_estimate", count=count))

    def _planned_targets(self) -> list[str]:
        return plan_targets(self.target_input.spec())

    def _navigate(self, index: int) -> None:
        self.views.setCurrentIndex(index)
        for widget in (self.scan_controls, self.summary_label, self.columns_button):
            widget.setVisible(index == 0)
        if index == 1:
            self._refresh_map(force=True)
            QTimer.singleShot(0, self.network_map.fit)

    def _filter(self, text: str) -> None:
        self.proxy.set_filter_text(text)
        self._map_dirty = True
        if self.views.currentIndex() == 1:
            self.network_map.set_filter_text(text)

    def _start_scan(self) -> None:
        if self._worker and self._worker.isRunning() or self._node_worker and self._node_worker.isRunning():
            return
        try:
            targets = self._planned_targets()
            options = ScanOptions(adaptive=True, fingerprint=True,
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
        self._cancelled = False
        self._scan_complete = False
        self._metrics = {}
        self._pending.clear()
        self._observations = DeviceRegistry()
        self._conflicts.clear()
        self._warnings.clear()
        self.warning_label.clear()
        self.warning_label.hide()
        self.model.clear()
        self._update_summary()
        self.network_map.collapsed.clear()
        self.network_map.refresh([])
        self._scan_target = self.target_input.spec()
        self._scan_adapter = self.adapter_select.currentData()
        self._scan_started = time.monotonic()
        self.progress_bar.reset()
        self._set_scanning(True)
        self.progress_bar.setRange(0, len(targets))
        self.progress_bar.setValue(0)
        self.status_label.setText(t(self.lang, "status_discovering", count=len(targets)))
        self.navigation.setCurrentIndex(0)
        self._worker = ScanWorker(targets, options, self)
        self._worker.device_found.connect(self._on_device_found)
        self._worker.progress.connect(self._on_progress)
        self._worker.phase_changed.connect(self._on_phase_changed)
        self._worker.conflicts_found.connect(self._on_conflicts)
        self._worker.warning.connect(self._warning)
        self._worker.metrics.connect(self._on_metrics)
        self._worker.finished_ok.connect(self._on_scan_finished)
        self._worker.failed.connect(self._on_scan_failed)
        self._worker.finished.connect(self._close_when_idle)
        self._worker.start()

    def _set_scanning(self, active: bool) -> None:
        self.scan_btn.setEnabled(not active)
        self.stop_btn.setEnabled(active)
        self.target_input.setEnabled(not active)
        self.adapter_select.setEnabled(not active)
        self.progress_bar.setVisible(active)
        self.proxy.setDynamicSortFilter(not active)

    def _stop_scan(self) -> None:
        if self._worker and self._worker.isRunning():
            self._cancelled = True
            self._worker.stop()
            self.status_label.setText(t(self.lang, "status_stopping"))

    def _on_device_found(self, device: Device) -> None:
        merged = self._observations.merge(device)
        merged.custom_name = self.device_names.get(self._name_scope(), merged) or None
        self._pending[device.ip] = merged
        self._on_conflicts(self._observations.conflicts)

    def _flush_results(self, all_results: bool = False) -> None:
        keys = list(self._pending)[:len(self._pending) if all_results else 256]
        if keys:
            self.model.add_devices([self._pending.pop(ip) for ip in keys])
            self._map_dirty = True
        if keys:
            self._update_summary()

    def _update_summary(self) -> None:
        devices = self.model._devices
        self.summary_label.setText(self._v4(
            f"{len(devices)} devices  ·  Double-click to open the web interface ↗",
            f"{len(devices)} cihaz  ·  Web arayüzünü açmak için çift tıklayın ↗"))
        self.conflicts_button.setText(f"{t(self.lang, 'conflicts')} ({len(self._conflicts)})")

    def _on_conflicts(self, conflicts) -> None:
        self._conflicts = list({conflict.ip: conflict for conflict in (*self._conflicts, *conflicts)}.values())

    def _on_phase_changed(self, phase: str) -> None:
        labels = {
            "discovering network": self._v4("Discovering your network", "Ağınız keşfediliyor"),
            "identifying devices": self._v4("Identifying devices", "Cihazlar tanımlanıyor"),
            "building network topology": self._v4("Preparing the network map", "Ağ haritası hazırlanıyor"),
        }
        if phase != "discovering network":
            # Discovery totals do not measure enrichment: show activity, not a false 100%.
            self.progress_bar.setRange(0, 0)
        self.status_label.setText(labels.get(phase, phase))

    def _on_progress(self, done: int, total: int) -> None:
        self.progress_bar.setRange(0, max(total, 1))
        self.progress_bar.setValue(done)
        self.status_label.setText(t(self.lang, "status_scanning", done=done, total=total,
                                   found=self.model.rowCount()))

    def _on_scan_finished(self) -> None:
        self._flush_results(all_results=True)
        self._set_scanning(False)
        self._refresh_map(force=True)
        if self._cancelled:
            self.status_label.setText(t(self.lang, "scan_cancelled", count=self.model.rowCount()))
            return
        self._scan_complete = True
        devices = self.model._devices
        self.status_label.setText(t(self.lang, "status_done", count=len(devices)))
        if self.views.currentIndex() == 1:
            self.network_map.fit()

    def _on_scan_failed(self, message: str) -> None:
        self._flush_results(all_results=True)
        self._set_scanning(False)
        self._warning(message)
        self.status_label.setText(t(self.lang, "status_error"))
        QMessageBox.critical(self, t(self.lang, "status_error"), message)

    def _warning(self, message: str) -> None:
        self.warning_label.show()
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
        self._node_worker = ScanWorker([ip], ScanOptions(adaptive=True, fingerprint=True, interface_ip=adapter.ip if adapter else None), self)
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
                self._open_device(device)

    def _open_device(self, device: Device) -> None:
        try:
            url = QUrl(device.url)
        except ValueError:
            self._warning(self._v4("The device IP address is invalid.", "Cihazın IP adresi geçersiz."))
            return
        if not QDesktopServices.openUrl(url):
            self._warning(self._v4("Could not open the default browser.", "Varsayılan tarayıcı açılamadı."))

    def _name_scope(self) -> str:
        adapter = self._scan_adapter or self.adapter_select.currentData()
        return f'{adapter.name}|{adapter.network}|{adapter.gateway}' if adapter else self._scan_target or 'manual'

    def _rename_selected(self) -> None:
        index = self.table.currentIndex()
        if index.isValid():
            device = self.model.device_at(self.proxy.mapToSource(index).row())
            if device:
                self._rename_device(device)

    def _device_menu(self, position) -> None:
        index = self.table.indexAt(position)
        if not index.isValid():
            return
        device = self.model.device_at(self.proxy.mapToSource(index).row())
        menu = QMenu(self)
        rename = menu.addAction(t(self.lang, 'rename_device'))
        open_device = menu.addAction(t(self.lang, 'open_device'))
        chosen = menu.exec(self.table.viewport().mapToGlobal(position))
        if chosen == rename:
            self._rename_device(device)
        elif chosen == open_device:
            self._open_device(device)

    def _rename_device(self, device: Device) -> None:
        name, accepted = QInputDialog.getText(self, t(self.lang, 'rename_device'),
            self._v4(f'{device.ip} · Up to 80 characters. Leave empty to reset.',
                     f'{device.ip} · En fazla 80 karakter. Sıfırlamak için boş bırakın.'),
            text=device.custom_name or '')
        if not accepted:
            return
        try:
            name = self.device_names.set(self._name_scope(), device, name)
        except (OSError, ValueError) as exc:
            QMessageBox.warning(self, t(self.lang, 'rename_device'), str(exc))
            return
        # Update all live references, including results already queued by a scan.
        for entry in [device, *self.model._devices, *self._pending.values(), *self._observations.devices.values()]:
            if entry.ip == device.ip:
                entry.custom_name = name or None
        row = self.model._rows_by_ip.get(device.ip)
        if row is not None:
            self.model.dataChanged.emit(self.model.index(row, 0), self.model.index(row, self.model.columnCount()-1))
        self._refresh_map(force=True)
        self.status_label.setText(self._v4('Device name saved locally.', 'Cihaz adı bu bilgisayara kaydedildi.'))

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
            self, self._v4('Export report', 'Raporu dışa aktar'), "IPscans-report.pdf", "PDF (*.pdf);;HTML (*.html);;CSV (*.csv);;JSON (*.json)")
        if not path:
            return
        target = Path(path)
        if target.suffix.lower() not in (".csv", ".json", '.html', '.pdf'):
            target = target.with_suffix('.pdf' if 'PDF' in selected else '.html' if 'HTML' in selected else '.json' if 'JSON' in selected else '.csv')
        devices = [self.model.device_at(self.proxy.mapToSource(self.proxy.index(row, 0)).row())
                   for row in range(self.proxy.rowCount())]
        devices = [replace(d) for d in devices if d]
        report_options = dict(target=self._scan_target, profile=self._metrics.get('profile', ''),
                              completed=self._scan_complete, metrics=dict(self._metrics))
        self.export_button.setEnabled(False)
        self.status_label.setText(self._v4('Preparing your report…', 'Raporunuz hazırlanıyor…'))
        def save():
            if target.suffix.lower() == '.pdf':
                return write_pdf(devices, target, target=report_options['target'], completed=report_options['completed'], lang=self.lang)
            if target.suffix.lower() == '.html':
                return target.write_text(render_report(devices, **report_options), encoding='utf-8')
            return history.export_results(devices, target)
        def done(_):
            self.export_button.setEnabled(True)
            self.status_label.setText(self._v4('Report saved: ', 'Rapor kaydedildi: ') + str(target))
        def failed(message):
            self.export_button.setEnabled(True)
            self._warning(message)
            QMessageBox.warning(self, self._v4('Export failed', 'Rapor kaydedilemedi'), message)
        self._background(save, done, failed)

    def closeEvent(self, event) -> None:
        running = any(worker and worker.isRunning() for worker in (
            self._worker, self._node_worker, *self._jobs))
        if running:
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
