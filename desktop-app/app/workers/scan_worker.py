"""Runs the (thread-pooled) scan pipeline on a QThread so the GUI event loop
never blocks — this is what keeps the window responsive during a scan.
"""
from __future__ import annotations

from PyQt6.QtCore import QThread, pyqtSignal

from app.core.models import Device
from app.core.scanner import ScanOptions, run_scan


class ScanWorker(QThread):
    device_found = pyqtSignal(object)  # Device
    progress = pyqtSignal(int, int)  # completed, total
    finished_ok = pyqtSignal()
    failed = pyqtSignal(str)

    def __init__(self, targets: list[str], options: ScanOptions, parent=None) -> None:
        super().__init__(parent)
        self._targets = targets
        self._options = options
        self._stop_requested = False

    def stop(self) -> None:
        self._stop_requested = True

    def run(self) -> None:  # noqa: D102 (QThread override)
        try:
            run_scan(
                self._targets,
                self._options,
                on_device_found=lambda device: self.device_found.emit(device),
                on_progress=lambda done, total: self.progress.emit(done, total),
                should_stop=lambda: self._stop_requested,
            )
            self.finished_ok.emit()
        except Exception as exc:  # keep the UI thread alive no matter what
            self.failed.emit(str(exc))
