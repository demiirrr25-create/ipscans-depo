"""Bounded discovery and enrichment with progressive, deduplicated observations."""
from __future__ import annotations

from concurrent.futures import FIRST_COMPLETED, Future, ThreadPoolExecutor, wait
from dataclasses import dataclass, field
from datetime import datetime, timezone
import ipaddress
import logging
from typing import Callable

from app.core import intelligence, network_utils, vendor_lookup
from app.core.models import Device
from app.core.providers import DeviceProvider, MDNSProvider, ONVIFProvider, UPnPProvider
from app.core.protocols import mdns_probe, nmap_probe, onvif_probe, snmp_probe, upnp_probe, wmi_probe
from app.core.registry import DeviceRegistry, PotentialConflict

_LOG = logging.getLogger(__name__)


@dataclass
class ScanOptions:
    enable_snmp: bool = False
    snmp_community: str | None = field(default=None, repr=False)
    enable_wmi: bool = True
    enable_upnp: bool = True
    enable_nmap: bool = False
    nmap_os_detection: bool = False
    max_workers: int = 64
    providers: list[DeviceProvider] | None = None
    interface_ip: str | None = None

    def __post_init__(self) -> None:
        if not 2 <= self.max_workers <= 128:
            raise ValueError("Scan concurrency must be between 2 and 128 workers")
        if self.enable_snmp and not self.snmp_community:
            raise ValueError("An explicitly supplied SNMP community is required")
        if self.interface_ip:
            ipaddress.IPv4Address(self.interface_ip)


def _enrich_host(ip: str, mac: str | None, options: ScanOptions,
                 stopped: Callable[[], bool]) -> Device:
    device = Device(ip=ip, mac=mac, vendor=vendor_lookup.lookup_vendor(mac))
    if stopped():
        return device
    device.hostname = network_utils.resolve_hostname(ip)
    if stopped():
        return device
    latencies: list[float] = []
    device.open_ports = network_utils.scan_ports(ip, on_latency=latencies.append)
    device.latency_ms = min(latencies) if latencies else None
    if stopped():
        return device
    if options.enable_snmp and options.snmp_community and ipaddress.ip_address(ip).version == 4:
        result = snmp_probe.query(ip, options.snmp_community)
        if result:
            device.snmp_sys_descr = result.sys_descr
            device.snmp_sys_name = result.sys_name
            device.serial_number = result.serial_number
            device.lldp_neighbor_macs = list(result.lldp_neighbor_macs)
            device.sources.append("SNMP")
    if options.enable_wmi and not stopped() and _looks_like_self(ip):
        result = wmi_probe.query_local_machine()
        if result:
            device.wmi_computer_name = result.computer_name
            device.wmi_os_caption = result.os_caption
            device.serial_number = device.serial_number or result.bios_serial_number
            device.sources.append("WMI")
    if options.enable_nmap and not stopped() and ipaddress.ip_address(ip).version == 4:
        result = nmap_probe.query(ip, with_os_detection=options.nmap_os_detection)
        if result:
            device.nmap_os_guess = result.os_guess
            device.nmap_services = result.services
            device.sources.append("Nmap")
    return device


def _looks_like_self(ip: str) -> bool:
    return any(address.address == ip for addresses in network_utils.psutil.net_if_addrs().values()
               for address in addresses if address.family == network_utils.socket.AF_INET)


