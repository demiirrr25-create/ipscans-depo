"""Authenticated, capability-driven ONVIF device management over verified TLS."""
from __future__ import annotations

import base64
import hashlib
import ipaddress
import logging
import secrets
import time
from dataclasses import dataclass, field, replace
from datetime import datetime, timezone
from typing import Callable, Protocol
from urllib.parse import urlsplit, urlunsplit
from xml.etree.ElementTree import Element, SubElement, tostring

import requests
from requests.auth import HTTPDigestAuth
from defusedxml import ElementTree
from defusedxml.common import DefusedXmlException

from app.core import network_utils
from app.core.models import Device
from app.core.protocols import onvif_probe

SOAP = "http://www.w3.org/2003/05/soap-envelope"
TDS = "http://www.onvif.org/ver10/device/wsdl"
TT = "http://www.onvif.org/ver10/schema"
WSSE = "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd"
WSU = "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd"
_LOG = logging.getLogger(__name__)


class ManagementError(RuntimeError):
    pass


@dataclass(frozen=True)
class Credentials:
    username: str
    password: str = field(repr=False)


@dataclass(frozen=True)
class Capabilities:
    read_network: bool = False
    write_network: bool = False
    reason: str = "No supported authenticated management protocol was discovered."
    configure_dhcp: bool = False


@dataclass(frozen=True)
class NetworkConfiguration:
    interface_token: str
    ip: str
    subnet_mask: str
    gateway: str | None
    dns: tuple[str, ...]
    dhcp: bool
    dns_from_dhcp: bool = False
    search_domains: tuple[str, ...] = ()


@dataclass(frozen=True)
class DeviceIdentity:
    manufacturer: str
    model: str
    serial: str
    firmware: str


@dataclass(frozen=True)
class ChangeResult:
    old_ip: str
    new_ip: str | None
    verified: bool
    reboot_required: bool
    message: str
    configuration: NetworkConfiguration | None = None
    endpoint: str | None = None


class DeviceAdapter(Protocol):
    def identify(self) -> DeviceIdentity: ...
    def authenticate(self, credentials: Credentials) -> DeviceIdentity: ...
    def get_capabilities(self) -> Capabilities: ...
    def get_network_configuration(self) -> NetworkConfiguration: ...
    def set_network_configuration(self, configuration: NetworkConfiguration) -> bool: ...
    def validate_configuration(self, configuration: NetworkConfiguration) -> None: ...
    def close(self) -> None: ...


def validate_configuration(configuration: NetworkConfiguration,
                           local_network: str | None = None) -> None:
    if not configuration.interface_token:
        raise ManagementError("The device did not supply a network interface token.")
    try:
        dns_servers = [ipaddress.IPv4Address(server) for server in configuration.dns]
    except ValueError as exc:
        raise ManagementError("Enter valid IPv4 DNS server addresses.") from exc
    if any(server.is_multicast or server.is_unspecified or server.is_loopback for server in dns_servers):
        raise ManagementError("DNS servers must be usable unicast addresses.")
    if configuration.dhcp:
        return
    try:
        ip = ipaddress.IPv4Address(configuration.ip)
        subnet = ipaddress.IPv4Network(f"{ip}/{configuration.subnet_mask}", strict=False)
        gateway = ipaddress.IPv4Address(configuration.gateway) if configuration.gateway else None
    except ValueError as exc:
        raise ManagementError("Enter valid IPv4 addresses and a contiguous subnet mask.") from exc
    if ip.is_multicast or ip.is_unspecified or ip.is_loopback or ip.is_reserved:
        raise ManagementError("The device IP must be a unicast network address.")
    if subnet.prefixlen < 31 and ip in (subnet.network_address, subnet.broadcast_address):
        raise ManagementError("Network and broadcast addresses cannot be assigned to a device.")
    if gateway and (gateway not in subnet or gateway == ip or gateway.is_multicast
                    or gateway.is_unspecified
                    or subnet.prefixlen < 31 and gateway in (subnet.network_address, subnet.broadcast_address)):
        raise ManagementError("The gateway must be a different usable address in the device subnet.")
    if local_network and ip not in ipaddress.IPv4Network(local_network):
        raise ManagementError("Choose an IP reachable on the selected local adapter subnet.")


