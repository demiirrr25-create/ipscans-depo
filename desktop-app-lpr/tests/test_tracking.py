import pytest
from lpr.tracking import TrackedConsensus, Region
from lpr.vision import Box


def prediction(text="34ABC123",x=10):
    return {"text":text,"confidence":.99,"box":Box(x,10,x+40,30,.99)}


def observe(engine,items,n):
    return engine.observe(items,n,n*.1,n*.1,300,100)


def test_two_vehicles_independent_even_when_detector_order_changes():
    engine=TrackedConsensus("a")
    for n in range(3):
        items=[prediction(),prediction("06AB1234",150)]
        if n%2:items.reverse()
        decisions=observe(engine,items,n)
    assert {d['plate'] for d in decisions if d['status']=='recognized'}=={'34ABC123','06AB1234'}
    assert len({d['track'] for d in decisions})==2


def test_crossing_boxes_do_not_merge_evidence():
    engine=TrackedConsensus("a")
    for n in range(2):observe(engine,[prediction(),prediction("06AB1234",40)],n)
    results=observe(engine,[prediction(x=25),prediction("06AB1234",26)],2)
    assert all(d['status']=='pending' for d in results)


def test_empty_gap_and_reconnect_retire_evidence_preserve_cooldown():
    engine=TrackedConsensus("a")
    observe(engine,[prediction()],0)
    observe(engine,[prediction()],1)
    observe(engine,[],2)
    assert observe(engine,[prediction()],3)[0]['status']=='pending'
    observe(engine,[prediction()],4)
    assert observe(engine,[prediction()],5)[0]['status']=='recognized'
    engine.reset()
    observe(engine,[prediction()],6)
    observe(engine,[prediction()],7)
    assert observe(engine,[prediction()],8)[0]['status']=='suppressed'


def test_roi_stale_frames_reordering_and_camera_isolation():
    a=TrackedConsensus('a',region=Region(0,0,.4,1))
    b=TrackedConsensus('b')
    assert observe(a,[prediction(x=150)],0)==[]
    assert a.observe([prediction()],1,1,5,300,100)==[]
    assert observe(a,[prediction()],2)[0]['status']=='pending'
    assert observe(a,[prediction()],2)==[]
    assert observe(b,[prediction()],2)[0]['status']=='pending'
    with pytest.raises(ValueError):Region(1,0,0,1)
    with pytest.raises(ValueError):Region(float('nan'),0,1,1)


def test_many_passages_keep_state_bounded():
    engine=TrackedConsensus('a')
    for n in range(400):
        observe(engine,[prediction(x=10 if n%2 else 150)],n)
        assert len(engine.engine.history)<=1

