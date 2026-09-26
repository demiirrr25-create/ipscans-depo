"""ipscans Network Scanner — PyQt6 desktop app entry point."""
import sys

from PyQt6.QtWidgets import QApplication

from app.ui.main_window import MainWindow
from app.ui.styles import DARK_QSS


def main() -> None:
    # `--selftest` boots the window and exits immediately (exit code 0 on
    # success) — used by CI to smoke-test a packaged .exe without a real display.
    selftest = "--selftest" in sys.argv

    app = QApplication(sys.argv)
    app.setStyle("Fusion")
    # Applied at the QApplication level (not just the main window) so every
    # popup — QMessageBox, tooltips, combo/list views — inherits the dark
    # theme too, instead of falling back to the native white/black default.
    app.setStyleSheet(DARK_QSS)
    window = MainWindow()

    if selftest:
        print("selftest: window created OK")
        sys.exit(0)

    window.show()
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
