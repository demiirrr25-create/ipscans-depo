import sqlite3
import pytest
from lpr.operations import Operations


@pytest.fixture
def station(tmp_path):
    now=[1800000000.]
    ops=Operations(tmp_path/'station.db',clock=lambda:now[0])
    ops.setup('admin','a secure test password')
    admin=ops.login('admin','a secure test password')
    yield ops,admin,now
    ops.close()


def test_capacity_antipassback_idempotence_and_exit(station):
    ops,s,now=station
    ops.set_capacity(s,1)
    result=ops.confirm_passage(s,'34ABC123','entry','Seen entering','one')
    assert not result['barrier_command']
    assert ops.confirm_passage(s,'34ABC123','entry','Retry','one')['duplicate']
    with pytest.raises(ValueError):ops.confirm_passage(s,'06AB1234','entry','Seen','one')
    with pytest.raises(ValueError):ops.confirm_passage(s,'34ABC123','entry','Seen','two')
    with pytest.raises(ValueError):ops.confirm_passage(s,'06AB1234','entry','Seen','three')
    assert ops.parking(s)['occupied']==1
    now[0]+=60
    ops.confirm_passage(s,'34ABC123','exit','Seen leaving','four')
    assert ops.parking(s)['available']==1
    with pytest.raises(ValueError):ops.confirm_passage(s,'34ABC123','exit','Again','five')
    ops.confirm_passage(s,'06AB1234','entry','Seen','six')
    assert len(ops.db.execute('SELECT * FROM parking_visits').fetchall())==2


def test_backup_verified_and_never_overwrites(station,tmp_path):
    ops,s,_=station
    ops.confirm_passage(s,'34ABC123','entry','Verified','one')
    target=tmp_path/'backup.sqlite3'
    ops.backup(s,target)
    db=sqlite3.connect(target)
    assert db.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
    assert db.execute('SELECT plate FROM parking_visits').fetchone()[0]=='34ABC123'
    db.close()
    with pytest.raises(FileExistsError):ops.backup(s,target)


def test_auditor_cannot_change_occupancy_and_recognition_does_not_change_it(station):
    ops,s,_=station
    ops.add_user(s,'audit','auditor secure password','auditor')
    auditor=ops.login('audit','auditor secure password')
    with pytest.raises(PermissionError):ops.confirm_passage(auditor,'34ABC123','entry','Seen','one')
    with pytest.raises(PermissionError):ops.set_capacity(auditor,10)
    ops.record(s,'34ABC123',.99,'recognized','gate','live_rtsp')
    assert ops.parking(s)['occupied']==0


def test_clock_rollback_does_not_close_visit(station):
    ops,s,now=station
    ops.confirm_passage(s,'34ABC123','entry','Seen','one')
    now[0]-=5
    with pytest.raises(ValueError):ops.confirm_passage(s,'34ABC123','exit','Seen','two')
    assert ops.parking(s)['occupied']==1
