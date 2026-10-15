import json
from types import SimpleNamespace

import pytest

from lpr.calibration import CameraCalibration, CalibrationRegion, RecognitionLine, RecognitionGate
from lpr.lines import CrossingLine, LineCrossings
from lpr.passages import VehiclePassages
from lpr.vehicles import Vehicle
from lpr.vision import Box


def car(bottom,x=50):return Vehicle(Box(x-20,bottom-30,x+20,bottom,.95),"car")
def reading(bottom,text="34ABC123",x=50):return dict(box=Box(x-10,bottom-12,x+10,bottom-4,.98),text=text,confidence=.98)


def test_roundtrip_independent_lines_regions_and_immutable_coordinates():
    coords=[[.1,.1],[.9,.1],[.8,.8],[.2,.8]]
    roi=CalibrationRegion("roi","Okuma",coords)
    config=CameraCalibration((CrossingLine("trigger","Giriş",(.1,.7),(.9,.7),allowed_directions=("entry",)),),
        (RecognitionLine("read","Okuma",(.2,.4),(.8,.4),priority=3,region_id="roi"),),(roi,),8,1.5)
    coords[0][0]=.9
    assert config.regions[0].points[0]==(.1,.1)
    restored=CameraCalibration.from_dict(json.loads(json.dumps(config.to_dict())))
    assert restored==config
    assert restored.trigger_lines[0].start!=(restored.recognition_lines[0].start)
    assert restored.repeat_seconds==8 and restored.result_wait_seconds==1.5
    with pytest.raises(ValueError):CameraCalibration(recognition_lines=(RecognitionLine("read","Okuma",(0,.5),(1,.5),region_id="missing"),))
    with pytest.raises(ValueError):CameraCalibration.from_dict({"schema_version":99})
    with pytest.raises(ValueError):CameraCalibration.from_dict({"unknown":1})


def test_legacy_lines_remain_triggers_and_preserve_rectangle():
    line=CrossingLine("old","Old",(.2,.6),(.8,.6))
    config=CameraCalibration.from_legacy([line],[.1,.2,.8,.9])
    assert config.trigger_lines==(line,) and config.recognition_lines==()
    assert config.result_wait_seconds==0
    assert config.accepts((.5,.5),"recognition")
    assert not config.accepts((.9,.5),"recognition")


def test_concave_polygon_exclusions_and_invalid_shapes():
    concave=CalibrationRegion("main","Main",((.1,.1),(.9,.1),(.9,.4),(.4,.4),(.4,.9),(.1,.9)))
    excluded=CalibrationRegion.rectangle("excluded","Hide",(.2,.2),(.3,.3),exclude=True)
    config=CameraCalibration(regions=(concave,excluded))
    assert config.accepts((.2,.7),"recognition")
    assert not config.accepts((.7,.7),"recognition")
    assert not config.accepts((.25,.25),"recognition")
    assert concave.contains((.4,.7))  # Boundary is stable across resize.
    with pytest.raises(ValueError):CalibrationRegion("bad","Bad",((.1,.1),(.9,.9),(.1,.9),(.9,.1)))
    with pytest.raises(ValueError):CalibrationRegion("bad","Bad",((.1,.1),(.1,.1),(.9,.9)))
    with pytest.raises(ValueError):CalibrationRegion("bad","Bad",((0,0),(1,0),(float("nan"),1)))


def test_vehicle_and_plate_rois_have_independent_gates_at_any_resolution():
    config=CameraCalibration(regions=(CalibrationRegion.rectangle("plate","Plate",(.1,.1),(.8,.8)),
        CalibrationRegion.rectangle("vehicle","Vehicle",(.1,.2),(.8,.9),purpose="vehicle")))
    assert config.filter_vehicles([car(85)],100,100)
    assert config.filter_readings([reading(85)],100,100)
    assert not config.filter_vehicles([car(95)],100,100)
    assert not config.filter_readings([reading(95)],100,100)
    scaled=dict(reading(85));scaled["box"]=Box(400,730,600,810,.98)
    assert bool(config.filter_readings([scaled],1000,1000))==bool(config.filter_readings([reading(85)],100,100))


def test_one_way_trigger_never_emits_reverse():
    engine=LineCrossings([CrossingLine("gate","Gate",(0,.5),(1,.5),allowed_directions=("entry",))])
    assert not engine.observe("car",(.5,.7),0)
    assert not engine.observe("car",(.5,.3),.2)
    assert engine.observe("car",(.5,.7),.4)[0]["direction"]=="entry"


