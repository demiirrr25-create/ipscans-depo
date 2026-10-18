"""Product integration tests with real SQLite/Qt and explicitly fake camera capture."""
import os
os.environ.setdefault('QT_QPA_PLATFORM', 'offscreen')

from pathlib import Path
import uuid

import pytest
from PySide6.QtWidgets import QApplication, QLabel, QPushButton

from lpr.application import ProductWindow
from lpr.camera_metadata import CameraMetadata
from lpr.operations import Operations


@pytest.fixture
def product(tmp_path, monkeypatch):
    # Never read the user's installed model/config path or open a network camera.
    monkeypatch.setattr('lpr.application.data_directory', lambda: tmp_path)
    app = QApplication.instance() or QApplication([])
    ops = Operations(tmp_path / 'product.db')
    ops.setup('admin', 'operator shell admin password')
    session = ops.login('admin', 'operator shell admin password')
    ops.save_camera(session, 'gate', 'Original gate', 'rtsp://192.0.2.1/test', 'entry')
    window = ProductWindow(ops, session, autostart=False)
    window.resize(1440, 950); window.show(); app.processEvents()
    # Tests drive updates deliberately; no wall-clock polling race or camera activity.
    window.live_dashboard.timer.stop(); window.retention_timer.stop()
    yield app, ops, session, window
    window.close(); app.processEvents(); window.deleteLater(); app.processEvents(); ops.close()


def event(ops, *, plate='34ABC123', status='recognized', confidence=.95):
    return dict(event_id=str(uuid.uuid4()), at=ops.clock(), camera='gate', line_id='line', direction='entry',
                track_id=str(uuid.uuid4()), vehicle_type='car', plate=plate,
                confidence=0 if status == 'unread' else confidence, status=status,
                evidence_frames=0 if status == 'unread' else 4, frame_sequence=20)


def cards(dashboard):
    result = {}
    for index in range(dashboard.feed_layout.count()):
        widget = dashboard.feed_layout.itemAt(index).widget()
        if widget is None or widget.objectName() != 'eventCard': continue
        buttons = widget.findChildren(QPushButton)
        result[buttons[0].text()] = '\n'.join(label.text() for label in widget.findChildren(QLabel))
    return result


def add_owner(window, session, plate='34ABC123', *, status='registered'):
    registry = window.registry_widget.registry
    block = registry.save_block(session, 'Actual A Block'); unit = registry.save_unit(session, block, '24')
    person = registry.save_resident(session, 'Actual Deniz', 'Actual Yılmaz', phone='private-phone', unit_id=unit)
    vehicle = registry.save_vehicle(session, plate, owner_ids=[person], notes='private-notes', status=status)
    return person, vehicle


def test_five_operator_pages_and_actual_registry_event_feed(product):
    app, ops, session, window = product
    assert window.tabs.count() == window.navigation.count() == 5
    assert set(window.operator_pages) == {'dashboard', 'cameras', 'vehicles', 'events', 'settings'}
    assert window.navigation.currentRow() == window.tabs.currentIndex() == 0
    for page in range(5):
        window.navigation.setCurrentRow(page); app.processEvents(); assert window.tabs.currentIndex() == page
    window.navigation.setCurrentRow(0)
    add_owner(window, session)
    dashboard = window.live_dashboard
    dashboard.consume(dict(camera='gate', passages=[event(ops), event(ops, plate='06AB1234'), event(ops, plate='', status='unread')]))
    found = cards(dashboard)
    assert set(found) == {'34ABC123', '06AB1234', 'PLAKA OKUNAMADI'}
    assert 'Actual Deniz Actual Yılmaz' in found['34ABC123']
    assert 'Actual A Block' in found['34ABC123'] and '24' in found['34ABC123']
    for plate in ('06AB1234', 'PLAKA OKUNAMADI'):
        assert 'Actual Deniz' not in found[plate] and 'Actual A Block' not in found[plate]
    assert 'private-phone' not in repr(found) and 'private-notes' not in repr(found)
    assert dashboard.queue.pending == 0 and len(ops.vehicle_passages(session)) == 3
    # Raw OCR hints never become passage cards without a tracked crossing.
    dashboard.consume(dict(camera='gate', decisions=[dict(plate='16ABC123')], passages=[]))
    assert '16ABC123' not in cards(dashboard)
    assert not window.grab().isNull()


