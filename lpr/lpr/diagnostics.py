"""Bounded camera diagnostics for source and packaged builds; no image or URL output."""
import time
from queue import Empty
from .camera import CameraConfig,CameraWorker


def probe_camera(source,seconds=10,preview=False):
    if not 1<=seconds<=30:
        raise ValueError("Camera test duration must be 1..30 seconds")
    if preview:
        from PySide6.QtCore import QTimer
        from PySide6.QtWidgets import QApplication
        from .desktop import RecognitionWindow,STYLE
        from .preview import PreviewDialog
        app=QApplication.instance() or QApplication([])
        initializer=RecognitionWindow();initializer.close()
        dialog=PreviewDialog(source,"diagnostic")
        dialog.setStyleSheet(STYLE)
        counts={"frames":0,"paints":0}
        original_set=dialog.surface.set_frame
        original_paint=dialog.surface.paintEvent
        def display(frame):
            original_set(frame);counts["frames"]+=1
        def paint(event):
            original_paint(event)
            if not dialog.surface.image.isNull():counts["paints"]+=1
        dialog.surface.set_frame=display
        dialog.surface.paintEvent=paint
        dialog.show()
        QTimer.singleShot(int(seconds*1000),dialog.close)
        dialog.exec()
        return {"mode":"qt_preview","frames_displayed":counts["frames"],"video_paints":counts["paints"],
                "resolution":dialog.worker.resolution,"shutdown_completed":not dialog.worker.is_alive(),
                "last_error":dialog.worker.last_error}
    worker=CameraWorker(CameraConfig(source,max_retries=1))
    started=time.monotonic();first=None;count=0
    worker.start()
    try:
        while time.monotonic()-started<seconds:
            try:worker.frames.get(timeout=.1)
            except Empty:
                if not worker.is_alive():break
                continue
            count+=1
            if first is None:first=time.monotonic()-started
    finally:
        worker.stop();worker.join(7)
    return {"mode":"decode","frames_received":count,"first_frame_seconds":first,
            "resolution":worker.resolution,"shutdown_completed":not worker.is_alive(),"last_error":worker.last_error}
