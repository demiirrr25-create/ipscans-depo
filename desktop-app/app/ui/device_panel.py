"""Device details and explicitly confirmed, authenticated network operations."""
from __future__ import annotations

from dataclasses import replace
import webbrowser

from PyQt6.QtCore import Qt, pyqtSignal
from PyQt6.QtWidgets import (
    QApplication, QCheckBox, QDialog, QFileDialog, QFormLayout, QHBoxLayout, QLabel,
    QLineEdit, QInputDialog, QMessageBox, QPushButton, QTextEdit, QVBoxLayout,
)

from app.core import network_utils
from app.core.adapters import (
    ChangeResult, Credentials, ManagementError, NetworkConfiguration, ONVIFAdapter,
    adapter_capabilities, change_network_configuration, validate_configuration,
)
from app.core.models import Device
from app.i18n import t
from app.workers.task_worker import TaskWorker


class DeviceControlPanel(QDialog):
    device_updated = pyqtSignal(object)
    configuration_verified = pyqtSignal(object)

    def __init__(self, device: Device, known_devices: list[Device],
                 local_network: str | None, lang: str = "en", parent=None, *, allow_changes: bool = True) -> None:
        super().__init__(parent)
        self.device, self.known_devices, self.local_network, self.lang = device, known_devices, local_network, lang
        self._adapter: ONVIFAdapter | None = None
        self._configuration: NetworkConfiguration | None = None
        self._worker: TaskWorker | None = None
        self._closing = False
        self._allow_changes = allow_changes
        self.setWindowTitle(f"{t(lang, 'device_details')} / {device.ip}")
        self.resize(620, 760)
        self.setAttribute(Qt.WidgetAttribute.WA_DeleteOnClose)
        self.setWindowModality(Qt.WindowModality.WindowModal)
        layout = QVBoxLayout(self)
        title = QLabel(f"{device.device_type} / {device.ip} / {device.reachability}")
        title.setWordWrap(True)
        layout.addWidget(title)
        self.details = QTextEdit()
        self.details.setReadOnly(True)
        self.details.setMaximumHeight(180)
        self.details.setAccessibleName(t(lang, "device_details"))
        self._refresh_details()
        layout.addWidget(self.details)
        actions = QHBoxLayout()
        for key, operation in (
            ("open_device", lambda: webbrowser.open(self.device.url)),
            ("copy_ip", lambda: QApplication.clipboard().setText(self.device.ip)),
            ("ping_test", self._test_reachability),
        ):
            button = QPushButton(t(lang, key))
            button.clicked.connect(operation)
            actions.addWidget(button)
        layout.addLayout(actions)
        topology_button = QPushButton('Read topology / SNMP' if lang != 'tr' else 'Bağlantıları oku / SNMP')
        topology_button.clicked.connect(self._read_topology)
        layout.addWidget(topology_button)
        form = QFormLayout()
        self.username, self.password, self.ca_bundle = QLineEdit(), QLineEdit(), QLineEdit()
        self.password.setEchoMode(QLineEdit.EchoMode.Password)
        self.password.setAccessibleName(t(lang, "password"))
        self.ca_bundle.setPlaceholderText(t(lang, "trusted_ca"))
        form.addRow(t(lang, "username"), self.username)
        form.addRow(t(lang, "password"), self.password)
        ca_row = QHBoxLayout()
        ca_row.addWidget(self.ca_bundle)
        choose_ca = QPushButton(t(lang, "choose_ca"))
        choose_ca.clicked.connect(self._choose_ca)
        ca_row.addWidget(choose_ca)
        form.addRow(t(lang, "trusted_ca"), ca_row)
        layout.addLayout(form)
        self.read_button = QPushButton(t(lang, "read_configuration"))
        self.read_button.clicked.connect(self._read_configuration)
        layout.addWidget(self.read_button)
        network_form = QFormLayout()
        self.ip, self.mask, self.gateway, self.dns = QLineEdit(), QLineEdit(), QLineEdit(), QLineEdit()
        self.dhcp = QCheckBox(t(lang, "dhcp"))
        self.dns_dhcp = QCheckBox(t(lang, "dns_from_dhcp"))
        self.dhcp.toggled.connect(self._enable_configuration_fields)
        self.dns_dhcp.toggled.connect(self._enable_configuration_fields)
        network_form.addRow(self.dhcp)
        for key, field in (("col_ip", self.ip), ("subnet_mask", self.mask),
                           ("gateway", self.gateway), ("dns_servers", self.dns)):
            network_form.addRow(t(lang, key), field)
        network_form.addRow(self.dns_dhcp)
        layout.addLayout(network_form)
        self.apply_button = QPushButton(t(lang, "apply_changes"), objectName="PrimaryButton")
        self.apply_button.clicked.connect(self._apply)
        self.apply_button.setEnabled(False)
        layout.addWidget(self.apply_button)
        self.status = QLabel(adapter_capabilities(device).reason)
        self.status.setWordWrap(True)
        layout.addWidget(self.status)
        if not allow_changes:
            layout.addWidget(QLabel(t(lang, "scan_read_only")))
        layout.addWidget(QLabel(t(lang, "credentials_notice")))
        supported = adapter_capabilities(device).read_network
        for field in (self.username, self.password, self.ca_bundle, choose_ca, self.read_button):
            field.setEnabled(supported)
        self._enable_configuration_fields()

    def _refresh_details(self) -> None:
        device = self.device
        fields = {
            "IP": device.ip, "MAC": device.mac, "Hostname": device.hostname, "Vendor": device.vendor,
            "Type": f"{device.device_type} / {device.classification_confidence} confidence",
            "Evidence": device.classification_evidence, "Model": device.onvif_model or device.model,
            "Evidence score (not accuracy %)": f'{device.identification_score}/100',
            "HTTP identity": device.http_title or device.http_server, "RTSP identity": device.rtsp_server,
            "Serial": device.serial_number, "Firmware": device.onvif_firmware,
            "Parent / connection": device.connection_evidence,
            "TCP connect time": f"{device.latency_ms:.1f} ms" if device.latency_ms is not None else None,
            "First seen": device.first_seen, "Last seen": device.last_seen,
            "Sources": ", ".join(device.sources), "Ports": ", ".join(map(str, device.open_ports)),
        }
        self.details.setPlainText("\n".join(f"{key}: {value or 'Unavailable'}" for key, value in fields.items()))

    def _read_topology(self) -> None:
        if self._worker and self._worker.isRunning():
            return
        secret, accepted = QInputDialog.getText(self, 'Authorized SNMPv2c',
            'Read-only community for this device (session only; SNMPv2c is unencrypted):', QLineEdit.EchoMode.Password)
        if not accepted or not secret:
            return
        from app.core.protocols import snmp_probe
        from app.core import intelligence
        def received(result):
            if not result:
                self.status.setText('No authorized SNMP response; topology remains unresolved.')
                return
            self.device = replace(self.device, snmp_sys_descr=result.sys_descr, snmp_sys_name=result.sys_name,
                model=result.model or self.device.model,
                serial_number=result.serial_number or self.device.serial_number,
                lldp_neighbor_macs=list(result.lldp_neighbor_macs), cdp_neighbor_ips=list(result.cdp_neighbor_ips),
                bridge_fdb=list(result.bridge_fdb), sources=list(set(self.device.sources) | {'SNMP'}))
            intelligence.classify(self.device)
            self.device_updated.emit(self.device)
            self._refresh_details()
            self.status.setText('SNMP observations received. Forwarding paths are marked as inferred.')
        self._run(lambda: snmp_probe.query(self.device.ip, secret), received)

    def _choose_ca(self) -> None:
        path, _ = QFileDialog.getOpenFileName(self, t(self.lang, "trusted_ca"), "", "Certificates (*.pem *.crt)")
        if path:
            self.ca_bundle.setText(path)

    def _run(self, operation, completed) -> None:
        if self._worker and self._worker.isRunning():
            return
        self.read_button.setEnabled(False)
        self.apply_button.setEnabled(False)
        self._worker = TaskWorker(operation, self)
        self._worker.completed.connect(completed)
        self._worker.failed.connect(self._failed)
        self._worker.finished.connect(self._idle)
        self._worker.start()
        self.status.setText(t(self.lang, "operation_running"))
        self._enable_configuration_fields()

    def _idle(self) -> None:
        if self._closing:
            self.close()
            return
        self.read_button.setEnabled(adapter_capabilities(self.device).read_network)
        self.apply_button.setEnabled(bool(self._configuration and self._adapter
                                         and self._adapter.get_capabilities().write_network and self._allow_changes))
        self._enable_configuration_fields()

    def _failed(self, message: str) -> None:
        self.status.setText(message)
        QMessageBox.warning(self, t(self.lang, "device_details"), message)

    def _read_configuration(self) -> None:
        credentials = Credentials(self.username.text().strip(), self.password.text())
        if not credentials.username or not credentials.password:
            self._failed("Enter your own username and password; no default password is attempted.")
            return
        if self._adapter:
            self._adapter.close()
        try:
            self._adapter = ONVIFAdapter(self.device, self.ca_bundle.text().strip() or None)
        except ManagementError as exc:
            self._failed(str(exc))
            return
        self._configuration = None
        adapter = self._adapter

        def read():
            identity = adapter.authenticate(credentials)
            configuration = adapter.get_network_configuration()
            return identity, configuration

        self._run(read, self._configuration_loaded)
        self.password.clear()

    def _configuration_loaded(self, result) -> None:
        identity, configuration = result
        self.device = replace(
            self.device, onvif_manufacturer=identity.manufacturer, onvif_model=identity.model,
            onvif_firmware=identity.firmware, serial_number=identity.serial,
            sources=sorted(set(self.device.sources) | {"Authenticated ONVIF"}),
        )
        self._refresh_details()
        self.device_updated.emit(self.device)
        self._configuration = configuration
        self.ip.setText(configuration.ip)
        self.mask.setText(configuration.subnet_mask)
        self.gateway.setText(configuration.gateway or "")
        self.dns.setText(", ".join(configuration.dns))
        self.dhcp.setChecked(configuration.dhcp)
        self.dns_dhcp.setChecked(configuration.dns_from_dhcp)
        self.status.setText(self._adapter.get_capabilities().reason or t(self.lang, "configuration_loaded"))

    def _enable_configuration_fields(self, *_args) -> None:
        enabled = bool(self._configuration and not (self._worker and self._worker.isRunning()))
        for field in (self.ip, self.mask, self.gateway):
            field.setEnabled(enabled and not self.dhcp.isChecked())
        self.dns.setEnabled(enabled and not self.dns_dhcp.isChecked())
        self.dhcp.setEnabled(enabled and bool(self._adapter and self._adapter.get_capabilities().configure_dhcp))
        self.dhcp.setToolTip("" if self.dhcp.isEnabled()
                             else "Changing DHCP requires a stable WS-Discovery identity for safe rediscovery.")
        self.dns_dhcp.setEnabled(enabled)

    def _apply(self) -> None:
        if not self._allow_changes:
            self._failed(t(self.lang, "scan_read_only"))
            return
        if not self._configuration or not self._adapter:
            self._failed("Read the authenticated device configuration first.")
            return
        configuration = replace(
            self._configuration, ip=self.ip.text().strip(), subnet_mask=self.mask.text().strip(),
            gateway=self.gateway.text().strip() or None,
            dns=tuple(value.strip() for value in self.dns.text().split(",") if value.strip()),
            dhcp=self.dhcp.isChecked(), dns_from_dhcp=self.dns_dhcp.isChecked(),
        )
        try:
            validate_configuration(configuration, self.local_network)
        except ManagementError as exc:
            self._failed(str(exc))
            return
        preview = (
            f"{self.device.ip} -> {'DHCP (address assigned by the network)' if configuration.dhcp else configuration.ip}\n"
            f"Mask: {configuration.subnet_mask}\nGateway: {configuration.gateway or 'None'}\n"
            f"DNS: {'DHCP' if configuration.dns_from_dhcp else ', '.join(configuration.dns) or 'None'}\n\n"
            "Only proceed if you are authorized to configure this device. The device may disconnect or "
            "require a reboot. No response during collision checks does not prove an IP is free. "
            "DNS, gateway and interface writes are not atomic; partial changes are possible."
        )
        if QMessageBox.question(self, t(self.lang, "confirm_change"), preview,
                                QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No,
                                QMessageBox.StandardButton.No) != QMessageBox.StandardButton.Yes:
            return
        adapter = self._adapter
        self._configuration = None
        self._run(lambda: change_network_configuration(
            adapter, configuration, self.known_devices, self.local_network,
            should_stop=lambda: bool(self._worker and self._worker.isInterruptionRequested()),
        ), self._changed)

    def _changed(self, result: ChangeResult) -> None:
        self.status.setText(result.message)
        self._configuration = None
        if result.verified and result.new_ip and result.configuration:
            self.configuration_verified.emit(result)
            self.close()
        else:
            QMessageBox.warning(self, t(self.lang, "apply_changes"), result.message)

    def _test_reachability(self) -> None:
        def probe():
            icmp = network_utils.ping_once(self.device.ip)
            ports = network_utils.scan_ports(self.device.ip)
            return f"ICMP: {'responded' if icmp else 'no response'} / TCP ports: {', '.join(map(str, ports)) or 'no response'}"
        self._run(probe, self.status.setText)

    def closeEvent(self, event) -> None:
        if self._worker and self._worker.isRunning():
            self._closing = True
            self._worker.requestInterruption()
            event.ignore()
            return
        if self._adapter:
            self._adapter.close()
        self.password.clear()
        super().closeEvent(event)
