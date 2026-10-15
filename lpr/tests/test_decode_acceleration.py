"""Negotiation/unit tests; hardware selection below is simulated, not a GPU claim."""
import os
import sys
import time
from types import SimpleNamespace
import numpy as np
import pytest
from lpr.camera import CameraConfig,CameraWorker,opencv_capture,decoder_report
from lpr.isolated_capture import IsolatedCapture,NativeDiagnostics


class FakeCV:
    CAP_FFMPEG=1900;CAP_PROP_OPEN_TIMEOUT_MSEC=53;CAP_PROP_READ_TIMEOUT_MSEC=54
    CAP_PROP_HW_ACCELERATION=50;CAP_PROP_BACKEND=42;CAP_PROP_FOURCC=6
    VIDEO_ACCELERATION_NONE=0;VIDEO_ACCELERATION_ANY=1;VIDEO_ACCELERATION_D3D11=2
    VIDEO_ACCELERATION_VAAPI=3;VIDEO_ACCELERATION_MFX=4
    def __init__(self,modes):self.modes=list(modes);self.calls=[];self.released=[]
    def VideoCapture(self,source,backend,params):
        self.calls.append((backend,list(params)))
        opened,actual=self.modes.pop(0);parent=self
        class Capture:
            def isOpened(self):return opened
            def get(self,key):return {50:actual,42:1900,6:int.from_bytes(b'h264','little')}.get(key,0)
            def read(self):return True,np.zeros((4,6,3),dtype=np.uint8)
            def release(self):parent.released.append(actual)
        return Capture()


def test_auto_open_failure_falls_back_once_with_bounded_timeouts(monkeypatch):
    cv=FakeCV([(False,1),(True,0)]);monkeypatch.setitem(sys.modules,'cv2',cv)
    cap=opencv_capture('rtsp://credential-must-not-leak@example.invalid/test',decoder_mode='auto')
    assert cap.isOpened() and len(cv.calls)==2 and cv.released==[1]
    assert cv.calls[0][1]==[53,3000,54,3000,50,1]
    assert cv.calls[1][1]==[53,3000,54,3000,50,0]
    assert cap.decoder_info['actual']=='software' and cap.decoder_info['fallback_reason']=='hardware_open_failed'
    assert not cap.decoder_info['hardware_active']
    cap.release()


@pytest.mark.parametrize('reported,expected,active',[(1,'unknown',False),(0,'software',False),(2,'d3d11',True)])
def test_request_flag_is_not_hardware_evidence(monkeypatch,reported,expected,active):
    cv=FakeCV([(True,reported)]);monkeypatch.setitem(sys.modules,'cv2',cv)
    cap=opencv_capture('not-logged',decoder_mode='auto')
    assert cap.decoder_info['actual']==expected and not cap.decoder_info['hardware_active']
    assert cap.read()[0]
    assert cap.decoder_info['hardware_active'] is active
    assert cap.decoder_info['codec']=='h264'
    cap.release()


def test_software_default_never_requests_any_and_missing_api_is_unknown(monkeypatch):
    cv=FakeCV([(True,0)]);monkeypatch.setitem(sys.modules,'cv2',cv)
    cap=opencv_capture('not-logged');assert cv.calls[0][1][-2:]==[50,0]
    assert cap.decoder_info['requested']=='software';cap.release()
    bare=SimpleNamespace(CAP_FFMPEG=1900,CAP_PROP_OPEN_TIMEOUT_MSEC=53,CAP_PROP_READ_TIMEOUT_MSEC=54,VideoCapture=cv.VideoCapture)
    cv.modes=[(True,0)];monkeypatch.setitem(sys.modules,'cv2',bare)
    cap=opencv_capture('not-logged',decoder_mode='auto')
    assert cv.calls[-1][1]==[53,3000,54,3000]
    assert cap.decoder_info['actual']=='unknown' and cap.decoder_info['fallback_reason']=='hardware_api_unavailable'
    cap.release()


class DiagnosticCapture:
    def __init__(self,source):
        self.source=source
        self.decoder_info={**decoder_report('auto'),'actual':'software','evidence':'backend_property'}
    def isOpened(self):return True
    def read(self):
        os.write(2,b'[h264] error while decoding rtsp://private-user:private-password@camera.invalid\n')
        time.sleep(.08)  # Let the independent bounded diagnostic reader classify this native write.
        return False,None
    def release(self):pass


def test_native_diagnostic_category_survives_without_raw_credentials(capfd):
    cap=IsolatedCapture('private-source',max_pixels=24,factory=DiagnosticCapture,decoder_mode='auto')
    try:
        assert cap.isOpened()
        assert cap.read()==(False,None)
        assert cap.error=='codec_error' and cap.diagnostic_counts['codec_error']>=1
        assert cap.decoder_info['actual']=='software'
        assert 'private-' not in repr(cap.diagnostic_counts)+repr(cap.decoder_info)
    finally:cap.release()
    captured=capfd.readouterr()
    assert 'private-password' not in captured.err and 'private-user' not in captured.err
    assert not cap.process.is_alive()


def test_classifier_counts_only_known_categories():
    diagnostic=NativeDiagnostics()
    diagnostic.classify(b'401 Unauthorized rtsp://user:secret@example.invalid')
    diagnostic.classify(b'connection refused; overread')
    assert diagnostic.snapshot()=={'authentication_failed':1,'connection_refused':1,'codec_error':1}
    assert 'secret' not in repr(vars(diagnostic))


