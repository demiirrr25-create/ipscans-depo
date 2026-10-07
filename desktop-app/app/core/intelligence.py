"""Conservative classification: product identity requires self-advertised evidence."""
from __future__ import annotations
import re

from app.core.models import Device


def classify(device: Device) -> None:
    device.device_type = "Unknown"
    device.classification_evidence = None
    device.classification_confidence = "Low"
    types = {value.rsplit(":", 1)[-1] for value in device.onvif_types}
    if "NetworkVideoStorage" in types:
        device.device_type = "NVR"
        device.classification_evidence = "ONVIF NetworkVideoStorage announcement"
        device.classification_confidence = "Medium"
        return
    if ("NetworkVideoTransmitter" in types
            or not types and (device.onvif_endpoint or "ONVIF" in device.sources)):
        device.device_type = "IP Camera"
        device.classification_evidence = "ONVIF discovery announcement"
        device.classification_confidence = "Medium"
        return
    description = " ".join(filter(None, (device.upnp_device_type, device.snmp_sys_descr))).lower()
    signatures = (
        ("internetgatewaydevice", "Router"), ("router", "Router"),
        ("accesspoint", "Access Point"), ("wirelessaccesspoint", "Access Point"), ("wireless access point", "Access Point"),
        ("poe switch", "PoE Switch"), ("switch", "Switch"),
        ("networkvideorecorder", "NVR"), ("nvr", "NVR"), ("dvr", "DVR"),
        ("camera", "IP Camera"), ("printer", "Printer"), ("nas", "NAS"),
        ("voip phone", "VoIP Phone"), ("ipphone", "VoIP Phone"),
        ("iot device", "IoT Device"), ("network server", "Server"), ("computer", "Computer"),
    )
    for signature, category in signatures:
        if re.search(r"(?<![a-z0-9])" + re.escape(signature) + r"(?![a-z0-9])", description):
            device.device_type = category
            device.classification_evidence = "SNMP device description" if device.snmp_sys_descr else "UPnP device description"
            device.classification_confidence = "Medium"
            return
    if device.wmi_os_caption:
        device.device_type = "Computer"
        device.classification_evidence = "Local Windows WMI"
        device.classification_confidence = "High"
        return
    if "_printer._tcp.local." in device.mdns_services:
        device.device_type = "Printer"
        device.classification_evidence = "mDNS printer service"
        device.classification_confidence = "Medium"
    elif "_workstation._tcp.local." in device.mdns_services:
        device.device_type = "Computer"
        device.classification_evidence = "mDNS workstation service"
        device.classification_confidence = "Medium"
