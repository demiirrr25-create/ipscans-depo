"""Bounded OCR consumer of an existing camera; never opens a second stream."""
from queue import Queue, Full
from threading import Event, Thread
import time

from .tracking import TrackedConsensus


class LiveInference(Thread):
    def __init__(self,camera,pipeline_factory,*,region=None,lines=(),interval=.2,clock=time.monotonic):
        super().__init__(name=f"ocr-{camera.config.camera_id}",daemon=True)
        if not .01<=interval<=10:raise ValueError("Invalid inference sampling interval")
        self.camera,self.pipeline_factory=camera,pipeline_factory
        self.interval,self.clock=interval,clock
        self.tracker=TrackedConsensus(camera.config.camera_id,region=region)
        self.results=Queue(maxsize=16)
        self.stop_event=Event()
        self.status="idle"
        self.processed=0
        self.stale=0
        self.inference_ms=None
        self.lines=tuple(lines)
        self.passages=None
        self.passage_status="loading"

    def stop(self):
        self.stop_event.set()

    def run(self):
        try:
            self.status="loading_models"
            pipeline=self.pipeline_factory()
            vehicle_mode=getattr(pipeline,"supports_vehicle_tracking",False) is True
            if vehicle_mode and self.lines:
                from .passages import VehiclePassages
                self.passages=VehiclePassages(self.camera.config.camera_id,self.lines)
            self.passage_status="enabled" if self.passages else ("no_lines" if vehicle_mode else "no_vehicle_model")
            sequence=-1
            generation=None
            self.status="waiting_for_frame"
            while not self.stop_event.is_set():
                frame,epoch=self.camera.snapshot()
                if generation!=epoch:
                    self.tracker.reset()
                    if self.passages:self.passages.reset()
                    generation=epoch
                if frame is None or frame.sequence==sequence:
                    self.stop_event.wait(.02)
                    continue
                sequence=frame.sequence
                if not 0<=self.clock()-frame.captured_at<=self.tracker.engine.max_age:
                    self.stale+=1;self.tracker.reset()
                    if self.passages:self.passages.reset()
                    self.stop_event.wait(.02)
                    continue
                self.status="analyzing"
                started=self.clock()
                vehicles=[]
                if vehicle_mode:predictions,vehicles,latency=pipeline.analyze_traffic(frame.image)
                else:predictions,latency=pipeline.analyze(frame.image)
                latest,current_epoch=self.camera.snapshot()
                if self.stop_event.is_set():break
                now=self.clock()
                if latest is None or current_epoch!=epoch or not 0<=now-frame.captured_at<=self.tracker.engine.max_age:
                    self.stale+=1;self.tracker.reset()
                    if self.passages:self.passages.reset()
                else:
                    decisions=self.tracker.observe(predictions,frame.sequence,frame.captured_at,now,
                                                   frame.image.shape[1],frame.image.shape[0])
                    passages=self.passages.observe(vehicles,predictions,frame.sequence,frame.captured_at,now,
                        frame.image.shape[1],frame.image.shape[0]) if self.passages else []
                    self.processed+=1
                    self.inference_ms=latency
                    try:
                        self.results.put_nowait({"camera":self.camera.config.camera_id,"source":"live_rtsp",
                            "generation":epoch,"decisions":decisions,"inference_ms":latency,
                            "frame_sequence":frame.sequence,"passages":passages,"vehicle_count":len(vehicles)})
                    except Full:
                        # Do not silently lose records or block capture on a slow UI/database.
                        self.status="result_queue_full"
                        return
                self.stop_event.wait(max(0,self.interval-(self.clock()-started)))
            self.status="stopped"
        except Exception:
            self.status="inference_failed"
