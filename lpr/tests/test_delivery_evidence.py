import os
os.environ.setdefault('QT_QPA_PLATFORM','offscreen')
from queue import Queue
from types import SimpleNamespace
from unittest.mock import Mock
import numpy as np
from PySide6.QtWidgets import QApplication
from lpr.camera_center import CameraCenter
from lpr.evidence import attach_images


def test_grid_retains_failed_delivery_until_retry_before_close():
    app=QApplication.instance() or QApplication([])
    def worker(config):
        value=Mock();value.config=config;value.is_alive.return_value=False;return value
    callback=Mock(side_effect=[OSError('temporary outage'),None])
    center=CameraCenter([dict(id='gate',name='Gate',source='private')],authorize=lambda:None,open_detail=Mock(),worker_factory=worker,on_result=callback)
    center.timer.stop()
    inference=SimpleNamespace(results=Queue(),states={'gate':{'processed':1,'status':'stopped'}},status='stopped',is_alive=lambda:False,stop=Mock())
    center.inference=inference;result={'passages':[{'event_id':'captured'}]};inference.results.put(result)
    center.poll_ocr();assert center.pending_result is result
    center.poll_ocr();assert callback.call_count==1
    center.delivery_retry_at=0;center.poll_ocr()
    assert callback.call_count==2 and center.pending_result is None
    assert not center.delivery_failed
    center.close();app.processEvents()


def test_evidence_never_uses_different_frame_or_outside_empty_crop():
    frame=np.zeros((100,200,3),dtype=np.uint8)
    stale=dict(frame_sequence=1,_vehicle_box=(10,10,100,90))
    current=dict(frame_sequence=2,_vehicle_box=(10,10,100,90),_plate_box=(300,300,400,400))
    attach_images([stale,current],frame,2)
    assert '_images' not in stale
    assert 'vehicle' in current['_images'] and 'plate' not in current['_images']
