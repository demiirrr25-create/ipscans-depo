import os
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

os.environ.setdefault('QT_QPA_PLATFORM', 'offscreen')
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from PyQt6.QtCore import QModelIndex, Qt, QVariantAnimation
from PyQt6.QtWidgets import QApplication, QLabel
from app.core.models import Device
from app.ui.main_window import MainWindow


class Desktop42Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = QApplication.instance() or QApplication([])

    def setUp(self):
        self.adapters = patch.object(MainWindow, '_refresh_adapters')
        self.adapters.start()
        self.window = MainWindow('en')
        self.window.show()
        self.app.processEvents()

    def tearDown(self):
        self.window.close()
        self.app.processEvents()
        self.adapters.stop()

    def test_filtered_sorted_double_click_opens_only_selected_ip(self):
        self.window.model.add_devices([
            Device('192.0.2.8', hostname='camera-eight', open_ports=[443]),
            Device('192.0.2.2', hostname='camera-two', open_ports=[8080]),
            Device('192.0.2.1', hostname='printer'),
        ])
        self.window.filter_edit.setText('camera')
        self.window.table.sortByColumn(0, Qt.SortOrder.DescendingOrder)
        with patch('app.ui.main_window.QDesktopServices.openUrl', return_value=True) as browser:
            self.window.table.doubleClicked.emit(self.window.proxy.index(0, 0))
            self.assertEqual(browser.call_args.args[0].toString(), 'https://192.0.2.8')
            self.assertEqual(browser.call_count, 1)
            self.window._on_row_double_clicked(QModelIndex())
            self.assertEqual(browser.call_count, 1)
        self.assertFalse(hasattr(self.window, '_panels'))
        self.assertFalse(hasattr(self.window, '_configuration_verified'))

    def test_map_opens_default_browser_and_reports_launch_failure(self):
        with patch('app.ui.main_window.QDesktopServices.openUrl', return_value=False) as browser:
            self.window.network_map.device_activated.emit(Device('2001:db8::1', open_ports=[443]))
            self.assertEqual(browser.call_args.args[0].toString(), 'https://[2001:db8::1]')
        self.assertIn('default browser', self.window.warning_label.text())

    def test_invalid_ip_never_dispatches_browser(self):
        with patch('app.ui.main_window.QDesktopServices.openUrl') as browser:
            self.window._open_device(Device('example.com/path'))
            browser.assert_not_called()

    def test_web_port_preference_and_untrusted_names(self):
        for ports, url in [([], 'http://192.0.2.1'), ([443,80], 'https://192.0.2.1'),
                           ([8443], 'https://192.0.2.1:8443'), ([8080], 'http://192.0.2.1:8080'),
                           ([80,8443], 'http://192.0.2.1')]:
            self.assertEqual(Device('192.0.2.1', open_ports=ports, hostname='evil.invalid').url, url)

    def test_progress_phases_and_idle_animation_lifecycle(self):
        bar = self.window.progress_bar
        self.window._set_scanning(True)
        self.window._on_progress(4, 10)
        self.assertEqual((bar.value(), bar.maximum()), (4, 10))
        self.window._on_phase_changed('identifying devices')
        self.assertEqual((bar.minimum(), bar.maximum()), (0, 0))
        self.window._on_scan_finished()
        self.assertFalse(bar.isVisible())
        self.assertEqual(bar._flow.state(), QVariantAnimation.State.Stopped)
        self.assertEqual(bar._smooth.state(), QVariantAnimation.State.Stopped)
        self.assertTrue(self.window.scan_btn.isEnabled())

    def test_reduced_motion_and_removed_telemetry_labels(self):
        with patch('app.ui.scan_progress.animations_enabled', return_value=False):
            self.window._set_scanning(True)
            self.window._on_progress(5, 10)
            bar = self.window.progress_bar
            self.assertEqual(bar._fraction, 0.5)
            self.assertEqual(bar._flow.state(), QVariantAnimation.State.Stopped)
            self.assertEqual(bar._smooth.state(), QVariantAnimation.State.Stopped)
        self.window._on_metrics({'hosts_per_second': 99, 'elapsed_seconds': 3})
        labels = ' '.join(label.text() for label in self.window.findChildren(QLabel)).upper()
        self.assertNotIn('HOSTS / SECOND', labels)
        self.assertNotIn('ELAPSED', labels)


if __name__ == '__main__':
    unittest.main()
