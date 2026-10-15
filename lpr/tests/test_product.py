import os
os.environ.setdefault('QT_QPA_PLATFORM','offscreen')
from PySide6.QtWidgets import QApplication
from lpr.application import ProductWindow
from lpr.operations import Operations


def test_multi_plate_results_are_saved_once_and_parking_is_separate(tmp_path,monkeypatch):
    monkeypatch.setenv('LOCALAPPDATA',str(tmp_path))
    app=QApplication.instance() or QApplication([])
    ops=Operations(tmp_path/'station.db')
    ops.setup('admin','a secure test password')
    s=ops.login('admin','a secure test password')
    window=ProductWindow(ops,s)
    d={'plate':'34ABC123','confidence':.99,'status':'recognized'}
    try:
        window.lab.consume({'source':'recorded_video','decision':d,'decisions':[d,{**d,'plate':'06AB1234'}]})
        assert len(ops.history(s))==2
        assert window.lab.table.rowCount()==2
        assert ops.parking(s)['occupied']==0
        ops.confirm_passage(s,'34ABC123','entry','Operator confirmed','one')
        window.refresh()
        assert window.parking_table.rowCount()==1
        window.switch_language(1)
        events=window.operator_pages['events']
        assert events.tabText(events.indexOf(window.widgets['parking'][0]))=='Parking'
        assert window.tabs.count()==5
        window.lab.consume({'source':'recorded_video','decisions':[{**d,'status':'suppressed'}]})
        assert len(ops.history(s))==2
    finally:
        window.close();app.processEvents();ops.close()
