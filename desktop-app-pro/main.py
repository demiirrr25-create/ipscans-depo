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

from app.ui.styles import DARK_QSS  # noqa: E402

from pro.pro_content import DEFAULT_LANGUAGE  # noqa: E402
from pro.pro_settings import (  # noqa: E402
    get_saved_language,
    has_accepted_privacy,
    has_accepted_terms,
    has_seen_welcome,
)
from ui.pro_main_window import ProMainWindow  # noqa: E402
from ui.pro_onboarding_wizard import STEPS, ProOnboardingWizard  # noqa: E402
from ui.pro_resources import load_pro_app_icon  # noqa: E402
from ui.pro_styles import PRO_EXTRA_QSS  # noqa: E402


def _pending_onboarding_steps() -> list[str]:
    steps = []
    if get_saved_language() is None:
        steps.append("language")
    if not has_accepted_terms():
        steps.append("terms")
    if not has_accepted_privacy():
        steps.append("privacy")
    if not has_seen_welcome():
        steps.append("welcome")
    return steps


def main() -> None:
    selftest = "--selftest" in sys.argv

    app = QApplication(sys.argv)
    app.setStyle("Fusion")
    app.setStyleSheet(DARK_QSS + PRO_EXTRA_QSS)
    app_icon = load_pro_app_icon()
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

        wizard = ProOnboardingWizard(STEPS, DEFAULT_LANGUAGE, app_icon)
        for _ in wizard.steps:
            wizard.grab()
            if wizard.step_index < len(wizard.steps) - 1:
                wizard.step_index += 1
                wizard._refresh_step()
        print("selftest: pro window created OK")
        sys.exit(0)

    steps = _pending_onboarding_steps()
    language = get_saved_language() or DEFAULT_LANGUAGE
    if steps:
        wizard = ProOnboardingWizard(steps, language, app_icon)
        if wizard.exec() != ProOnboardingWizard.DialogCode.Accepted:
            sys.exit(0)
        language = get_saved_language() or DEFAULT_LANGUAGE

    window = ProMainWindow(language)
    window.setWindowIcon(app_icon)
    window.show()
    app.window_ref = window
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
