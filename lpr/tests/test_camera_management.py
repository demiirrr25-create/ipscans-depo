import os
os.environ.setdefault('QT_QPA_PLATFORM','offscreen')
from PySide6.QtWidgets import QApplication,QDialog
from lpr.operations import Operations
from lpr.camera_management import CameraManagementPanel,CameraEditDialog


def test_camera_table_callbacks_and_rename_refresh(tmp_path,monkeypatch):
    app=QApplication.instance() or QApplication([])
    ops=Operations(tmp_path/'station.sqlite3')
    ops.setup('admin','a secure camera test password')
    session=ops.login('admin','a secure camera test password')
    ops.save_camera(session,'gate','Gate','rtsp://192.0.2.1/live','entry')
    called=[]
    panel=CameraManagementPanel(ops,session,on_add=lambda:called.append('add'),
        on_discover=lambda:called.append('discover'),on_calibrate=lambda key:called.append(key),
        on_changed=lambda:called.append('changed'))
    try:
        panel.table.selectRow(0);assert panel.selected_camera_id()=='gate'
        panel.calibrate.click();assert called==['gate']
        def accept(dialog):
            dialog.name.setText('Site Ana Giriş');dialog.location.setText('A Blok')
            return QDialog.DialogCode.Accepted
        monkeypatch.setattr(CameraEditDialog,'exec',accept)
        panel.edit.click()
        assert panel.table.item(0,0).text()=='Site Ana Giriş'
        assert panel.table.item(0,3).text()=='A Blok'
        assert called==['gate','changed']
        panel.store.archive(session,'gate');panel.refresh()
        assert panel.table.rowCount()==0
        panel.archived.setChecked(True);panel.table.selectRow(0)
        assert not panel.calibrate.isEnabled() and panel.restore_button.isEnabled()
        panel.restore_button.click()
        assert panel.table.item(0,6).text()=='Pasif'
    finally:
        panel.close();ops.close();app.processEvents()
