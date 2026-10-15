"""One inference pipeline, fair camera rounds, existing capture snapshots only."""
from queue import Queue,Full
from threading import Thread,Event
import time
from .tracking import TrackedConsensus,Region
from .passages import VehiclePassages


class FleetInference(Thread):
    def __init__(self,workers,cameras,pipeline_factory,*,clock=time.monotonic,interval=.2):
        super().__init__(name='camera-fleet-ocr',daemon=True)
        if not 1<=len(workers)<=16 or set(workers)!={c['id'] for c in cameras}:raise ValueError('Invalid camera fleet')
        if not .01<=interval<=10:raise ValueError('Invalid sampling interval')
        self.clock,self.interval,self.pipeline_factory=clock,interval,pipeline_factory
        self.stop_event=Event();self.results=Queue(maxsize=64);self.status='idle'
        self.states={}
        for camera in cameras:
            key=camera['id']
            self.states[key]=dict(worker=workers[key],tracker=TrackedConsensus(key,region=Region(*camera.get('roi',[0,0,1,1]))),
                lines=camera.get('lines',()),passages=None,sequence=-1,generation=None,next_at=0.,processed=0,stale=0,status='idle')

    def stop(self):self.stop_event.set()

    @staticmethod
    def reset(state):
        state['tracker'].reset()
        if state['passages']:state['passages'].reset()

    def run(self):
        try:
            self.status='loading_models';pipeline=self.pipeline_factory()
            vehicle_mode=getattr(pipeline,'supports_vehicle_tracking',False) is True
            for key,state in self.states.items():
                if vehicle_mode and state['lines']:state['passages']=VehiclePassages(key,state['lines'])
                state['status']='waiting_for_frame'
            self.status='running'
            while not self.stop_event.is_set():
                for key,state in self.states.items():
                    if self.stop_event.is_set():break
                    if state['status']=='inference_failed' or self.clock()<state['next_at']:continue
                    try:
                        worker,tracker=state['worker'],state['tracker']
                        frame,epoch=worker.snapshot()
                        if epoch!=state['generation']:
                            self.reset(state);state['generation']=epoch
                        if frame is None or frame.sequence==state['sequence']:continue
                        state['sequence']=frame.sequence
                        now=self.clock()
                        if not 0<=now-frame.captured_at<=tracker.engine.max_age:
                            state['stale']+=1;self.reset(state);continue
                        state['next_at']=now+self.interval
                        if vehicle_mode:readings,vehicles,latency=pipeline.analyze_traffic(frame.image)
                        else:readings,latency=pipeline.analyze(frame.image);vehicles=[]
                        latest,current=worker.snapshot();now=self.clock()
                        if self.stop_event.is_set():break
                        if latest is None or current!=epoch or not 0<=now-frame.captured_at<=tracker.engine.max_age:
                            state['stale']+=1;self.reset(state);continue
                        h,w=frame.image.shape[:2]
                        decisions=tracker.observe(readings,frame.sequence,frame.captured_at,now,w,h)
                        passages=state['passages'].observe(vehicles,readings,frame.sequence,frame.captured_at,now,w,h) if state['passages'] else []
                        state['processed']+=1;state['status']='running'
                        self.results.put_nowait(dict(camera=key,generation=epoch,decisions=decisions,passages=passages,
                            inference_ms=latency,frame_sequence=frame.sequence,source='live_rtsp',vehicle_count=len(vehicles)))
                    except Full:
                        self.status='result_queue_full';return
                    except Exception:
                        self.reset(state);state['status']='inference_failed'
                self.stop_event.wait(.01)
            self.status='stopped'
        except Exception:self.status='inference_failed'
