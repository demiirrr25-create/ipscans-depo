"""Run bounded non-scanning operations outside the GUI thread."""
from __future__ import annotations

import logging
from typing import Callable

from PyQt6.QtCore import QThread, pyqtSignal

from app.core.adapters import ManagementError


class TaskWorker(QThread):
    completed = pyqtSignal(object)
    failed = pyqtSignal(str)

    def __init__(self, operation: Callable[[], object], parent=None) -> None:
        super().__init__(parent)
        self.operation = operation

    def run(self) -> None:
        try:
            self.completed.emit(self.operation())
        except (ManagementError, OSError, ValueError) as exc:
            logging.getLogger(__name__).warning("Background operation failed (%s)", type(exc).__name__)
            self.failed.emit(str(exc) if isinstance(exc, ManagementError)
                             else "The operation failed. Check the adapter and application log.")
        except Exception as exc:
            logging.getLogger(__name__).error("Unexpected background failure (%s)", type(exc).__name__)
            self.failed.emit("The operation could not finish. See the application log.")
        finally:
            self.operation = lambda: None
