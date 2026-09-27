"""ipscans Network Health Pro — desktop entry point.

Reuses the free IP Scanner's UI components/styles/onboarding/scanner engine
from ../desktop-app without duplicating or modifying that project (product
rule #1). Two mechanisms make `import app...` resolve to that sibling
project's code:
  1. At runtime (this file, `python main.py`): sys.path insertion below.
  2. At PyInstaller build time: `--paths ../desktop-app` (see the build
     workflow), which lets PyInstaller's static analysis find and bundle
     those same modules into the standalone .exe.
"""
from __future__ import annotations

import sys
from pathlib import Path

_FREE_APP_ROOT = Path(__file__).resolve().parent.parent / "desktop-app"
sys.path.insert(0, str(_FREE_APP_ROOT))

from PyQt6.QtWidgets import QApplication  # noqa: E402

from app.i18n import DEFAULT_LANGUAGE, get_saved_language  # noqa: E402
from app.ui.onboarding_wizard import OnboardingWizard  # noqa: E402
from app.ui.privacy_dialog import has_accepted_privacy, has_accepted_terms  # noqa: E402
from app.ui.resources import load_app_icon  # noqa: E402
from app.ui.styles import DARK_QSS  # noqa: E402

from ui.pro_main_window import ProMainWindow  # noqa: E402
from ui.pro_styles import PRO_EXTRA_QSS  # noqa: E402


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
    selftest = "--selftest" in sys.argv

    app = QApplication(sys.argv)
    app.setStyle("Fusion")
    app.setStyleSheet(DARK_QSS + PRO_EXTRA_QSS)
    app_icon = load_app_icon()
    app.setWindowIcon(app_icon)

    if selftest:
        window = ProMainWindow(DEFAULT_LANGUAGE)
        window.setWindowIcon(app_icon)
        window.grab()
        # Paint-test every tab, not just the one shown at startup — this is
        # exactly the class of bug the free app's own --selftest was built
        # to catch (paint-time errors only surface once something is
        # actually rendered).
        for i in range(window.tabs.count()):
            window.tabs.setCurrentIndex(i)
            window.tabs.currentWidget().grab()
        print("selftest: pro window created OK")
        sys.exit(0)

    steps = _pending_onboarding_steps()
    language = get_saved_language() or DEFAULT_LANGUAGE
    if steps:
        wizard = OnboardingWizard(steps, language, app_icon)
        if wizard.exec() != OnboardingWizard.DialogCode.Accepted:
            sys.exit(0)
        language = get_saved_language() or DEFAULT_LANGUAGE

    window = ProMainWindow(language)
    window.setWindowIcon(app_icon)
    window.show()
    app.window_ref = window
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
