"""ipscans Network Scanner — PyQt6 desktop app entry point."""
import sys
import traceback
from pathlib import Path

from PyQt6.QtCore import QTimer
from PyQt6.QtWidgets import QApplication, QMessageBox

from app.i18n import DEFAULT_LANGUAGE, get_saved_language
from app.ui.language_dialog import LanguageDialog
from app.ui.main_window import MainWindow
from app.ui.privacy_dialog import PrivacyTermsDialog, has_accepted_privacy_terms
from app.ui.resources import load_app_icon
from app.ui.splash import WelcomeSplash
from app.ui.styles import DARK_QSS

SPLASH_DURATION_MS = 1400

# A --windowed PyInstaller build has no console, and PyQt6 aborts the whole
# process (no dialog, no traceback) on an unhandled exception raised inside a
# Qt slot/timer callback — from the user's side that looks exactly like
# "double-click the .exe and nothing happens". This hook makes such crashes
# visible (message box) and diagnosable (log file next to the exe).
def _install_crash_handler() -> None:
    log_path = Path.home() / "ipscans-network-scanner-crash.log"

    def handle_exception(exc_type, exc_value, exc_tb):
        message = "".join(traceback.format_exception(exc_type, exc_value, exc_tb))
        try:
            log_path.write_text(message, encoding="utf-8")
        except OSError:
            pass
        try:
            QMessageBox.critical(
                None,
                "ipscans — Startup error",
                "The application hit an unexpected error and needs to close.\n\n"
                f"Details were saved to:\n{log_path}\n\n{exc_value}",
            )
        except Exception:
            pass

    sys.excepthook = handle_exception


def main() -> None:
    # `--selftest` boots the window and exits immediately (exit code 0 on
    # success) — used by CI to smoke-test a packaged .exe without a real display.
    selftest = "--selftest" in sys.argv

    _install_crash_handler()

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
        window = MainWindow(DEFAULT_LANGUAGE)
        window.setWindowIcon(app_icon)
        print("selftest: window created OK")
        sys.exit(0)

    splash = WelcomeSplash()
    splash.show()
    app.processEvents()

    def finish_startup() -> None:
        try:
            _finish_startup_impl(app, splash, app_icon)
        except Exception:
            # Re-raise into sys.excepthook so it's logged/shown instead of
            # aborting the process with zero feedback (PyQt6's default
            # behaviour for exceptions raised from a QTimer callback).
            sys.excepthook(*sys.exc_info())
            app.quit()

    QTimer.singleShot(SPLASH_DURATION_MS, finish_startup)
    sys.exit(app.exec())


def _finish_startup_impl(app: QApplication, splash: WelcomeSplash, app_icon) -> None:
    splash.close()

    language = get_saved_language()
    if language is None:
        lang_dialog = LanguageDialog()
        lang_dialog.setWindowIcon(app_icon)
        if lang_dialog.exec() != LanguageDialog.DialogCode.Accepted:
            app.quit()
            return
        language = lang_dialog.selected_language
    language = language or DEFAULT_LANGUAGE

    if not has_accepted_privacy_terms():
        dialog = PrivacyTermsDialog(language)
        dialog.setWindowIcon(app_icon)
        if dialog.exec() != PrivacyTermsDialog.DialogCode.Accepted:
            app.quit()
            return

    window = MainWindow(language)
    window.setWindowIcon(app_icon)
    window.show()
    app.window_ref = window  # keep a live reference so it isn't garbage-collected


if __name__ == "__main__":
    main()

