from queue import Queue
from types import SimpleNamespace
import numpy as np
import pytest
from lpr.runtime import observe_cameras
from lpr.camera import Frame
from lpr.vision import Box


def test_fair_scheduling_isolated_camera_evidence_and_shutdown():
    now=[0.]
    workers=[]
    class Worker:
        def __init__(self,config):
            self.config=config;self.frames=Queue();self.status='connected';self.reconnects=0;self.dropped=0;self.stopped=False
            for i in range(3):self.frames.put(Frame(i,0.,np.zeros((40,100,3),np.uint8)))
            workers.append(self)
        def start(self):pass
        def stop(self):self.stopped=True
        def join(self,timeout):pass
        def is_alive(self):return False
    class Pipeline:
        evaluation=True  # informational model status does not block live processing
        def analyze(self,frame):
            now[0]+=.1
            return [{'text':'34ABC123','confidence':.99,'box':Box(0,0,30,20,.99)}],100
    events=[]
    result=observe_cameras(Pipeline(),[{'id':'a','source':'rtsp://a'},{'id':'b','source':'rtsp://b'}],.8,':memory:',events.append,
        worker_factory=Worker,clock=lambda:now[0],sleep=lambda seconds:now.__setitem__(0,now[0]+seconds))
    frames=[e for e in events if 'decisions' in e]
    assert [e['camera'] for e in frames]==['a','b','a','b','a','b']
    assert [e['camera'] for e in frames if e['decisions'][0]['status']=='recognized']==['a','b']
    assert all(w.stopped for w in workers) and result==0
    assert events[-1]['processed_frames']==6


def test_invalid_configs_never_start_capture():
    def forbidden(*args):raise AssertionError('Capture must not start')
    for pipeline,cameras in [(SimpleNamespace(evaluation=True),[]),
                             (SimpleNamespace(evaluation=False),[{'id':'a','source':'x'}]*2)]:
        with pytest.raises(ValueError):observe_cameras(pipeline,cameras,1,':memory:',lambda _:None,worker_factory=forbidden)
