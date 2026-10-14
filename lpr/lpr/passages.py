"""Vehicle trajectories -> directional passages with separate plate evidence."""
from collections import deque,defaultdict
import math
import time
import uuid

from .core import normalize_plate,valid_tr_plate
from .lines import LineCrossings
from .vehicles import VehicleTracker


class VehiclePassages:
    def __init__(self,camera,lines,*,wall_clock=time.time,max_age=2):
        self.camera=camera
        self.lines=LineCrossings(lines)
        self.tracker=VehicleTracker()
        self.evidence={}
        self.wall_clock=wall_clock
        self.max_age=max_age
        self.session=uuid.uuid4().hex
        self.last_frame=-1

    def reset(self):
        self.tracker.reset();self.lines.retain([]);self.evidence.clear()

    def plate_result(self,track):
        readings=self.evidence.get(track,())
        if not readings:return {"plate":"","confidence":0.,"status":"unread","evidence_frames":0}
        grouped=defaultdict(list)
        for text,score in readings:grouped[text].append(score)
        text,scores=max(grouped.items(),key=lambda item:sum(item[1]))
        ratio=sum(scores)/max(1e-12,sum(score for _,score in readings))
        confidence=sum(scores)/len(scores)*ratio
        status="recognized" if len(scores)>=3 and ratio>=.7 and confidence>=.85 and valid_tr_plate(text) else "review"
        return {"plate":text,"confidence":confidence,"status":status,"evidence_frames":len(scores)}

    def observe(self,vehicles,readings,frame_id,captured_at,now,width,height):
        if frame_id<=self.last_frame:return []
        if min(width,height)<=0 or not all(math.isfinite(t) for t in (captured_at,now)):
            raise ValueError("Invalid vehicle frame")
        self.last_frame=frame_id
        if not 0<=now-captured_at<=self.max_age:
            self.reset();return []
        for vehicle in vehicles:
            box=vehicle.box
            if not (0<=box.x1<box.x2<=width and 0<=box.y1<box.y2<=height and 0<=box.score<=1):
                raise ValueError("Invalid vehicle geometry")
        tracks=self.tracker.update(vehicles,captured_at)
        ids={track.id for track in tracks}
        self.lines.retain(ids)
        self.evidence={key:value for key,value in self.evidence.items() if key in ids}
        matched=defaultdict(list)
        for reading in readings:
            plate=reading["box"]
            owners=[track.id for track in tracks if track.vehicle.box.x1<=plate.x1<plate.x2<=track.vehicle.box.x2
                    and track.vehicle.box.y1<=plate.y1<plate.y2<=track.vehicle.box.y2]
            # Ambiguous containment must not attach a neighboring vehicle's plate.
            if len(owners)==1:matched[owners[0]].append(reading)
        for track_id,values in matched.items():
            if len(values)!=1:continue
            text=normalize_plate(values[0]["text"]);score=values[0]["confidence"]
            if text and math.isfinite(score) and 0<score<=1:
                self.evidence.setdefault(track_id,deque(maxlen=12)).append((text,score))
        events=[]
        for track in tracks:
            box=track.vehicle.box
            # Bottom center approximates the vehicle's contact position in the image.
            crossings=self.lines.observe(track.id,((box.x1+box.x2)/(2*width),box.y2/height),captured_at)
            if track.hits<3:continue
            for crossing in crossings:
                identity=f"{self.session}:{self.camera}:{track.id}:{crossing['line_id']}:{crossing['direction']}"
                events.append({"event_id":str(uuid.uuid5(uuid.NAMESPACE_OID,identity)),"camera":self.camera,
                    "line_id":crossing["line_id"],"direction":crossing["direction"],"track_id":track.id,
                    "vehicle_type":track.vehicle.kind,"at":self.wall_clock()-(now-captured_at),
                    "frame_sequence":frame_id,**self.plate_result(track.id)})
        return events
