"""Bounded camera diagnostics for source and packaged builds; no image or URL output."""
import time
from queue import Empty
from .camera import CameraConfig,CameraWorker


def probe_camera(source,seconds=10,preview=False,models=None,transport='tcp'):
    if not 1<=seconds<=30:
        raise ValueError("Camera test duration must be 1..30 seconds")
    if models is not None and not preview:
        raise ValueError("Shared OCR diagnostics require preview")
    if preview:
        from PySide6.QtCore import QTimer
        from PySide6.QtWidgets import QApplication
        from .desktop import RecognitionWindow
        from .preview import PreviewDialog
        from .theme import apply_theme
        app=QApplication.instance() or QApplication([])
        initializer=RecognitionWindow();initializer.close()
        connections=[0]
        def capture(value):
            from .isolated_capture import IsolatedCapture
            connections[0]+=1
            return IsolatedCapture(value,transport=transport)
        options={"worker_factory":lambda config:CameraWorker(config,factory=capture)}
        result_count=[0]
        if models is not None:
            from .vision import build_pipeline
            def received(result):result_count[0]+=1
            options.update(pipeline_factory=lambda:build_pipeline(models),on_result=received)
        dialog=PreviewDialog(source,"diagnostic",**options)
        apply_theme(dialog)
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
        if models is not None:dialog.toggle_ocr()
        QTimer.singleShot(int(seconds*1000),dialog.close)
        dialog.exec()
        result={"mode":"qt_preview","frames_displayed":counts["frames"],"video_paints":counts["paints"],
                "resolution":dialog.worker.resolution,"shutdown_completed":not dialog.worker.is_alive(),
                "last_error":dialog.worker.last_error,"capture_connections":connections[0],"transport":transport}
        if models is not None:
            result.update(ocr_processed=dialog.inference.processed,ocr_status=dialog.inference.status,
                          ocr_result_batches=result_count[0],ocr_shutdown_completed=not dialog.inference.is_alive())
        return result
    worker=CameraWorker(CameraConfig(source,max_retries=1,transport=transport))
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
