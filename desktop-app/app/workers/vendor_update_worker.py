from PyQt6.QtCore import QThread, pyqtSignal

from app.core import vendor_lookup


class VendorUpdateWorker(QThread):
    completed = pyqtSignal()
    failed = pyqtSignal(str)

    def run(self) -> None:
        try:
            vendor_lookup.update_database()
        except Exception as exc:
            self.failed.emit(f"{type(exc).__name__}: {exc}")
        else:
            self.completed.emit()
