import importlib.util
import os
import unittest
os.environ.setdefault("QT_QPA_PLATFORM","offscreen")


@unittest.skipUnless(importlib.util.find_spec("PySide6"),"desktop extra not installed")
class DesktopTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        from PySide6.QtWidgets import QApplication
        cls.app=QApplication.instance() or QApplication([])

    def setUp(self):
        from lpr.desktop import RecognitionWindow
        self.window=RecognitionWindow()

    def tearDown(self):
        self.window.close();self.app.processEvents()

    def test_translation_and_missing_input(self):
        self.window.start()
        self.assertEqual(self.window.status_key,"choose")
        self.window.language.setCurrentIndex(1)
        self.assertEqual(self.window.run_button.text(),"Start recognition")
        self.assertFalse(self.window.stop_button.isEnabled())

    def test_low_confidence_and_foreign_plate_go_to_review(self):
        self.window.consume({"readings":[{"text":"34ABC123","confidence":.6},
            {"text":"5AU5341","confidence":.99},{"text":"34ABC123","confidence":.99}]})
        self.assertEqual(self.window.table.item(0,2).text(),"İnceleme gerekli")
        self.assertEqual(self.window.table.item(1,2).text(),"İnceleme gerekli")
        self.assertEqual(self.window.table.item(2,2).text(),"Aday okuma")
        self.window.language.setCurrentIndex(1)
        self.assertEqual(self.window.table.item(0,2).text(),"Needs review")

    def test_table_is_bounded(self):
        for _ in range(250):self.window.consume({"readings":[{"text":"34ABC123","confidence":.99}]})
        self.assertEqual(self.window.table.rowCount(),200)
