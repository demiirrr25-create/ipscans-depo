"""Bounded OCR consumer of an existing camera; never opens a second stream."""
from queue import Full
from threading import Event, Thread
import time

from .tracking import TrackedConsensus
from .result_queue import ResultQueue


class LiveInference(Thread):
    def __init__(self,camera,pipeline_factory,*,region=None,lines=(),calibration=None,interval=.2,clock=time.monotonic):
        super().__init__(name=f"ocr-{camera.config.camera_id}",daemon=True)
        if not .01<=interval<=10:raise ValueError("Invalid inference sampling interval")
        self.camera,self.pipeline_factory=camera,pipeline_factory
        self.interval,self.clock=interval,clock
        self.tracker=TrackedConsensus(camera.config.camera_id,region=None if calibration is not None else region)
        self.results=ResultQueue(maxsize=16,reserve=2)
        self.stop_event=Event()
        self.status="idle"
        self.processed=0
        self.stale=0
        self.inference_ms=None
        self.calibration=calibration
        self.lines=tuple(calibration.trigger_lines if calibration is not None else lines)
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
                self.passages=VehiclePassages(self.camera.config.camera_id,self.lines,calibration=self.calibration)
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
                    self.publish_pending()
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
                    if self.calibration:
                        predictions=self.calibration.filter_readings(predictions,frame.image.shape[1],frame.image.shape[0])
                    decisions=self.tracker.observe(predictions,frame.sequence,frame.captured_at,now,
                                                   frame.image.shape[1],frame.image.shape[0])
                    passages=self.passages.observe(vehicles,predictions,frame.sequence,frame.captured_at,now,
                        frame.image.shape[1],frame.image.shape[0]) if self.passages else []
                    from .evidence import attach_images
                    attach_images(passages,frame.image,frame.sequence)
                    self.processed+=1
                    self.inference_ms=latency
                    try:
                        self.results.publish({"camera":self.camera.config.camera_id,"source":"live_rtsp",
                            "generation":epoch,"decisions":decisions,"inference_ms":latency,
                            "frame_sequence":frame.sequence,"passages":passages,"vehicle_count":len(vehicles)})
                    except Full:
                        # Do not silently lose records or block capture on a slow UI/database.
                        self.status="result_queue_full"
                        return
                self.stop_event.wait(max(0,self.interval-(self.clock()-started)))
            self.status="stopped"
        except Full:
            self.status="result_queue_full"
        except Exception:
            self.status="inference_failed"
        finally:
            self.publish_pending(force=True)

    def publish_pending(self,force=False):
        if self.passages:
            events=self.passages.flush_pending(self.clock(),force=force)
            if events:self.results.publish(dict(camera=self.camera.config.camera_id,source='live_rtsp',generation=self.camera.snapshot()[1],
                decisions=[],passages=events,inference_ms=self.inference_ms,frame_sequence=-1,vehicle_count=0),final=force)
