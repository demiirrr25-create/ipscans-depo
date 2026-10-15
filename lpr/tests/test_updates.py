from dataclasses import asdict
import hashlib
import json
from pathlib import Path
from urllib.request import Request
import pytest
from lpr.updates import (UpdatePolicy,ReleaseManifest,UpdateManager,UpdateError,HTTPSReader,
    SameOriginRedirect,https_origin,version_key,parse_manifest,verify_authenticode)

PIN='a'*64
URL='https://updates.example.test/lpr/manifest.json'


def release(payload=b'MZtest installer',version='1.0.1',channel='stable'):
    return ReleaseManifest(version,channel,'https://updates.example.test/lpr/setup.exe',hashlib.sha256(payload).hexdigest(),len(payload))


class Reader:
    def __init__(self,payload):self.payload=payload;self.calls=[]
    def chunks(self,url,maximum):
        self.calls.append((url,maximum))
        yield self.payload


def configured(tmp_path,payload=b'MZtest installer',verifier=None):
    policy=UpdatePolicy(URL,publisher_sha256=PIN)
    reader=Reader(payload)
    manager=UpdateManager(tmp_path,policy,reader=reader,
        signature_verifier=verifier or (lambda *args:None))
    return manager,reader


def test_unconfigured_publisher_never_requests_network_or_stages(tmp_path):
    reader=Reader(b'')
    manager=UpdateManager(tmp_path,UpdatePolicy(URL),reader=reader)
    assert manager.check('1.0.0').code=='signing_not_configured'
    assert manager.stage(release(),'1.0.0').code=='signing_not_configured'
    assert manager.rollback_candidate().code=='signing_not_configured'
    assert reader.calls==[] and not (tmp_path/'state.json').exists()


@pytest.mark.parametrize('change',[
    {'url':'http://updates.example.test/lpr.exe'}, {'url':'https://other.example.test/lpr.exe'},
    {'url':'https://user:secret@updates.example.test/lpr.exe'}, {'size':True}, {'size':0},
    {'size':513*1024*1024}, {'version':'1.0.1.dev1'}, {'version':'01.0.1'}, {'channel':'preview'},
    {'sha256':'x'*64}, {'schema':True}, {'app':'different-product'}, {'publisher_sha256':PIN},
])
def test_manifest_rejects_unsafe_metadata_and_manifest_supplied_trust(change):
    values={**asdict(release()),**change}
    with pytest.raises(UpdateError):parse_manifest(json.dumps(values).encode(),UpdatePolicy(URL,publisher_sha256=PIN))


def test_manifest_rejects_duplicate_fields_and_version_ordering_is_numeric():
    raw=json.dumps(asdict(release())).encode().replace(b'"schema": 1',b'"schema": 1,"schema": 1')
    with pytest.raises(UpdateError):parse_manifest(raw,UpdatePolicy(URL,publisher_sha256=PIN))
    assert version_key('1.0.0.dev9')<version_key('1.0.0rc1')<version_key('1.0.0')<version_key('1.0.10')


def test_redirects_are_https_same_origin_and_port_only():
    redirect=SameOriginRedirect(https_origin(URL));request=Request(URL)
    accepted=redirect.redirect_request(request,None,302,'Found',{},'/files/manifest.json')
    assert accepted.full_url=='https://updates.example.test/files/manifest.json'
    for target in ('http://updates.example.test/next','https://attacker.test/next',
                   'https://updates.example.test:8443/next','https://user@updates.example.test/next',
                   'https://updates.example.test:0/next'):
        with pytest.raises(UpdateError):redirect.redirect_request(request,None,302,'Found',{},target)


@pytest.mark.parametrize('changed',[
    {'status':'NotSigned'},{'status':'HashMismatch'},{'status':'NotTrusted'},
    {'publisher_sha256':'b'*64},{'version':'0.9.0'},{'product_name':'Other signed product'},
])
def test_authenticode_rejects_invalid_signatures_wrong_publisher_and_signed_identity(changed):
    policy=UpdatePolicy(URL,publisher_sha256=PIN)
    identity={'status':'Valid','publisher_sha256':PIN,'product_name':policy.product_name,'version':'1.0.1'}
    with pytest.raises(UpdateError):verify_authenticode(Path('unused.exe'),release(),policy,identity_reader=lambda _:identity|changed)


def test_authenticode_accepts_only_valid_pinned_matching_product_and_version():
    policy=UpdatePolicy(URL,publisher_sha256=PIN)
    verify_authenticode(Path('unused.exe'),release(),policy,identity_reader=lambda _:
        {'status':'Valid','publisher_sha256':PIN,'product_name':policy.product_name,'version':'1.0.1'})
    verify_authenticode(Path('unused.exe'),release(),policy,identity_reader=lambda _:
        {'status':'Valid','publisher_sha256':PIN,'product_name':policy.product_name+'   ','version':'1.0.1   '})


def test_check_available_staging_persists_pointer_and_retains_verified_rollback(tmp_path):
    manager,reader=configured(tmp_path)
    reader.payload=json.dumps(asdict(release())).encode()
    assert manager.check('1.0.0').code=='update_available'
    reader.payload=b'MZtest installer'
    first=manager.stage(release(),'1.0.0')
    assert first.code=='staged' and first.path.read_bytes()==reader.payload
    assert manager.candidate().code=='staged'
    next_payload=b'MZnext installer';reader.payload=next_payload
    second=manager.stage(release(next_payload,'1.0.2'),'1.0.1')
    assert second.code=='staged' and second.path.exists()
    previous=manager.rollback_candidate()
    assert previous.code=='previous_verified' and previous.path==first.path and previous.manifest.version=='1.0.1'
    assert not list(tmp_path.glob('.download-*')) and not (tmp_path/'.stage.lock').exists()