def test_recognition_priority_and_region_association_are_effective():
    left=CalibrationRegion.rectangle("left","Left",(0,0),(.45,1))
    right=CalibrationRegion.rectangle("right","Right",(.55,0),(1,1))
    config=CameraCalibration(recognition_lines=(RecognitionLine("low","Low",(0,.5),(1,.5),priority=1,region_id="left"),
        RecognitionLine("high","High",(0,.5),(1,.5),priority=2,region_id="right")),regions=(left,right))
    gate=RecognitionGate(config)
    gate.update([SimpleNamespace(id="car",vehicle=car(50))],0,100,100)
    assert not gate.accepts("car",reading(50,x=30),100,100)
    assert gate.accepts("car",reading(50,x=70),100,100)
    gate.update([SimpleNamespace(id="car",vehicle=car(90))],2,100,100)
    assert not gate.accepts("car",reading(90,x=70),100,100)


def test_reading_window_is_independent_and_late_result_matches_trigger_track():
    config=CameraCalibration(trigger_lines=(CrossingLine("trigger","Gate",(.1,.5),(.9,.5)),),
        recognition_lines=(RecognitionLine("read","Read",(.1,.65),(.9,.65),band=.04,after_seconds=.5),),result_wait_seconds=1)
    engine=VehiclePassages("gate",calibration=config,wall_clock=lambda:1700.)
    events=[]
    for index,bottom in enumerate([40,44,48,53,57,61,65,69,73,77]):
        events+=engine.observe([car(bottom)],[reading(bottom)],index,index*.2,index*.2,100,100)
        if index==3:
            assert not events
            assert next(iter(engine.pending.values()))["event"]["status"]=="unread"
    assert len(events)==1 and events[0]["direction"]=="entry"
    event=events[0]
    assert event["status"]=="recognized" and event["plate"]=="34ABC123"
    assert event["trigger_frame_sequence"]==3 and event["frame_sequence"]==8
    assert event["_vehicle_box"]==(30,43,70,73)
    assert event["_plate_box"]==(40,61,60,69)
    assert event["at"]==1700  # Crossing timestamp, not deferred emission time.


def test_vehicle_roi_suppresses_crossing_and_recognition_roi_suppresses_evidence():
    trigger=CrossingLine("trigger","Gate",(.1,.5),(.9,.5))
    excluded=CalibrationRegion.rectangle("exclude","Exclude",(.2,.2),(.8,.8),purpose="vehicle",exclude=True)
    engine=VehiclePassages("gate",calibration=CameraCalibration((trigger,),regions=(excluded,),result_wait_seconds=0))
    for index,bottom in enumerate([40,44,48,53]):
        assert not engine.observe([car(bottom)],[reading(bottom)],index,index*.2,index*.2,100,100)
    recognition=CalibrationRegion.rectangle("read","Read",(.0,.0),(.2,1))
    engine=VehiclePassages("gate",calibration=CameraCalibration((trigger,),regions=(recognition,),result_wait_seconds=0))
    events=[]
    for index,bottom in enumerate([40,44,48,53]):
        events+=engine.observe([car(bottom)],[reading(bottom)],index,index*.2,index*.2,100,100)
    assert len(events)==1 and events[0]["status"]=="unread"
    assert "_plate_box" not in events[0]


def test_pending_crossing_survives_reconnect_without_stale_image_and_can_be_drained():
    config=CameraCalibration((CrossingLine("trigger","Gate",(.1,.5),(.9,.5)),),result_wait_seconds=2)
    engine=VehiclePassages("gate",calibration=config)
    for index,bottom in enumerate([40,44,48,53]):
        assert not engine.observe([car(bottom)],[],index,index*.2,index*.2,100,100)
    engine.reset()
    assert not engine.flush_pending(.8)
    events=engine.flush_pending(.8,force=True)
    assert len(events)==1 and events[0]["status"]=="unread"
    assert event_frame_not_current(events[0],5)
    assert not engine.flush_pending(4,force=True)


def event_frame_not_current(event,current):return event["frame_sequence"]!=current


def test_cooldown_only_exact_confident_plate_same_gate_and_direction():
    config=CameraCalibration((CrossingLine("trigger","Gate",(.1,.5),(.9,.5)),),repeat_seconds=5,result_wait_seconds=0)
    engine=VehiclePassages("gate",calibration=config)
    events=[];index=0
    for text in ("34ABC123","34ABC123","34ABC124"):
        for bottom in [40,44,48,53]:
            events+=engine.observe([car(bottom)],[reading(bottom,text)],index,index*.2,index*.2,100,100);index+=1
        engine.observe([],[],index,index*.2,index*.2,100,100);index+=1
    assert [event["plate"] for event in events]==["34ABC123","34ABC124"]
