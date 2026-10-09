import ctypes
import errno
import os
from pathlib import Path
import socket
import struct
import sys
import time
import unittest
from unittest.mock import Mock, patch

os.environ.setdefault('QT_QPA_PLATFORM', 'offscreen')
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.core import native_ping, network_utils
from app.core.profiles import PROFILES, parse_ports
from app.core.scanner import ScanOptions, run_scan
from app.core.models import Device
from app.core.report import render_report
from app.core.search import matches_device
from app.core.targets import plan_targets


class V4Tests(unittest.TestCase):
    def test_native_ping_checks_reply_identity_status_and_closes_handle(self):
        api = Mock()
        api.IcmpCreateFile.return_value = 42
        for status, address, expected in [(0, '127.0.0.1', True), (11003, '127.0.0.1', False),
                                           (0, '127.0.0.2', False)]:
            def send(handle, dest, payload, size, opts, reply, reply_size, timeout):
                reply[:12] = struct.pack('<III', struct.unpack('<I', socket.inet_aton(address))[0], status, 1)
                return 1
            api.IcmpSendEcho.side_effect = send
            with patch.object(native_ping, '_api', return_value=api):
                self.assertEqual(native_ping.ping_ipv4('127.0.0.1'), expected)
        self.assertEqual(api.IcmpCloseHandle.call_count, 3)
        api.IcmpSendEcho.side_effect = OSError('transport')
        with patch.object(native_ping, '_api', return_value=api), self.assertRaises(OSError):
            native_ping.ping_ipv4('127.0.0.1')
        self.assertEqual(api.IcmpCloseHandle.call_count, 4)

    @unittest.skipUnless(sys.platform == 'win32', 'Windows ICMP API')
    def test_native_real_loopback_does_not_launch_ping(self):
        with patch('app.core.network_utils.subprocess.run', side_effect=AssertionError('spawned ping')):
            self.assertTrue(network_utils._ping_once('127.0.0.1'))

    def test_closed_tcp_port_proves_response_but_is_not_open(self):
        with socket.socket() as reserved:
            reserved.bind(('127.0.0.1', 0))  # bound but deliberately not listening
            port = reserved.getsockname()[1]
            with patch.object(network_utils, 'DISCOVERY_PORTS', (port,)):
                self.assertTrue(network_utils._tcp_alive('127.0.0.1', timeout=3))
            self.assertEqual(network_utils.scan_ports('127.0.0.1', [port]), [])

    def test_windows_exceptional_connect_refusal_is_consumed(self):
        sock = Mock()
        sock.connect_ex.return_value = 10035
        sock.getsockopt.return_value = 10061
        with patch('app.core.network_utils.socket.socket', return_value=sock), \
             patch('select.select', return_value=([], [], [sock])):
            self.assertEqual(network_utils._connect_ports('127.0.0.1', [80], .2), ([], True))
        sock.close.assert_called_once()

    def test_unreachable_is_not_reported_as_a_device(self):
        sock = Mock()
        sock.connect_ex.return_value = errno.EHOSTUNREACH
        with patch('app.core.network_utils.socket.socket', return_value=sock):
            self.assertEqual(network_utils._connect_ports('127.0.0.1', [80], .2), ([], False))

    def test_cancelled_tcp_probe_closes_pending_sockets(self):
        sock = Mock()
        sock.connect_ex.return_value = errno.EINPROGRESS
        cancelled = iter([False, False, True])
        with patch('app.core.network_utils.socket.socket', return_value=sock), \
             patch('select.select', side_effect=AssertionError('must cancel before wait')):
            self.assertEqual(network_utils.scan_ports('127.0.0.1', [80],
                should_stop=lambda: next(cancelled, True)), [])
        sock.close.assert_called_once()

    def test_port_parser_bounds_ranges_and_deduplicates(self):
        self.assertEqual(parse_ports('443,80,8000-8002,80'), (80, 443, 8000, 8001, 8002))
        self.assertIsNone(parse_ports(' '))
        for value in ('0', '65536', '3-1', '1-65535', '1-256,257', '80,,443', '22; rm', '-1'):
            with self.subTest(value=value), self.assertRaises(ValueError):
                parse_ports(value)

    def test_profile_validation(self):
        for kwargs in ({'profile': 'madeup'}, {'custom_ports': ()}, {'custom_ports': (True,)},
                       {'custom_ports': tuple(range(1, 258))}):
            with self.assertRaises(ValueError):
                ScanOptions(**kwargs)
        self.assertLess(PROFILES['gentle'].workers, PROFILES['balanced'].workers)

    def test_multi_subnet_plan_exclusions_and_global_bounds(self):
        self.assertEqual(plan_targets('192.168.1.1-3', '192.168.1.2,10.0.0.1', '10.0.0.0/8,192.168.1.2'),
                         ['192.168.1.1', '192.168.1.3'])
        for args in [('10.0.0.0/16', '10.1.0.1'), ('2001:db8::/120', '2001:db8:1::/120'),
                     ('192.168.1.1', '', '192.168.0.0/16')]:
            with self.assertRaises(network_utils.InvalidTargetError):
                plan_targets(*args)

    def test_quick_scan_omits_dns_and_reports_observed_metrics(self):
        reports, devices = [], []
        with patch('app.core.scanner.network_utils.resolve_macs', return_value={}), \
             patch('app.core.network_utils._ping_once', return_value=True), \
             patch('app.core.scanner.network_utils.resolve_hostname') as dns, \
             patch('app.core.scanner.network_utils.scan_ports', return_value=[443]) as ports:
            run_scan(['127.0.0.1'], ScanOptions(profile='quick', providers=[], enable_wmi=False),
                devices.append, on_metrics=reports.append)
        dns.assert_not_called()
        self.assertEqual(ports.call_args.args[1], list(PROFILES['quick'].ports))
        self.assertEqual(reports[-1]['probed'], 1)
        self.assertEqual(reports[-1]['devices'], 1)
        self.assertEqual(reports[-1]['enriched'], 1)
        self.assertIsNotNone(reports[-1]['first_result_seconds'])

    def test_detailed_scan_retries_only_nonresponders(self):
        with patch('app.core.network_utils._ping_once', side_effect=[False, True]) as ping, \
             patch('app.core.network_utils._tcp_alive', return_value=False):
            self.assertEqual(network_utils.ping_sweep(['127.0.0.1'], max_workers=1, retries=1), ['127.0.0.1'])
        self.assertEqual(ping.call_count, 2)

    def test_search_combines_cidr_ports_sources_negation_and_quotes(self):
        device = Device('192.168.1.8', open_ports=[443], device_type='IP Camera', sources=['ONVIF'], vendor='Axis')
        self.assertTrue(matches_device(device, 'ip:192.168.1.0/24 port:443 type:"IP Camera" -vendor:Other source:onvif'))
        for query in ('port:44', '-source:onvif', 'ip:10.0.0.0/24', 'ip:invalid/24', 'source:'):
            self.assertFalse(matches_device(device, query))
        self.assertTrue(matches_device(device, 'axis camera'))

    def test_html_report_escapes_device_and_metadata_and_marks_partial(self):
        html = render_report([Device('127.0.0.1', hostname='<script>alert(1)</script>')],
                             target='<img src=x onerror=1>', completed=False)
        self.assertNotIn('<script>', html)
        self.assertNotIn('<img', html)
        self.assertIn('&lt;script&gt;', html)
        self.assertIn('Partial / in progress', html)
        self.assertIn('default-src', html)

    def test_profile_ui_changes_budget_and_metrics(self):
        from PyQt6.QtWidgets import QApplication
        from app.ui.main_window import MainWindow
        app = QApplication.instance() or QApplication([])
        with patch.object(MainWindow, '_refresh_adapters'):
            window = MainWindow('tr')
            self.assertEqual(window.navigation.count(), 2)
            self.assertFalse(hasattr(window, 'profile_select'))
            window.show()
            window.navigation.setCurrentIndex(1)
            self.assertFalse(window.scan_controls.isVisible())
            self.assertEqual(window.views.currentWidget(), window.network_map)
            window._on_metrics({'elapsed_seconds': 2.0, 'hosts_per_second': 50.0})
            self.assertEqual(window._metrics['hosts_per_second'], 50.0)
            self.assertFalse(hasattr(window, 'metric_values'))
            window._set_scanning(True)
            self.assertFalse(window.target_input.isEnabled())
            window.close()


if __name__ == '__main__':
    unittest.main()