def test_review_candidate_never_asserts_owner_until_manual_correction(product):
    _, ops, session, window = product; add_owner(window, session)
    dashboard = window.live_dashboard; uncertain = event(ops, status='review', confidence=.50)
    dashboard.consume(dict(camera='gate', passages=[uncertain]))
    assert 'Actual Deniz' not in cards(dashboard)['34ABC123']
    dashboard.events.correct(session, uncertain['event_id'], '34ABC123', 'Verified against recorded evidence')
    dashboard.refresh_feed(force=True)
    assert 'Actual Deniz' in cards(dashboard)['34ABC123']
    detail = dashboard.events.details(session, uncertain['event_id'])
    assert detail['status'] == 'review' and detail['confidence'] == .50
    assert detail['corrections'][0]['actor'] == 'admin'


def test_registry_changed_refreshes_existing_feed_without_polling(product):
    _, ops, session, window = product
    dashboard = window.live_dashboard; dashboard.consume(dict(camera='gate', passages=[event(ops)]))
    assert 'Actual Deniz' not in cards(dashboard)['34ABC123']
    add_owner(window, session)
    window.registry_widget._saved()  # Same completion route used by real CRUD dialogs.
    assert 'Actual Deniz' in cards(dashboard)['34ABC123']


def test_unknown_and_blocked_registry_status_are_not_mislabeled(product):
    _, ops, session, window = product
    registry = window.registry_widget.registry
    registry.save_vehicle(session, '34ABC123', status='unknown')
    registry.save_vehicle(session, '06AB1234', status='blocked')
    window.live_dashboard.consume(dict(camera='gate', passages=[event(ops), event(ops, plate='06AB1234')]))
    found = cards(window.live_dashboard)
    assert 'KAYITLI ARAÇ' not in found['34ABC123'] and 'TANIMSIZ' in found['34ABC123']
    assert 'yasak' in found['06AB1234'].casefold()


def test_camera_rename_updates_feed_and_tile_without_worker_restart(product, monkeypatch):
    app, ops, session, window = product
    from lpr.camera_center import CameraCenter
    workers = []
    class FakeWorker:
        def __init__(self, config):
            self.config = config; self.started = 0; self.stopped = 0; self.status = 'disconnected'
            self.reconnects = 0; self.ident = None; workers.append(self)
        def start(self): self.started += 1; self.ident = 1
        def stop(self): self.stopped += 1
        def is_alive(self): return False
        def snapshot(self): return None, 0
    def center_factory(*args, **kwargs): return CameraCenter(*args, worker_factory=FakeWorker, **kwargs)
    monkeypatch.setattr('lpr.camera_center.CameraCenter', center_factory)
    window.autostart = True; dashboard = window.live_dashboard; dashboard.sync_cameras(); app.processEvents()
    center = dashboard.center; assert len(workers) == 1 and workers[0].started == 1
    dashboard.consume(dict(camera='gate', passages=[event(ops)]))
    original_source = ops.camera_source(session, 'gate')
    CameraMetadata(ops).save(session, 'gate', name='Renamed actual gate', direction='exit')
    window.refresh(); app.processEvents()
    assert dashboard.center is center and center.workers['gate'] is workers[0]
    assert workers[0].started == 1 and workers[0].stopped == 0
    assert center.tiles['gate'].title.text() == 'Renamed actual gate'
    assert center.tiles['gate'].direction == 'exit'
    assert 'Renamed actual gate' in cards(dashboard)['34ABC123']
    assert ops.camera_source(session, 'gate') == original_source
    assert ops.vehicle_passages(session)[0]['direction'] == 'entry'  # Historic direction is immutable.


def test_light_and_dark_theme_switching_across_windows(product):
    app, ops, session, window = product
    from lpr.theme import DARK_TOKENS, LIGHT_TOKENS, get_theme, get_tokens, set_theme, toggle_theme
    from lpr.application import Login
    from lpr.desktop import RecognitionWindow
    from lpr.splash_screen import LPRProSplash

    set_theme('light', app=app, persist=False)
    app.processEvents()
    assert get_theme() == 'light'
    assert get_tokens()['bg'] == LIGHT_TOKENS['bg'] == '#FFFFFF'
    assert hasattr(window, 'theme_toggle_btn')
    assert not window.grab().isNull()

    toggled = toggle_theme(app=app, persist=False)
    app.processEvents()
    assert toggled == 'dark' and get_theme() == 'dark'
    assert get_tokens()['bg'] == DARK_TOKENS['bg'] == '#07080B'
    assert not window.grab().isNull()

    login = Login(ops)
    assert hasattr(login, 'theme_toggle_btn')
    login.close(); login.deleteLater()

    splash = LPRProSplash()
    splash.close(); splash.deleteLater()

    desktop_win = RecognitionWindow()
    assert hasattr(desktop_win, 'theme_toggle_btn')
    desktop_win.close(); desktop_win.deleteLater()
    app.processEvents()

