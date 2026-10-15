import os
os.environ.setdefault("QT_QPA_PLATFORM","offscreen")
from queue import Queue
from types import SimpleNamespace
from unittest.mock import Mock

from PySide6.QtWidgets import QApplication

from lpr.preview import PreviewDialog
from lpr.calibration import CameraCalibration
from lpr.lines import CrossingLine
from lpr.passages import VehiclePassages
from lpr.vehicles import Vehicle
from lpr.vision import Box


def passage():
    return dict(event_id="verified-event",direction="entry",vehicle_type="car",plate="34ABC123",status="recognized")


def preview(callback):
    app=QApplication.instance() or QApplication([])
    capture=Mock();capture.is_alive.return_value=False;capture.snapshot.return_value=(None,2)
    dialog=PreviewDialog("private","gate",capture_worker=capture,pipeline_factory=lambda:None,on_result=callback)
    dialog.timer.stop()
    inference=SimpleNamespace(results=Queue(),processed=1,inference_ms=10,status="stopped",is_alive=lambda:False,stop=Mock())
    dialog.inference=inference;dialog.ocr_enabled=True
    return app,dialog,inference


def test_transient_storage_failure_retains_result_retries_once_then_allows_close():
    delivered=[]
    def deliver(result):
        if not delivered:
            delivered.append("failure")
            raise OSError("temporary disk fault")
        delivered.append(result)
    app,dialog,inference=preview(deliver)
    result=dict(generation=2,decisions=[],passages=[passage()])
    inference.results.put(result)
    dialog.poll_ocr()
    assert dialog.pending_result is result and dialog.ocr_delivery_failed
    inference.stop.assert_called_once()
    dialog.poll_ocr()
    assert delivered==["failure"]
    dialog.delivery_retry_at=0
    dialog.poll_ocr()
    assert delivered==["failure",result]
    assert dialog.pending_result is None and not dialog.ocr_delivery_failed
    assert dialog.readings.count()==1
    dialog.close();app.processEvents()


def test_reconnect_keeps_validated_passage_and_drops_uncommitted_raw_decisions():
    callback=Mock()
    app,dialog,inference=preview(callback)
    inference.results.put(dict(generation=1,decisions=[dict(plate="OLD",status="candidate",confidence=.4)],passages=[passage()]))
    dialog.poll_ocr()
    result=callback.call_args.args[0]
    assert result["passages"][0]["event_id"]=="verified-event" and result["decisions"]==[]
    assert dialog.readings.count()==1
    dialog.close();app.processEvents()


def test_close_drains_pending_crossing_finalized_during_inference_stop():
    engine=VehiclePassages("gate",calibration=CameraCalibration((CrossingLine("gate-line","Gate",(.1,.5),(.9,.5)),),result_wait_seconds=10))
    for index,bottom in enumerate([40,44,48,53]):
        assert engine.observe([Vehicle(Box(30,bottom-30,70,bottom,.95),"car")],[],index,index*.2,index*.2,100,100)==[]
    callback=Mock()
    app,dialog,inference=preview(callback)
    def stop():
        events=engine.flush_pending(.7,force=True)
        if events:inference.results.put(dict(generation=1,decisions=[],passages=events))
    inference.stop=stop
    dialog.ocr_enabled=False
    dialog.show();dialog.close();app.processEvents()
    assert not dialog.isVisible() and inference.results.empty()
    callback.assert_called_once()
    assert callback.call_args.args[0]["passages"][0]["status"]=="unread"
