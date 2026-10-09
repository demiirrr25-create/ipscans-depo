"""Reproducible application screenshot with explicitly labelled sample data."""
import os
from pathlib import Path
import sys
from unittest.mock import patch

os.environ['QT_QPA_PLATFORM'] = 'offscreen'
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from PyQt6.QtWidgets import QApplication
from PyQt6.QtGui import QFontDatabase
from app.core.models import Device
from app.ui.main_window import MainWindow

app = QApplication([])
for font in ('segoeui.ttf', 'segoeuib.ttf', 'seguisb.ttf'):
    font_path = Path(os.environ.get('WINDIR', 'C:/Windows')) / 'Fonts' / font
    if font_path.exists():
        QFontDatabase.addApplicationFont(str(font_path))
app.setStyle('Fusion')
with patch.object(MainWindow, '_refresh_adapters'), patch.object(MainWindow, '_load_history'):
    window = MainWindow('en')
    window.resize(1440, 900)
    window.adapter_details.setText('INTERFACE PREVIEW  /  Example office network  /  192.168.10.0/24')
    window.target_input.set_value('192.168.10.0/24')
    fixture = [
        Device('192.168.10.1', hostname='office-gateway', vendor='Example Networks', open_ports=[80,443], device_type='Router', classification_confidence='High', sources=['SNMP'], snmp_sys_descr='router'),
        Device('192.168.10.2', hostname='core-switch', vendor='Example Networks', open_ports=[22,443], device_type='Switch', classification_confidence='High', sources=['SNMP']),
        Device('192.168.10.12', hostname='reception-camera', onvif_model='Camera / Reception', open_ports=[80,443,554], device_type='IP Camera', classification_confidence='High', sources=['ONVIF']),
        Device('192.168.10.14', hostname='entrance-camera', onvif_model='Camera / Entrance', open_ports=[443,554], device_type='IP Camera', classification_confidence='High', sources=['ONVIF']),
        Device('192.168.10.25', hostname='studio-printer', open_ports=[80,443], device_type='Printer', classification_confidence='Medium', sources=['mDNS']),
        Device('192.168.10.30', hostname='design-workstation', open_ports=[445,3389], device_type='Computer', classification_confidence='Medium', sources=['WMI']),
        Device('192.168.10.42', hostname='meeting-display', open_ports=[80], sources=['SSDP']),
    ]
    window.model.add_devices(fixture)
    window._update_summary()
    window.status_label.setText('INTERFACE PREVIEW  /  Example data — not a live scan')
    window.warning_label.setText('Discovery · Device evidence · Network Map · Local history · Export')
    window.show()
    app.processEvents()
    target = Path(sys.argv[1])
    target.parent.mkdir(parents=True, exist_ok=True)
    if not window.grab().save(str(target)):
        raise RuntimeError('Screenshot save failed')
    window.close()
