import sys
import unittest
from dataclasses import replace
from pathlib import Path
from unittest.mock import Mock, patch
from xml.etree.ElementTree import fromstring

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.adapters import (
    Credentials, DeviceIdentity, ManagementError, NetworkConfiguration, ONVIFAdapter,
    SOAP, TDS, TT, adapter_capabilities, change_network_configuration, validate_configuration,
)
from app.core.models import Device


def response(operation, body=""):
    return fromstring(f'<tds:{operation}Response xmlns:tds="{TDS}" xmlns:tt="{TT}">{body}</tds:{operation}Response>')


CONFIG = NetworkConfiguration("eth0", "192.168.1.8", "255.255.255.0", "192.168.1.1", ("192.168.1.1",), False)
IDENTITY = DeviceIdentity("Axis", "Camera", "unique-device-serial", "1.0")
DEVICE = Device("192.168.1.8", onvif_endpoint="https://192.168.1.8/onvif/device_service")


class HttpResponse:
    def __init__(self, operation, body="", status=200, payload=None):
        self.status_code = status
        self.payload = payload or (
            f'<s:Envelope xmlns:s="{SOAP}"><s:Body>'
            f'<tds:{operation}Response xmlns:tds="{TDS}" xmlns:tt="{TT}">{body}</tds:{operation}Response>'
            '</s:Body></s:Envelope>').encode()

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def iter_content(self, _size):
        yield self.payload

    def raise_for_status(self):
        if self.status_code >= 400:
            raise RuntimeError("Unexpected test status")


