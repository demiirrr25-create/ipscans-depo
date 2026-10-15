import time
from unittest.mock import Mock
import numpy as np
from lpr.camera import Frame
from lpr.fleet_inference import FleetInference


class Camera:
    def __init__(self,value):self.value=value;self.sequence=0;self.epoch=0
    def snapshot(self):
        self.sequence+=1
        return Frame(self.sequence,time.monotonic(),np.full((20,30,3),self.value,dtype=np.uint8)),self.epoch


def wait_for(predicate):
    deadline=time.monotonic()+3
    while not predicate() and time.monotonic()<deadline:time.sleep(.01)
    assert predicate()


def test_one_model_fair_rounds_and_camera_failure_isolation():
    calls=[]
    class Pipeline:
        supports_vehicle_tracking=False
        def analyze(self,image):
            key=int(image[0,0,0]);calls.append(key)
            if key==1 and calls.count(1)==3:raise RuntimeError('private failure')
            return [],1
    factory=Mock(return_value=Pipeline())
    fleet=FleetInference({'a':Camera(1),'b':Camera(2)},[{'id':'a'},{'id':'b'}],factory,interval=.01)
    fleet.start()
    try:wait_for(lambda:fleet.states['b']['processed']>=5)
    finally:fleet.stop();fleet.join(2)
    assert not fleet.is_alive() and factory.call_count==1
    assert calls[:4]==[1,2,1,2]
    assert fleet.states['a']['status']=='inference_failed' and fleet.states['b']['processed']>=5


def test_reconnect_during_inference_rejects_stale_evidence():
    camera=Camera(1)
    class Pipeline:
        supports_vehicle_tracking=False
        def analyze(self,image):camera.epoch+=1;return [],1
    fleet=FleetInference({'a':camera},[{'id':'a'}],Pipeline,interval=.01);fleet.start()
    try:wait_for(lambda:fleet.states['a']['stale']>=2)
    finally:fleet.stop();fleet.join(2)
    assert fleet.results.empty() and fleet.states['a']['processed']==0


def test_slow_consumer_stops_at_bounded_queue():
    class Pipeline:
        supports_vehicle_tracking=False
        def analyze(self,image):return [],1
    fleet=FleetInference({'a':Camera(1)},[{'id':'a'}],Pipeline,interval=.01)
    fleet.start();fleet.join(3)
    try:
        assert not fleet.is_alive() and fleet.status=='result_queue_full'
        assert fleet.results.qsize()==64
    finally:fleet.stop();fleet.join(2)


def test_vehicle_passages_are_generated_independently_per_camera():
    from lpr.lines import CrossingLine
    from lpr.vehicles import Vehicle
    from lpr.vision import Box
    class LargeCamera(Camera):
        def snapshot(self):
            frame,epoch=super().snapshot()
            frame.image=np.full((100,100,3),self.value,dtype=np.uint8)
            return frame,epoch
    class Pipeline:
        supports_vehicle_tracking=True
        counts={1:0,2:0}
        def analyze_traffic(self,image):
            key=int(image[0,0,0]);index=self.counts[key];self.counts[key]+=1
            bottom=(40,44,48,53)[min(index,3)]
            return [],[Vehicle(Box(30,bottom-30,70,bottom,.95),'car')],1
    lines=[CrossingLine('gate','Gate',(.1,.5),(.9,.5))]
    fleet=FleetInference({'a':LargeCamera(1),'b':LargeCamera(2)},[{'id':key,'lines':lines} for key in ('a','b')],Pipeline,interval=.01)
    fleet.start()
    try:wait_for(lambda:all(s['processed']>=5 for s in fleet.states.values()))
    finally:fleet.stop();fleet.join(2)
    events=[]
    while not fleet.results.empty():events+=fleet.results.get_nowait()['passages']
    assert sorted((e['camera'],e['direction'],e['status']) for e in events)==[('a','entry','unread'),('b','entry','unread')]
