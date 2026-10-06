import sys
import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core import history, intelligence, network_utils, topology, vendor_lookup
from app.core.models import Device
from app.core.protocols import snmp_probe
from app.core.protocols.onvif_probe import parse_response
from app.core.scanner import ScanOptions, run_scan


class DiscoveryTests(unittest.TestCase):
    def test_cidr_and_range(self):
        self.assertEqual(network_utils.parse_targets("192.168.1.54/30"),
                         ["192.168.1.53", "192.168.1.54"])
        self.assertEqual(network_utils.parse_targets("192.168.1.3-5"),
                         ["192.168.1.3", "192.168.1.4", "192.168.1.5"])
        for target in ["10.0.0.1-9.0.0.1", "999.1.1.1", "192.168.1.1/8", "2001:db8::/64"]:
            with self.subTest(target=target), self.assertRaises(network_utils.InvalidTargetError):
                network_utils.parse_targets(target)

    def test_arp_parsing_and_mac_normalization(self):
        arp = "192.168.1.4   AA-BB-CC-DD-EE-FF dynamic\n999.999.1.1 00-11-22-33-44-55\n"
        self.assertEqual(network_utils.parse_arp_table(arp), {"192.168.1.4": "aa:bb:cc:dd:ee:ff"})
        self.assertIsNone(network_utils.normalize_mac("00:00:00:00:00:00"))
        self.assertIsNone(network_utils.normalize_mac("not-a-mac"))

    def test_vendor_only_when_database_recognizes_mac(self):
        self.assertIsNone(vendor_lookup.lookup_vendor(None))
        self.assertIsNone(vendor_lookup.lookup_vendor("invalid"))

    def test_adapter_cidr_from_real_netmask(self):
        from types import SimpleNamespace
        addresses = {"Ethernet": [
            SimpleNamespace(family=network_utils.socket.AF_INET, address="192.168.20.54",
                            netmask="255.255.255.0"),
            SimpleNamespace(family=network_utils.psutil.AF_LINK, address="aa:bb:cc:dd:ee:ff", netmask=None),
        ]}
        with patch("app.core.network_utils.psutil.net_if_addrs", return_value=addresses), \
             patch("app.core.network_utils.psutil.net_if_stats",
                   return_value={"Ethernet": SimpleNamespace(isup=True, speed=1000)}), \
             patch("app.core.network_utils._windows_gateway_by_ip",
                   return_value={"192.168.20.54": "192.168.20.1"}):
            adapters = network_utils.detect_adapters()
        self.assertEqual(adapters[0].network, "192.168.20.0/24")
        self.assertEqual(adapters[0].gateway, "192.168.20.1")

    def test_onvif_response_and_malformed_payload(self):
        payload = (b'<Envelope xmlns:d="http://schemas.xmlsoap.org/ws/2005/04/discovery">'
                   b'<d:ProbeMatch><d:Types>dn:NetworkVideoTransmitter</d:Types>'
                   b'<d:XAddrs>http://192.168.1.8/onvif/device_service</d:XAddrs>'
                   b'<d:Scopes>onvif://www.onvif.org/manufacturer/Axis '
                   b'onvif://www.onvif.org/model/M3068-P</d:Scopes></d:ProbeMatch></Envelope>')
        result = parse_response(payload, "192.168.1.8")
        self.assertEqual(result.endpoint, "http://192.168.1.8/onvif/device_service")
        self.assertEqual(result.model, "M3068-P")
        self.assertIsNone(parse_response(b"<invalid", "192.168.1.8"))
        self.assertIsNone(parse_response(b"<Envelope/>", "192.168.1.8"))

    def test_classification_does_not_infer_from_one_port_or_vendor(self):
        device = Device("192.168.1.8", vendor="Hikvision", open_ports=[554])
        intelligence.classify(device)
        self.assertEqual((device.device_type, device.confidence), ("Unknown", 0))
        device.onvif_endpoint = "http://192.168.1.8/onvif/device_service"
        intelligence.classify(device)
        self.assertEqual((device.device_type, device.confidence), ("IP Camera", 80))

    def test_topology_never_claims_physical_connection(self):
        devices = [Device("192.168.1.1"), Device("192.168.1.8")]
        self.assertEqual(topology.build_topology(devices, "192.168.1.200"), [])
        link, = topology.build_topology(devices, "192.168.1.1")
        self.assertFalse(link.confirmed)
        self.assertEqual(link.confidence, 35)
        self.assertIn("physical path unknown", link.evidence)

    def test_lldp_creates_confirmed_link_only_when_mac_matches(self):
        switch = Device("192.168.1.1", mac="aa:bb:cc:dd:ee:ff",
                        lldp_neighbor_macs=["11:22:33:44:55:66"])
        camera = Device("192.168.1.8", mac="11:22:33:44:55:66")
        link, = topology.build_topology([switch, camera], switch.ip)
        self.assertTrue(link.confirmed)
        self.assertEqual(link.parent, switch.ip)
        self.assertIn("LLDP", link.evidence)
        switch.lldp_neighbor_macs = ["de:ad:be:ef:00:00"]
        inferred, = topology.build_topology([switch, camera], switch.ip)
        self.assertFalse(inferred.confirmed)

    def test_snmp_never_uses_default_credentials(self):
        with self.assertRaises(ValueError):
            snmp_probe.query("192.168.1.1", "")
        self.assertFalse(ScanOptions().enable_snmp)

    def test_cancelled_scan_skips_followup_discovery(self):
        with patch("app.core.scanner.network_utils.ping_sweep", return_value=[]) as sweep, \
             patch("app.core.scanner.onvif_probe.discover") as onvif:
            run_scan(["192.168.1.8"], ScanOptions(), lambda device: self.fail("unexpected device"),
                     should_stop=lambda: True)
        sweep.assert_called_once()
        onvif.assert_not_called()

    def test_onvif_discovery_keeps_camera_even_without_icmp(self):
        from app.core.protocols.onvif_probe import OnvifResult
        found = []
        response = OnvifResult("192.168.1.8", "http://192.168.1.8/onvif/device_service",
                               ("onvif://www.onvif.org/model/M3068-P",), model="M3068-P")
        with patch("app.core.scanner.network_utils.ping_sweep", return_value=[]), \
             patch("app.core.scanner.onvif_probe.discover", return_value={response.ip: response}), \
             patch("app.core.scanner.network_utils.resolve_macs", return_value={}), \
             patch("app.core.scanner.network_utils.scan_ports", return_value=[]), \
             patch("app.core.scanner.network_utils.resolve_hostname", return_value=None), \
             patch("app.core.scanner.vendor_lookup.lookup_vendor", return_value=None):
            run_scan(["192.168.1.8"], ScanOptions(enable_upnp=False, enable_wmi=False),
                     found.append)
        self.assertEqual(len(found), 1)
        self.assertEqual(found[0].onvif_model, "M3068-P")
        self.assertEqual(found[0].device_type, "IP Camera")
        self.assertIsNone(found[0].serial_number)

    def test_tcp_host_survives_ping_failure_but_stale_arp_does_not(self):
        with patch("app.core.network_utils._ping_once", return_value=False), \
             patch("app.core.network_utils._read_arp_table", return_value={"192.168.1.8": "aa:bb:cc:dd:ee:ff"}), \
             patch("app.core.network_utils._tcp_alive", return_value=True):
            self.assertEqual(network_utils.ping_sweep(["192.168.1.8"], max_workers=1), ["192.168.1.8"])
        with patch("app.core.network_utils._ping_once", return_value=False), \
             patch("app.core.network_utils._tcp_alive", return_value=False):
            self.assertEqual(network_utils.ping_sweep(["192.168.1.8"], max_workers=1), [])

    def test_scan_history_ip_change_and_export(self):
        old = [Device("192.168.1.4", mac="aa:bb:cc:dd:ee:ff")]
        new = [Device("192.168.1.8", mac="aa:bb:cc:dd:ee:ff"),
               Device("192.168.1.9", device_type="IP Camera", sources=["ONVIF"])]
        self.assertEqual(history.compare(old, new), history.ScanChange(1, 0, 1))
        changed = history.compare(old, [Device("192.168.1.4", mac="11:22:33:44:55:66")])
        self.assertEqual(changed.mac_changes, 1)
        with tempfile.TemporaryDirectory() as directory:
            snapshot = Path(directory) / "history.json"
            history.save_snapshot(new, snapshot)
            self.assertEqual(len(history.load_latest(snapshot)), 2)
            self.assertEqual(json.loads(snapshot.read_text())["devices"][1]["device_type"], "IP Camera")
            for extension in (".csv", ".json"):
                export = Path(directory) / ("report" + extension)
                history.export_results(new, export)
                self.assertIn("192.168.1.9", export.read_text(encoding="utf-8-sig"))

    def test_ip_tree_does_not_invent_links(self):
        os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")
        from PyQt6.QtWidgets import QApplication
        from app.ui.ip_tree import IpTree
        app = QApplication.instance() or QApplication([])
        tree = IpTree()
        tree.refresh([Device("192.168.1.8", device_type="IP Camera")], "192.168.1.1")
        self.assertIn("Unmapped", tree.tree.topLevelItem(0).text(0))
        tree.tree.topLevelItem(0).child(0).setSelected(True)
        self.assertIn("Unknown", tree.inspector.toPlainText())
        tree.close()

if __name__ == "__main__":
    unittest.main()
