import os
os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")
from queue import Queue
from threading import Event
from unittest.mock import Mock
import time

import numpy as np
from PySide6.QtWidgets import QApplication
from lpr.camera import CameraConfig, CameraWorker, Frame
from lpr.preview import PreviewDialog


def test_open_without_decoded_frame_is_not_connected():
    reading, release = Event(), Event()
    cap = Mock()
    cap.isOpened.return_value = True
    def read():
        reading.set()
        release.wait(2)
        return False, None
    cap.read.side_effect = read
    worker = CameraWorker(CameraConfig("private", max_retries=0), lambda source: cap)
    worker.start()
    try:
        assert reading.wait(1)
        assert worker.status == "awaiting_frame"
    finally:
        release.set()
        worker.join(2)
    assert worker.status == "retry_exhausted"
    assert worker.last_error == "no_decoded_frame"
    cap.release.assert_called_once()


def test_retry_budget_is_finite_and_secrets_are_not_errors():
    factory = Mock(side_effect=RuntimeError("rtsp://user:secret@host"))
    worker = CameraWorker(CameraConfig("private", max_retries=2, reconnect_seconds=.001), factory)
    worker.start()
    worker.join(2)
    assert not worker.is_alive()
    assert factory.call_count == 3
    assert worker.reconnects == 2
    assert worker.status == "retry_exhausted"
    assert worker.last_error == "capture_failed"


def test_preview_displays_owned_frame_without_models_and_clears_stale_image():
    app = QApplication.instance() or QApplication([])
    worker = Mock()
    worker.frames = Queue(maxsize=1)
    worker.status = "connected"
    worker.resolution = (32,16)
    worker.fps = 25
    worker.reconnects = 0
    worker.last_error = None
    worker.is_alive.return_value = False
    dialog = PreviewDialog("private", "test", worker_factory=lambda config:worker)
    try:
        data = np.zeros((16,32,3),dtype=np.uint8)
        data[:,:,2] = 255
        worker.frames.put(Frame(1,time.monotonic(),data))
        dialog.poll()
        assert not dialog.surface.image.isNull()
        data[:] = 0
        assert dialog.surface.image.pixelColor(0,0).red() == 255
        dialog.last_frame_at = time.monotonic()-3
        dialog.poll()
        assert dialog.surface.image.isNull()
    finally:
        dialog.close()
        app.processEvents()
    worker.stop.assert_called()


def test_preview_revokes_access_when_session_expires():
    app = QApplication.instance() or QApplication([])
    worker = Mock()
    worker.is_alive.return_value = False
    authorize = Mock(side_effect=PermissionError)
    dialog = PreviewDialog("private", "test", worker_factory=lambda config:worker,
                           authorize=authorize)
    dialog.show()
    dialog.poll()
    app.processEvents()
    assert not dialog.isVisible()
    worker.stop.assert_called()


def test_save_requires_fresh_decoded_frame_and_waits_for_shutdown():
    app = QApplication.instance() or QApplication([])
    worker = Mock()
    worker.frames = Queue(maxsize=1)
    worker.status = "awaiting_frame"
    worker.last_error = None
    worker.reconnects = 0
    worker.is_alive.return_value = True
    dialog = PreviewDialog("private", "test", worker_factory=lambda config:worker,
                           confirm_connection=True)
    dialog.show()
    assert not dialog.confirm_button.isEnabled()
    dialog.confirm()
    assert not dialog.closing
    worker.status = "connected"
    worker.resolution = (32,16)
    worker.fps = 25
    worker.frames.put(Frame(1,time.monotonic(),np.zeros((16,32,3),dtype=np.uint8)))
    dialog.poll()
    assert dialog.confirm_button.isEnabled()
    dialog.confirm()
    assert dialog.closing
    assert dialog.surface.image.isNull()
    assert dialog.isVisible()
    worker.is_alive.return_value = False
    dialog.close()
    app.processEvents()
    assert dialog.result() == PreviewDialog.DialogCode.Accepted


