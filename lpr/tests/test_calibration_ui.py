import os
os.environ.setdefault("QT_QPA_PLATFORM","offscreen")
import json
import numpy as np
import pytest
from PySide6.QtCore import Qt,QPoint
from PySide6.QtTest import QTest
from PySide6.QtWidgets import QApplication
from lpr.calibration import CameraCalibration,CalibrationRegion,RecognitionLine
from lpr.lines import CrossingLine
from lpr.calibration_ui import CalibrationSurface,CalibrationControls


def drag(surface,start,end):
    QTest.mousePress(surface,Qt.MouseButton.LeftButton,pos=QPoint(*start))
    QTest.mouseMove(surface,QPoint(*end))
    QTest.mouseRelease(surface,Qt.MouseButton.LeftButton,pos=QPoint(*end))


def test_independent_lines_polygon_drag_undo_save_reload_and_letterboxing():
    app=QApplication.instance() or QApplication([])
    surface=CalibrationSurface();surface.resize(800,600)
    frame=np.zeros((450,800,3),dtype=np.uint8)
    surface.set_frame(frame);surface.show();app.processEvents()
    saved=[]
    controls=CalibrationControls(surface,lambda value:saved.append(value.to_dict()),lambda:None)
    surface.set_tool("trigger");drag(surface,(160,390),(640,390))
    trigger=surface.lines[0]
    surface.set_tool("recognition");drag(surface,(240,255),(560,255))
    read=surface.recognition_lines[0]
    assert trigger.start==pytest.approx((.2,.7))
    assert read.start==pytest.approx((.3,.4))
    surface.set_tool("recognition_polygon")
    for point in ((80,120),(720,120),(640,480),(160,480)):
        QTest.mouseClick(surface,Qt.MouseButton.LeftButton,pos=QPoint(*point))
    surface.set_frame(frame.copy())
    QTest.keyClick(surface,Qt.Key.Key_Return)
    assert len(surface.regions)==1 and not surface.image.isNull()
    before=surface.calibration()
    surface.set_tool("edit");drag(surface,(240,255),(280,255))
    assert surface.lines[0]==trigger
    assert surface.recognition_lines[0].start[0]==pytest.approx(.35)
    QTest.keyClick(surface,Qt.Key.Key_Z,Qt.KeyboardModifier.ControlModifier)
    assert surface.calibration()==before
    controls.save_document()
    assert "kaydedildi" in controls.status.text()
    restored=CameraCalibration.from_dict(json.loads(json.dumps(saved[-1])))
    surface.set_calibration(restored)
    surface.resize(1600,900);app.processEvents()
    assert surface.screen_point(surface.lines[0].start).y()==pytest.approx(630)
    assert surface.screen_point(surface.recognition_lines[0].start).y()==pytest.approx(360)
    assert surface.calibration()==before
    surface.reset_geometry();assert not surface.objects()
    surface.undo();assert surface.calibration()==before
    surface.close();controls.close()


def test_two_click_line_and_rectangle_and_boundary_safe_vertex_edit():
    app=QApplication.instance() or QApplication([])
    surface=CalibrationSurface();surface.resize(800,600)
    surface.set_frame(np.zeros((450,800,3),dtype=np.uint8));surface.show();app.processEvents()
    surface.set_tool("trigger")
    QTest.mouseClick(surface,Qt.MouseButton.LeftButton,pos=QPoint(100,300))
    QTest.mouseClick(surface,Qt.MouseButton.LeftButton,pos=QPoint(700,300))
    assert len(surface.lines)==1
    surface.set_tool("vehicle_rectangle");drag(surface,(160,165),(640,435))
    assert surface.regions[0].shape=="rectangle"
    drag(surface,(160,165),(200,180))
    assert surface.regions[0].points[0]==pytest.approx((.25,105/450))
    saved=surface.calibration()
    drag(surface,(200,180),(200,20))  # Letterbox pixels never become geometry.
    assert surface.calibration()==saved
    surface.close()


