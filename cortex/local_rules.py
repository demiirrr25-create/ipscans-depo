"""Deterministic, sampled-image rules. No model, object labels or identity inference."""
import datetime as dt
import io
import math
from PIL import Image, ImageChops, ImageFilter, ImageStat

CATALOG = [
    ('lights_off', 'Aydınlatma', 'Işık kapandı', 'Önce aydınlık referans öğrenir; belirgin kararmayı doğrular.', 45, 2),
    ('lights_on', 'Aydınlatma', 'Işık açıldı', 'Önce karanlık referans öğrenir; aydınlanmayı doğrular.', 100, 2),
    ('darkness', 'Aydınlatma', 'Uzun süre karanlık', 'Başlangıçtan itibaren düşük parlaklığı izler.', 40, 60),
    ('overexposure', 'Aydınlatma', 'Aşırı aydınlık', 'Parlama veya yüksek pozlama olasılığını bildirir.', 225, 15),
    ('motion', 'Hareket ve bölge', 'Bölgede hareket', 'Ardışık karelerde değişen piksel oranını izler; insan/nesne ayırmaz.', 8, 6),
    ('sustained_motion', 'Hareket ve bölge', 'Süregelen hareket', 'Hareketin belirlenen süre boyunca sürmesini izler.', 8, 30),
    ('inactivity', 'Hareket ve bölge', 'Uzun süre hareketsizlik', 'Seçili bölgede görüntü değişiminin düşük kalmasını izler.', 2, 300),
    ('scene_change', 'Görüntü sağlığı', 'Kalıcı sahne değişimi', 'İlk referansa göre değişimi izler. Kamera yönü/nesne değişimi olabilir.', 30, 30),
    ('low_detail', 'Görüntü sağlığı', 'Görüntü ayrıntısı kaybı', 'İlk referansa göre kenar ayrıntısının azalmasını izler; netlik kaybı veya örtülme olabilir.', 50, 15),
    ('frozen', 'Görüntü sağlığı', 'Değişmeyen görüntü', 'Piksel farkının neredeyse sıfır kalmasını izler; durağan sahne de tetikleyebilir.', 0.3, 120),
    ('offline', 'Bağlantı', 'Kamera bağlantısı kesildi', 'Görüntü alınamayan sürenin sınırı aşmasını bildirir.', 0, 30),
    ('online', 'Bağlantı', 'Kamera bağlantısı geri geldi', 'Doğrulanmış kesintiden sonra görüntünün geri dönmesini bildirir.', 0, 6),
]
TEMPLATES = [{'kind': k, 'category': c, 'name': n, 'description': d, 'sensitivity': s, 'duration': t} for k,c,n,d,s,t in CATALOG]
KINDS = {t['kind'] for t in TEMPLATES}

def repair_light_rule(rule):
    """Repair only exact shipped light templates, never arbitrary user prose."""
    known={'Önce aydınlık referans öğrenir; belirgin kararmayı doğrular.', 'Aydınlık ortam belirgin şekilde karardığında ve karanlık art arda doğrulandığında bildir.'}
    if rule.get('kind','vision')=='vision' and rule.get('prompt','').strip() in known and rule.get('name','').strip() in ('Işık kapandı','Ortamdaki ışık kapandı'):
        return {**rule,'kind':'lights_off','duration':2,'sensitivity':45,'dark':45,'drop':.45,'hold':3,'repairedLightTemplate':True}
    return rule

def validate(d):
    kind = d.get('kind', 'vision')
    if kind not in KINDS | {'vision'}: raise ValueError('Kural türü geçersiz.')
    template = next((t for t in TEMPLATES if t['kind'] == kind), {})
    duration = float(d.get('duration', template.get('duration', 9)))
    sensitivity = float(d.get('sensitivity', template.get('sensitivity', 8)))
    if not math.isfinite(duration) or not 0.5 <= duration <= 86400: raise ValueError('Doğrulama süresi 0.5–86400 saniye olmalı.')
    limit = 255 if kind in ('lights_off','lights_on','darkness','overexposure') else 100
    if not math.isfinite(sensitivity) or not 0 <= sensitivity <= limit: raise ValueError(f'Eşik 0–{limit} aralığında olmalı.')
    roi = [float(d.get(key, value)) for key,value in zip(('x','y','width','height'),(0,0,100,100))]
    x,y,w,h = roi
    if not all(math.isfinite(v) for v in roi) or min(x,y)<0 or min(w,h)<5 or x+w>100 or y+h>100:
        raise ValueError('Bölge görüntü içinde olmalı; genişlik ve yükseklik en az %5.')
    start, end = str(d.get('start','00:00')), str(d.get('end','00:00'))
    for value in (start,end):
        if len(value)!=5 or value[2]!=':': raise ValueError('Saat biçimi SS:DD olmalı.')
        dt.time.fromisoformat(value)
    days = d.get('days', '0,1,2,3,4,5,6')
    if isinstance(days,str): days = [int(v) for v in days.split(',') if v.strip()]
    if not isinstance(days,list) or not days or any(type(v) is not int or v not in range(7) for v in days):
        raise ValueError('En az bir geçerli gün seçin.')
    return {'kind':kind,'duration':duration,'sensitivity':sensitivity,'roi':roi,'schedule':{'start':start,'end':end,'days':sorted(set(days))}}

