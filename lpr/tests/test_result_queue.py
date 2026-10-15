from queue import Full
import pytest
from lpr.result_queue import ResultQueue


def test_saturated_ocr_keeps_accepted_crossing_and_final_pending_events():
    queue=ResultQueue(1,reserve=2)
    queue.publish({'passages':[],'frame':1})
    with pytest.raises(Full):queue.publish({'passages':['accepted'],'frame':2})
    queue.publish({'passages':['delayed'],'frame':3},final=True)
    assert queue.qsize()==3
    assert [queue.get_nowait()['passages'] for _ in range(3)]==[[],['accepted'],['delayed']]
    assert queue.empty()


def test_empty_ocr_hint_does_not_consume_emergency_event_capacity():
    queue=ResultQueue(1,reserve=2);queue.publish({'passages':[]})
    with pytest.raises(Full):queue.publish({'passages':[]})
    assert queue.qsize()==1
