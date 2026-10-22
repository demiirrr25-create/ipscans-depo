import json
import urllib.error
import urllib.request
import uuid

import pytest

from lpr.local_panel import LocalPanel
from lpr.operations import Operations
from lpr.event_service import EventService


@pytest.fixture
def panel(tmp_path):
    ops = Operations(tmp_path/'ledger.db')
    ops.setup('admin', 'a secure test password')
    session = ops.login('admin', 'a secure test password')
    ops.add_user(session, 'audit', 'a secure audit password', 'auditor')
    ops.save_camera(session, 'a', 'Gate A', 'rtsp://secret:password@192.0.2.1/a', 'entry')
    event = dict(event_id=str(uuid.uuid4()), at=ops.clock(), camera='a', line_id='line',
                 direction='entry', track_id='1', vehicle_type='car', plate='34ABC123', confidence=.95,
                 status='recognized', evidence_frames=4, frame_sequence=1)
    EventService(ops).persist(session, event)
    service = LocalPanel(ops.path)
    yield service, ops, session, event
    service.close(); ops.close()


def request(panel, path, body=None, cookie='', csrf='', origin=None, host=None):
    headers = {'Origin': panel.url if origin is None else origin,
               'Cookie': cookie, 'X-CSRF-Token': csrf, 'Content-Type': 'application/json'}
    if host:
        headers['Host'] = host
    req = urllib.request.Request(panel.url+'/api/'+path,
        data=json.dumps(body).encode() if body is not None else None, headers=headers)
    try:
        response = urllib.request.urlopen(req, timeout=5)
    except urllib.error.HTTPError as error:
        response = error
    with response:
        return response.status, json.load(response), response.headers


def login(service, username='admin', password='a secure test password'):
    status, data, headers = request(service, 'login', {'username': username, 'password': password})
    assert status == 200
    return headers['Set-Cookie'].split(';')[0], data['csrf']


def test_local_boundary_auth_csrf_and_redaction(panel):
    service, *_ = panel
    assert request(service, 'state')[0] == 401
    assert request(service, 'state', host='attacker.example')[0] == 403
    assert request(service, 'login', {}, origin='https://attacker.example')[0] == 403
    cookie, csrf = login(service)
    status, state, _ = request(service, 'state', cookie=cookie)
    assert status == 200 and len(state['events']) == 1
    assert 'rtsp://' not in json.dumps(state) and 'secret' not in json.dumps(state)
    assert request(service, 'settings', {'enabled': True, 'model': 'gemma3:4b'}, cookie=cookie)[0] == 403
    assert request(service, 'logout', {}, cookie, csrf)[0] == 200
    assert request(service, 'state', cookie=cookie)[0] == 401


def test_disabled_ai_missing_evidence_and_role_enforcement(panel, monkeypatch):
    service, ops, session, event = panel
    starts = []
    monkeypatch.setattr(service.ai, 'start', lambda *args: starts.append(args))
    cookie, csrf = login(service)
    assert request(service, 'prepare', {}, cookie, csrf)[0] == 400
    assert not starts
    assert request(service, 'settings', {'enabled': True, 'model': 'gemma3:4b'}, cookie, csrf)[0] == 200
    assert 'AI etkin' in request(service, 'state', cookie=cookie)[1]['ai']['message']
    assert request(service, 'review', {'id': event['event_id']}, cookie, csrf)[0] == 400
    assert not starts
    audit, token = login(service, 'audit', 'a secure audit password')
    assert request(service, 'settings', {'enabled': False, 'model': 'gemma3:4b'}, audit, token)[0] == 401
    assert request(service, 'correct', {'id': event['event_id'], 'plate': '06AB123', 'reason': 'verified'}, audit, token)[0] == 401
    assert request(service, 'correct', {'id': event['event_id'], 'plate': '06AB123', 'reason': 'Görselden doğrulandı'}, cookie, csrf)[0] == 200
    details = EventService(ops).details(session, event['event_id'])
    assert details['plate'] == '34ABC123'
    assert details['corrections'][0]['plate'] == '06AB123'
    assert request(service, 'settings', {'enabled': False, 'model': 'gemma3:4b'}, cookie, csrf)[0] == 200
    assert service.ai.cancel.is_set()
