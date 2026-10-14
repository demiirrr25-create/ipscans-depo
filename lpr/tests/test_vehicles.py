import numpy as np
import pytest
from lpr.vision import Box
from lpr.vehicles import Vehicle,VehicleTracker,decode_yolox
from lpr.passages import VehiclePassages
from lpr.lines import CrossingLine


def vehicle(bottom,score=.95):
    return Vehicle(Box(30,bottom-30,70,bottom,score),'car')


def test_raw_decoder_contract_and_class_filter():
    raw=np.zeros((1,3549,85),dtype=np.float32)
    raw[0,0,:5]=[25,25,np.log(10),np.log(10),.9]
    raw[0,0,7]=.9
    found=decode_yolox(raw,416,416)
    assert len(found)==1 and found[0].kind=='car'
    assert abs(found[0].box.x1-160)<=1 and abs(found[0].box.x2-240)<=1
    raw[0,0,5]=1 # Person is strongest: not a vehicle.
    assert decode_yolox(raw,416,416)==[]
    with pytest.raises(ValueError):decode_yolox(raw[:,:100],416,416)


def test_low_score_continuation_missing_frame_and_ambiguity():
    tracker=VehicleTracker()
    assert tracker.update([vehicle(40,.2)],1)==[]
    first=tracker.update([vehicle(40)],2)[0]
    continued=tracker.update([vehicle(43,.2)],2.2)[0]
    assert continued.id==first.id and continued.hits==2
    assert tracker.update([],2.4)==[]
    assert tracker.update([vehicle(46)],2.6)[0].id!=first.id
    tracker.reset()
    twins=tracker.update([vehicle(50),vehicle(50)],3)
    after=tracker.update([vehicle(52)],3.2)[0]
    assert after.id not in {t.id for t in twins}


def run_passage(bottoms,*,read=True):
    engine=VehiclePassages('gate',[CrossingLine('line','Gate',(.1,.5),(.9,.5))],wall_clock=lambda:1800000000.)
    events=[]
    for i,bottom in enumerate(bottoms):
        readings=[dict(text='34ABC123',confidence=.97,box=Box(40,bottom-12,60,bottom-4,.99))] if read else []
        events+=engine.observe([vehicle(bottom)],readings,i,i*.2,i*.2,100,100)
    return engine,events


def test_vehicle_crossing_fuses_frames_and_deduplicates_jitter():
    _,events=run_passage([40,44,48,53,50,54,48,53])
    assert [e['direction'] for e in events]==['entry','exit']
    assert len({e['event_id'] for e in events})==2
    assert events[0]['plate']=='34ABC123'
    assert events[0]['status']=='recognized' and events[0]['evidence_frames']==4


def test_unread_is_still_vehicle_passage_and_stale_cannot_bridge():
    engine,events=run_passage([40,44,48,53],read=False)
    assert len(events)==1 and events[0]['status']=='unread' and events[0]['plate']==''
    assert engine.observe([vehicle(40)],[],5,1.,4.,100,100)==[]
    assert engine.observe([vehicle(60)],[],6,4.2,4.2,100,100)==[]


def test_plate_presence_without_vehicle_never_creates_passage():
    engine=VehiclePassages('gate',[CrossingLine('line','Gate',(.1,.5),(.9,.5))])
    for i in range(5):
        assert engine.observe([], [dict(text='34ABC123',confidence=.99,box=Box(40,40,60,60,.99))],i,i*.2,i*.2,100,100)==[]


def test_conflicting_or_single_frame_plate_is_review():
    engine,_=run_passage([40],read=False)
    engine.evidence['x']=[('34ABC123',.99),('06AB1234',.99),('34ABC123',.99)]
    assert engine.plate_result('x')['status']=='review'
    engine.evidence['x']=[('34ABC123',.99)]
    assert engine.plate_result('x')['status']=='review'
