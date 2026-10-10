from dataclasses import replace
import pytest
from lpr.operations import Operations
from lpr.security import protect_secret,unprotect_secret

@pytest.fixture
def station(tmp_path):
    now=[1_800_000_000.0]
    ops=Operations(tmp_path/'station.db',clock=lambda:now[0])
    ops.setup('admin','a secure test password')
    session=ops.login('admin','a secure test password')
    yield ops,session,now
    ops.close()

def test_roles_and_forged_sessions(station):
    ops,admin,_=station
    ops.add_user(admin,'operator','operator secure password','operator')
    operator=ops.login('operator','operator secure password')
    with pytest.raises(PermissionError):ops.export_rows(operator)
    with pytest.raises(PermissionError):ops.add_user(operator,'evil','this is a password','admin')
    with pytest.raises(PermissionError):ops.check(replace(operator,role='admin'),'users')
    ops.logout(operator)
    with pytest.raises(PermissionError):ops.history(operator)

def test_lockout_and_expiry(station):
    ops,admin,now=station
    for _ in range(5):
        with pytest.raises(PermissionError):ops.login('admin','incorrect')
    with pytest.raises(PermissionError):ops.login('admin','a secure test password')
    now[0]+=301
    assert ops.login('admin','a secure test password').role=='admin'
    now[0]+=8*3600
    with pytest.raises(PermissionError):ops.history(admin)

def test_grant_denials_do_not_consume_or_actuate(station):
    ops,admin,now=station
    ops.save_grant(admin,'34ABC123','visitor',False,now[0]-1,now[0]+3600,'entry',1)
    assert not ops.simulate(admin,'34ABC123',.99,'entry')['eligible']
    assert ops.simulate(admin,'34ABC123',.99,'exit',fresh=True,physical_presence=True)['reason']=='direction_denied'
    for _ in range(3):
        result=ops.simulate(admin,'34ABC123',.99,'entry',fresh=True,physical_presence=True)
        assert result['eligible'] and not result['barrier_command']
    assert ops.grants(admin)[0]['remaining']==1
    ops.save_grant(admin,'34ABC123','visitor',True,now[0]-1,now[0]+3600,'both')
    assert ops.simulate(admin,'34ABC123',.99,'entry',fresh=True,physical_presence=True)['reason']=='blacklisted'

def test_correction_audit_retention(station):
    ops,admin,now=station
    event=ops.record(admin,'34ABC123',.91,'review','offline','offline_image')
    ops.correct(admin,event,'06AB1234','Verified against authorized image')
    assert ops.history(admin)[0]['plate']=='06AB1234'
    assert ops.db.execute('SELECT old_plate FROM corrections').fetchone()[0]=='34ABC123'
    assert len(ops.history(admin,"' OR 1=1 --"))==0
    now[0]+=31*86400
    admin=ops.login('admin','a secure test password')
    assert ops.retain(admin,30)==1
    assert ops.db.execute('SELECT count(*) FROM corrections').fetchone()[0]==0
    assert any(r['action']=='retention' for r in ops.audit(admin))

def test_dpapi_and_no_plaintext_camera(station):
    ops,admin,_=station
    source='rtsp://operator:secret-test@192.0.2.1:554/Streaming/Channels/101'
    encoded=protect_secret(source)
    assert unprotect_secret(encoded)==source and 'secret-test' not in encoded
    ops.save_camera(admin,'gate','Gate',source,'entry')
    assert ops.camera_source(admin,'gate')==source
    assert 'secret' not in ops.cameras(admin)[0]
    assert source not in str(ops.audit(admin))
    with pytest.raises(Exception):unprotect_secret(encoded[:-8]+'AAAAAAAA')
