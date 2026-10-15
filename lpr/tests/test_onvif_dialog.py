import os,time
os.environ.setdefault('QT_QPA_PLATFORM','offscreen')
from threading import Event
from PySide6.QtWidgets import QApplication,QDialog
from lpr.onvif import MediaProfile
from lpr.onvif_dialog import OnvifDialog


def wait_result(dialog):
    deadline=time.monotonic()+2
    while dialog.busy and time.monotonic()<deadline:
        dialog.poll();time.sleep(.01)
    assert not dialog.busy


def test_profile_query_is_async_and_uri_requires_selection():
    app=QApplication.instance() or QApplication([])
    gate=Event()
    class Client:
        def __init__(self,*args,**kwargs):pass
        def profiles(self):gate.wait(2);return [MediaProfile('main','Main','H264',1920,1080),MediaProfile('sub','Sub','H264',640,360)]
        def stream_uri(self,profile):return 'rtsp://192.0.2.1/'+profile.token
    dialog=OnvifDialog(client_factory=Client)
    try:
        dialog.find_profiles()
        assert dialog.busy and not dialog.select.isEnabled() and dialog.source is None
        app.processEvents();gate.set();wait_result(dialog)
        assert dialog.choice.count()==2 and dialog.select.isEnabled()
        dialog.choice.setCurrentIndex(1);dialog.select_profile();wait_result(dialog)
        assert dialog.result()==QDialog.DialogCode.Accepted and dialog.source=='rtsp://192.0.2.1/sub'
    finally:gate.set();dialog.close();app.processEvents()


def test_endpoint_edit_invalidates_old_profiles():
    app=QApplication.instance() or QApplication([])
    dialog=OnvifDialog()
    dialog.client=object();dialog.profiles=[MediaProfile('main','Main','H264',1920,1080)]
    dialog.choice.addItem('Main');dialog.select.setEnabled(True)
    dialog.port.setValue(2020)
    assert dialog.client is None and not dialog.profiles and not dialog.select.isEnabled()
    dialog.reject();app.processEvents()


def test_discovered_device_requires_selection_and_clears_previous_credentials():
    from lpr.discovery import DiscoveredCamera
    app=QApplication.instance() or QApplication([])
    dialog=OnvifDialog();dialog.username.setText('old-user');dialog.password.setText('old-password')
    dialog.results.put((True,('devices',[DiscoveredCamera('id','Test','http://192.0.2.1:2020/custom/device')])))
    dialog.poll()
    assert dialog.host.text()=='' and dialog.client is None
    dialog.use_discovered()
    assert dialog.host.text()=='192.0.2.1' and dialog.port.value()==2020 and dialog.path.text()=='/custom/device'
    assert dialog.password.text()==dialog.username.text()=='' and not dialog.select.isEnabled()
    dialog.reject();app.processEvents()
