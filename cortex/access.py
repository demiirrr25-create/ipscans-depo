"""Local pedestrian detection and two-zone crossing correlation; no identity inference."""
import math
import threading
import time
from collections import deque

KINDS={'access_crossing','access_reverse','access_unpermitted'}
TEMPLATES=[{'kind':kind,'category':'Geçiş kontrolü · pilot','name':name,'description':description,'sensitivity':8,'duration':1} for kind,name,description in [
    ('access_crossing','Giriş çizgisi geçildi','İnsan izinin iki tarafta doğrulandığı giriş yönündeki geçişi kaydeder.'),
    ('access_reverse','Ters yönde geçiş','Belirlenen giriş yönünün tersine gerçekleşen insan geçişini bildirir.'),
    ('access_unpermitted','İzinsiz geçiş şüphesi','Geçerli tek kullanımlık giriş izniyle eşleşmeyen insan geçişini bildirir. Üyelik çıkarımı yapmaz.')]]

class Permits:
    def __init__(self): self.lock=threading.Lock(); self.queues={}
    def grant(self,camera,seconds=15):
        with self.lock:
            q=self.queues.setdefault(camera,deque()); now=time.monotonic()
            while q and q[0]<now: q.popleft()
            if len(q)>=20: raise ValueError('En fazla 20 bekleyen izin olabilir.')
            q.append(now+seconds)
    def consume(self,camera,now):
        with self.lock:
            q=self.queues.setdefault(camera,deque())
            while q and q[0]<now: q.popleft()
            if q: q.popleft(); return True
            return False

PERMITS=Permits()

def validate(data):
    axis=data.get('axis','y'); direction=data.get('direction','positive')
    line=float(data.get('line',50)); margin=float(data.get('margin',8))
    if axis not in ('x','y') or direction not in ('positive','negative'): raise ValueError('Geçiş yönü geçersiz.')
    if not math.isfinite(line) or not math.isfinite(margin) or not 5<=margin<=20 or not margin+5<=line<=95-margin:
        raise ValueError('Çizgi ve doğrulama mesafesi görüntü içinde olmalı.')
    return dict(axis=axis,direction=direction,line=line,margin=margin)

class Pedestrians:
    def __init__(self):
        import cv2
        self.cv2=cv2
        if hasattr(cv2,'HOGDescriptor'):
            self.hog=cv2.HOGDescriptor(); self.hog.setSVMDetector(cv2.HOGDescriptor_getDefaultPeopleDetector())
            self.bg=None
        else:
            self.hog=None
            self.bg=cv2.createBackgroundSubtractorMOG2(history=120,varThreshold=28,detectShadows=False) if hasattr(cv2,'createBackgroundSubtractorMOG2') else None
    def detect(self,frame):
        import numpy as np
        cv=self.cv2; img=cv.imdecode(np.frombuffer(frame,np.uint8),cv.IMREAD_COLOR)
        if img is None: return []
        h,w=img.shape[:2]; img=cv.resize(img,(640,round(h*640/w))); h,w=img.shape[:2]
        if h<128:return []
        if self.hog is not None:
            boxes,weights=self.hog.detectMultiScale(img,winStride=(8,8),padding=(8,8),scale=1.08)
            chosen=cv.dnn.NMSBoxes(list(boxes),[float(v) for v in weights],0.5,0.35)
            return [((int(boxes[int(i)][0])+int(boxes[int(i)][2])/2)/w*100,
                     (int(boxes[int(i)][1])+int(boxes[int(i)][3]))/h*100) for i in np.asarray(chosen).flatten()]
        # OpenCV 5+ silhouette & motion contour fallback
        if self.bg is not None:
            mask=self.bg.apply(img)
        else:
            gray=cv.cvtColor(img,cv.COLOR_BGR2GRAY)
            mask=cv.Canny(gray,60,150)
        kernel=np.ones((5,5),np.uint8)
        mask=cv.morphologyEx(mask,cv.MORPH_CLOSE,kernel)
        contours,_=cv.findContours(mask,cv.RETR_EXTERNAL,cv.CHAIN_APPROX_SIMPLE)
        boxes=[]; weights=[]
        for c in contours:
            x,y,bw,bh=cv.boundingRect(c)
            if bw>=18 and bh>=36 and bw*bh>=800 and 0.8<=bh/max(1,bw)<=4.5:
                boxes.append([int(x),int(y),int(bw),int(bh)])
                weights.append(min(1.0, (bw*bh)/(w*h*0.15)+0.55))
        if not boxes: return []
        chosen=cv.dnn.NMSBoxes(boxes,weights,0.5,0.35)
        return [((int(boxes[int(i)][0])+int(boxes[int(i)][2])/2)/w*100,
                 (int(boxes[int(i)][1])+int(boxes[int(i)][3]))/h*100) for i in np.asarray(chosen).flatten()]

class Tracker:
    def __init__(self): self.tracks={}; self.next=0
    def update(self,points,rule,now):
        self.tracks={k:v for k,v in self.tracks.items() if now-v['time']<2}
        remaining=set(self.tracks); events=[]; axis=0 if rule.get('axis','y')=='x' else 1
        x,y,w,h=rule.get('roi',[0,0,100,100])
        for point in points:
            if not (x<=point[0]<=x+w and y<=point[1]<=y+h): continue
            candidates=sorted((math.dist(point,self.tracks[k]['point']),k) for k in remaining)
            key=candidates[0][1] if candidates and candidates[0][0]<18 else None
            if key is None:
                self.next+=1; key=self.next; self.tracks[key]={'point':point,'side':0,'time':now,'seen':0}
            else: remaining.remove(key)
            track=self.tracks[key]; track['seen']+=1
            value=point[axis]; line=rule.get('line',50); margin=rule.get('margin',8)
            side=-1 if value<line-margin else 1 if value>line+margin else 0
            if side:
                if track['side'] and side!=track['side'] and track['seen']>=3:
                    events.append('positive' if side==1 else 'negative')
                track['side']=side
            track.update(point=point,time=now)
        return events
