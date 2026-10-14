from queue import Empty
from threading import Event
from types import SimpleNamespace
from unittest.mock import Mock
import time
import numpy as np

from lpr.camera import CameraConfig,CameraWorker,Frame
from lpr.live_inference import LiveInference


def wait_until(predicate,seconds=2):
    deadline=time.monotonic()+seconds
    while time.monotonic()<deadline:
        if predicate():return
        time.sleep(.005)
    assert predicate()


def test_slow_ocr_and_preview_share_one_capture_without_consuming_each_other():
    entered,release=Event(),Event()
    cap=Mock();cap.isOpened.return_value=True
    def read():
        time.sleep(.005)
        return True,np.zeros((32,64,3),dtype=np.uint8)
    cap.read.side_effect=read
    factory=Mock(return_value=cap)
    camera=CameraWorker(CameraConfig("private"),factory)
    pipeline=Mock()
    def analyze(image):
        assert not image.flags.writeable
        entered.set();release.wait(2)
        return [],1
    pipeline.analyze.side_effect=analyze
    inference=LiveInference(camera,lambda:pipeline,interval=.01)
    camera.start();inference.start()
    try:
        assert entered.wait(1)
        first,epoch=camera.snapshot()
        wait_until(lambda:camera.snapshot()[0].sequence>first.sequence+3)
        # Preview may drain its queue while inference owns an older frame.
        visible=camera.frames.get(timeout=1)
        assert visible.sequence>first.sequence
        assert camera.snapshot()[0] is not None
        assert camera.snapshot()[1]==epoch
        assert factory.call_count==1
        release.set()
        wait_until(lambda:inference.processed>0)
    finally:
        release.set();inference.stop();camera.stop()
        inference.join(2);camera.join(2)
    assert not inference.is_alive() and not camera.is_alive()
    assert camera.snapshot()[0] is None
    cap.release.assert_called_once()


def test_reconnection_during_inference_discards_old_evidence():
    entered,release=Event(),Event()
    frame=Frame(1,time.monotonic(),np.zeros((32,64,3),dtype=np.uint8))
    current=[frame,0]
    camera=SimpleNamespace(config=CameraConfig("private"),snapshot=lambda:tuple(current))
    pipeline=Mock()
    def analyze(image):
        entered.set();release.wait(2)
        return [],1
    pipeline.analyze.side_effect=analyze
    inference=LiveInference(camera,lambda:pipeline,interval=.01)
    inference.start()
    try:
        assert entered.wait(1)
        current[:]=[None,1]
        release.set()
        wait_until(lambda:inference.stale==1)
        assert inference.results.empty()
        assert inference.processed==0
    finally:
        release.set();inference.stop();inference.join(2)


def test_result_backpressure_stops_ocr_instead_of_growing_memory():
    serial=0
    image=np.zeros((32,64,3),dtype=np.uint8)
    def snapshot():
        nonlocal serial
        serial+=1
        return Frame(serial,time.monotonic(),image),0
    camera=SimpleNamespace(config=CameraConfig("private"),snapshot=snapshot)
    pipeline=Mock();pipeline.analyze.return_value=([],1)
    inference=LiveInference(camera,lambda:pipeline,interval=.01)
    inference.start();inference.join(2)
    assert not inference.is_alive()
    assert inference.status=="result_queue_full"
    assert inference.results.qsize()==16


def test_model_failure_is_contained_without_camera_stop():
    camera=Mock();camera.config=CameraConfig("private")
    inference=LiveInference(camera,Mock(side_effect=RuntimeError("secret path")))
    inference.start();inference.join(1)
    assert inference.status=="inference_failed"
    camera.stop.assert_not_called()


def test_vehicle_pipeline_emits_passage_from_shared_frames():
    from lpr.lines import CrossingLine
    from lpr.vehicles import Vehicle
    from lpr.vision import Box
    image=np.zeros((100,100,3),dtype=np.uint8)
    current=[None,0]
    camera=SimpleNamespace(config=CameraConfig('private',camera_id='gate'),snapshot=lambda:tuple(current))
    bottoms=iter([40,44,48,53])
    def analyze(image):
        bottom=next(bottoms)
        return [],[Vehicle(Box(30,bottom-30,70,bottom,.95),'car')],1
    pipeline=SimpleNamespace(supports_vehicle_tracking=True,analyze_traffic=analyze)
    inference=LiveInference(camera,lambda:pipeline,lines=[CrossingLine('line','Gate',(.1,.5),(.9,.5))],interval=.01)
    inference.start()
    batches=[]
    try:
        for index in range(4):
            current[0]=Frame(index,time.monotonic(),image)
            batches.append(inference.results.get(timeout=2))
        events=[event for batch in batches for event in batch['passages']]
        assert len(events)==1 and events[0]['direction']=='entry'
        assert events[0]['status']=='unread' and events[0]['camera']=='gate'
        assert inference.passage_status=='enabled'
    finally:
        inference.stop();inference.join(2)
