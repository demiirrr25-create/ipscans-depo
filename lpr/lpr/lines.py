"""Resolution-independent finite crossing lines and per-track hysteresis."""
from dataclasses import dataclass
import math


@dataclass(frozen=True)
class CrossingLine:
    id: str
    name: str
    start: tuple
    end: tuple
    positive_direction: str = "entry"

    def __post_init__(self):
        object.__setattr__(self,"start",tuple(self.start))
        object.__setattr__(self,"end",tuple(self.end))
        if not self.id or len(self.id)>64 or not self.name or len(self.name)>120:
            raise ValueError("Invalid line identity")
        if self.positive_direction not in {"entry","exit"}:
            raise ValueError("Invalid crossing direction")
        if len(self.start)!=2 or len(self.end)!=2:
            raise ValueError("Invalid point")
        if not all(math.isfinite(v) and 0<=v<=1 for v in (*self.start,*self.end)):
            raise ValueError("Points must be normalized")
        if math.dist(self.start,self.end)<.01:
            raise ValueError("Line is too short")


def video_rectangle(width,height,video_width,video_height):
    if min(width,height,video_width,video_height)<=0:
        raise ValueError("Invalid viewport")
    scale=min(width/video_width,height/video_height)
    w,h=min(width,video_width*scale),min(height,video_height*scale)
    return ((width-w)/2,(height-h)/2,w,h)


def normalized_point(x,y,rect):
    left,top,width,height=rect
    if not left<=x<=left+width or not top<=y<=top+height:
        return None
    return ((x-left)/width,(y-top)/height)


class LineCrossings:
    """Consumes vehicle track positions, not OCR presence. IDs must be stable.

    A track can emit each direction once per line until it is retired. Missing
    tracks must be retired by the caller; never infer crossings over occlusion.
    """
    def __init__(self,lines,deadband=.005,max_gap=1.0):
        if not 0<deadband<.1 or not 0<max_gap<=10:
            raise ValueError("Invalid crossing policy")
        self.lines=tuple(lines)
        self.deadband,self.max_gap=deadband,max_gap
        self.positions={}
        self.emitted=set()

    def retain(self,track_ids):
        active=set(track_ids)
        self.positions={k:v for k,v in self.positions.items() if k[0] in active}
        self.emitted={k for k in self.emitted if k[0] in active}

    def observe(self,track_id,point,at):
        if not track_id or len(point)!=2 or not all(math.isfinite(v) and 0<=v<=1 for v in point) or not math.isfinite(at):
            raise ValueError("Invalid track observation")
        events=[]
        for line in self.lines:
            ax,ay=line.start;bx,by=line.end
            dx,dy=bx-ax,by-ay
            distance=(dx*(point[1]-ay)-dy*(point[0]-ax))/math.hypot(dx,dy)
            key=(track_id,line.id)
            previous=self.positions.get(key)
            if previous and at<=previous[2]:
                continue
            # Keep the last definite side while inside the hysteresis band.
            if abs(distance)<=self.deadband:
                continue
            side=1 if distance>0 else -1
            self.positions[key]=(point,side,at)
            if not previous or at-previous[2]>self.max_gap or previous[1]==side:
                continue
            px,py=previous[0]
            vx,vy=point[0]-px,point[1]-py
            denominator=vx*dy-vy*dx
            if abs(denominator)<1e-12:
                continue
            t=((ax-px)*dy-(ay-py)*dx)/denominator
            u=((ax-px)*vy-(ay-py)*vx)/denominator
            if not 0<=t<=1 or not 0<=u<=1:
                continue
            direction=line.positive_direction if side>0 else ("exit" if line.positive_direction=="entry" else "entry")
            receipt=(track_id,line.id,direction)
            if receipt in self.emitted:
                continue
            self.emitted.add(receipt)
            events.append({"track_id":track_id,"line_id":line.id,"direction":direction,"at":at})
        return events
