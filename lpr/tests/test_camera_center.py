import os
os.environ.setdefault("QT_QPA_PLATFORM","offscreen")
import time
from queue import Queue
from unittest.mock import Mock
import numpy as np
from PySide6.QtWidgets import QApplication
from lpr.camera import Frame
from lpr.camera_center import CameraCenter
from lpr.preview import PreviewDialog


def worker(config):
    item=Mock()
    item.config=config
    item.status="connected";item.reconnects=0;item.fps=15;item.resolution=(64,32)
    item.frames=Queue(maxsize=1)
    frame=Frame(1,time.monotonic(),np.zeros((32,64,3),dtype=np.uint8))
    item.frames.put(frame);item.snapshot.return_value=(frame,0)
    item.is_alive.return_value=False
    return item


def test_all_grid_sizes_pagination_isolation_and_one_capture_per_camera():
    app=QApplication.instance() or QApplication([])
    cameras=[{"id":str(i),"name":f"Camera {i}","source":"private"} for i in range(16)]
    factory=Mock(side_effect=worker)
    detail=Mock()
    center=CameraCenter(cameras,authorize=lambda:None,open_detail=detail,worker_factory=factory)
    center.show();app.processEvents()
    try:
        assert factory.call_count==16
        for count in (1,2,4,9,16):
            center.layout_choice.setCurrentText(str(count));app.processEvents()
            assert sum(not tile.isHidden() for tile in center.tiles.values())==count
        center.layout_choice.setCurrentText("9")
        center.change_page(1)
        assert sum(not tile.isHidden() for tile in center.tiles.values())==7
        center.layout_choice.setCurrentText("16")
        center.workers["0"].status="retry_exhausted"
        center.workers["0"].snapshot.return_value=(None,1)
        center.poll()
        assert center.tiles["0"].surface.image.isNull()
        assert not center.tiles["1"].surface.image.isNull()
        center.detail("1")
        detail.assert_called_once_with("1",center.workers["1"],center)
        assert factory.call_count==16
    finally:
        center.close();app.processEvents()
    for capture in center.workers.values():
        capture.start.assert_called_once()
        capture.stop.assert_called_once()


def test_detail_reuses_capture_and_closing_detail_does_not_stop_grid():
    app=QApplication.instance() or QApplication([])
    from lpr.camera import CameraConfig
    capture=worker(CameraConfig("private"))
    capture.is_alive.return_value=True
    factory=Mock(side_effect=AssertionError("Unexpected duplicate RTSP connection"))
    dialog=PreviewDialog("private","test",capture_worker=capture,worker_factory=factory)
    dialog.show();dialog.poll()
    assert not dialog.surface.image.isNull()
    dialog.close();app.processEvents()
    assert not dialog.isVisible()
    factory.assert_not_called()
    capture.start.assert_not_called()
    capture.stop.assert_not_called()


def test_grid_session_revocation_stops_all_owned_captures():
    app=QApplication.instance() or QApplication([])
    authorize=Mock()
    center=CameraCenter([{"id":"1","name":"One","source":"private"}],authorize=authorize,
                        open_detail=Mock(),worker_factory=worker)
    center.show()
    authorize.side_effect=PermissionError
    center.poll();app.processEvents()
    assert not center.isVisible()
    center.workers["1"].stop.assert_called_once()
