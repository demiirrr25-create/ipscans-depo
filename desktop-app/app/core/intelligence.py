"""Conservative classification: product identity requires self-advertised evidence."""
from __future__ import annotations

from app.core.models import Device


def classify(device: Device) -> None:
    if device.onvif_endpoint or "ONVIF" in device.sources:
        device.device_type = "IP Camera"
        device.classification_evidence = "ONVIF discovery announcement"
        return
    description = " ".join(filter(None, (device.upnp_device_type, device.snmp_sys_descr))).lower()
    signatures = (
        ("internetgatewaydevice", "Router"), ("router", "Router"),
        ("accesspoint", "Access Point"), ("wireless access point", "Access Point"),
        ("poe switch", "PoE Switch"), ("switch", "Switch"),
        ("networkvideorecorder", "NVR"), ("nvr", "NVR"), ("dvr", "DVR"),
        ("camera", "IP Camera"), ("printer", "Printer"), ("nas", "NAS"),
    )
    for signature, category in signatures:
        if signature in description:
            device.device_type = category
            device.classification_evidence = "SNMP device description" if device.snmp_sys_descr else "UPnP device description"
            return
    if device.wmi_os_caption:
        device.device_type = "Computer"
        device.classification_evidence = "Local Windows WMI"
        return
    if "_printer._tcp.local." in device.mdns_services:
        device.device_type = "Printer"
        device.classification_evidence = "mDNS printer service"
