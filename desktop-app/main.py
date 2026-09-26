"""ipscans Network Scanner — PyQt6 desktop app entry point."""
import sys

from PyQt6.QtWidgets import QApplication

from app.ui.main_window import MainWindow


def main() -> None:
    # `--selftest` boots the window and exits immediately (exit code 0 on
    # success) — used by CI to smoke-test a packaged .exe without a real display.
    selftest = "--selftest" in sys.argv

    app = QApplication(sys.argv)
    app.setStyle("Fusion")
    window = MainWindow()

    if selftest:
        print("selftest: window created OK")
        sys.exit(0)

    window.show()
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
