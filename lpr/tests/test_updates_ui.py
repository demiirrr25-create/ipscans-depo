import os,time
os.environ.setdefault('QT_QPA_PLATFORM','offscreen')
from dataclasses import asdict
import json
from threading import Event
from pathlib import Path
import pytest
from PySide6.QtWidgets import QApplication,QDialog
from lpr.operations import Operations
from lpr.updates import UpdatePolicy,ReleaseManifest,UpdateStatus,UpdateError
from lpr.updates_ui import UpdatesPanel,UpdatePolicyDialog,read_policy,write_policy

PIN='a'*64
PRODUCT='IPScans LPR Pro Preview'
URL='https://updates.example.test/manifest.json'


@pytest.fixture
def station(tmp_path):
    app=QApplication.instance() or QApplication([])
    ops=Operations(tmp_path/'station.db');ops.setup('admin','a secure update test password')
    session=ops.login('admin','a secure update test password')
    yield app,ops,session,tmp_path
    ops.close();app.processEvents()


def policy():return UpdatePolicy(URL,'preview',PIN,PRODUCT)
def manifest():return ReleaseManifest('0.5.0.dev5','preview','https://updates.example.test/setup.exe','b'*64,100)


def finish(panel):
    deadline=time.monotonic()+2
    while panel.busy() and time.monotonic()<deadline:
        panel.poll();time.sleep(.005)
    panel.poll();assert not panel.busy()


def test_default_policy_is_disabled_and_does_not_invent_endpoint(station):
    app,ops,session,path=station;calls=[]
    panel=UpdatesPanel(ops,session,path,'0.5.0.dev4',manager_factory=lambda *args:calls.append(args))
    try:
        assert not panel.check_button.isEnabled() and not panel.stage_button.isEnabled()
        assert panel.policy_button.isEnabled() and panel.policy is None
        panel.begin('check');assert calls==[]
        assert not (path/'update-policy.json').exists()
    finally:panel.close()


def test_local_policy_is_atomic_strict_and_separate_from_downloaded_manifest(station):
    _,_,_,path=station;write_policy(path,policy())
    assert read_policy(path,PRODUCT)==policy()
    assert not list(path.glob('.update-policy-*'))
    fields={'schema':1,**asdict(policy()),'downloaded_signer':'b'*64}
    (path/'update-policy.json').write_text(json.dumps(fields))
    with pytest.raises(UpdateError):read_policy(path,PRODUCT)
    write_policy(path,policy())
    with pytest.raises(UpdateError):read_policy(path,'Different product')


def test_async_check_and_stage_display_verified_metadata_without_execution(station):
    app,ops,session,path=station;write_policy(path,policy());gate=Event();calls=[]
    class Manager:
        def check(self,version):gate.wait(2);calls.append(('check',version));return UpdateStatus('update_available','Found',manifest())
        def stage(self,candidate,version):calls.append(('stage',candidate.version));return UpdateStatus('staged','Verified',candidate,path/'verified-updates'/'b.exe')
        def rollback_candidate(self):calls.append(('previous',));return UpdateStatus('no_previous','No previous')
    panel=UpdatesPanel(ops,session,path,'0.5.0.dev4',manager_factory=lambda *args:Manager())
    try:
        panel.check_button.click();assert panel.busy() and not panel.policy_button.isEnabled()
        app.processEvents();gate.set();finish(panel)
        assert panel.stage_button.isEnabled() and 'henüz doğrulanmadı' in panel.details.text()
        panel.stage_button.click();finish(panel)
        assert panel.available is None and panel.verified_path.name=='b.exe'
        assert 'Kurulum başlatılmadı' in panel.details.text() and panel.folder_button.isEnabled()
        panel.previous_button.click();finish(panel)
        assert panel.verified_path is None and not panel.folder_button.isEnabled()
        assert calls==[('check','0.5.0.dev4'),('stage','0.5.0.dev5'),('previous',)]
    finally:gate.set();panel.close()


def test_operator_has_no_update_management_actions(station):
    _,ops,admin,path=station;write_policy(path,policy());calls=[]
    ops.add_user(admin,'operator','operator secure update password','operator')
    session=ops.login('operator','operator secure update password')
    panel=UpdatesPanel(ops,session,path,'0.5.0.dev4',manager_factory=lambda *args:calls.append(args))
    try:
        assert not panel.policy_button.isEnabled() and not panel.check_button.isEnabled()
        panel.begin('check');assert calls==[]
    finally:panel.close()


def test_session_expiry_cancels_worker_and_discards_result(station):
    _,ops,session,path=station;write_policy(path,policy());gate=Event();seen=[]
    class Manager:
        def check(self,version):gate.wait(2);return UpdateStatus('update_available','Found',manifest())
    def factory(directory,trust,cancel):seen.append(cancel);return Manager()
    panel=UpdatesPanel(ops,session,path,'0.5.0.dev4',manager_factory=factory)
    try:
        panel.begin('check');ops.logout(session);panel.poll()
        assert panel.cancel.is_set() and not panel.policy_button.isEnabled()
        gate.set();finish(panel)
        assert panel.available is None and panel.verified_path is None and panel.details.text()==''
    finally:gate.set();panel.close()


def test_close_does_not_leave_worker_touching_destroyed_qt_widgets(station):
    app,ops,session,path=station;write_policy(path,policy());gate=Event()
    class Manager:
        def check(self,version):gate.wait(2);return UpdateStatus('update_available','Found',manifest())
    panel=UpdatesPanel(ops,session,path,'0.5.0.dev4',manager_factory=lambda *args:Manager())
    panel.begin('check');panel.close()
    assert panel.closed and panel.cancel.is_set() and not panel.timer.isActive()
    gate.set();panel.worker.join(2);app.processEvents()
    assert not panel.worker.is_alive() and panel.results.empty()


def test_admin_policy_editor_writes_only_explicit_configuration(station,monkeypatch):
    _,ops,session,path=station;calls=[]
    panel=UpdatesPanel(ops,session,path,'0.5.0.dev4',manager_factory=lambda *args:calls.append(args))
    def accept(dialog):dialog.policy=policy();return QDialog.DialogCode.Accepted
    monkeypatch.setattr(UpdatePolicyDialog,'exec',accept)
    try:
        panel.configure()
        assert panel.policy==policy() and panel.check_button.isEnabled()
        assert calls==[] and read_policy(path,PRODUCT)==policy()
        assert any(row['action']=='update_policy_configuration_requested' for row in ops.audit(session))
    finally:panel.close()
