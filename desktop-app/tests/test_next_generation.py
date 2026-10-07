import os
import sys
import tempfile
import threading
import socket
import time
import unittest
from contextlib import ExitStack
from pathlib import Path
from unittest.mock import patch

os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from PyQt6.QtCore import Qt, QTimer
from PyQt6.QtWidgets import QApplication

from app.core import history, intelligence, network_utils
from app.core.models import Device
from app.core.protocols.onvif_probe import parse_response
from app.core.providers import ONVIFProvider
from app.core.registry import DeviceRegistry
from app.core.scanner import ScanOptions, run_scan
from app.ui.device_panel import DeviceControlPanel
from app.ui.network_map import NetworkMap
from app.ui.widgets import DeviceFilterProxyModel, DeviceTableModel, TargetInput

_APP = QApplication.instance() or QApplication([])


class NextGenerationTests(unittest.TestCase):
    def mocked_transport(self):
        stack = ExitStack()
        stack.enter_context(patch("app.core.scanner.network_utils.resolve_macs", return_value={}))
        stack.enter_context(patch("app.core.scanner.network_utils.resolve_hostname", return_value=None))
        stack.enter_context(patch("app.core.scanner.network_utils.scan_ports", return_value=[]))
        stack.enter_context(patch("app.core.network_utils._tcp_alive", return_value=False))
        return stack

    def test_results_are_emitted_before_sweep_finishes(self):
        observed = threading.Event()
        found, progress = [], []
        def ping(ip):
            if ip.endswith(".8"):
                return True
            if not observed.wait(1):
                self.fail("The first device was held behind the full discovery sweep")
            return False
        def discovered(device):
            found.append(device)
            observed.set()
        with self.mocked_transport(), patch("app.core.network_utils._ping_once", side_effect=ping):
            run_scan(["192.168.1.8", "192.168.1.9"],
                     ScanOptions(max_workers=4, providers=[], enable_wmi=False), discovered,
                     on_progress=lambda done, total: progress.append((done, total)))
        self.assertEqual({device.ip for device in found}, {"192.168.1.8"})
        self.assertIn("ICMP", found[-1].sources)
        self.assertEqual(progress[-1], (2, 2))

    def test_providers_merge_and_do_not_escape_target_range(self):
        class Provider:
            name = "test-standard-provider"
            def discover(self, stopped):
                return [Device("192.168.1.8", sources=["ONVIF"], onvif_types=["dn:NetworkVideoTransmitter"],
                               onvif_model="CameraModel"),
                        Device("192.168.1.99", sources=["ONVIF"])]
        found = {}
        with self.mocked_transport(), patch("app.core.network_utils._ping_once", return_value=True):
            run_scan(["192.168.1.8"], ScanOptions(max_workers=4, providers=[Provider()], enable_wmi=False),
                     lambda device: found.update({device.ip: device}))
        self.assertEqual(set(found), {"192.168.1.8"})
        self.assertEqual(set(found["192.168.1.8"].sources), {"ICMP", "ONVIF"})
        self.assertEqual(found["192.168.1.8"].onvif_model, "CameraModel")
        self.assertEqual(found["192.168.1.8"].classification_confidence, "Medium")

    def test_provider_errors_are_reported_without_success_shaped_devices(self):
        class Provider:
            name = "broken-provider"
            def discover(self, stopped):
                raise OSError("provider unavailable")
        found, warnings = [], []
        with self.mocked_transport(), patch("app.core.network_utils._ping_once", return_value=False):
            run_scan(["192.168.1.8"], ScanOptions(providers=[Provider()], enable_wmi=False),
                     found.append, on_warning=warnings.append)
        self.assertFalse(found)
        self.assertIn("broken-provider", warnings[0])

    def test_selected_interface_is_forwarded_to_multicast_provider(self):
        with patch("app.core.providers.onvif_probe.discover", return_value={}) as discover:
            provider = ONVIFProvider("192.168.1.54")
            stopped = lambda: False
            self.assertEqual(provider.discover(stopped), [])
        discover.assert_called_once_with(should_stop=stopped, interface_ip="192.168.1.54")

    def test_windows_neighbor_cache_is_scoped_even_with_localized_headers(self):
        output = (
            "Arayüz: 192.168.1.54 --- 0x1\n192.168.1.8 aa-bb-cc-dd-ee-ff dynamic\n"
            "Schnittstelle: 10.0.0.54 --- 0x2\n192.168.1.8 00-11-22-33-44-55 dynamic\n"
        )
        with patch.object(network_utils, "_IS_WINDOWS", True):
            self.assertEqual(network_utils.parse_arp_table(output, "192.168.1.54"),
                             {"192.168.1.8": "aa:bb:cc:dd:ee:ff"})

    def test_windows_adapter_metadata_accepts_array_or_object_gateways(self):
        import json
        from types import SimpleNamespace
        for gateway in ({"NextHop": "192.168.1.1"}, [{"NextHop": "192.168.1.1"}]):
            data = {"InterfaceAlias": "Ethernet", "IPv4DefaultGateway": gateway,
                    "DNSServer": {"ServerAddresses": "192.168.1.1"}}
            with patch.object(network_utils, "_IS_WINDOWS", True), \
                    patch("app.core.network_utils.subprocess.run",
                          return_value=SimpleNamespace(returncode=0, stdout=json.dumps(data))):
                gateways, dns = network_utils._windows_network_details()
            self.assertEqual(gateways, {"Ethernet": "192.168.1.1"})
            self.assertEqual(dns, {"Ethernet": ("192.168.1.1",)})

    def test_progress_delivery_is_throttled_but_always_reports_completion(self):
        from app.workers.scan_worker import ScanWorker
        worker = ScanWorker([], ScanOptions())
        updates = []
        worker.progress.connect(lambda done, total: updates.append((done, total)))
        with patch("app.workers.scan_worker.time.monotonic", return_value=1.0):
            for index in range(1, 10001):
                worker._emit_progress(index, 10000)
        self.assertEqual(updates, [(1, 10000), (10000, 10000)])

    def test_node_without_a_new_response_does_not_keep_online_status(self):
        from app.ui.main_window import MainWindow
        with patch.object(MainWindow, "_refresh_adapters"), patch.object(MainWindow, "_load_history"):
            window = MainWindow()
            window._on_device_found(Device("192.168.1.8", last_seen="2026-10-07"))
            window._flush_results(all_results=True)
            window._on_node_finished("192.168.1.8")
            window._flush_results(all_results=True)
        self.assertIn("No response", window.model.device_at(0).reachability)
        self.assertEqual(window.model.device_at(0).last_seen, "2026-10-07")
        window.close()

    def test_table_enter_shortcut_does_not_intercept_graph_keyboard_actions(self):
        from PyQt6.QtGui import QShortcut
        from app.ui.main_window import MainWindow
        with patch.object(MainWindow, "_refresh_adapters"), patch.object(MainWindow, "_load_history"):
            window = MainWindow()
        enter, = [shortcut for shortcut in window.table.findChildren(QShortcut)
                  if shortcut.key().toString() == "Return"]
        self.assertEqual(enter.context(), Qt.ShortcutContext.WidgetWithChildrenShortcut)
        window.close()
    def test_real_loopback_tcp_discovery_survives_icmp_failure_and_records_connect_time(self):
        found = {}
        callback_threads = []
        with socket.socket() as server:
            server.bind(("127.0.0.1", 0))
            server.listen(16)
            port = server.getsockname()[1]
            with patch("app.core.network_utils._ping_once", return_value=False), \
                    patch.object(network_utils, "DISCOVERY_PORTS", (port,)), \
                    patch.object(network_utils, "CANDIDATE_PORTS", [port]), \
                    patch("app.core.scanner.network_utils.resolve_macs", return_value={}), \
                    patch("app.core.scanner.network_utils.resolve_hostname", return_value=None):
                def callback(device):
                    found[device.ip] = device
                    callback_threads.append(threading.get_ident())
                run_scan(["127.0.0.1"], ScanOptions(max_workers=4, providers=[], enable_wmi=False), callback)
        self.assertEqual(set(found), {"127.0.0.1"})
        self.assertIn("TCP", found["127.0.0.1"].sources)
        self.assertEqual(found["127.0.0.1"].open_ports, [port])
        self.assertIsNotNone(found["127.0.0.1"].latency_ms)
        self.assertTrue(all(ident == threading.get_ident() for ident in callback_threads))

    def test_port_probe_does_not_drop_later_connections_after_an_early_refusal(self):
        from unittest.mock import Mock
        rejected, connected = Mock(), Mock()
        rejected.connect_ex.return_value = connected.connect_ex.return_value = 115
        rejected.getsockopt.return_value = 111
        connected.getsockopt.return_value = 0
        with patch("app.core.network_utils.socket.socket", side_effect=[rejected, connected]), \
                patch("select.select", side_effect=[([], [rejected], []), ([], [connected], [])]) as selected:
            self.assertEqual(network_utils.scan_ports("192.168.1.8", [80, 443]), [443])
        self.assertEqual(selected.call_count, 2)
        rejected.close.assert_called_once()
        connected.close.assert_called_once()

    def test_cancellation_is_bounded_and_does_not_enqueue_every_host(self):
        targets = network_utils.parse_targets("10.0.0.0/20")
        calls = []
        stop = threading.Event()
        def ping(ip):
            calls.append(ip)
            stop.set()
            return False
        with self.mocked_transport(), patch("app.core.network_utils._ping_once", side_effect=ping):
            start = time.monotonic()
            run_scan(targets, ScanOptions(max_workers=4, providers=[]), lambda device: self.fail("cancelled device"),
                     should_stop=stop.is_set)
        self.assertLessEqual(len(calls), 4)
        self.assertLess(time.monotonic() - start, 0.5)

    def test_worker_budget_rejects_unbounded_values(self):
        for workers in (0, 1, 129, 10000):
            with self.assertRaises(ValueError):
                ScanOptions(max_workers=workers)
        self.assertNotIn("private-community", repr(ScanOptions(enable_snmp=True, snmp_community="private-community")))

    def test_mac_changes_in_one_scan_are_only_potential_conflicts(self):
        registry = DeviceRegistry()
        first = Device("192.168.1.8", mac="AA-BB-CC-DD-EE-FF", sources=["ICMP"])
        registry.merge(first)
        registry.merge(Device(first.ip, mac="aa:bb:cc:dd:ee:ff", sources=["TCP"]))
        self.assertFalse(registry.conflicts)
        registry.merge(Device(first.ip, mac="00:11:22:33:44:55"))
        self.assertEqual(len(registry.devices), 1)
        conflict, = registry.conflicts
        self.assertEqual(conflict.confidence, "Low")
        self.assertEqual(len(conflict.macs), 2)
        self.assertIn("not proof", conflict.reason)
        self.assertIn("TCP", registry.devices[first.ip].sources)
        self.assertEqual(registry.devices[first.ip].classification_confidence, "Low")

    def test_conflicting_identity_downgrades_previously_high_confidence(self):
        registry = DeviceRegistry()
        registry.merge(Device("192.168.1.8", mac="aa:bb:cc:dd:ee:ff", classification_confidence="High"))
        result = registry.merge(Device("192.168.1.8", mac="00:11:22:33:44:55", classification_confidence="Medium"))
        self.assertEqual(result.classification_confidence, "Low")
        self.assertEqual(result.reachability, "Potential conflict")

    def test_previous_scan_identity_change_is_not_a_conflict(self):
        old = [Device("192.168.1.8", mac="aa:bb:cc:dd:ee:ff")]
        new = [Device("192.168.1.8", mac="00:11:22:33:44:55")]
        self.assertEqual(history.compare(old, new).mac_changes, 1)
        registry = DeviceRegistry()
        registry.merge(new[0])
        self.assertFalse(registry.conflicts)

    def test_first_seen_is_preserved_across_updates(self):
        registry = DeviceRegistry()
        first = registry.merge(Device("192.168.1.8", first_seen="2026-10-01", last_seen="2026-10-01"))
        second = registry.merge(Device(first.ip, first_seen="2026-10-07", last_seen="2026-10-07"))
        self.assertEqual(second.first_seen, "2026-10-01")
        self.assertEqual(first.last_seen, "2026-10-01")

    def test_onvif_storage_and_generic_device_are_not_cameras(self):
        for types, expected in ((["dn:NetworkVideoStorage"], "NVR"), (["dn:Device"], "Unknown")):
            device = Device("192.168.1.8", onvif_types=types, sources=["ONVIF"])
            intelligence.classify(device)
            self.assertEqual(device.device_type, expected)

    def test_onvif_announcements_cannot_redirect_credentials_to_other_hosts(self):
        payload = (
            '<Envelope xmlns:d="http://schemas.xmlsoap.org/ws/2005/04/discovery">'
            '<d:ProbeMatch><d:Types>dn:NetworkVideoTransmitter</d:Types><d:XAddrs>'
            'https://192.168.1.99/onvif/device_service</d:XAddrs></d:ProbeMatch></Envelope>'
        ).encode()
        self.assertIsNone(parse_response(payload, "192.168.1.8"))

    def test_target_input_has_no_mode_selector_and_preserves_supported_ranges(self):
        widget = TargetInput("en")
        widget.set_value("192.168.1.0/24")
        self.assertEqual(widget.spec(), "192.168.1.1-192.168.1.254")
        widget.set_value("2001:db8::/120")
        self.assertEqual(len(network_utils.parse_targets(widget.spec())), 255)
        self.assertFalse(hasattr(widget, "_buttons"))
        widget.close()

    def test_table_upserts_sort_numerically_and_search_device_type(self):
        model = DeviceTableModel()
        model.add_devices([Device("192.168.1.10"), Device("192.168.1.2"),
                           Device("192.168.1.2", device_type="IP Camera")])
        self.assertEqual(model.rowCount(), 2)
        proxy = DeviceFilterProxyModel()
        proxy.setSourceModel(model)
        proxy.sort(0, Qt.SortOrder.AscendingOrder)
        self.assertEqual(proxy.data(proxy.index(0, 0)), "192.168.1.2")
        proxy.set_filter_text("camera")
        self.assertEqual(proxy.rowCount(), 1)

    def test_table_10000_rows_updates_and_filters_without_widget_per_row(self):
        model = DeviceTableModel()
        devices = [Device(f"10.0.{i // 250}.{i % 250 + 1}") for i in range(10000)]
        started = time.monotonic()
        model.add_devices(devices)
        self.assertEqual(model.rowCount(), 10000)
        self.assertLess(time.monotonic() - started, 0.2)
        proxy = DeviceFilterProxyModel()
        proxy.setSourceModel(model)
        proxy.set_filter_text("10.0.1.")
        self.assertEqual(proxy.rowCount(), 250)

    def test_network_map_keeps_unknown_links_unmapped_and_supports_global_search(self):
        graph = NetworkMap()
        graph.refresh([Device("192.168.1.8", device_type="IP Camera"), Device("192.168.1.9", vendor="Axis")],
                      "192.168.1.1", "192.168.1.0/24")
        self.assertEqual(len(graph.nodes), 2)
        self.assertEqual(len(graph.scene.items()), 2)
        graph.set_filter_text("camera")
        self.assertEqual(set(graph.nodes), {"192.168.1.8"})
        graph.close()

    def test_network_map_collapses_verified_branch_and_exports_real_graph(self):
        gateway = Device("192.168.1.1", mac="00:11:22:33:44:55", lldp_neighbor_macs=["aa:bb:cc:dd:ee:ff"])
        camera = Device("192.168.1.8", mac="aa:bb:cc:dd:ee:ff", device_type="IP Camera")
        graph = NetworkMap()
        graph.refresh([gateway, camera], gateway.ip, "192.168.1.0/24")
        self.assertEqual(len(graph.scene.items()), 3)
        graph.toggle_branch(gateway.ip)
        self.assertEqual(set(graph.nodes), {gateway.ip})
        graph.expand_all()
        self.assertEqual(len(graph.nodes), 2)
        with tempfile.TemporaryDirectory() as directory:
            for suffix in (".svg", ".png"):
                target = Path(directory) / ("map" + suffix)
                graph.export_graph(target)
                self.assertGreater(target.stat().st_size, 1000)
        graph.close()

    def test_graph_1000_devices_render_under_one_second(self):
        graph = NetworkMap()
        devices = [Device(f"10.0.{i // 250}.{i % 250 + 1}") for i in range(1000)]
        start = time.monotonic()
        graph.refresh(devices)
        self.assertEqual(len(graph.nodes), 1000)
        self.assertLess(time.monotonic() - start, 1)
        graph.close()

    def test_unsupported_control_panel_explains_disabled_management(self):
        panel = DeviceControlPanel(Device("192.168.1.8"), [], "192.168.1.0/24")
        self.assertFalse(panel.apply_button.isEnabled())
        self.assertFalse(panel.read_button.isEnabled())
        self.assertIn("No supported", panel.status.text())
        self.assertFalse(panel.ip.isEnabled())
        panel.close()

    def test_configuration_is_disabled_while_scan_is_running(self):
        panel = DeviceControlPanel(
            Device("192.168.1.8", onvif_endpoint="https://192.168.1.8/onvif/device_service"),
            [], "192.168.1.0/24", allow_changes=False)
        self.assertTrue(panel.read_button.isEnabled())
        self.assertFalse(panel.apply_button.isEnabled())
        panel.close()

    def test_classification_does_not_match_substrings_in_unrelated_words(self):
        device = Device("192.168.1.8", snmp_sys_descr="NASA research terminal")
        intelligence.classify(device)
        self.assertEqual(device.device_type, "Unknown")

    def test_history_rotates_and_excludes_unknown_sensitive_fields(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "history.json"
            for i in range(23):
                history.save_snapshot([Device(f"192.168.1.{i + 1}")], path, target="192.168.1.0/24")
            snapshots = history.load_snapshots(path)
            self.assertEqual(len(snapshots), 20)
            self.assertEqual(snapshots[-1].target, "192.168.1.0/24")
            self.assertNotIn("password", path.read_text())
            self.assertFalse(list(path.parent.glob("*.tmp")))
            path.write_text('{"devices":[{"ip":"192.168.1.8","open_ports":["80"]}]}')
            with self.assertRaises(ValueError):
                history.load_latest(path)

    def test_spreadsheet_export_treats_untrusted_device_names_as_text(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "scan.csv"
            history.export_results([Device("192.168.1.8", hostname="=device-name")], path)
            self.assertIn("'=device-name", path.read_text(encoding="utf-8-sig"))


if __name__ == "__main__":
    unittest.main()
