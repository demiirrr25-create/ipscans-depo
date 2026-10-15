"""Vehicle trajectories -> directional passages with separate plate evidence."""
from collections import deque,defaultdict
import math
import time
import uuid

from .core import normalize_plate,valid_tr_plate
from .lines import LineCrossings
from .vehicles import VehicleTracker
from .calibration import CameraCalibration, RecognitionGate


class VehiclePassages:
    def __init__(self,camera,lines=(),*,wall_clock=time.time,max_age=2,calibration=None):
        self.camera=camera
        self.calibration=calibration if calibration is not None else CameraCalibration.from_legacy(lines)
        if not isinstance(self.calibration,CameraCalibration):raise ValueError("Invalid camera calibration")
        self.lines=LineCrossings(self.calibration.trigger_lines)
        self.recognition=RecognitionGate(self.calibration)
        self.tracker=VehicleTracker()
        self.evidence={}
        self.wall_clock=wall_clock
        self.max_age=max_age
        self.session=uuid.uuid4().hex
        self.last_frame=-1
        self.pending={}
        self.recent=deque(maxlen=4096)

    def reset(self):
        self.tracker.reset();self.lines.retain([]);self.evidence.clear()
        self.recognition.reset()
        # Confirmed crossings survive reconnects. Their already-associated plate
        # evidence is frozen in pending records and can be drained by the caller.

    def flush_pending(self,now,*,force=False):
        if not math.isfinite(now):raise ValueError("Invalid passage time")
        events=[]
        while self.recent and now-self.recent[0][0]>self.calibration.repeat_seconds:self.recent.popleft()
        for identity,pending in list(self.pending.items()):
            if not force and now<pending["deadline"]:continue
            event=pending["event"]
            del self.pending[identity]
            key=(event["line_id"],event["direction"],event["plate"])
            # Exact high-confidence plates only: never merge similar text,
            # unread vehicles, opposite directions, or different gates.
            if event["status"]=="recognized" and self.calibration.repeat_seconds:
                if any(oldkey==key and 0<=pending["crossed_at"]-at<=self.calibration.repeat_seconds for at,oldkey in self.recent):continue
                self.recent.append((pending["crossed_at"],key))
            events.append(event)
        return events

    @staticmethod
    def _box(box):return (box.x1,box.y1,box.x2,box.y2)

    def _attach_current_evidence(self,event,track,readings,frame_id):
        # Boxes always refer to frame_sequence, never a past frame paired with
        # current pixels. A delayed result without a current track has no crop.
        event.pop("_plate_box",None);event.pop("_vehicle_box",None)
        if track is None:return
        event["frame_sequence"]=frame_id
        event["_vehicle_box"]=self._box(track.vehicle.box)
        matching=[reading for reading in readings if normalize_plate(reading["text"])==event["plate"]]
        if len(matching)==1:event["_plate_box"]=self._box(matching[0]["box"])

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
            self.reset();return self.flush_pending(now)
        for vehicle in vehicles:
            box=vehicle.box
            if not (0<=box.x1<box.x2<=width and 0<=box.y1<box.y2<=height and 0<=box.score<=1):
                raise ValueError("Invalid vehicle geometry")
        vehicles=self.calibration.filter_vehicles(vehicles,width,height)
        readings=self.calibration.filter_readings(readings,width,height)
        tracks=self.tracker.update(vehicles,captured_at)
        ids={track.id for track in tracks}
        self.lines.retain(ids)
        self.recognition.update(tracks,captured_at,width,height)
        self.evidence={key:value for key,value in self.evidence.items() if key in ids}
        matched=defaultdict(list)
        for reading in readings:
            plate=reading["box"]
            owners=[track.id for track in tracks if track.vehicle.box.x1<=plate.x1<plate.x2<=track.vehicle.box.x2
                    and track.vehicle.box.y1<=plate.y1<plate.y2<=track.vehicle.box.y2]
            # Ambiguous containment must not attach a neighboring vehicle's plate.
            if len(owners)==1 and self.recognition.accepts(owners[0],reading,width,height):matched[owners[0]].append(reading)
        for track_id,values in matched.items():
            if len(values)!=1:continue
            text=normalize_plate(values[0]["text"]);score=values[0]["confidence"]
            if text and math.isfinite(score) and 0<score<=1:
                self.evidence.setdefault(track_id,deque(maxlen=12)).append((text,score))
        track_map={track.id:track for track in tracks}
        for pending in self.pending.values():
            event=pending["event"];track_id=event["track_id"]
            if track_id in track_map:event.update(self.plate_result(track_id))
            self._attach_current_evidence(event,track_map.get(track_id),matched.get(track_id,()),frame_id)
        for track in tracks:
            box=track.vehicle.box
            # Bottom center approximates the vehicle's contact position in the image.
            crossings=self.lines.observe(track.id,((box.x1+box.x2)/(2*width),box.y2/height),captured_at)
            if track.hits<3:continue
            for crossing in crossings:
                identity=f"{self.session}:{self.camera}:{track.id}:{crossing['line_id']}:{crossing['direction']}"
                event={"event_id":str(uuid.uuid5(uuid.NAMESPACE_OID,identity)),"camera":self.camera,
                    "line_id":crossing["line_id"],"direction":crossing["direction"],"track_id":track.id,
                    "vehicle_type":track.vehicle.kind,"at":self.wall_clock()-(now-captured_at),
                    "frame_sequence":frame_id,"trigger_frame_sequence":frame_id,**self.plate_result(track.id)}
                self._attach_current_evidence(event,track,matched.get(track.id,()),frame_id)
                if len(self.pending)>=1024:raise RuntimeError("Pending passage capacity exceeded")
                self.pending[identity]={"event":event,"crossed_at":captured_at,
                    "deadline":captured_at+self.calibration.result_wait_seconds}
        return self.flush_pending(now)
