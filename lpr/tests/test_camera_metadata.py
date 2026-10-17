import json
import uuid
import pytest
from lpr.operations import Operations
from lpr.camera_metadata import CameraMetadata


@pytest.fixture
def station(tmp_path):
    ops=Operations(tmp_path/'station.sqlite3')
    ops.setup('admin','a secure camera test password')
    session=ops.login('admin','a secure camera test password')
    ops.save_camera(session,'gate','Gate','rtsp://operator:private-test@192.0.2.1/live','entry')
    yield ops,session,CameraMetadata(ops)
    ops.close()


def test_rename_preserves_identity_secret_history_and_calibration(station):
    from lpr.lines import CrossingLine
    ops,session,store=station
    before=ops.db.execute('SELECT secret FROM cameras WHERE id=?',('gate',)).fetchone()[0]
    event=dict(event_id=str(uuid.uuid4()),at=ops.clock(),camera='gate',line_id='line',direction='entry',
        track_id='1',vehicle_type='car',plate='',confidence=0,status='unread',evidence_frames=0,frame_sequence=1)
    ops.record_vehicle_passage(session,event)
    ops.save_camera_lines(session,'gate',[CrossingLine('line','Gate line',(.1,.5),(.9,.5))])
    store.save(session,'gate',name='  Site Ana Giriş  ',direction='exit',brand='Mercusys',model='MC510',location='A Blok')
    assert store.get(session,'gate')['name']=='Site Ana Giriş'
    assert store.get(session,'gate')['host']=='192.0.2.1'
    assert ops.db.execute('SELECT secret FROM cameras WHERE id=?',('gate',)).fetchone()[0]==before
    assert ops.vehicle_passages(session)[0]['event_id']==event['event_id']
    assert ops.camera_lines(session,'gate')[0].id=='line'
    assert 'private-test' not in json.dumps(store.list(session))
    assert 'private-test' not in str(ops.audit(session))
    CameraMetadata(ops)  # Additive migration is repeatable.
    assert store.get(session,'gate')['name']=='Site Ana Giriş'


def test_archive_restore_retains_credential_and_defaults_to_disabled(station):
    ops,session,store=station
    store.archive(session,'gate')
    assert store.list(session)==[]
    assert store.list(session,include_archived=True)[0]['archived']
    assert ops.camera_source(session,'gate').endswith('/live')
    with pytest.raises(ValueError):store.save(session,'gate',name='Changed',direction='entry')
    store.restore(session,'gate')
    row=store.get(session,'gate')
    assert not row['archived'] and not row['enabled']
    store.save(session,'gate',name='Restored',direction='entry',enabled=True)
    assert store.get(session,'gate')['enabled']


def test_operator_cannot_mutate_camera_and_native_mode_fails_closed(station):
    ops,session,store=station
    ops.add_user(session,'operator','an operator secure password','operator')
    operator=ops.login('operator','an operator secure password')
    assert store.list(operator)[0]['id']=='gate'
    for action in (lambda:store.save(operator,'gate',name='New',direction='entry'),
                   lambda:store.archive(operator,'gate'),lambda:store.restore(operator,'gate'),
                   lambda:store.sync_address(operator,'gate')):
        with pytest.raises(PermissionError):action()
    for name in (' ', 'x'*121, 'Gate\nFake'):
        with pytest.raises(ValueError):store.save(session,'gate',name=name,direction='entry')
    with pytest.raises(ValueError):store.save(session,'gate',name='Native',direction='entry',mode='native')
    assert store.get(session,'gate')['name']=='Gate'


def test_sync_address_retains_metadata_and_secret(station):
    ops,session,store=station
    store.save(session,'gate',name='Gate',direction='entry',model='MC510',enabled=False)
    ops.save_camera(session,'gate','Gate','rtsps://user:next-private@192.0.2.2/live','entry','udp')
    store.sync_address(session,'gate')
    row=store.get(session,'gate')
    assert (row['host'],row['protocol'],row['model'],row['enabled'],row['transport'])==('192.0.2.2','RTSPS','MC510',False,'udp')