class AdapterTests(unittest.TestCase):
    def make_adapter(self):
        adapter = ONVIFAdapter(DEVICE)
        self.addCleanup(adapter.close)
        return adapter

    def authenticate(self, adapter):
        with patch.object(adapter.session, "post", return_value=HttpResponse(
            "GetDeviceInformation", "<tds:Manufacturer>Axis</tds:Manufacturer><tds:Model>Camera</tds:Model>"
            "<tds:SerialNumber>unique-device-serial</tds:SerialNumber><tds:FirmwareVersion>1.0</tds:FirmwareVersion>",
        )):
            return adapter.authenticate(Credentials("operator", "private-password"))

    def test_configuration_validation(self):
        validate_configuration(CONFIG, "192.168.1.0/24")
        invalid = [
            replace(CONFIG, ip="192.168.1.0"), replace(CONFIG, ip="192.168.1.255"),
            replace(CONFIG, ip="224.0.0.1"), replace(CONFIG, ip="127.0.0.1"),
            replace(CONFIG, subnet_mask="255.0.255.0"), replace(CONFIG, gateway="192.168.2.1"),
            replace(CONFIG, gateway=CONFIG.ip), replace(CONFIG, gateway="192.168.1.255"),
            replace(CONFIG, dns=("0.0.0.0",)), replace(CONFIG, interface_token=""),
        ]
        for configuration in invalid:
            with self.subTest(configuration=configuration), self.assertRaises(ManagementError):
                validate_configuration(configuration, "192.168.1.0/24")
        with self.assertRaisesRegex(ManagementError, "selected local adapter"):
            validate_configuration(replace(CONFIG, ip="192.168.2.8", gateway="192.168.2.1"), "192.168.1.0/24")

    def test_management_capabilities_are_not_faked(self):
        self.assertFalse(adapter_capabilities(Device(CONFIG.ip)).read_network)
        http = replace(DEVICE, onvif_endpoint="http://192.168.1.8/onvif/device_service")
        self.assertFalse(adapter_capabilities(http).write_network)
        with self.assertRaisesRegex(ManagementError, "HTTPS"):
            ONVIFAdapter(http)
        with self.assertRaises(ManagementError):
            ONVIFAdapter(replace(DEVICE, onvif_endpoint="https://192.168.1.99/onvif/device_service"))
        with self.assertRaises(ManagementError):
            ONVIFAdapter(replace(DEVICE, onvif_endpoint="https://user:pass@192.168.1.8/onvif/device_service"))
        self.assertFalse(adapter_capabilities(DEVICE).write_network)

    def test_no_credentials_are_guessed_or_embedded_as_plaintext(self):
        adapter = self.make_adapter()
        with self.assertRaises(ManagementError):
            adapter.authenticate(Credentials("", ""))
        with patch.object(adapter.session, "post", return_value=HttpResponse("GetDeviceInformation")) as post:
            adapter.authenticate(Credentials("operator", "private-password"))
        kwargs = post.call_args.kwargs
        self.assertNotIn(b"private-password", kwargs["data"])
        self.assertIn(b"PasswordDigest", kwargs["data"])
        self.assertFalse(kwargs["allow_redirects"])
        self.assertEqual(kwargs["timeout"], (2, 3))
        self.assertTrue(adapter.session.verify)
        self.assertFalse(adapter.session.trust_env)
        self.assertNotIn("private-password", repr(Credentials("operator", "private-password")))

    def test_authentication_error_and_redirect_are_explicit(self):
        for status in (401, 403, 302):
            adapter = self.make_adapter()
            with patch.object(adapter.session, "post", return_value=HttpResponse("GetDeviceInformation", status=status)), \
                    self.assertRaises(ManagementError):
                adapter.authenticate(Credentials("operator", "private-password"))

    def test_xml_entities_and_oversize_responses_are_rejected(self):
        for payload in (b'<!DOCTYPE x [<!ENTITY e "expanded">]><x>&e;</x>', b"x" * 262145):
            adapter = self.make_adapter()
            with patch.object(adapter.session, "post", return_value=HttpResponse("", payload=payload)), \
                    self.assertRaises(ManagementError):
                adapter.authenticate(Credentials("operator", "private-password"))

    def test_read_configuration_uses_actual_interface_and_dns(self):
        adapter = self.make_adapter()
        self.assertEqual(self.authenticate(adapter), IDENTITY)
        replies = [
            response("GetNetworkInterfaces",
                     '<tds:NetworkInterfaces token="eth0"><tt:IPv4><tt:Config><tt:Manual>'
                     '<tt:Address>192.168.1.8</tt:Address><tt:PrefixLength>24</tt:PrefixLength>'
                     '</tt:Manual><tt:DHCP>false</tt:DHCP></tt:Config></tt:IPv4></tds:NetworkInterfaces>'),
            response("GetNetworkDefaultGateway", "<tds:NetworkGateway><tt:IPv4Address>192.168.1.1</tt:IPv4Address></tds:NetworkGateway>"),
            response("GetDNS", "<tds:DNSInformation><tt:FromDHCP>false</tt:FromDHCP><tt:DNSManual>"
                     "<tt:Type>IPv4</tt:Type><tt:IPv4Address>192.168.1.1</tt:IPv4Address>"
                     "</tt:DNSManual></tds:DNSInformation>"),
            response("GetUsers", "<tds:User><tt:Username>operator</tt:Username><tt:UserLevel>Administrator</tt:UserLevel></tds:User>"),
        ]
        with patch.object(adapter, "_call", side_effect=replies):
            self.assertEqual(adapter.get_network_configuration(), CONFIG)
        self.assertTrue(adapter.get_capabilities().write_network)

    def test_ambiguous_interface_and_missing_configuration_are_unsupported(self):
        adapter = self.make_adapter()
        self.authenticate(adapter)
        with patch.object(adapter, "_call", return_value=response("GetNetworkInterfaces")), \
                self.assertRaisesRegex(ManagementError, "unambiguously"):
            adapter.get_network_configuration()
        self.assertFalse(adapter.get_capabilities().write_network)

    def test_user_role_requires_matching_authenticated_administrator(self):
        adapter = self.make_adapter()
        self.authenticate(adapter)
        for username, role, allowed in (
            ("operator", "Administrator", True), ("operator", "Operator", False),
            ("another-user", "Administrator", False),
        ):
            with patch.object(adapter, "_call", return_value=response(
                "GetUsers", f"<tds:User><tt:Username>{username}</tt:Username><tt:UserLevel>{role}</tt:UserLevel></tds:User>")):
                self.assertEqual(adapter._administrator_verified(), allowed)
        with patch.object(adapter, "_call", side_effect=ManagementError("Unsupported")):
            self.assertFalse(adapter._administrator_verified())

    def test_potentially_conflicting_ip_is_not_manageable(self):
        caps = adapter_capabilities(replace(DEVICE, reachability="Potential conflict"))
        self.assertFalse(caps.read_network)
        self.assertIn("conflicting", caps.reason)

    def test_close_releases_credentials(self):
        adapter = self.make_adapter()
        self.authenticate(adapter)
        adapter.close()
        self.assertIsNone(adapter._credentials)
        self.assertIsNone(adapter.session.auth)

    def ready_adapter(self):
        adapter = self.make_adapter()
        self.authenticate(adapter)
        from app.core.adapters import Capabilities
        adapter._capabilities = Capabilities(True, True, "")
        adapter.identify = Mock(return_value=IDENTITY)
        return adapter

    def test_interface_write_preserves_token_and_does_not_reboot(self):
        adapter = self.ready_adapter()
        updated = replace(CONFIG, ip="192.168.1.120")
        with patch.object(adapter, "get_network_configuration", return_value=CONFIG), \
                patch.object(adapter, "_call", return_value=response(
                    "SetNetworkInterfaces", "<tds:RebootNeeded>true</tds:RebootNeeded>")) as call:
            self.assertTrue(adapter.set_network_configuration(updated))
        self.assertEqual(call.call_args.args[0], "SetNetworkInterfaces")
        args = call.call_args.args[1]
        self.assertEqual(args[0].text, CONFIG.interface_token)
        self.assertEqual(args[1].findtext(f"{{{TT}}}IPv4/{{{TT}}}Manual/{{{TT}}}Address"), updated.ip)
        self.assertEqual(call.call_count, 1)

    def test_partial_write_reports_applied_stages_and_no_automatic_retry(self):
        adapter = self.ready_adapter()
        with patch.object(adapter, "get_network_configuration", return_value=CONFIG), \
                patch.object(adapter, "_call", side_effect=[response("SetDNS"), ManagementError("Rejected")]) as call, \
                self.assertRaisesRegex(ManagementError, "completed steps: DNS"):
            adapter.set_network_configuration(replace(CONFIG, dns=("192.168.1.2",), gateway="192.168.1.254"))
        self.assertEqual(call.call_count, 2)

    def test_known_or_actively_used_ip_never_gets_a_write(self):
        adapter = self.ready_adapter()
        updated = replace(CONFIG, ip="192.168.1.120")
        with patch.object(adapter, "set_network_configuration") as write, \
                self.assertRaisesRegex(ManagementError, "already present"):
            change_network_configuration(adapter, updated, [Device(updated.ip)], "192.168.1.0/24")
        write.assert_not_called()
        with patch("app.core.adapters.network_utils.read_arp_entry", return_value="aa:bb:cc:dd:ee:ff"), \
                patch.object(adapter, "set_network_configuration") as write, \
                self.assertRaisesRegex(ManagementError, "in use"):
            change_network_configuration(adapter, updated, [], "192.168.1.0/24")
        write.assert_not_called()

    def test_new_neighbor_response_after_probing_prevents_static_ip_collision(self):
        adapter = self.ready_adapter()
        with patch("app.core.adapters.network_utils.read_arp_entry",
                   side_effect=[None, "aa:bb:cc:dd:ee:ff"]), \
                patch("app.core.adapters.network_utils.ping_once", return_value=False), \
                patch("app.core.adapters.network_utils.scan_ports", return_value=[]), \
                patch.object(adapter, "set_network_configuration") as write, \
                self.assertRaisesRegex(ManagementError, "in use"):
            change_network_configuration(adapter, replace(CONFIG, ip="192.168.1.120"), [], "192.168.1.0/24")
        write.assert_not_called()
    def test_cancelled_change_never_writes(self):
        adapter = self.ready_adapter()
        with patch.object(adapter, "set_network_configuration") as write, self.assertRaisesRegex(ManagementError, "cancelled"):
            change_network_configuration(adapter, CONFIG, [], "192.168.1.0/24", should_stop=lambda: True)
        write.assert_not_called()

    def test_reboot_is_pending_not_verified_success(self):
        adapter = self.ready_adapter()
        with patch.object(adapter, "set_network_configuration", return_value=True):
            result = change_network_configuration(adapter, CONFIG, [], "192.168.1.0/24")
        self.assertFalse(result.verified)
        self.assertTrue(result.reboot_required)
        self.assertIsNone(result.new_ip)

    def test_changed_ip_requires_matching_authenticated_identity_and_settings(self):
        adapter = self.ready_adapter()
        updated = replace(CONFIG, ip="192.168.1.120")
        candidate = Mock()
        candidate.endpoint = "https://192.168.1.120/onvif/device_service"
        candidate.authenticate.return_value = IDENTITY
        candidate.get_network_configuration.return_value = updated
        with patch("app.core.adapters.network_utils.read_arp_entry", return_value=None), \
                patch("app.core.adapters.network_utils.ping_once", return_value=False), \
                patch("app.core.adapters.network_utils.scan_ports", return_value=[]), \
                patch.object(adapter, "set_network_configuration", return_value=False), \
                patch("app.core.adapters.ONVIFAdapter", return_value=candidate):
            result = change_network_configuration(adapter, updated, [], "192.168.1.0/24")
        self.assertTrue(result.verified)
        self.assertEqual((result.old_ip, result.new_ip), (CONFIG.ip, updated.ip))
        candidate.close.assert_called_once()

    def test_wrong_device_is_not_reported_as_success(self):
        adapter = self.ready_adapter()
        candidate = Mock()
        candidate.authenticate.return_value = replace(IDENTITY, serial="different-device")
        with patch.object(adapter, "set_network_configuration", return_value=False), \
                patch("app.core.adapters.ONVIFAdapter", return_value=candidate), \
                patch("app.core.adapters.time.monotonic", side_effect=[0, 1, 20]), \
                patch("app.core.adapters.time.sleep"):
            result = change_network_configuration(adapter, CONFIG, [], "192.168.1.0/24")
        self.assertFalse(result.verified)
        self.assertIn("identity", result.message)
        candidate.get_network_configuration.assert_not_called()

    def test_device_replacement_before_apply_never_gets_a_write(self):
        adapter = self.ready_adapter()
        adapter.identify.return_value = replace(IDENTITY, serial="replacement-device")
        with patch.object(adapter, "set_network_configuration") as write, self.assertRaisesRegex(ManagementError, "identity changed"):
            change_network_configuration(adapter, CONFIG, [], "192.168.1.0/24")
        write.assert_not_called()

    def test_dhcp_dns_is_validated_even_when_ip_is_automatic(self):
        with self.assertRaisesRegex(ManagementError, "DNS"):
            validate_configuration(replace(CONFIG, dhcp=True, dns=("invalid",)))


if __name__ == "__main__":
    unittest.main()
