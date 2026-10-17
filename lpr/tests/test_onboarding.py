import os
os.environ.setdefault("QT_QPA_PLATFORM","offscreen")
import json
from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from PySide6.QtCore import Qt
from PySide6.QtTest import QTest
from PySide6.QtWidgets import QApplication,QWidget,QListWidget

from lpr.calibration import CameraCalibration
from lpr.lines import CrossingLine
from lpr.onboarding import SetupWizard,setup_status
from lpr.operations import Operations
from lpr.registry import Registry


@pytest.fixture
def station(tmp_path):
    app=QApplication.instance() or QApplication([])
    ops=Operations(tmp_path/"onboarding.db");ops.setup("admin","long onboarding test password")
    session=ops.login("admin","long onboarding test password")
    registry=Registry(ops)
    window=QWidget();window.ops=ops;window.session=session;window.notice=Mock()
    window.navigation=QListWidget(window);window.navigation.addItems(["Dashboard","Cameras","Vehicles","Events","Settings"]);window.navigation.setCurrentRow(4)
    def add_camera():
        with ops.db:ops.db.execute("INSERT OR IGNORE INTO cameras(id,name,secret,direction) VALUES('gate','Test Gate','test-only','entry')")
    def calibrate(camera):ops.save_camera_calibration(session,camera,CameraCalibration((CrossingLine("trigger","Gate",(.1,.6),(.9,.6)),)))
    def add_vehicle():registry.save_vehicle(session,"34ABC123")
    window.add_camera=Mock(side_effect=add_camera);window.discover_camera=Mock(side_effect=add_camera)
    window.calibrate_camera=Mock(side_effect=calibrate);window.registry_widget=SimpleNamespace(create_vehicle=Mock(side_effect=add_vehicle))
    yield app,window,ops,session
    for wizard in window.findChildren(SetupWizard):
        wizard.close();wizard.deleteLater()
    window.close();app.processEvents();ops.close()


def marker(ops,key):
    row=ops.db.execute("SELECT value FROM settings WHERE key=?",(key,)).fetchone()
    return row[0] if row else None


def test_empty_station_never_marked_complete_and_skip_reports_missing(station):
    app,window,ops,session=station
    wizard=SetupWizard(window);wizard.show();app.processEvents()
    assert str(ops.path.resolve()) in wizard.path_label.text()
    assert wizard.current_status["checks"]==dict(account=True,storage=True,camera=False,calibration=False,vehicle=False)
    wizard.pages.setCurrentIndex(5);QTest.mouseClick(wizard.next,Qt.MouseButton.LeftButton)
    assert marker(ops,"onboarding_complete") is None
    assert wizard.isVisible() and "Eksik" in wizard.error.text()
    QTest.mouseClick(wizard.later,Qt.MouseButton.LeftButton)
    assert marker(ops,"onboarding_dismissed")=="1"
    stored=json.loads(marker(ops,"onboarding_status"))
    assert stored["complete"] is False and stored["checks"]["camera"] is False
    assert "Eksik" in window.notice.call_args.args[0]


def test_real_actions_save_then_recheck_complete_and_navigate_dashboard(station):
    app,window,ops,session=station
    wizard=SetupWizard(window);wizard.show();app.processEvents()
    wizard.pages.setCurrentIndex(2);QTest.mouseClick(wizard.add_camera_button,Qt.MouseButton.LeftButton)
    window.add_camera.assert_called_once()
    assert wizard.camera_choice.currentData()=="gate"
    wizard.pages.setCurrentIndex(3);QTest.mouseClick(wizard.calibrate_button,Qt.MouseButton.LeftButton)
    window.calibrate_camera.assert_called_once_with("gate")
    wizard.pages.setCurrentIndex(4);QTest.mouseClick(wizard.vehicle_button,Qt.MouseButton.LeftButton)
    window.registry_widget.create_vehicle.assert_called_once()
    assert setup_status(ops,session)["complete"]
    wizard.pages.setCurrentIndex(5);QTest.mouseClick(wizard.next,Qt.MouseButton.LeftButton)
    assert marker(ops,"onboarding_complete")=="1"
    assert marker(ops,"onboarding_dismissed") is None
    assert window.navigation.currentRow()==0 and not wizard.isVisible()
    assert ops.db.execute("SELECT count(*) FROM audit WHERE action='onboarding_completed'").fetchone()[0]==1


def test_discovery_uses_real_callback_and_each_saved_camera_needs_calibration(station):
    app,window,ops,session=station
    wizard=SetupWizard(window);wizard.show();wizard.pages.setCurrentIndex(2);app.processEvents()
    QTest.mouseClick(wizard.discover_button,Qt.MouseButton.LeftButton)
    window.discover_camera.assert_called_once()
    window.calibrate_camera("gate");window.registry_widget.create_vehicle()
    with ops.db:ops.db.execute("INSERT INTO cameras(id,name,secret,direction) VALUES('second','Second','test-only','exit')")
    wizard.refresh()
    assert wizard.current_status["missing_calibration"]==["second"]
    wizard.finish_setup();assert marker(ops,"onboarding_complete") is None


def test_finish_checks_database_again_not_cached_status(station):
    app,window,ops,session=station
    window.add_camera();window.calibrate_camera("gate");window.registry_widget.create_vehicle()
    wizard=SetupWizard(window)
    assert wizard.current_status["complete"]
    ops.save_camera_calibration(session,"gate",CameraCalibration())
    wizard.finish_setup()
    assert marker(ops,"onboarding_complete") is None
    assert not wizard.current_status["checks"]["calibration"]


def test_constructing_existing_station_wizard_does_not_open_or_mutate_completion(station):
    app,window,ops,session=station
    window.add_camera();window.calibrate_camera("gate");window.registry_widget.create_vehicle()
    with ops.db:ops.db.execute("INSERT INTO settings(key,value) VALUES('onboarding_complete','1')")
    before=ops.db.total_changes
    wizard=SetupWizard(window)
    assert not wizard.isVisible() and ops.db.total_changes==before
    assert marker(ops,"onboarding_complete")=="1"


def test_memory_database_is_not_reported_as_persistent_storage():
    ops=Operations(":memory:");ops.setup("admin","long onboarding test password")
    session=ops.login("admin","long onboarding test password")
    assert not setup_status(ops,session)["checks"]["storage"]
    assert setup_status(ops,session)["data_path"]=="Bellekte; kalıcı dosya yok"
    ops.close()


def test_operator_cannot_mark_setup_complete_or_open_admin_guide(station):
    app,window,ops,session=station
    ops.add_user(session,"operator","long operator test password","operator")
    window.session=ops.login("operator","long operator test password")
    with pytest.raises(PermissionError):SetupWizard(window)
    assert marker(ops,"onboarding_complete") is None