def run_scan(
    targets: list[str],
    options: ScanOptions,
    on_device_found: Callable[[Device], None],
    on_progress: Callable[[int, int], None] | None = None,
    should_stop: Callable[[], bool] | None = None,
    on_phase: Callable[[str], None] | None = None,
    on_conflicts: Callable[[list[PotentialConflict]], None] | None = None,
    on_warning: Callable[[str], None] | None = None,
) -> None:
    """Emit upserts as soon as reachability or a discovery announcement is observed.

    Half the worker budget probes hosts, half enriches; each executor holds
    at most twice its worker count in pending jobs. Protocol discovery runs
    concurrently in three fixed slots. All user callbacks run on this thread.
    """
    stopped = should_stop or (lambda: False)
    target_set = set(targets)
    registry = DeviceRegistry()
    scheduled: set[str] = set()
    initial_macs = network_utils.resolve_macs(targets, options.interface_ip) if not stopped() else {}
    providers = options.providers
    if providers is None:
        providers = [ONVIFProvider(options.interface_ip), MDNSProvider(options.interface_ip)]
        if options.enable_upnp:
            providers.append(UPnPProvider(options.interface_ip))
    if len(providers) > 16:
        raise ValueError("At most 16 discovery providers can run in one scan")
    if not any(ipaddress.ip_address(ip).version == 4 for ip in targets):
        providers = []
    enrichment_workers = options.max_workers // 2
    with ThreadPoolExecutor(max_workers=3) as discovery, \
            ThreadPoolExecutor(max_workers=enrichment_workers) as enrichment:
        announcements = {
            discovery.submit(provider.discover, stopped): provider.name
            for provider in providers if not stopped()
        }
        pending: dict[Future[Device], str] = {}

        def emit(device: Device) -> None:
            if stopped():
                return
            merged = registry.merge(device)
            intelligence.classify(merged)
            if any(conflict.ip == merged.ip for conflict in registry.conflicts):
                merged.classification_confidence = "Low"
                merged.classification_evidence = "Potential IP conflict; device identity is ambiguous"
            on_device_found(merged)
            if on_conflicts:
                on_conflicts(registry.conflicts)

        def finish_enrichment(block: bool = False) -> None:
            if not pending:
                return
            ready, _ = wait(pending, timeout=0.1 if block else 0,
                            return_when=FIRST_COMPLETED)
            for future in ready:
                ip = pending.pop(future)
                if future.cancelled():
                    continue
                try:
                    emit(future.result())
                except (OSError, TimeoutError, ValueError, RuntimeError) as exc:
                    _LOG.warning("Enrichment failed for %s (%s)", ip, type(exc).__name__)
                    if on_warning:
                        on_warning(f"Device identification incomplete for {ip}.")

        def found(device: Device) -> None:
            if device.ip not in target_set or stopped():
                return
            now = datetime.now(timezone.utc).isoformat()
            device.first_seen = device.first_seen or now
            device.last_seen = now
            device.mac = device.mac or initial_macs.get(device.ip)
            emit(device)
            if device.ip in scheduled:
                return
            while len(pending) >= enrichment_workers * 2 and not stopped():
                finish_enrichment(block=True)
            if not stopped():
                scheduled.add(device.ip)
                pending[enrichment.submit(_enrich_host, device.ip, device.mac, options, stopped)] = device.ip

        def finish_announcements() -> None:
            for future in list(announcements):
                if not future.done():
                    continue
                name = announcements.pop(future)
                if future.cancelled():
                    continue
                try:
                    for device in future.result():
                        found(device)
                except (OSError, TimeoutError, ValueError, RuntimeError) as exc:
                    _LOG.warning("%s discovery failed (%s)", name, type(exc).__name__)
                    if on_warning:
                        on_warning(f"{name} discovery unavailable; other discovery methods remain active.")

        def progress(done: int, total: int) -> None:
            if on_progress:
                on_progress(done, total)
            finish_announcements()
            finish_enrichment()

        if on_phase:
            on_phase("discovering network")
        alive = network_utils.ping_sweep(
            targets, max_workers=options.max_workers - enrichment_workers,
            should_stop=stopped, on_probe=progress,
            on_alive=lambda ip, source: found(Device(ip, sources=[source])),
        )
        for ip in alive:
            if ip not in scheduled:
                found(Device(ip, sources=["ICMP or TCP"]))
        if on_phase and not stopped():
            on_phase("identifying devices")
        while announcements and not stopped():
            wait(announcements, timeout=0.1, return_when=FIRST_COMPLETED)
            finish_announcements()
            finish_enrichment()
        while pending and not stopped():
            finish_enrichment(block=True)
        if stopped():
            for future in (*announcements, *pending):
                future.cancel()
            return
        final_macs = network_utils.resolve_macs(list(registry.devices), options.interface_ip)
        for ip, mac in final_macs.items():
            emit(Device(ip, mac=mac, vendor=vendor_lookup.lookup_vendor(mac)))
        if on_phase:
            on_phase("building network topology")
