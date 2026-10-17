import json
import sqlite3
import uuid
import pytest
from lpr.operations import Operations
from lpr.event_service import EventService,DurablePassageQueue


def setup(tmp_path):
    ops=Operations(tmp_path/'ops.db');ops.setup('admin','test password long enough')
    session=ops.login('admin','test password long enough')
    ops.save_camera(session,'gate','Gate','rtsp://192.0.2.1/stream','entry')
    event=dict(event_id=str(uuid.uuid4()),at=ops.clock(),camera='gate',line_id='line',direction='entry',track_id='track',
        vehicle_type='car',plate='34ABC123',confidence=.95,status='recognized',evidence_frames=3,frame_sequence=4)
    return ops,session,event


def test_delivery_survives_restart_and_replay_after_partial_commit(tmp_path):
    ops,session,event=setup(tmp_path);service=EventService(ops)
    queue=DurablePassageQueue(tmp_path/'journal.db');queue.enqueue(event)
    raw=queue.db.execute('SELECT payload FROM pending').fetchone()[0]
    assert event['plate'] not in raw
    def partially_deliver(value):
        service.persist(session,value)
        raise sqlite3.OperationalError('disk unavailable after operation commit')
    with pytest.raises(sqlite3.OperationalError):queue.drain(partially_deliver)
    queue.close();queue=DurablePassageQueue(tmp_path/'journal.db')
    assert queue.pending==1
    assert queue.drain(lambda value:service.persist(session,value))==1
    assert queue.pending==0 and len(ops.vehicle_passages(session))==1
    queue.close();ops.close()


def test_review_keeps_original_and_camera_rename_updates_history(tmp_path):
    ops,session,event=setup(tmp_path);service=EventService(ops);service.persist(session,event)
    service.correct(session,event['event_id'],'34 abc 124','Operator checked image')
    ops.db.execute("UPDATE cameras SET name='New gate' WHERE id='gate'");ops.db.commit()
    row=service.latest(session)[0]
    assert row['plate']=='34ABC123' and row['corrected_plate']=='34ABC124' and row['camera_name']=='New gate'
    assert service.details(session,event['event_id'])['corrections'][0]['actor']=='admin'
    ops.add_user(session,'auditor','different password long','auditor');audit=ops.login('auditor','different password long')
    with pytest.raises(PermissionError):service.correct(audit,event['event_id'],'34ABC125','Not allowed')
    ops.close()


def test_queue_is_bounded_and_conflicting_replay_rejected(tmp_path):
    ops,session,event=setup(tmp_path);queue=DurablePassageQueue(tmp_path/'journal.db',maximum=1)
    queue.enqueue(event);queue.enqueue(event)
    with pytest.raises(ValueError):queue.enqueue({**event,'plate':'34ABC124'})
    with pytest.raises(RuntimeError):queue.enqueue({**event,'event_id':str(uuid.uuid4())})
    assert queue.pending==1
    queue.close();ops.close()


def test_invalid_evidence_does_not_partially_commit_passage(tmp_path):
    ops,session,event=setup(tmp_path);service=EventService(ops)
    with pytest.raises(ValueError):service.persist(session,{**event,'_images':{'plate':'not-base64'}})
    assert ops.vehicle_passages(session)==[]
    ops.close()
