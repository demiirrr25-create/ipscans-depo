"""Tests for ModernWelcomeDialog and first-run persistence logic."""
import os
from pathlib import Path
import sys
import tempfile
import unittest

os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from PyQt6.QtCore import QSettings
from PyQt6.QtWidgets import QApplication

from app.ui.modern_welcome import (
    ModernWelcomeDialog,
    is_first_run,
    mark_first_run_completed,
    reset_first_run,
    _SETTINGS_ORG,
    _SETTINGS_APP,
    _KEY_FIRST_RUN_DONE,
)


class ModernWelcomeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = QApplication.instance() or QApplication([])

    def setUp(self):
        self.settings = QSettings(_SETTINGS_ORG, _SETTINGS_APP)
        self.settings.remove(_KEY_FIRST_RUN_DONE)

    def tearDown(self):
        self.settings.remove(_KEY_FIRST_RUN_DONE)

    def test_first_run_cycle(self):
        # 1. Fresh installation -> first run is True
        self.assertTrue(is_first_run())

        # 2. Mark completed -> first run is False
        mark_first_run_completed()
        self.assertFalse(is_first_run())

        # 3. Reset -> first run is True again
        reset_first_run()
        self.assertTrue(is_first_run())

    def test_welcome_dialog_paint_and_interaction(self):
        dialog = ModernWelcomeDialog("tr")
        dialog.grab()
        self.assertIn("IPscans+", dialog.title_lbl.text())
        self.assertTrue(dialog.start_btn.isEnabled())

        # Toggle terms checkbox -> disables button when unchecked
        dialog.terms_checkbox.setChecked(False)
        self.assertFalse(dialog.start_btn.isEnabled())
        dialog.terms_checkbox.setChecked(True)
        self.assertTrue(dialog.start_btn.isEnabled())

        # Switch language to English
        for btn in dialog.lang_group.buttons():
            if btn.property("code") == "en":
                btn.click()
                break
        self.assertEqual(dialog.lang, "en")
        self.assertIn("Welcome", dialog.tagline_lbl.text())
        dialog.close()

    def test_theme_manager_and_light_dark_toggle(self):
        from unittest.mock import patch
        from app.core.models import Device
        from app.ui.main_window import MainWindow
        from app.ui.styles import (
            DARK_QSS,
            DARK_TOKENS,
            LIGHT_QSS,
            LIGHT_TOKENS,
            get_current_theme,
            set_current_theme,
            toggle_theme,
        )

        # Verify token palettes match IPScans v2 design tokens
        self.assertEqual(LIGHT_TOKENS["bg_canvas"], "#FFFFFF")
        self.assertEqual(LIGHT_TOKENS["accent_primary"], "#2F6BFF")
        self.assertEqual(DARK_TOKENS["bg_canvas"], "#07080B")
        self.assertEqual(DARK_TOKENS["accent_primary"], "#4C82FF")
        self.assertIn("#FFFFFF", LIGHT_QSS)
        self.assertIn("#07080B", DARK_QSS)

        with patch.object(MainWindow, "_refresh_adapters"):
            window = MainWindow("en")
            self.assertTrue(hasattr(window, "theme_toggle_btn"))
            window.model.add_devices([Device("192.168.1.1", hostname="gateway", device_type="Router")])
            window._refresh_map(force=True)

            set_current_theme("light")
            self.assertEqual(get_current_theme(), "light")
            window.grab()
            window.network_map.grab()

            toggle_theme()
            self.assertEqual(get_current_theme(), "dark")
            window.grab()
            window.network_map.grab()

            # Clicking theme_toggle_btn toggles back to light
            window.theme_toggle_btn.click()
            self.assertEqual(get_current_theme(), "light")
            window.close()


if __name__ == "__main__":
    unittest.main()

