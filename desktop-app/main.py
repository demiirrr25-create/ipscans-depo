"""ipscans Network Scanner — PyQt6 desktop app entry point."""
import sys
import traceback
from pathlib import Path

from PyQt6.QtCore import QTimer
from PyQt6.QtWidgets import QApplication, QMessageBox

from app.i18n import DEFAULT_LANGUAGE, get_saved_language
from app.ui.language_dialog import LanguageDialog
from app.ui.main_window import MainWindow
from app.ui.privacy_dialog import (
    PrivacyPolicyDialog,
    TermsOfUseDialog,
    has_accepted_privacy,
    has_accepted_terms,
)
from app.ui.resources import load_app_icon
from app.ui.splash import WelcomeSplash
from app.ui.styles import DARK_QSS

SPLASH_DURATION_MS = 1400

# Written next to every run (not just on crash) so a support request can
# include real diagnostics even without a crash — see _log().
_LOG_PATH = Path.home() / "ipscans-network-scanner.log"


def _log(message: str) -> None:
    try:
        with _LOG_PATH.open("a", encoding="utf-8") as f:
            f.write(message.rstrip("\n") + "\n")
    except OSError:
        pass


# A --windowed PyInstaller build has no console, and PyQt6 aborts the whole
# process (no dialog, no traceback) on an unhandled exception raised inside a
# Qt slot/timer callback — from the user's side that looks exactly like
# "double-click the .exe and nothing happens". This hook makes such crashes
# visible (message box) and diagnosable (log file next to the exe).
def _install_crash_handler() -> None:
    def handle_exception(exc_type, exc_value, exc_tb):
        message = "".join(traceback.format_exception(exc_type, exc_value, exc_tb))
        _log(message)
        try:
            QMessageBox.critical(
                None,
                "ipscans — Startup error",
                "The application hit an unexpected error and needs to close.\n\n"
                f"Details were saved to:\n{_LOG_PATH}\n\n{exc_value}",
            )
        except Exception:
            pass

    sys.excepthook = handle_exception


def _reset_onboarding() -> None:
    """`--reset-onboarding`: clears the saved language + terms/privacy
    acceptance so the next launch replays the full first-run flow — useful
    for verifying a "fresh download" experience without touching the
    registry by hand (QSettings(...).clear() removes the whole
    ipscans/NetworkScanner key, not just these three values, which is fine
    since scan settings aren't persisted anywhere yet).
    """
    from PyQt6.QtCore import QSettings

    QSettings("ipscans", "NetworkScanner").clear()


def main() -> None:
    # `--selftest` boots the window and exits immediately (exit code 0 on
    # success) — used by CI to smoke-test a packaged .exe without a real display.
    selftest = "--selftest" in sys.argv

    if "--reset-onboarding" in sys.argv:
        _reset_onboarding()

    _install_crash_handler()
    _log("--- startup ---")

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
        # .grab() forces a real paintEvent without needing show()/a visible
        # window — this is what caught nothing before: paint-time bugs (e.g.
        # a QConicalGradient center type mismatch) only surface once
        # something actually gets painted, which a bare constructor call
        # never triggers.
        window.grab()
        splash = WelcomeSplash()
        splash.spinner.start()
        splash.grab()
        splash.spinner.stop()
        LanguageDialog().grab()
        TermsOfUseDialog(DEFAULT_LANGUAGE).grab()
        PrivacyPolicyDialog(DEFAULT_LANGUAGE).grab()
        print("selftest: window created OK")
        sys.exit(0)

    # Splash is a nice-to-have, not a requirement — if it fails to build/show
    # for any reason, log it and skip straight to the onboarding flow instead
    # of taking the whole app down with it.
    splash = None
    try:
        splash = WelcomeSplash()
        splash.show()
        app.processEvents()
    except Exception:
        _log("Splash failed, skipping it:\n" + traceback.format_exc())
        splash = None

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


def _finish_startup_impl(app: QApplication, splash: WelcomeSplash | None, app_icon) -> None:
    if splash is not None:
        try:
            splash.close()
        except Exception:
            _log("Splash close failed:\n" + traceback.format_exc())

    # The language prompt degrades to a safe default instead of blocking the
    # whole app if it throws — losing the language picker is far better than
    # losing the app entirely. Terms/Privacy below are NOT best-effort: they
    # are a mandatory legal gate, so a failure there quits instead of
    # silently granting access.
    language = get_saved_language()
    if language is None:
        try:
            lang_dialog = LanguageDialog()
            lang_dialog.setWindowIcon(app_icon)
            if lang_dialog.exec() != LanguageDialog.DialogCode.Accepted:
                app.quit()
                return
            language = lang_dialog.selected_language
        except Exception:
            _log("Language dialog failed, defaulting language:\n" + traceback.format_exc())
            language = DEFAULT_LANGUAGE
    language = language or DEFAULT_LANGUAGE

    if not has_accepted_terms():
        # Mandatory gate: any failure here must NOT grant access to the app,
        # so unlike splash/language it is not "best-effort" — a broken
        # dialog means we quit, not silently continue.
        dialog = TermsOfUseDialog(language)
        dialog.setWindowIcon(app_icon)
        if dialog.exec() != TermsOfUseDialog.DialogCode.Accepted:
            app.quit()
            return

    if not has_accepted_privacy():
        dialog = PrivacyPolicyDialog(language)
        dialog.setWindowIcon(app_icon)
        if dialog.exec() != PrivacyPolicyDialog.DialogCode.Accepted:
            app.quit()
            return

    window = MainWindow(language)
    window.setWindowIcon(app_icon)
    window.show()
    app.window_ref = window  # keep a live reference so it isn't garbage-collected
    _log("Main window shown OK")


if __name__ == "__main__":
    main()

