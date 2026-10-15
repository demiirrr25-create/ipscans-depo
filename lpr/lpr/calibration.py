"""Validated normalized camera geometry, independent of Qt and video resolution.

Vehicle ROIs use the bottom-center contact point; recognition ROIs use the plate
center. Exclusion regions always win. Empty inclusion lists mean the full image.
Recognition lines gate evidence by proximity and a bounded post-crossing window;
they never produce vehicle passage events themselves.
"""
from dataclasses import asdict, dataclass
import math

from .lines import CrossingLine, LineCrossings


def _identity(identity, name):
    if not isinstance(identity, str) or not 1 <= len(identity) <= 64 or not isinstance(name, str) or not 1 <= len(name.strip()) <= 120:
        raise ValueError("Invalid calibration identity")


def _number(value, low, high):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value) and low <= value <= high


def _cross(a, b, c):
    return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])


def _on_segment(a, b, p):
    return abs(_cross(a,b,p)) < 1e-10 and min(a[0],b[0])-1e-10 <= p[0] <= max(a[0],b[0])+1e-10 and min(a[1],b[1])-1e-10 <= p[1] <= max(a[1],b[1])+1e-10


def _intersects(a,b,c,d):
    c1,c2,c3,c4=_cross(a,b,c),_cross(a,b,d),_cross(c,d,a),_cross(c,d,b)
    return (c1*c2 < 0 and c3*c4 < 0) or any((_on_segment(a,b,c),_on_segment(a,b,d),_on_segment(c,d,a),_on_segment(c,d,b)))


@dataclass(frozen=True)
class CalibrationRegion:
    id: str
    name: str
    points: tuple
    purpose: str = "recognition"
    exclude: bool = False
    shape: str = "polygon"

    def __post_init__(self):
        _identity(self.id,self.name)
        object.__setattr__(self,"points",tuple(tuple(point) for point in self.points))
        if self.purpose not in {"recognition","vehicle"} or type(self.exclude) is not bool or self.shape not in {"polygon","rectangle"}:
            raise ValueError("Invalid region purpose")
        points=self.points
        if not 3 <= len(points) <= 32 or any(len(point)!=2 or not all(_number(v,0,1) for v in point) for point in points):
            raise ValueError("Invalid normalized polygon")
        if len(set(points))!=len(points):raise ValueError("Repeated polygon point")
        if abs(sum(points[i][0]*points[(i+1)%len(points)][1]-points[(i+1)%len(points)][0]*points[i][1] for i in range(len(points)))) < .0002:
            raise ValueError("Region is too small")
        for i,a in enumerate(points):
            b=points[(i+1)%len(points)]
            for j in range(i+1,len(points)):
                if j==i+1 or (i==0 and j==len(points)-1):continue
                if _intersects(a,b,points[j],points[(j+1)%len(points)]):raise ValueError("Polygon intersects itself")
        if self.shape=="rectangle" and (len(points)!=4 or len({p[0] for p in points})!=2 or len({p[1] for p in points})!=2 or any(a[0]!=b[0] and a[1]!=b[1] for a,b in zip(points,points[1:]+points[:1]))):
            raise ValueError("Invalid rectangle")

    def contains(self, point):
        if len(point)!=2 or not all(_number(v,0,1) for v in point):return False
        inside=False
        for a,b in zip(self.points,self.points[1:]+self.points[:1]):
            if _on_segment(a,b,point):return True
            if (a[1]>point[1]) != (b[1]>point[1]) and point[0] < (b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0]:inside=not inside
        return inside

    @classmethod
    def rectangle(cls, identity, name, first, second, purpose="recognition", exclude=False):
        left,right=sorted((first[0],second[0]));top,bottom=sorted((first[1],second[1]))
        return cls(identity,name,((left,top),(right,top),(right,bottom),(left,bottom)),purpose,exclude,"rectangle")


@dataclass(frozen=True)
class RecognitionLine:
    id: str
    name: str
    start: tuple
    end: tuple
    priority: int = 1
    band: float = .08
    after_seconds: float = 1.
    region_id: str | None = None

    def __post_init__(self):
        base=CrossingLine(self.id,self.name,self.start,self.end)
        object.__setattr__(self,"start",base.start);object.__setattr__(self,"end",base.end)
        if type(self.priority) is not int or not 1 <= self.priority <= 10 or not _number(self.band,.005,.5) or not _number(self.after_seconds,0,10):
            raise ValueError("Invalid recognition window")
        if self.region_id is not None and (not isinstance(self.region_id,str) or not 1 <= len(self.region_id) <= 64):
            raise ValueError("Invalid recognition region association")

    def near(self, point):
        ax,ay=self.start;bx,by=self.end
        dx,dy=bx-ax,by-ay
        t=((point[0]-ax)*dx+(point[1]-ay)*dy)/(dx*dx+dy*dy)
        return 0 <= t <= 1 and abs(dx*(point[1]-ay)-dy*(point[0]-ax))/math.hypot(dx,dy) <= self.band


