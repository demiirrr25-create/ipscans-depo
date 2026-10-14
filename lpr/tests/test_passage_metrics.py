import pytest
from lpr.passage_metrics import score_passages


def event(identity,time,direction='entry',line='gate'):
    return dict(id=identity,time=time,direction=direction,line_id=line)


def test_duplicate_and_wrong_direction_are_not_successes():
    report=score_passages([event('a',1),event('b',4,'exit')],
        [event('x',1.1),event('dup',1.2),event('wrong',4)])
    assert (report['true_positive'],report['false_positive'],report['false_negative'])==(1,2,1)
    assert report['recall']==.5


def test_matching_does_not_lose_valid_pairs_to_nearest_neighbor_greed():
    report=score_passages([event('a',1),event('b',2)],[event('x',1.4),event('y',.4)],.7)
    assert report['true_positive']==2


def test_wrong_line_and_empty_reference():
    report=score_passages([event('a',1)],[event('x',1,line='other')])
    assert report['true_positive']==0 and report['false_negative']==1
    assert score_passages([],[])['recall'] is None
    with pytest.raises(ValueError):score_passages([event('a',1),event('a',2)],[])