def scheduled(rule, now=None):
    now = now or dt.datetime.now()
    schedule = rule.get('schedule', {'start':'00:00','end':'00:00','days':list(range(7))})
    start,end = schedule['start'],schedule['end']; current=now.strftime('%H:%M')
    if start==end: return now.weekday() in schedule['days']
    if start<end: return now.weekday() in schedule['days'] and start<=current<end
    # An overnight interval belongs to the day on which it starts.
    return (current>=start and now.weekday() in schedule['days']) or (current<end and (now.weekday()-1)%7 in schedule['days'])

def sample(frame, roi):
    with Image.open(io.BytesIO(frame)) as source:
        gray=source.convert('L'); x,y,w,h=roi; sw,sh=gray.size
        return gray.crop((round(sw*x/100),round(sh*y/100),round(sw*(x+w)/100),round(sh*(y+h)/100))).resize((96,72))

class Detector:
    def __init__(self):
        self.previous=None; self.reference=None; self.level=None; self.detail=None
        self.since=None; self.active=False; self.clear_since=None; self.disconnected=None
        self.was_offline=False; self.last_time=None; self.metrics={}

    def gate(self, condition, now, duration):
        if condition:
            self.clear_since=None
            if self.since is None: self.since=now
            if not self.active and now-self.since>=duration:
                self.active=True; return True
        else:
            self.since=None
            if self.clear_since is None: self.clear_since=now
            if now-self.clear_since>=min(duration,9): self.active=False
        return False

    def update(self, rule, frame, now):
        kind=rule['kind']; duration=rule.get('duration',9); threshold=rule.get('sensitivity',8)
        if kind in ('offline','online'):
            if frame is None:
                if self.disconnected is None: self.disconnected=now
                if now-self.disconnected>=max(15,duration if kind=='offline' else 15): self.was_offline=True
                self.since=None if kind=='online' else self.since
                return self.gate(self.was_offline,now,0) if kind=='offline' else False
            self.disconnected=None
            if kind=='offline': return self.gate(False,now,0)
            fired=self.gate(self.was_offline,now,duration)
            if fired: self.was_offline=False
            return fired
        if frame is None:
            self.__init__(); return False
        # Unknown gaps cannot count as continuously observed evidence.
        if self.last_time is not None and now-self.last_time>30: self.__init__()
        self.last_time=now
        img=sample(frame,rule.get('roi',[0,0,100,100])); level=ImageStat.Stat(img).mean[0]
        detail=ImageStat.Stat(img.filter(ImageFilter.FIND_EDGES).crop((1,1,95,71))).mean[0]
        if self.previous is None:
            self.previous=img; self.reference=img.copy(); self.level=level; self.detail=detail
            if kind in ('darkness','overexposure'): self.since=now if (level<=threshold if kind=='darkness' else level>=threshold) else None
            return False
        difference=ImageChops.difference(img,self.previous)
        histogram=difference.histogram(); motion=100*sum(histogram[20:])/(96*72)
        delta=ImageStat.Stat(difference).mean[0]
        scene=100*sum(ImageChops.difference(img,self.reference).histogram()[25:])/(96*72)
        self.previous=img
        self.metrics={'brightness':round(level,1),'motion':round(motion,2),'difference':round(delta,3),'scene':round(scene,2),'detail':round(detail,2)}
        conditions={
            'lights_off': self.level>=threshold+15 and level<=threshold and level<=self.level*rule.get('drop',.45),
            'lights_on': self.level<=threshold-20 and level>=threshold,
            'darkness':level<=threshold, 'overexposure':level>=threshold,
            'motion':motion>=threshold, 'sustained_motion':motion>=threshold,
            'inactivity':motion<=threshold, 'scene_change':scene>=threshold,
            'low_detail':self.detail>=3 and detail<=self.detail*(1-threshold/100),
            'frozen':delta<=threshold,
        }
        condition=conditions[kind]
        if kind=='lights_off' and level>=threshold+15 and not self.active: self.level=max(self.level,level)
        if kind=='lights_on' and level<=threshold-20 and not self.active: self.level=min(self.level,level)
        return self.gate(condition,now,duration)