@dataclass(frozen=True)
class CameraCalibration:
    trigger_lines: tuple = ()
    recognition_lines: tuple = ()
    regions: tuple = ()
    repeat_seconds: float = 5.
    result_wait_seconds: float = 1.
    schema_version: int = 1

    def __post_init__(self):
        for field in ("trigger_lines","recognition_lines","regions"):
            object.__setattr__(self,field,tuple(getattr(self,field)))
        if type(self.schema_version) is not int or self.schema_version!=1 or not _number(self.repeat_seconds,0,300) or not _number(self.result_wait_seconds,0,10):raise ValueError("Invalid calibration policy")
        if len(self.trigger_lines)>16 or len(self.recognition_lines)>16 or len(self.regions)>32:raise ValueError("Too many calibration objects")
        for values,kind in ((self.trigger_lines,CrossingLine),(self.recognition_lines,RecognitionLine),(self.regions,CalibrationRegion)):
            if any(not isinstance(value,kind) for value in values):raise ValueError("Invalid calibration object")
        objects=self.trigger_lines+self.recognition_lines+self.regions
        if len({obj.id for obj in objects})!=len(objects):raise ValueError("Duplicate calibration identity")
        regions={region.id:region for region in self.regions}
        for line in self.recognition_lines:
            if line.region_id is not None and (line.region_id not in regions or regions[line.region_id].purpose!="recognition" or regions[line.region_id].exclude):
                raise ValueError("Recognition line requires a recognition inclusion ROI")

    def to_dict(self):
        return asdict(self)

    @classmethod
    def from_dict(cls, value):
        if not isinstance(value,dict):raise ValueError("Invalid calibration document")
        allowed={"trigger_lines","recognition_lines","regions","repeat_seconds","result_wait_seconds","schema_version"}
        if set(value)-allowed:raise ValueError("Unknown calibration fields")
        try:
            return cls(tuple(CrossingLine(**line) for line in value.get("trigger_lines",())),
                tuple(RecognitionLine(**line) for line in value.get("recognition_lines",())),
                tuple(CalibrationRegion(**region) for region in value.get("regions",())),
                value.get("repeat_seconds",5.),value.get("result_wait_seconds",1.),value.get("schema_version",1))
        except (TypeError,KeyError) as error:raise ValueError("Invalid calibration document") from error

    @classmethod
    def from_legacy(cls, lines=(), roi=None):
        regions=()
        if roi is not None:
            if hasattr(roi,"left"):roi=(roi.left,roi.top,roi.right,roi.bottom)
            if len(roi)!=4:raise ValueError("Invalid legacy ROI")
            if tuple(roi)!=(0,0,1,1):
                regions=(CalibrationRegion.rectangle("legacy-recognition-roi","Okuma bölgesi",roi[:2],roi[2:]),)
        return cls(tuple(lines),regions=regions,result_wait_seconds=0.)

    def accepts(self, point, purpose):
        if purpose not in {"recognition","vehicle"}:raise ValueError("Invalid region purpose")
        if len(point)!=2 or not all(_number(v,0,1) for v in point):return False
        relevant=[region for region in self.regions if region.purpose==purpose]
        if any(region.exclude and region.contains(point) for region in relevant):return False
        included=[region for region in relevant if not region.exclude]
        return not included or any(region.contains(point) for region in included)

    def filter_readings(self, readings, width, height):
        if min(width,height)<=0:raise ValueError("Invalid image size")
        return [reading for reading in readings if self.accepts(((reading["box"].x1+reading["box"].x2)/(2*width),(reading["box"].y1+reading["box"].y2)/(2*height)),"recognition")]

    def filter_vehicles(self, vehicles, width, height):
        if min(width,height)<=0:raise ValueError("Invalid image size")
        return [vehicle for vehicle in vehicles if self.accepts(((vehicle.box.x1+vehicle.box.x2)/(2*width),vehicle.box.y2/height),"vehicle")]


class RecognitionGate:
    """Per-track reading windows; priorities choose the applicable line's ROI."""
    def __init__(self, calibration):
        self.calibration=calibration
        self.crossings=LineCrossings([CrossingLine(line.id,line.name,line.start,line.end) for line in calibration.recognition_lines])
        self.crossed={}
        self.active={}

    def reset(self):
        self.crossings.retain([]);self.crossed.clear();self.active.clear()

    def update(self, tracks, at, width, height):
        ids={track.id for track in tracks}
        self.crossings.retain(ids)
        self.crossed={key:value for key,value in self.crossed.items() if key[0] in ids}
        self.active={}
        for track in tracks:
            box=track.vehicle.box;point=((box.x1+box.x2)/(2*width),box.y2/height)
            for crossing in self.crossings.observe(track.id,point,at):self.crossed[(track.id,crossing["line_id"])]=at
            eligible=[line for line in self.calibration.recognition_lines if line.near(point) or 0 <= at-self.crossed.get((track.id,line.id),-math.inf) <= line.after_seconds]
            if eligible:
                priority=max(line.priority for line in eligible)
                self.active[track.id]=[line for line in eligible if line.priority==priority]

    def accepts(self, track_id, reading, width, height):
        if not self.calibration.recognition_lines:return True
        point=((reading["box"].x1+reading["box"].x2)/(2*width),(reading["box"].y1+reading["box"].y2)/(2*height))
        regions={region.id:region for region in self.calibration.regions}
        return any(line.region_id is None or regions[line.region_id].contains(point) for line in self.active.get(track_id,()))
