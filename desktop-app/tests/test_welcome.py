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


if __name__ == "__main__":
    unittest.main()
