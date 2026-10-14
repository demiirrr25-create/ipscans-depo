"""Bounded spatial tracking. Ambiguous associations start new evidence histories."""
from dataclasses import dataclass
import math

from .core import Consensus, Reading
from .vision import iou


@dataclass(frozen=True)
class Region:
    left: float = 0
    top: float = 0
    right: float = 1
    bottom: float = 1

    def __post_init__(self):
        if not all(math.isfinite(v) for v in (self.left,self.top,self.right,self.bottom)):
            raise ValueError("Non-finite region")
        if not (0 <= self.left < self.right <= 1 and 0 <= self.top < self.bottom <= 1):
            raise ValueError("Region must be normalized left,top,right,bottom")

    def contains(self, box, width, height):
        x,y=(box.x1+box.x2)/(2*width),(box.y1+box.y2)/(2*height)
        return self.left <= x <= self.right and self.top <= y <= self.bottom


class TrackedConsensus:
    def __init__(self, camera, *, region=None, max_tracks=64, max_gap=1.0, overlap=.25):
        if not camera or type(max_tracks) is not int or not 1 <= max_tracks <= 256:
            raise ValueError("Invalid tracking capacity")
        if not math.isfinite(max_gap) or not 0 < max_gap <= 10 or not 0 < overlap <= 1:
            raise ValueError("Invalid association policy")
        self.camera,self.region=camera,region or Region()
        self.max_tracks,self.max_gap,self.overlap=max_tracks,max_gap,overlap
        self.engine=Consensus(max_tracks=max_tracks)
        self.tracks={}
        self.serial=0
        self.last_frame=-1
        self.last_at=-math.inf

    def reset(self):
        self.tracks.clear()
        self.engine.history.clear()
        self.engine.last_frame.clear()
        # Preserve passage cooldown across disconnects and empty frames.

    def observe(self, predictions, frame_id, captured_at, now, width, height):
        if width <= 0 or height <= 0 or len(predictions)>16:
            raise ValueError("Invalid frame or detection capacity")
        if not all(math.isfinite(v) for v in (captured_at,now)):
            raise ValueError("Invalid frame time")
        if frame_id <= self.last_frame or captured_at < self.last_at:
            return []
        if not 0 <= now-captured_at <= self.engine.max_age:
            self.reset()
            return []
        self.last_frame,self.last_at=frame_id,captured_at
        self.tracks={k:v for k,v in self.tracks.items() if captured_at-v[1] <= self.max_gap}
        selected=[]
        for prediction in predictions:
            box=prediction.get("box")
            if box is None:
                raise ValueError("Spatial tracking requires detector boxes")
            if not (0 <= box.x1 < box.x2 <= width and 0 <= box.y1 < box.y2 <= height):
                raise ValueError("Invalid detection box")
            if self.region.contains(box,width,height):
                selected.append(prediction)
        candidates=[[k for k,(box,_) in self.tracks.items()
                     if iou(p["box"],box)>=self.overlap] for p in selected]
        used={k:sum(k in options for options in candidates) for k in self.tracks}
        next_tracks={}
        decisions=[]
        for prediction,options in zip(selected,candidates):
            # No OCR-text matching: repeated plates must not join different vehicles.
            if len(options)==1 and used[options[0]]==1:
                track=options[0]
            else:
                self.serial+=1
                track=str(self.serial)
            if len(next_tracks)>=self.max_tracks:
                break
            next_tracks[track]=(prediction["box"],captured_at)
            reading=Reading(self.camera,frame_id,captured_at,prediction["text"],
                            prediction["confidence"],track)
            decision=self.engine.observe(reading,now)
            decisions.append({**vars(decision),"track":track,"box":vars(prediction["box"])})
        # Missing detections retire tracks; never bridge an unobserved occlusion.
        self.tracks=next_tracks
        active={(self.camera,k) for k in next_tracks}
        self.engine.history={k:v for k,v in self.engine.history.items() if k in active}
        self.engine.last_frame={k:v for k,v in self.engine.last_frame.items() if k in active}
        return decisions
