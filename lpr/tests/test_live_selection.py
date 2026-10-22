import os
os.environ.setdefault('QT_QPA_PLATFORM', 'offscreen')
from PySide6.QtWidgets import QApplication
from test_passage_query import ledger
from lpr.passage_browser import PassageBrowser
import shiboken6

APP = QApplication.instance() or QApplication([])


def test_live_refresh_preserves_event_identity_and_clears_missing_selection(ledger):
    ops, session, add = ledger
    selected = add(0)
    add(1)
    browser = PassageBrowser(ops, session)
    browser.load_page()
    browser.table.setCurrentCell(1, 0)
    assert browser.table.item(browser.table.currentRow(), 8).text() == selected['event_id']
    add(2)
    browser.latest()
    assert browser.table.currentRow() == 2
    assert browser.table.item(2, 8).text() == selected['event_id']
    browser.plate.setText('NO-MATCH')
    browser.apply_filters()
    assert browser.table.currentRow() == -1
    browser.close()
    shiboken6.delete(browser)
