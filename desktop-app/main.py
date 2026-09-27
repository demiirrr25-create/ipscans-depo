"""ipscans Network Scanner — PyQt6 desktop app entry point."""
import sys
import traceback
from pathlib import Path

from PyQt6.QtWidgets import QApplication, QMessageBox

from app.i18n import DEFAULT_LANGUAGE, get_saved_language
from app.ui.main_window import MainWindow
from app.ui.onboarding_wizard import OnboardingWizard
from app.ui.privacy_dialog import has_accepted_privacy, has_accepted_terms
from app.ui.resources import load_app_icon
from app.ui.styles import DARK_QSS

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


def _pending_onboarding_steps() -> list[str]:
    steps = []
    if get_saved_language() is None:
        steps.append("language")
    if not has_accepted_terms():
        steps.append("terms")
    if not has_accepted_privacy():
        steps.append("privacy")
    return steps


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
        wizard = OnboardingWizard(["language", "terms", "privacy"], DEFAULT_LANGUAGE, app_icon)
        for _ in wizard.steps:
            wizard.grab()  # paints every step, not just the first one shown
            if wizard.step_index < len(wizard.steps) - 1:
                wizard.step_index += 1
                wizard._refresh_step()
        print("selftest: window created OK")
        sys.exit(0)

    try:
        _run_onboarding_then_show_main_window(app, app_icon)
    except Exception:
        sys.excepthook(*sys.exc_info())
        app.quit()

    sys.exit(app.exec())


def _run_onboarding_then_show_main_window(app: QApplication, app_icon) -> None:
    steps = _pending_onboarding_steps()
    language = get_saved_language() or DEFAULT_LANGUAGE

    if steps:
        wizard = OnboardingWizard(steps, language, app_icon)
        if wizard.exec() != OnboardingWizard.DialogCode.Accepted:
            app.quit()
            return
        language = get_saved_language() or DEFAULT_LANGUAGE

    window = MainWindow(language)
    window.setWindowIcon(app_icon)
    window.show()
    app.window_ref = window  # keep a live reference so it isn't garbage-collected
    _log("Main window shown OK")


if __name__ == "__main__":
    main()


if __name__ == "__main__":
    main()

