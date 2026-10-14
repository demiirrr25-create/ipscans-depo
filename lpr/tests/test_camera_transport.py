import sqlite3
from unittest.mock import Mock,patch
import numpy as np
import pytest
from lpr.camera import CameraConfig,CameraWorker
from lpr.operations import Operations


def test_auto_falls_back_only_after_failure_and_decodes_udp():
    attempts=[]
    worker=CameraWorker(CameraConfig('private',transport='auto',reconnect_seconds=.001,max_retries=2))
    def capture(source,**options):
        attempts.append(options['transport'])
        cap=Mock();cap.isOpened.return_value=options['transport']=='udp'
        reads=[0]
        def read():
            reads[0]+=1
            if reads[0]>1:worker.stop();return False,None
            return True,np.zeros((8,12,3),dtype=np.uint8)
        cap.read.side_effect=read
        return cap
    with patch('lpr.isolated_capture.IsolatedCapture',side_effect=capture):
        worker.start();worker.join(2)
    assert attempts==['tcp','udp'] and worker.resolution==(12,8)
    assert worker.status=='stopped' and worker.last_error is None


@pytest.mark.parametrize('transport,expected',[('auto',['tcp','udp','tcp']),('udp',['udp']*3),('tcp',['tcp']*3)])
def test_failed_transport_retries_are_bounded(transport,expected):
    attempts=[]
    def capture(source,**options):
        attempts.append(options['transport'])
        cap=Mock();cap.isOpened.return_value=False;return cap
    worker=CameraWorker(CameraConfig('private',transport=transport,reconnect_seconds=.001,max_retries=2))
    with patch('lpr.isolated_capture.IsolatedCapture',side_effect=capture):
        worker.start();worker.join(2)
    assert attempts==expected and worker.status=='retry_exhausted'


def test_legacy_camera_migration_preserves_secret_and_direction(tmp_path):
    path=tmp_path/'old.db';db=sqlite3.connect(path)
    db.execute('CREATE TABLE cameras(id TEXT PRIMARY KEY,name TEXT NOT NULL,secret TEXT NOT NULL,direction TEXT NOT NULL)')
    db.execute("INSERT INTO cameras VALUES('gate','Gate','encrypted-existing','exit')")
    db.commit();db.close()
    for _ in range(2):
        ops=Operations(path)
        assert tuple(ops.db.execute('SELECT secret,direction,transport FROM cameras').fetchone())==('encrypted-existing','exit','tcp')
        ops.close()


def test_transport_roundtrip_and_permissions(tmp_path):
    path=tmp_path/'camera.db';ops=Operations(path)
    ops.setup('admin','a secure test password');admin=ops.login('admin','a secure test password')
    ops.save_camera(admin,'gate','Gate','rtsp://user:secret@192.0.2.1/live','entry','auto')
    assert ops.cameras(admin)[0]['transport']=='auto'
    ops.add_user(admin,'operator','another secure password','operator')
    operator=ops.login('operator','another secure password')
    with pytest.raises(PermissionError):ops.save_camera(operator,'gate','Gate','rtsp://192.0.2.1/live','entry','udp')
    with pytest.raises(ValueError):ops.save_camera(admin,'gate','Gate','rtsp://192.0.2.1/live','entry','invalid')
    ops.close();ops=Operations(path)
    admin=ops.login('admin','a secure test password')
    assert ops.camera_transport(admin,'gate')=='auto'
    assert ops.camera_source(admin,'gate')=='rtsp://user:secret@192.0.2.1/live'
    ops.close()


def test_connection_dialog_saves_transport_only_after_confirmation(tmp_path,monkeypatch):
    monkeypatch.setenv('QT_QPA_PLATFORM','offscreen')
    from PySide6.QtWidgets import QApplication,QDialog
    from lpr.application import ProductWindow
    app=QApplication.instance() or QApplication([])
    ops=Operations(tmp_path/'ui.db')
    ops.setup('admin','a secure test password');admin=ops.login('admin','a secure test password')
    window=ProductWindow(ops,admin)
    try:
        with patch('lpr.preview.PreviewDialog') as dialog:
            dialog.return_value.exec.return_value=QDialog.DialogCode.Rejected
            window.test_and_save_camera('gate','Gate','rtsp://192.0.2.1/live','entry','udp')
            assert ops.cameras(admin)==[]
            assert dialog.call_args.kwargs['transport']=='udp'
            dialog.return_value.exec.return_value=QDialog.DialogCode.Accepted
            window.test_and_save_camera('gate','Gate','rtsp://192.0.2.1/live','entry','udp')
            assert ops.camera_transport(admin,'gate')=='udp'
            assert window.camera_table.item(0,3).text()=='UDP'
    finally:window.close();app.processEvents();ops.close()