def test_preview_saves_geometry_to_real_database_and_reloads_after_restart(tmp_path):
    from unittest.mock import Mock
    from lpr.operations import Operations
    from lpr.preview import PreviewDialog
    app=QApplication.instance() or QApplication([])
    path=tmp_path/"calibration.db"
    ops=Operations(path);ops.setup("admin","long calibration test password")
    session=ops.login("admin","long calibration test password")
    with ops.db:ops.db.execute("INSERT INTO cameras(id,name,secret,direction) VALUES('gate','Gate','test-only','entry')")
    capture=Mock();capture.is_alive.return_value=False
    dialog=PreviewDialog("private","gate",capture_worker=capture,calibration=ops.camera_calibration(session,"gate"),
        save_calibration=lambda value:ops.save_camera_calibration(session,"gate",value))
    dialog.timer.stop();dialog.show();app.processEvents()
    surface=dialog.surface;surface.set_frame(np.zeros((450,800,3),dtype=np.uint8))
    def pixel(point):
        screen=surface.screen_point(point);return (round(screen.x()),round(screen.y()))
    surface.set_tool("trigger");drag(surface,pixel((.2,.7)),pixel((.8,.7)))
    surface.set_tool("recognition");drag(surface,pixel((.3,.4)),pixel((.7,.4)))
    surface.set_tool("recognition_rectangle");drag(surface,pixel((.1,.1)),pixel((.9,.8)))
    controls=dialog.calibration_controls
    from PySide6.QtWidgets import QPushButton
    save_button=next(button for button in controls.findChildren(QPushButton) if button.text()=="Kalibrasyonu kaydet")
    QTest.mouseClick(save_button,Qt.MouseButton.LeftButton)
    expected=surface.calibration()
    assert "kaydedildi" in controls.status.text()
    assert ops.camera_calibration(session,"gate")==expected
    dialog.close();app.processEvents();ops.close()
    ops=Operations(path);session=ops.login("admin","long calibration test password")
    restored=ops.camera_calibration(session,"gate")
    assert restored==expected and len(restored.regions)==1
    assert restored.trigger_lines[0].start!=restored.recognition_lines[0].start
    ops.close()


def test_toolbar_changes_direction_priority_windows_and_roi_association():
    app=QApplication.instance() or QApplication([])
    surface=CalibrationSurface()
    surface.set_calibration(CameraCalibration((CrossingLine("trigger","Gate",(.1,.7),(.9,.7)),),
        (RecognitionLine("read","Read",(.2,.4),(.8,.4)),),
        (CalibrationRegion.rectangle("roi","ROI",(.1,.1),(.9,.8)),)))
    controls=CalibrationControls(surface,lambda value:None,lambda:None)
    surface.selected="trigger";surface.selectionChanged.emit()
    controls.direction.setCurrentIndex(1);controls.direction.activated.emit(1)
    assert surface.lines[0].allowed_directions==("entry",)
    controls.reverse();assert surface.lines[0].positive_direction=="exit"
    surface.selected="read";surface.selectionChanged.emit()
    controls.priority.setValue(7);controls.band.setValue(.12);controls.after.setValue(2.5)
    index=controls.region.findData("roi");controls.region.setCurrentIndex(index);controls.region.activated.emit(index)
    line=surface.recognition_lines[0]
    assert (line.priority,line.band,line.after_seconds,line.region_id)==(7,.12,2.5,"roi")
    controls.repeat.setValue(12);controls.wait.setValue(2)
    assert surface.calibration().repeat_seconds==12 and surface.calibration().result_wait_seconds==2
    surface.selected="roi";surface.delete_selected()
    assert surface.recognition_lines[0].region_id is None
    surface.undo();assert surface.recognition_lines[0].region_id=="roi"
    controls.close();surface.close();app.processEvents()