def adapter_capabilities(device: Device) -> Capabilities:
    if device.reachability == "Potential conflict":
        return Capabilities(reason="Resolve conflicting IP/MAC observations before configuring this address.")
    if not device.onvif_endpoint:
        return Capabilities()
    if urlsplit(device.onvif_endpoint).scheme != "https":
        return Capabilities(reason="This device advertises only HTTP. Enable verified HTTPS ONVIF on the device.")
    return Capabilities(read_network=True, reason="Authenticate over verified HTTPS to inspect network capabilities.")


class ONVIFAdapter:
    def __init__(self, device: Device, ca_bundle: str | None = None) -> None:
        endpoint = device.onvif_endpoint
        if not endpoint:
            raise ManagementError("The device has no advertised ONVIF endpoint.")
        parsed = urlsplit(endpoint)
        if (parsed.scheme != "https" or parsed.hostname != device.ip
                or parsed.username or parsed.password or parsed.fragment or parsed.query):
            raise ManagementError("Management requires an advertised HTTPS endpoint on this device's IP.")
        self.device = device
        self.endpoint = endpoint
        self.session = requests.Session()
        self.session.trust_env = False
        self.session.verify = ca_bundle or True
        self._credentials: Credentials | None = None
        self._capabilities = Capabilities(read_network=True, reason="Authenticate first.")
        self.identity: DeviceIdentity | None = None

    def close(self) -> None:
        self._credentials = None
        self.session.auth = None
        self.session.close()

    def _call(self, operation: str, arguments: list[Element] | None = None) -> Element:
        if not self._credentials:
            raise ManagementError("Enter your own device credentials first.")
        envelope = Element(f"{{{SOAP}}}Envelope")
        header = SubElement(envelope, f"{{{SOAP}}}Header")
        security = SubElement(header, f"{{{WSSE}}}Security", {f"{{{SOAP}}}mustUnderstand": "true"})
        token = SubElement(security, f"{{{WSSE}}}UsernameToken")
        SubElement(token, f"{{{WSSE}}}Username").text = self._credentials.username
        nonce = secrets.token_bytes(24)
        created = datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")
        digest = base64.b64encode(hashlib.sha1(
            nonce + created.encode() + self._credentials.password.encode()).digest()).decode()
        SubElement(token, f"{{{WSSE}}}Password", {
            "Type": "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordDigest"
        }).text = digest
        SubElement(token, f"{{{WSSE}}}Nonce", {
            "EncodingType": "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-soap-message-security-1.0#Base64Binary"
        }).text = base64.b64encode(nonce).decode()
        SubElement(token, f"{{{WSU}}}Created").text = created
        body = SubElement(envelope, f"{{{SOAP}}}Body")
        request = SubElement(body, f"{{{TDS}}}{operation}")
        request.extend(arguments or [])
        try:
            with self.session.post(
                self.endpoint, data=tostring(envelope, encoding="utf-8", xml_declaration=True),
                headers={"Content-Type": f'application/soap+xml; charset=utf-8; action="{TDS}/{operation}"'},
                timeout=(2, 3), allow_redirects=False, stream=True,
            ) as response:
                if response.status_code in (401, 403):
                    raise ManagementError("Authentication failed or your account lacks permission.")
                if 300 <= response.status_code < 400:
                    raise ManagementError("Device management redirects are not allowed.")
                payload = bytearray()
                deadline = time.monotonic() + 4
                # Check the wall-clock limit even for a slow trickle response.
                for chunk in response.iter_content(1):
                    if time.monotonic() > deadline or len(payload) + len(chunk) > 262144:
                        raise ManagementError("The device response exceeded the management limit.")
                    payload.extend(chunk)
                root = ElementTree.fromstring(bytes(payload))
                if root.find(f".//{{{SOAP}}}Fault") is not None:
                    raise ManagementError("The device rejected this ONVIF operation. Check support, permissions and device clock.")
                response.raise_for_status()
        except requests.exceptions.SSLError as exc:
            raise ManagementError("TLS certificate verification failed. Supply a trusted device CA with a matching IP certificate.") from exc
        except (requests.RequestException, ElementTree.ParseError, DefusedXmlException) as exc:
            _LOG.warning("ONVIF %s failed for %s (%s)", operation, self.device.ip, type(exc).__name__)
            raise ManagementError("The device did not return a valid ONVIF response.") from exc
        result = root.find(f".//{{{TDS}}}{operation}Response")
        if result is None:
            raise ManagementError("The device returned an unexpected ONVIF response.")
        return result

    def authenticate(self, credentials: Credentials) -> DeviceIdentity:
        if not credentials.username or not credentials.password:
            raise ManagementError("Username and password are required; no default credentials are attempted.")
        self._credentials = credentials
        self.session.auth = HTTPDigestAuth(credentials.username, credentials.password)
        try:
            self.identity = self.identify()
        except ManagementError:
            self.close()
            raise
        return self.identity

    def identify(self) -> DeviceIdentity:
        result = self._call("GetDeviceInformation")
        return DeviceIdentity(
            result.findtext(f"{{{TDS}}}Manufacturer", ""),
            result.findtext(f"{{{TDS}}}Model", ""),
            result.findtext(f"{{{TDS}}}SerialNumber", ""),
            result.findtext(f"{{{TDS}}}FirmwareVersion", ""),
        )

    def get_capabilities(self) -> Capabilities:
        return self._capabilities

    def validate_configuration(self, configuration: NetworkConfiguration) -> None:
        validate_configuration(configuration)

    def _administrator_verified(self) -> bool:
        try:
            users = self._call("GetUsers")
        except ManagementError:
            _LOG.info("Device account role could not be verified; management remains read-only")
            return False
        if not self._credentials:
            return False
        return any(user.findtext(f"{{{TT}}}Username") == self._credentials.username
                   and user.findtext(f"{{{TT}}}UserLevel") == "Administrator"
                   for user in users.findall(f"{{{TDS}}}User"))

    def get_network_configuration(self) -> NetworkConfiguration:
        interfaces = self._call("GetNetworkInterfaces")
        matching = []
        for interface in interfaces.findall(f"{{{TDS}}}NetworkInterfaces"):
            config = interface.find(f"{{{TT}}}IPv4/{{{TT}}}Config")
            if config is None:
                continue
            flag = config.findtext(f"{{{TT}}}DHCP")
            if flag not in ("true", "false", "1", "0"):
                raise ManagementError("The device returned incomplete DHCP configuration.")
            dhcp = flag in ("true", "1")
            addresses = config.findall(f"{{{TT}}}{'FromDHCP' if dhcp else 'Manual'}")
            for address in addresses:
                if address.findtext(f"{{{TT}}}Address") == self.device.ip:
                    matching.append((interface, config, address, dhcp))
        if len(matching) != 1:
            raise ManagementError("The active IPv4 interface cannot be identified unambiguously.")
        interface, config, address, dhcp = matching[0]
        if len(config.findall(f"{{{TT}}}Manual")) > 1:
            raise ManagementError("Multiple static addresses require the vendor's management interface.")
        gateway = self._call("GetNetworkDefaultGateway")
        dns = self._call("GetDNS")
        gateways = gateway.findall(f"{{{TDS}}}NetworkGateway/{{{TT}}}IPv4Address")
        if len(gateways) > 1 or gateway.findall(f"{{{TDS}}}NetworkGateway/{{{TT}}}IPv6Address"):
            raise ManagementError("Multiple or IPv6 gateways require the vendor's management interface.")
        info = dns.find(f"{{{TDS}}}DNSInformation")
        if info is None:
            raise ManagementError("The device returned incomplete DNS configuration.")
        flag = info.findtext(f"{{{TT}}}FromDHCP")
        if flag not in ("true", "false", "1", "0"):
            raise ManagementError("The device returned incomplete DNS mode information.")
        dns_dhcp = flag in ("true", "1")
        dns_servers = tuple(
            value.text for value in info.findall(
                f"{{{TT}}}{'DNSFromDHCP' if dns_dhcp else 'DNSManual'}/{{{TT}}}IPv4Address")
            if value.text
        )
        if info.findall(f"{{{TT}}}DNSManual/{{{TT}}}IPv6Address"):
            raise ManagementError("Mixed IPv4/IPv6 DNS configuration requires the vendor's interface.")
        try:
            prefix = int(address.findtext(f"{{{TT}}}PrefixLength", ""))
            mask = str(ipaddress.IPv4Network(f"0.0.0.0/{prefix}").netmask)
        except ValueError as exc:
            raise ManagementError("The device returned an invalid subnet prefix.") from exc
        result = NetworkConfiguration(
            interface.get("token", ""), self.device.ip, mask,
            gateways[0].text if gateways else None, dns_servers, dhcp, dns_dhcp,
            tuple(item.text for item in info.findall(f"{{{TT}}}SearchDomain") if item.text),
        )
        if not result.interface_token:
            raise ManagementError("The device returned no interface token.")
        stable_identity = bool(self.identity and self.identity.serial)
        authorized = self._administrator_verified()
        self._capabilities = Capabilities(True, stable_identity and authorized,
                                         "" if stable_identity and authorized else
                                         "A stable serial number and verified administrator role are required for changes.",
                                         bool(self.device.discovery_id))
        return result

    def set_network_configuration(self, configuration: NetworkConfiguration) -> bool:
        if not self._capabilities.write_network:
            raise ManagementError("Authenticate and read a supported configuration before making changes.")
        self.validate_configuration(configuration)
        original = self.get_network_configuration()
        if not self._capabilities.write_network:
            raise ManagementError("The current account no longer has verified configuration permission.")
        if configuration.dhcp != original.dhcp and not self.device.discovery_id:
            raise ManagementError("Changing DHCP mode requires a stable WS-Discovery identity for rediscovery.")
        if configuration.interface_token != original.interface_token:
            raise ManagementError("The selected device interface changed. Read its configuration again.")
        stages: list[str] = []
        try:
            if (configuration.dns, configuration.dns_from_dhcp) != (original.dns, original.dns_from_dhcp):
                args = [_element(TDS, "FromDHCP", str(configuration.dns_from_dhcp).lower())]
                args.extend(_element(TDS, "SearchDomain", domain) for domain in original.search_domains)
                if not configuration.dns_from_dhcp:
                    for server in configuration.dns:
                        node = _element(TDS, "DNSManual")
                        SubElement(node, f"{{{TT}}}Type").text = "IPv4"
                        SubElement(node, f"{{{TT}}}IPv4Address").text = server
                        args.append(node)
                self._call("SetDNS", args)
                stages.append("DNS")
            if configuration.gateway != original.gateway and not configuration.dhcp:
                args = [_element(TDS, "IPv4Address", configuration.gateway)] if configuration.gateway else []
                self._call("SetNetworkDefaultGateway", args)
                stages.append("gateway")
            if (configuration.ip, configuration.subnet_mask, configuration.dhcp) == (
                    original.ip, original.subnet_mask, original.dhcp):
                return False
            node = _element(TDS, "NetworkInterface")
            ipv4 = SubElement(node, f"{{{TT}}}IPv4")
            SubElement(ipv4, f"{{{TT}}}Enabled").text = "true"
            if not configuration.dhcp:
                manual = SubElement(ipv4, f"{{{TT}}}Manual")
                SubElement(manual, f"{{{TT}}}Address").text = configuration.ip
                SubElement(manual, f"{{{TT}}}PrefixLength").text = str(
                    ipaddress.IPv4Network(f"0.0.0.0/{configuration.subnet_mask}").prefixlen)
            SubElement(ipv4, f"{{{TT}}}DHCP").text = str(configuration.dhcp).lower()
            result = self._call("SetNetworkInterfaces", [_element(TDS, "InterfaceToken", configuration.interface_token), node])
            reboot = result.findtext(f"{{{TDS}}}RebootNeeded")
            if reboot not in ("true", "false", "1", "0"):
                raise ManagementError("The device did not report whether a reboot is required.")
            return reboot in ("true", "1")
        except ManagementError as exc:
            applied = ", ".join(stages) or "none confirmed"
            raise ManagementError(
                f"Configuration could not be confirmed (completed steps: {applied}). "
                "A timed-out write may already have applied. Read the device configuration before retrying. "
                f"{exc}"
            ) from exc


