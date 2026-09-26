"""Main application window: a normal, resizable/maximizable OS window with
a dark theme applied throughout — houses the target selector, live filter
bar and the device results table.
"""
from __future__ import annotations

import webbrowser

from PyQt6.QtWidgets import (
    QCheckBox,
    QFrame,
    QHBoxLayout,
    QHeaderView,
    QLabel,
    QLineEdit,
    QMessageBox,
    QProgressBar,
    QPushButton,
    QTableView,
    QVBoxLayout,
    QWidget,
)

from app.core import network_utils
from app.core.models import Device
from app.core.network_utils import InvalidTargetError
from app.core.scanner import ScanOptions
from app.ui.resources import load_logo_pixmap
from app.ui.styles import DARK_QSS
from app.ui.widgets import DeviceFilterProxyModel, DeviceTableModel, TargetInput, section_label
from app.workers.scan_worker import ScanWorker


class MainWindow(QWidget):
    def __init__(self) -> None:
        super().__init__()
        self._worker: ScanWorker | None = None

        self.setObjectName("AppRoot")
        self.setWindowTitle("ipscans — Ağ Tarayıcı")
        # A plain, native window: resizable and maximizable out of the box.
        # (A previous frameless/translucent version caused unreadable,
        # partially-unstyled rendering on real Windows and blocked maximize.)
        self.resize(1180, 760)
        self.setMinimumSize(900, 600)
        self.setStyleSheet(DARK_QSS)

        self._build_ui()
        self._wire_signals()
        self._prefill_detected_network()

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
        body.addWidget(self._build_table(), stretch=1)
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
        title = QLabel("ipscans", objectName="TitleText")
        subtitle = QLabel("Derin Ağ Tarama Aracı", objectName="SubtitleText")
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

        layout.addWidget(section_label("Tarama Hedefi"))

        row = QHBoxLayout()
        row.setSpacing(10)
        self.target_input = TargetInput()
        row.addWidget(self.target_input, stretch=1)

        self.scan_btn = QPushButton("▶  Taramayı Başlat", objectName="PrimaryButton")
        self.stop_btn = QPushButton("■  Durdur", objectName="GhostButton")
        self.stop_btn.setEnabled(False)
        row.addWidget(self.scan_btn)
        row.addWidget(self.stop_btn)
        layout.addLayout(row)

        options_row = QHBoxLayout()
        options_row.setSpacing(16)
        options_row.addWidget(section_label("Protokoller"))
        self.snmp_check = QCheckBox("SNMP")
        self.snmp_check.setChecked(True)
        self.upnp_check = QCheckBox("UPnP")
        self.upnp_check.setChecked(True)
        self.wmi_check = QCheckBox("WMI (yerel)")
        self.wmi_check.setChecked(True)
        self.nmap_check = QCheckBox("Nmap (yavaş)")
        self.nmap_check.setChecked(False)
        for chk in (self.snmp_check, self.upnp_check, self.wmi_check, self.nmap_check):
            options_row.addWidget(chk)
        options_row.addStretch(1)
        layout.addLayout(options_row)

        return card

    def _build_filter_bar(self) -> QWidget:
        wrap = QWidget()
        layout = QHBoxLayout(wrap)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(8)

        self.filter_edit = QLineEdit()
        self.filter_edit.setPlaceholderText(
            "Ara: IP, üretici veya MAC adresine göre anında filtrele..."
        )
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

        self.model = DeviceTableModel()
        self.proxy = DeviceFilterProxyModel()
        self.proxy.setSourceModel(self.model)
        self.table.setModel(self.proxy)
        self.table.doubleClicked.connect(self._on_row_double_clicked)
        return self.table

    def _build_status_bar(self) -> QHBoxLayout:
        layout = QHBoxLayout()
        self.status_label = QLabel("Hazır.", objectName="StatusLabel")
        self.progress_bar = QProgressBar()
        self.progress_bar.setFixedWidth(160)
        self.progress_bar.setRange(0, 100)
        self.progress_bar.setValue(0)
        layout.addWidget(self.status_label, stretch=1)
        layout.addWidget(self.progress_bar)
        return layout

    # --------------------------------------------------------------- wiring
    def _wire_signals(self) -> None:
        self.scan_btn.clicked.connect(self._start_scan)
        self.stop_btn.clicked.connect(self._stop_scan)
        self.filter_edit.textChanged.connect(self.proxy.set_filter_text)

    def _prefill_detected_network(self) -> None:
        """Auto-detects the machine's local /24 and writes a ready-to-scan
        range into the target field, so most users can just press Start.
        """
        suggestion = network_utils.suggest_range_spec()
        if suggestion:
            self.target_input.set_value(suggestion)
            self.status_label.setText(f"Algılanan yerel ağ: {suggestion}")

    # ------------------------------------------------------------- actions
    def _start_scan(self) -> None:
        spec = self.target_input.spec()
        try:
            targets = network_utils.parse_targets(spec)
        except InvalidTargetError as exc:
            QMessageBox.warning(self, "Geçersiz hedef", str(exc))
            return

        self.model.clear()
        self.progress_bar.setValue(0)
        self.status_label.setText(f"{len(targets)} adres taranıyor...")
        self.scan_btn.setEnabled(False)
        self.stop_btn.setEnabled(True)

        options = ScanOptions(
            enable_snmp=self.snmp_check.isChecked(),
            enable_upnp=self.upnp_check.isChecked(),
            enable_wmi=self.wmi_check.isChecked(),
            enable_nmap=self.nmap_check.isChecked(),
        )

        self._worker = ScanWorker(targets, options)
        self._worker.device_found.connect(self._on_device_found)
        self._worker.progress.connect(self._on_progress)
        self._worker.finished_ok.connect(self._on_scan_finished)
        self._worker.failed.connect(self._on_scan_failed)
        self._worker.start()

    def _stop_scan(self) -> None:
        if self._worker:
            self._worker.stop()
        self.status_label.setText("Durduruluyor...")

    def _on_device_found(self, device: Device) -> None:
        self.model.add_device(device)

    def _on_progress(self, done: int, total: int) -> None:
        percent = int((done / total) * 100) if total else 0
        self.progress_bar.setValue(percent)
        self.status_label.setText(f"{done}/{total} tarandı — {self.model.rowCount()} cihaz bulundu")

    def _on_scan_finished(self) -> None:
        self.scan_btn.setEnabled(True)
        self.stop_btn.setEnabled(False)
        self.status_label.setText(f"Tamamlandı — {self.model.rowCount()} cihaz bulundu")

    def _on_scan_failed(self, message: str) -> None:
        self.scan_btn.setEnabled(True)
        self.stop_btn.setEnabled(False)
        self.status_label.setText("Tarama hatası")
        QMessageBox.critical(self, "Tarama hatası", message)

    def _on_row_double_clicked(self, proxy_index) -> None:
        source_index = self.proxy.mapToSource(proxy_index)
        device = self.model.device_at(source_index.row())
        if device:
            # The "clickable IP" feature: opens the device's web UI in the
            # user's default browser (https if a secure port is open).
            webbrowser.open(device.url)