def test_real_opencv_ffmpeg_decodes_generated_mjpeg(tmp_path):
    import cv2
    from lpr.camera import opencv_capture
    path = tmp_path / "capture.avi"
    writer = cv2.VideoWriter(str(path),cv2.VideoWriter_fourcc(*"MJPG"),25,(64,32))
    assert writer.isOpened()
    try:
        writer.write(np.full((32,64,3),127,dtype=np.uint8))
    finally:
        writer.release()
    cap = opencv_capture(str(path))
    try:
        assert cap.isOpened()
        ok, frame = cap.read()
        assert ok and frame.shape == (32,64,3)
        assert abs(float(frame.mean())-127) < 5
    finally:
        cap.release()


def test_camera_diagnostics_cli_does_not_require_models(monkeypatch,capsys):
    from lpr.cli import main
    from lpr import diagnostics
    monkeypatch.setenv("TEST_CAMERA_SOURCE","private-camera")
    probe=Mock(return_value={"frames_displayed":2,"shutdown_completed":True})
    monkeypatch.setattr(diagnostics,"probe_camera",probe)
    assert main(["camera-test","--source-env","TEST_CAMERA_SOURCE","--seconds","1","--preview"])==0
    probe.assert_called_once_with("private-camera",1,True,None)
    assert "private-camera" not in capsys.readouterr().out


def test_camera_diagnostics_missing_source_fails_without_leaking(monkeypatch,capsys):
    from lpr.cli import main
    monkeypatch.delenv("TEST_CAMERA_SOURCE",raising=False)
    assert main(["camera-test","--source-env","TEST_CAMERA_SOURCE","--seconds","1"])==2
    assert '"error": "ValueError"' in capsys.readouterr().out


def test_preview_records_on_ui_thread_and_discards_prior_connection(tmp_path):
    from types import SimpleNamespace
    from lpr.operations import Operations
    app=QApplication.instance() or QApplication([])
    ops=Operations(tmp_path/"preview.db")
    ops.setup("admin","a secure test password")
    session=ops.login("admin","a secure test password")
    capture=Mock();capture.is_alive.return_value=False;capture.snapshot.return_value=(None,2)
    def save(result):
        for d in result["decisions"]:
            ops.record(session,d["plate"],d["confidence"],d["status"],"gate","live_rtsp")
    dialog=PreviewDialog("private","gate",worker_factory=lambda config:capture,
                         pipeline_factory=lambda:None,on_result=save)
    inference=SimpleNamespace(results=Queue(),processed=1,inference_ms=10,status="stopped",
                              is_alive=lambda:False,stop=Mock())
    dialog.inference=inference;dialog.ocr_enabled=True
    decision={"plate":"34ABC123","confidence":.99,"status":"recognized"}
    try:
        inference.results.put({"generation":1,"decisions":[decision]})
        dialog.poll_ocr()
        assert ops.history(session)==[]
        inference.results.put({"generation":2,"decisions":[decision]})
        dialog.poll_ocr()
        assert len(ops.history(session))==1
        assert dialog.readings.count()==1
        assert ops.parking(session)["occupied"]==0
    finally:
        dialog.close();app.processEvents();ops.close()


def test_record_failure_stops_ocr_without_stopping_live_capture():
    from types import SimpleNamespace
    app=QApplication.instance() or QApplication([])
    capture=Mock();capture.is_alive.return_value=False;capture.snapshot.return_value=(None,0)
    dialog=PreviewDialog("private","gate",worker_factory=lambda config:capture,
                         pipeline_factory=lambda:None,on_result=Mock(side_effect=OSError("private")))
    inference=SimpleNamespace(results=Queue(),processed=1,inference_ms=10,status="stopped",
                              is_alive=lambda:False,stop=Mock())
    inference.results.put({"generation":0,"decisions":[]})
    dialog.inference=inference;dialog.ocr_enabled=True
    dialog.poll_ocr()
    assert dialog.ocr_delivery_failed
    inference.stop.assert_called_once()
    capture.stop.assert_not_called()
    dialog.close();app.processEvents()
