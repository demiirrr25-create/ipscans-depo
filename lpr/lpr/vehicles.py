"""Vehicle detector adapter and conservative motion association.

YOLOX tensor contract: Megvii-BaseDetection/YOLOX (Apache-2.0).
See third-party-notices/YOLOX and docs/VEHICLE_PIPELINE.md.
"""
from dataclasses import dataclass
import math
from .vision import Box,iou

VEHICLE_CLASSES={2:"car",3:"motorcycle",5:"bus",7:"truck"}


@dataclass(frozen=True)
class Vehicle:
    box: Box
    kind: str


def decode_yolox(output,width,height,size=416,threshold=.1):
    import numpy as np
    rows=np.asarray(output)
    count=sum((size//stride)**2 for stride in (8,16,32))
    if rows.shape!=(1,count,85):raise ValueError("Expected raw YOLOX COCO tensor")
    if min(width,height)<=0 or not 0<threshold<1:raise ValueError("Invalid detector geometry")
    grids=[];scales=[]
    for stride in (8,16,32):
        yy,xx=np.indices((size//stride,size//stride))
        grids.append(np.stack((xx.ravel(),yy.ravel()),axis=1))
        scales.append(np.full(((size//stride)**2,1),stride))
    grid=np.concatenate(grids);stride=np.concatenate(scales)
    rows=rows[0]
    classes=rows[:,5:].argmax(axis=1)
    scores=rows[:,4]*rows[np.arange(count),classes+5]
    mask=np.isfinite(rows).all(axis=1)&np.isin(classes,list(VEHICLE_CLASSES))&(scores>=threshold)&(scores<=1)
    mask &= (np.abs(rows[:,2:4])<20).all(axis=1)
    selected=np.flatnonzero(mask)
    if len(selected)>2048:selected=selected[np.argsort(scores[selected])[-2048:]]
    ratio=min(size/width,size/height)
    centers=(rows[selected,:2]+grid[selected])*stride[selected]/ratio
    dimensions=np.exp(rows[selected,2:4])*stride[selected]/ratio
    vehicles=[]
    for index,center,dimensions in zip(selected,centers,dimensions):
        left,top=center-dimensions/2;right,bottom=center+dimensions/2
        box=Box(max(0,int(left)),max(0,int(top)),min(width,int(right)),min(height,int(bottom)),float(scores[index]))
        if box.x2-box.x1>=12 and box.y2-box.y1>=12:
            vehicles.append(Vehicle(box,VEHICLE_CLASSES[int(classes[index])]))
    kept=[]
    for vehicle in sorted(vehicles,key=lambda v:v.box.score,reverse=True):
        if all(iou(vehicle.box,other.box)<.45 for other in kept):kept.append(vehicle)
        if len(kept)>=64:break
    return kept


class YoloxVehicleDetector:
    def __init__(self,artifact):
        import onnxruntime as ort
        if artifact.get("format")!="yolox_raw_coco" or artifact.get("input_size")!=416:
            raise ValueError("Unsupported vehicle detector contract")
        self.size=416
        options=ort.SessionOptions();options.intra_op_num_threads=2
        self.session=ort.InferenceSession(artifact["resolved_path"],sess_options=options,providers=["CPUExecutionProvider"])
        inputs=self.session.get_inputs()
        if len(inputs)!=1 or inputs[0].type!="tensor(float)" or inputs[0].shape!=[1,3,416,416]:
            raise ValueError("Unexpected vehicle model input")
        self.input_name=inputs[0].name

    def detect(self,frame):
        import cv2
        import numpy as np
        height,width=frame.shape[:2]
        ratio=min(self.size/width,self.size/height)
        w,h=max(1,int(width*ratio)),max(1,int(height*ratio))
        canvas=np.full((self.size,self.size,3),114,dtype=np.uint8)
        canvas[:h,:w]=cv2.resize(frame,(w,h))
        # This release uses BGR 0..255 and top-left padding, unlike the plate model.
        tensor=np.ascontiguousarray(canvas.transpose(2,0,1)[None],dtype=np.float32)
        return decode_yolox(self.session.run(None,{self.input_name:tensor})[0],width,height)


@dataclass
class VehicleTrack:
    id: str
    vehicle: Vehicle
    at: float
    hits: int=1
    velocity: tuple=(0.0,0.0)


class VehicleTracker:
    """Mutual unambiguous IoU association with velocity and low-score recovery.

    This is an independent conservative tracker, not a claimed ByteTrack port.
    Unobserved tracks are retired; crossings are never bridged over occlusion.
    """
    def __init__(self,max_gap=1.,new_threshold=.5,overlap=.2,margin=.1,max_scale_change=2.5):
        if not math.isfinite(max_scale_change) or max_scale_change<=1:
            raise ValueError("Invalid association scale limit")
        self.max_gap,self.new_threshold,self.overlap,self.margin=max_gap,new_threshold,overlap,margin
        self.max_scale_change=max_scale_change
        self.tracks={};self.serial=0;self.last_at=-math.inf

    def reset(self):self.tracks.clear()

    def update(self,vehicles,at):
        if not math.isfinite(at) or len(vehicles)>64:raise ValueError("Invalid vehicle observations")
        if at<=self.last_at:return []
        self.last_at=at
        active={key:value for key,value in self.tracks.items() if 0<at-value.at<=self.max_gap}
        scores={}
        for key,track in active.items():
            box=track.vehicle.box;dt=at-track.at
            dx,dy=track.velocity[0]*dt,track.velocity[1]*dt
            predicted=Box(box.x1+dx,box.y1+dy,box.x2+dx,box.y2+dy,box.score)
            for index,vehicle in enumerate(vehicles):
                # A departing foreground vehicle can overlap the parked car it
                # uncovers. IoU alone transfers identity and creates a false
                # reverse crossing. Retire uncertain identities at abrupt
                # dimension changes (including heavily clipped detections).
                candidate=vehicle.box
                ratios=((candidate.x2-candidate.x1)/max(1,box.x2-box.x1),
                        (candidate.y2-candidate.y1)/max(1,box.y2-box.y1))
                if any(not 1/self.max_scale_change<=ratio<=self.max_scale_change for ratio in ratios):continue
                score=max(iou(box,vehicle.box),iou(predicted,vehicle.box))
                if score>=self.overlap:scores[key,index]=score
        next_tracks={}
        for index,vehicle in enumerate(vehicles):
            candidates=sorted(((value,key) for (key,j),value in scores.items() if j==index),reverse=True)
            previous=None
            if candidates and (len(candidates)==1 or candidates[0][0]-candidates[1][0]>=self.margin):
                score,key=candidates[0]
                competing=sorted((value,j) for (k,j),value in scores.items() if k==key)
                if competing[-1][1]==index and (len(competing)==1 or score-competing[-2][0]>=self.margin):
                    previous=active[key]
            if previous:
                old=previous.vehicle.box;new=vehicle.box;dt=at-previous.at
                velocity=((new.x1+new.x2-old.x1-old.x2)/(2*dt),(new.y1+new.y2-old.y1-old.y2)/(2*dt))
                track=VehicleTrack(previous.id,vehicle,at,previous.hits+1,velocity)
            elif vehicle.box.score>=self.new_threshold:
                self.serial+=1;track=VehicleTrack(str(self.serial),vehicle,at)
            else:continue
            next_tracks[track.id]=track
        self.tracks=next_tracks
        return list(next_tracks.values())
