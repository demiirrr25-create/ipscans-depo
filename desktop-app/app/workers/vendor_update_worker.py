from PyQt6.QtCore import QThread, pyqtSignal
import logging

from app.core import vendor_lookup


class VendorUpdateWorker(QThread):
    completed = pyqtSignal()
    failed = pyqtSignal(str)

    def run(self) -> None:
        try:
            vendor_lookup.update_database()
        except Exception as exc:
            logging.getLogger(__name__).warning("OUI update failed (%s)", type(exc).__name__)
            self.failed.emit("The IEEE OUI update failed. The existing offline database was not replaced.")
        else:
            self.completed.emit()
