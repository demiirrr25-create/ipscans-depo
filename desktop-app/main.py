"""ipscans Network Scanner — PyQt6 desktop app entry point."""
import sys

from PyQt6.QtCore import QTimer
from PyQt6.QtWidgets import QApplication

from app.ui.main_window import MainWindow
from app.ui.privacy_dialog import PrivacyTermsDialog, has_accepted_privacy_terms
from app.ui.resources import load_app_icon
from app.ui.splash import WelcomeSplash
from app.ui.styles import DARK_QSS

SPLASH_DURATION_MS = 1400


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
    # Same mark as ipscans.com's logo, so the taskbar/desktop icon is instantly
    # recognizable as the same product.
    app_icon = load_app_icon()
    app.setWindowIcon(app_icon)

    if selftest:
        window = MainWindow()
        window.setWindowIcon(app_icon)
        print("selftest: window created OK")
        sys.exit(0)

    splash = WelcomeSplash()
    splash.show()
    app.processEvents()

    def finish_startup() -> None:
        splash.close()

        if not has_accepted_privacy_terms():
            dialog = PrivacyTermsDialog()
            if dialog.exec() != PrivacyTermsDialog.DialogCode.Accepted:
                app.quit()
                return

        window = MainWindow()
        window.setWindowIcon(app_icon)
        window.show()
        app.window_ref = window  # keep a live reference so it isn't garbage-collected

    QTimer.singleShot(SPLASH_DURATION_MS, finish_startup)
    sys.exit(app.exec())


if __name__ == "__main__":
    main()

