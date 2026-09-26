"""Orchestrates the full hybrid scan: fast ping sweep first, then per-host
enrichment (MAC/vendor/hostname/ports/SNMP/WMI/Nmap) plus one network-wide
UPnP discovery pass, merged into a single Device per responding host.
"""
from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from typing import Callable

from app.core import network_utils, vendor_lookup
from app.core.models import Device
from app.core.protocols import nmap_probe, snmp_probe, upnp_probe, wmi_probe


@dataclass
class ScanOptions:
    enable_snmp: bool = True
    snmp_community: str = "public"
    enable_wmi: bool = True
    enable_upnp: bool = True
    enable_nmap: bool = False  # off by default: nmap is comparatively slow
    nmap_os_detection: bool = False
    max_workers: int = 32


def _enrich_host(ip: str, mac_by_ip: dict[str, str], upnp_by_ip: dict, options: ScanOptions) -> Device:
    mac = mac_by_ip.get(ip)
    device = Device(ip=ip, mac=mac)

    # Every enrichment step is independently guarded: a single misbehaving
    # protocol (e.g. an incompatible SNMP/WMI library on this machine) must
    # never abort the whole scan — it should just leave that field empty.
    try:
        device.vendor = vendor_lookup.lookup_vendor(mac)
    except Exception:
        pass

    try:
        device.hostname = network_utils.resolve_hostname(ip)
    except Exception:
        pass

    try:
        device.open_ports = network_utils.scan_ports(ip)
    except Exception:
        pass

    if options.enable_snmp:
        try:
            snmp_result = snmp_probe.query(ip, options.snmp_community)
        except Exception:
            snmp_result = None
        if snmp_result:
            device.snmp_sys_descr = snmp_result.sys_descr
            device.snmp_sys_name = snmp_result.sys_name
            device.serial_number = device.serial_number or snmp_result.serial_number
            device.sources.append("SNMP")

    upnp_result = upnp_by_ip.get(ip)
    if upnp_result:
        device.upnp_friendly_name = upnp_result.friendly_name
        device.upnp_device_type = upnp_result.device_type
        device.sources.append("UPnP")

    if options.enable_wmi:
        try:
            wmi_result = wmi_probe.query_local_machine() if _looks_like_self(ip) else None
        except Exception:
            wmi_result = None
        if wmi_result:
            device.wmi_computer_name = wmi_result.computer_name
            device.wmi_os_caption = wmi_result.os_caption
            device.serial_number = device.serial_number or wmi_result.bios_serial_number
            device.sources.append("WMI")

    if options.enable_nmap:
        try:
            nmap_result = nmap_probe.query(ip, with_os_detection=options.nmap_os_detection)
        except Exception:
            nmap_result = None
        if nmap_result:
            device.nmap_os_guess = nmap_result.os_guess
            device.nmap_services = nmap_result.services
            device.sources.append("Nmap")

    return device


def _looks_like_self(ip: str) -> bool:
    import socket

    try:
        return ip in socket.gethostbyname_ex(socket.gethostname())[2]
    except OSError:
        return False


def run_scan(
    targets: list[str],
    options: ScanOptions,
    on_device_found: Callable[[Device], None],
    on_progress: Callable[[int, int], None] | None = None,
    should_stop: Callable[[], bool] | None = None,
    on_phase: Callable[[str], None] | None = None,
) -> None:
    """Runs synchronously on a background thread (see workers/scan_worker.py);
    calls `on_device_found` incrementally so the UI can populate rows live.
    `on_phase` reports coarse progress ("discovering" while the host sweep has
    no per-item progress yet, then "enriching" once per-host counts are known)
    so the UI can switch between an indeterminate spinner and a real progress bar.
    """
    if on_phase:
        on_phase("discovering")
    alive_hosts = network_utils.ping_sweep(targets)
    if not alive_hosts:
        return

    mac_by_ip = network_utils.resolve_macs(alive_hosts)
    upnp_by_ip = upnp_probe.discover() if options.enable_upnp else {}

    total = len(alive_hosts)
    completed = 0
    if on_phase:
        on_phase("enriching")
    with ThreadPoolExecutor(max_workers=options.max_workers) as pool:
        futures = {
            pool.submit(_enrich_host, ip, mac_by_ip, upnp_by_ip, options): ip
            for ip in alive_hosts
        }
        for future in as_completed(futures):
            if should_stop and should_stop():
                pool.shutdown(cancel_futures=True)
                break
            try:
                device = future.result()
            except Exception:
                # _enrich_host already guards its own steps, but this is a
                # last-resort net so one bad host can never abort the scan.
                ip = futures[future]
                device = Device(ip=ip)
            on_device_found(device)
            completed += 1
            if on_progress:
                on_progress(completed, total)
