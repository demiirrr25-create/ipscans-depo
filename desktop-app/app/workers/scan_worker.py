"""Runs the (thread-pooled) scan pipeline on a QThread so the GUI event loop
never blocks — this is what keeps the window responsive during a scan.
"""
from __future__ import annotations
import logging
from threading import Event

from PyQt6.QtCore import QThread, pyqtSignal

from app.core.models import Device
from app.core.scanner import ScanOptions, run_scan


class ScanWorker(QThread):
    device_found = pyqtSignal(object)  # Device
    progress = pyqtSignal(int, int)  # completed, total
    phase_changed = pyqtSignal(str)  # "discovering" | "enriching"
    finished_ok = pyqtSignal()
    failed = pyqtSignal(str)
    conflicts_found = pyqtSignal(object)
    warning = pyqtSignal(str)

    def __init__(self, targets: list[str], options: ScanOptions, parent=None) -> None:
        super().__init__(parent)
        self._targets = targets
        self._options = options
        self._stop_requested = Event()

    def stop(self) -> None:
        self._stop_requested.set()

    def run(self) -> None:  # noqa: D102 (QThread override)
        try:
            run_scan(
                self._targets,
                self._options,
                on_device_found=lambda device: self.device_found.emit(device),
                on_progress=lambda done, total: self.progress.emit(done, total),
                should_stop=self._stop_requested.is_set,
                on_phase=lambda phase: self.phase_changed.emit(phase),
                on_conflicts=self.conflicts_found.emit,
                on_warning=self.warning.emit,
            )
            self.finished_ok.emit()
        except Exception as exc:  # keep the UI thread alive no matter what
            logging.getLogger(__name__).error("Scan failed (%s)", type(exc).__name__)
            self.failed.emit("The scan could not finish. Check the network adapter and application log.")
        finally:
            self._options.snmp_community = None