def _element(namespace: str, name: str, text: str | None = None) -> Element:
    element = Element(f"{{{namespace}}}{name}")
    element.text = text
    return element


def change_network_configuration(
    adapter: ONVIFAdapter, configuration: NetworkConfiguration, known_devices: list[Device],
    local_network: str | None, should_stop: Callable[[], bool] | None = None,
) -> ChangeResult:
    stopped = should_stop or (lambda: False)
    old_ip = adapter.device.ip
    validate_configuration(configuration, local_network)
    identity = adapter.identity
    if not identity or not identity.serial:
        raise ManagementError("A stable authenticated device identity is required.")
    current_identity = adapter.identify()
    if (current_identity.serial, current_identity.manufacturer, current_identity.model) != (
            identity.serial, identity.manufacturer, identity.model):
        raise ManagementError("The device identity changed since authentication. No configuration write was sent.")
    if not configuration.dhcp and configuration.ip != old_ip:
        if any(device.ip == configuration.ip for device in known_devices):
            raise ManagementError("The requested IP is already present in the current scan.")
        if network_utils.read_arp_entry(configuration.ip) or network_utils.ping_once(configuration.ip) \
                or network_utils.scan_ports(configuration.ip) or network_utils.read_arp_entry(configuration.ip):
            raise ManagementError("The requested IP may be in use. Choose another address.")
    if stopped():
        raise ManagementError("Configuration cancelled before any write.")
    reboot = adapter.set_network_configuration(configuration)
    if reboot:
        return ChangeResult(old_ip, None, False, True,
                            "The device accepted the settings but requires a reboot. No reboot was sent. "
                            "It may still be reachable at the old IP; reboot through the vendor interface and rescan.")
    parsed = urlsplit(adapter.endpoint)
    deadline = time.monotonic() + 15
    last_error = "The configured address did not respond."
    while time.monotonic() < deadline and not stopped():
        candidates = [configuration.ip]
        endpoints: dict[str, str] = {}
        if configuration.dhcp:
            discovered = onvif_probe.discover(timeout=0.5, should_stop=stopped)
            candidates = [old_ip] + [
                ip for ip, result in discovered.items()
                if adapter.device.discovery_id and result.discovery_id == adapter.device.discovery_id
                and (not local_network or ipaddress.ip_address(ip) in ipaddress.ip_network(local_network))
            ]
            candidates = list(dict.fromkeys(candidates))
            endpoints = {ip: result.endpoint for ip, result in discovered.items() if result.endpoint}
        for ip in candidates:
            endpoint = endpoints.get(ip) or urlunsplit(
                (parsed.scheme, f"{ip}:{parsed.port}" if parsed.port else ip, parsed.path, "", ""))
            candidate = ONVIFAdapter(replace(adapter.device, ip=ip, onvif_endpoint=endpoint),
                                     adapter.session.verify if isinstance(adapter.session.verify, str) else None)
            try:
                if adapter._credentials is None:
                    raise ManagementError("The management session expired.")
                found = candidate.authenticate(adapter._credentials)
                if (found.serial, found.manufacturer, found.model) != (
                        identity.serial, identity.manufacturer, identity.model):
                    raise ManagementError("The responding device identity does not match the original device.")
                actual = candidate.get_network_configuration()
                matches = actual.dhcp == configuration.dhcp
                if not configuration.dhcp:
                    matches = matches and (actual.ip, actual.subnet_mask, actual.gateway) == (
                        configuration.ip, configuration.subnet_mask, configuration.gateway)
                matches = matches and actual.dns_from_dhcp == configuration.dns_from_dhcp
                if not configuration.dns_from_dhcp:
                    matches = matches and actual.dns == configuration.dns
                if not matches:
                    raise ManagementError("The device responded but its configuration differs from the requested settings.")
                return ChangeResult(old_ip, actual.ip, True, False,
                                    f"Authenticated identity and configuration verified: {old_ip} -> {actual.ip}.",
                                    actual, candidate.endpoint)
            except ManagementError as exc:
                last_error = str(exc)
            finally:
                candidate.close()
        time.sleep(0.25)
    return ChangeResult(old_ip, None, False, False,
                        f"The write was sent but the new configuration could not be verified. {last_error} "
                        "Do not assume success; inspect the device and rescan.")