def test_worker_uses_cpu_retry_without_bypassing_retry_budget(monkeypatch):
    calls=[];holder={}
    class Capture:
        def __init__(self,source,**options):
            calls.append(options['decoder_mode']);self.error='decoder_failed'
            self.decoder_info={**decoder_report(options['decoder_mode']),'actual':'software'}
            self.diagnostic_counts={}
        def isOpened(self):return True
        def read(self):return False,None
        def release(self):pass
    monkeypatch.setattr('lpr.isolated_capture.IsolatedCapture',Capture)
    worker=CameraWorker(CameraConfig('rtsp://not-logged',decoder_mode='auto',max_retries=1,reconnect_seconds=.01))
    worker.start();worker.join(3)
    assert not worker.is_alive() and worker.status=='retry_exhausted'
    assert calls==['auto','software'] and worker.reconnects==1
    assert worker.last_error=='decoder_failed' and worker.decoder_info['fallback_reason']=='read_failure_cpu_retry'
    assert worker.decoder_info['requested']=='auto'


def test_unknown_exception_error_cannot_leak_camera_source():
    capture=SimpleNamespace(error='rtsp://user:password@camera.invalid')
    assert CameraWorker._capture_error(capture,'open_failed')=='open_failed'
    with pytest.raises(ValueError):CameraConfig('source',decoder_mode='cuda-guaranteed')


def test_existing_metadata_migration_and_decoder_preference_persistence(tmp_path):
    from lpr.operations import Operations
    from lpr.camera_metadata import CameraMetadata
    path=tmp_path/'camera.db';ops=Operations(path)
    ops.setup('admin','decoder metadata admin password');session=ops.login('admin','decoder metadata admin password')
    ops.save_camera(session,'gate','Gate','rtsp://private-user:private-password@192.0.2.1/live','entry')
    secret=ops.db.execute('SELECT secret FROM cameras').fetchone()[0]
    with ops.db:
        ops.db.execute('''CREATE TABLE camera_metadata(camera_id TEXT PRIMARY KEY REFERENCES cameras(id),brand TEXT DEFAULT '',
            model TEXT DEFAULT '',location TEXT DEFAULT '',host TEXT DEFAULT '',protocol TEXT DEFAULT 'RTSP',
            enabled INTEGER DEFAULT 1,mode TEXT DEFAULT 'software',archived INTEGER DEFAULT 0,updated_at REAL NOT NULL)''')
        ops.db.execute("INSERT INTO camera_metadata(camera_id,brand,updated_at) VALUES('gate','Existing brand',0)")
    store=CameraMetadata(ops)
    assert store.get(session,'gate')['decoder_mode']=='software'
    assert store.get(session,'gate')['brand']=='Existing brand'
    store.save(session,'gate',name='Gate',direction='entry',decoder_mode='auto')
    # A name-only update must not reset the independently chosen decoder.
    store.save(session,'gate',name='Renamed gate',direction='entry')
    assert store.get(session,'gate')['decoder_mode']=='auto'
    with pytest.raises(ValueError):store.save(session,'gate',name='Bad',direction='entry',decoder_mode='guaranteed-gpu')
    ops.add_user(session,'operator','decoder operator password','operator');operator=ops.login('operator','decoder operator password')
    with pytest.raises(PermissionError):store.save(operator,'gate',name='Gate',direction='entry',decoder_mode='software')
    assert ops.db.execute('SELECT secret FROM cameras').fetchone()[0]==secret
    ops.close();ops=Operations(path);session=ops.login('admin','decoder metadata admin password')
    try:assert CameraMetadata(ops).get(session,'gate')['decoder_mode']=='auto'
    finally:ops.close()


def test_camera_editor_choice_saves_requested_mode_not_hardware_claim(tmp_path,monkeypatch):
    monkeypatch.setenv('QT_QPA_PLATFORM','offscreen')
    from PySide6.QtWidgets import QApplication,QDialog
    from lpr.operations import Operations
    from lpr.camera_management import CameraManagementPanel,CameraEditDialog
    app=QApplication.instance() or QApplication([]);ops=Operations(tmp_path/'ui.db')
    ops.setup('admin','decoder editor admin password');session=ops.login('admin','decoder editor admin password')
    ops.save_camera(session,'gate','Gate','rtsp://192.0.2.1/live','entry')
    changed=[]
    panel=CameraManagementPanel(ops,session,on_add=lambda:None,on_discover=lambda:None,on_calibrate=lambda _:None,on_changed=lambda:changed.append(True))
    try:
        panel.table.selectRow(0)
        def edit(dialog):
            assert dialog.decoder_mode.currentData()=='software'
            dialog.decoder_mode.setCurrentIndex(dialog.decoder_mode.findData('auto'))
            return QDialog.DialogCode.Accepted
        monkeypatch.setattr(CameraEditDialog,'exec',edit);panel.edit.click()
        assert changed==[True] and panel.store.get(session,'gate')['decoder_mode']=='auto'
        assert panel.table.item(0,8).text()=='Otomatik'
        assert 'D3D11' not in panel.table.item(0,8).text()  # A preference is not a hardware observation.
        editor=CameraEditDialog(panel.store.get(session,'gate'))
        assert editor.decoder_mode.currentData()=='auto';editor.close()
    finally:panel.close();app.processEvents();ops.close()
