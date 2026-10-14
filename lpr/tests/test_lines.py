import os
os.environ.setdefault("QT_QPA_PLATFORM","offscreen")
import pytest
import numpy as np
from PySide6.QtCore import Qt,QPoint
from PySide6.QtTest import QTest
from PySide6.QtWidgets import QApplication
from lpr.lines import CrossingLine,LineCrossings,video_rectangle,normalized_point
from lpr.operations import Operations
from lpr.preview import VideoSurface


def test_letterbox_coordinate_conversion_and_outside_rejection():
    rect=video_rectangle(1000,1000,1920,1080)
    assert rect==(0,218.75,1000,562.5)
    assert normalized_point(500,500,rect)==(.5,.5)
    assert normalized_point(500,200,rect) is None
    assert normalized_point(640,360,video_rectangle(1280,720,1920,1080))==(.5,.5)


def test_finite_segment_direction_jitter_and_no_repeat():
    line=CrossingLine("one","Gate",(.2,.5),(.8,.5))
    tracker=LineCrossings([line])
    assert tracker.observe("car",(.5,.4),0)==[]
    assert tracker.observe("car",(.5,.501),.1)==[]
    event=tracker.observe("car",(.5,.6),.2)
    assert event[0]["direction"]=="entry"
    assert tracker.observe("car",(.5,.7),.3)==[]
    assert tracker.observe("car",(.5,.4),.4)[0]["direction"]=="exit"
    assert tracker.observe("car",(.5,.6),.5)==[]
    assert tracker.observe("outside",(.9,.4),0)==[]
    assert tracker.observe("outside",(.9,.6),.2)==[]
    tracker.retain([])
    assert not tracker.positions and not tracker.emitted


def test_gap_and_invalid_coordinates_do_not_create_passages():
    tracker=LineCrossings([CrossingLine("one","Gate",(0,.5),(1,.5))])
    tracker.observe("car",(.5,.4),0)
    assert tracker.observe("car",(.5,.6),2)==[]
    with pytest.raises(ValueError):CrossingLine("bad","Bad",(0,0),(float("nan"),1))
    with pytest.raises(ValueError):CrossingLine("bad","Bad",(0,0),(0,0))


def test_lines_persist_after_reopen_and_invalid_update_is_atomic(tmp_path):
    path=tmp_path/"operations.db"
    ops=Operations(path)
    ops.setup("admin","long test password")
    session=ops.login("admin","long test password")
    # No camera secret is needed for this persistence-only test.
    with ops.db:ops.db.execute("INSERT INTO cameras VALUES('gate','Gate','test-only','entry')")
    lines=[CrossingLine("one","First",(.2,.5),(.8,.5)),CrossingLine("two","Second",(.3,.6),(.7,.6),"exit")]
    ops.save_camera_lines(session,"gate",lines)
    with pytest.raises(ValueError):ops.save_camera_lines(session,"gate",[lines[0],lines[0]])
    assert ops.camera_lines(session,"gate")==lines
    ops.close()
    ops=Operations(path)
    session=ops.login("admin","long test password")
    assert ops.camera_lines(session,"gate")==lines
    ops.save_camera_lines(session,"gate",[])
    assert ops.camera_lines(session,"gate")==[]
    ops.close()


def test_drag_line_edit_endpoint_move_delete_while_frames_update():
    app=QApplication.instance() or QApplication([])
    surface=VideoSurface()
    surface.resize(800,600)
    frame=np.zeros((450,800,3),dtype=np.uint8)
    surface.set_frame(frame)
    surface.show();app.processEvents()
    surface.drawing=True
    QTest.mousePress(surface,Qt.MouseButton.LeftButton,pos=QPoint(200,300))
    QTest.mouseMove(surface,QPoint(600,300))
    surface.set_frame(frame.copy())
    QTest.mouseRelease(surface,Qt.MouseButton.LeftButton,pos=QPoint(600,300))
    assert len(surface.lines)==1
    assert surface.lines[0].start==(.25,.5)
    assert surface.lines[0].end==(.75,.5)
    QTest.mousePress(surface,Qt.MouseButton.LeftButton,pos=QPoint(600,300))
    QTest.mouseMove(surface,QPoint(640,300))
    QTest.mouseRelease(surface,Qt.MouseButton.LeftButton,pos=QPoint(640,300))
    assert surface.lines[0].end==(.8,.5)
    QTest.mousePress(surface,Qt.MouseButton.LeftButton,pos=QPoint(400,300))
    QTest.mouseMove(surface,QPoint(400,345))
    QTest.mouseRelease(surface,Qt.MouseButton.LeftButton,pos=QPoint(400,345))
    assert surface.lines[0].start[1]==pytest.approx(.6)
    surface.resize(1280,720);app.processEvents()
    assert surface.screen_point(surface.lines[0].start).y()==pytest.approx(432)
    QTest.keyClick(surface,Qt.Key.Key_Delete)
    assert surface.lines==[]
    surface.close()