@pytest.mark.parametrize('payload',[b'MZtampered data',b'MZshort',b'MZ'+b'x'*100])
def test_bad_download_leaves_previous_pointer_and_package_unchanged(tmp_path,payload):
    manager,reader=configured(tmp_path)
    first=manager.stage(release(),'1.0.0');old_state=(tmp_path/'state.json').read_bytes()
    reader.payload=payload
    status=manager.stage(release(version='1.0.2'),'1.0.1')
    assert status.code=='failed'
    assert (tmp_path/'state.json').read_bytes()==old_state and first.path.read_bytes()==b'MZtest installer'
    assert not list(tmp_path.glob('.download-*'))


def test_network_failure_and_signature_failure_leave_previous_usable(tmp_path):
    manager,reader=configured(tmp_path);first=manager.stage(release(),'1.0.0')
    old_state=(tmp_path/'state.json').read_bytes()
    def interrupted(*args):
        yield b'MZ'
        raise OSError('network disconnected')
    reader.chunks=interrupted
    assert manager.stage(release(version='1.0.2'),'1.0.1').code=='failed'
    assert (tmp_path/'state.json').read_bytes()==old_state
    reader.chunks=lambda *args:iter([b'MZtest installer'])
    def invalid(*args):raise UpdateError('Wrong publisher')
    manager.verify_signature=invalid
    assert manager.stage(release(version='1.0.2'),'1.0.1').code=='failed'
    assert (tmp_path/'state.json').read_bytes()==old_state and first.path.exists()


def test_pointer_write_failure_preserves_previous_and_cleanup_is_after_commit(tmp_path,monkeypatch):
    manager,reader=configured(tmp_path);first=manager.stage(release(),'1.0.0')
    old_state=(tmp_path/'state.json').read_bytes();reader.payload=b'MZnew'
    monkeypatch.setattr(manager,'_write_state',lambda _:(_ for _ in ()).throw(OSError('disk full')))
    assert manager.stage(release(reader.payload,'1.0.2'),'1.0.1').code=='failed'
    assert (tmp_path/'state.json').read_bytes()==old_state and first.path.exists()


def test_downgrade_and_same_version_refused_even_if_running_version_is_older(tmp_path):
    manager,reader=configured(tmp_path);assert manager.stage(release(version='1.2.0'),'1.0.0').code=='staged'
    assert manager.stage(release(version='1.1.0'),'1.0.0').code=='failed'
    assert manager.stage(release(version='1.2.0'),'1.0.0').code=='failed'
    reader.payload=json.dumps(asdict(release(version='1.1.0'))).encode()
    assert manager.check('1.0.0').code=='up_to_date'


def test_rollback_revalidates_tampered_package_and_rejects_paths(tmp_path):
    manager,reader=configured(tmp_path);first=manager.stage(release(),'1.0.0')
    reader.payload=b'MZnew';assert manager.stage(release(reader.payload,'1.0.2'),'1.0.1').code=='staged'
    first.path.write_bytes(b'MZtampered')
    assert manager.rollback_candidate().code=='failed'
    state=json.loads((tmp_path/'state.json').read_text());state['previous']['filename']='../outside.exe'
    (tmp_path/'state.json').write_text(json.dumps(state))
    assert manager.rollback_candidate().code=='failed'


def test_existing_stage_lock_prevents_concurrent_write_and_is_not_deleted(tmp_path):
    manager,_=configured(tmp_path);lock=tmp_path/'.stage.lock';lock.write_text('another writer')
    assert manager.stage(release(),'1.0.0').code=='failed'
    assert lock.read_text()=='another writer' and not (tmp_path/'state.json').exists()


def test_inconsistent_version_history_is_not_silently_replaced(tmp_path):
    manager,_=configured(tmp_path);assert manager.stage(release(version='1.2.0'),'1.0.0').code=='staged'
    path=tmp_path/'state.json';state=json.loads(path.read_text());state['high_water_version']='1.0.0'
    path.write_text(json.dumps(state));before=path.read_bytes()
    assert manager.stage(release(version='1.1.0'),'1.0.0').code=='failed'
    assert path.read_bytes()==before


def test_https_reader_checks_length_encoding_and_total_limit():
    class Response:
        status=200
        headers={}
        blocks=[]
        def __enter__(self):return self
        def __exit__(self,*args):pass
        def geturl(self):return URL
        def read(self,size):return self.blocks.pop(0) if self.blocks else b''
    class Opener:
        def __init__(self,response):self.response=response
        def open(self,*args,**kwargs):return self.response
    reader=HTTPSReader(https_origin(URL))
    for headers,blocks in [({'Content-Length':'100'},[b'123']),
                           ({'Content-Encoding':'gzip'},[b'12']),({},[b'123456']),
                           ({'Content-Length':'4'},[b'12'])]:
        response=Response();response.headers=headers;response.blocks=blocks
        reader.opener=Opener(response)
        with pytest.raises(UpdateError):list(reader.chunks(URL,5))
