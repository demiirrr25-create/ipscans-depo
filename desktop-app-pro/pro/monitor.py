"""Continuous Monitoring (spec item 8): a QThread that re-scans the same
targets on a configurable interval, running each result through the
conflict engine, offline/latency/packet-loss checks, and the health score —
without ever blocking the UI thread (same pattern as the free app's
ScanWorker).
"""
from __future__ import annotations

import sys
import time
from pathlib import Path

from PyQt6.QtCore import QThread, pyqtSignal

# Reuse the free app's scanner engine instead of duplicating it — see
# main.py for the matching sys.path insertion done at process startup.
_FREE_APP_ROOT = Path(__file__).resolve().parent.parent.parent / "desktop-app"
if str(_FREE_APP_ROOT) not in sys.path:
    sys.path.insert(0, str(_FREE_APP_ROOT))

from app.core import network_utils  # noqa: E402
from app.core.scanner import ScanOptions, run_scan  # noqa: E402

from pro.conflict_engine import identity_key_for, process_ping_result, process_scan_pass  # noqa: E402
from pro.database import Database, now_iso  # noqa: E402
from pro.device_classifier import classify_device_type  # noqa: E402
from pro.health_score import compute_health_score  # noqa: E402
from pro.license import LicenseProvider  # noqa: E402
from pro.models import Event, ScanPassResult  # noqa: E402
from pro.ping_utils import LATENCY_HIGH_MS, ping_with_latency  # noqa: E402
from pro.remote_api import RemoteAPIError, post_json  # noqa: E402

DEFAULT_OFFLINE_THRESHOLD = 3  # consecutive failed polls (spec item 12)
CRITICAL_OFFLINE_THRESHOLD = 1  # devices marked critical alert on the first miss


class MonitorWorker(QThread):
    tick_started = pyqtSignal()
    device_updated = pyqtSignal(object)  # sqlite3.Row-like device snapshot
    event_created = pyqtSignal(object)  # Event
    health_updated = pyqtSignal(object)  # HealthBreakdown
    tick_finished = pyqtSignal()
    failed = pyqtSignal(str)

    def __init__(
        self,
        db: Database,
        targets: list[str],
        interval_sec: int,
        site_name: str | None = None,
        license_provider: LicenseProvider | None = None,
        lang: str = "en",
        parent=None,
    ) -> None:
        super().__init__(parent)
        self._db = db
        self._targets = targets
        self._interval_sec = interval_sec
        self._site_name = site_name
        self._license_provider = license_provider
        self._lang = lang
        self._stop_requested = False
        self._offline_threshold = DEFAULT_OFFLINE_THRESHOLD

    def set_interval(self, interval_sec: int) -> None:
        self._interval_sec = interval_sec

    def stop(self) -> None:
        self._stop_requested = True

    def run(self) -> None:  # noqa: D102 (QThread override)
        try:
            while not self._stop_requested:
                self._run_one_tick()
                for _ in range(self._interval_sec * 10):
                    if self._stop_requested:
                        break
                    time.sleep(0.1)
        except Exception as exc:  # keep the UI thread alive no matter what
            self.failed.emit(str(exc))

    def _run_one_tick(self) -> None:
        self.tick_started.emit()
        scan_results: list[ScanPassResult] = []

        def on_device_found(device) -> None:
            device_type = classify_device_type(device.open_ports, device.vendor, device.hostname)
            scan_results.append(
                ScanPassResult(
                    ip=device.ip, mac=device.mac, vendor=device.vendor, hostname=device.hostname,
                    device_type=device_type, open_ports=device.open_ports,
                )
            )

        run_scan(
            self._targets,
            ScanOptions(enable_nmap=False),
            on_device_found=on_device_found,
            should_stop=lambda: self._stop_requested,
        )

        events: list[Event] = process_scan_pass(self._db, scan_results, self._lang)

        high_latency = 0
        packet_losses: list[float] = []
        tick_ts = now_iso()
        for result in scan_results:
            key = identity_key_for(result.mac, result.ip)
            ping = ping_with_latency(result.ip, samples=2)
            self._db.set_ping_stats(key, ping.latency_ms, ping.packet_loss_pct)
            self._db.record_metric(key, tick_ts, ping.latency_ms, ping.packet_loss_pct)
            packet_losses.append(ping.packet_loss_pct)
            if ping.latency_ms is not None and ping.latency_ms >= LATENCY_HIGH_MS:
                high_latency += 1
            device_row = self._db.get_device(key)
            threshold = (
                CRITICAL_OFFLINE_THRESHOLD if device_row and device_row["is_critical"] else self._offline_threshold
            )
            offline_event = process_ping_result(
                self._db, key, result.ip, ping.alive, threshold, self._lang
            )
            if offline_event:
                events.append(offline_event)
                self._db.add_event(offline_event)

        for event in events:
            self.event_created.emit(event)

        conflicts = sum(1 for e in events if e.type.value == "ip_conflict")
        offline_devices = sum(
            1 for row in self._db.all_devices() if row["status"] == "offline"
        )
        unknown = sum(1 for row in self._db.all_devices() if not row["vendor"])
        avg_loss = sum(packet_losses) / len(packet_losses) if packet_losses else 0.0

        breakdown = compute_health_score(
            total_devices=len(scan_results),
            ip_conflicts=conflicts,
            offline_devices=offline_devices,
            high_latency_devices=high_latency,
            avg_packet_loss_pct=avg_loss,
            unknown_devices=unknown,
        )
        self.health_updated.emit(breakdown)
        for row in self._db.all_devices():
            self.device_updated.emit(row)
        self._sync_site(breakdown)
        self.tick_finished.emit()

    def _sync_site(self, breakdown) -> None:
        """Multi-site sync (spec items 42-43) — best-effort, license-gated,
        and run here (the background thread) so a slow/unreachable server
        never stalls the UI (spec item 28).
        """
        if not self._site_name or not self._license_provider:
            return
        status = self._license_provider.get_status()
        if not status.is_active or not status.has_feature("multi_site") or not status.email or not status.license_key:
            return
        try:
            post_json(
                "/site/sync",
                {
                    "email": status.email,
                    "key": status.license_key,
                    "site": {
                        "name": self._site_name,
                        "deviceCount": breakdown.total_devices,
                        "onlineCount": breakdown.total_devices - breakdown.offline_devices,
                        "offlineCount": breakdown.offline_devices,
                        "conflictCount": breakdown.ip_conflicts,
                        "healthScore": breakdown.score,
                    },
                },
            )
        except RemoteAPIError:
            pass  # non-critical — next tick will retry


def detect_default_targets() -> list[str]:
    """Same local-/24 auto-detection the free app uses on launch."""
    suggestion = network_utils.suggest_range_spec()
    if not suggestion:
        return []
    try:
        return network_utils.parse_targets(suggestion)
    except network_utils.InvalidTargetError:
        return []
