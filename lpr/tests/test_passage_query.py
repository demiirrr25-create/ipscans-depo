import os
os.environ.setdefault('QT_QPA_PLATFORM','offscreen')
import uuid
import pytest
from lpr.operations import Operations
from lpr.passage_query import PassageFilter


@pytest.fixture
def ledger(tmp_path):
    ops=Operations(tmp_path/'ledger.db',clock=lambda:1800000000.)
    ops.setup('admin','a secure test password');session=ops.login('admin','a secure test password')
    ops.save_camera(session,'a','Gate A','rtsp://192.0.2.1/a','entry')
    ops.save_camera(session,'b','Gate B','rtsp://192.0.2.2/b','exit')
    def add(index,**changes):
        event=dict(event_id=str(uuid.UUID(int=index+1)),at=1799990000.+index,camera='a',line_id='line',
                   direction='entry',track_id=str(index),vehicle_type='car',plate='34ABC123',confidence=.95,
                   status='recognized',evidence_frames=4,frame_sequence=index)
        event.update(changes);ops.record_vehicle_passage(session,event)
        return event
    yield ops,session,add
    ops.close()


def test_combined_filters_and_exclusive_end(ledger):
    ops,session,add=ledger
    add(0);add(1,camera='b');add(2,direction='exit');add(3,vehicle_type='truck')
    add(4,plate='',confidence=0,status='unread',evidence_frames=0)
    rows=ops.passage_page(session,PassageFilter(plate='34 ABC',camera='a',direction='entry',vehicle_type='car',min_confidence=.9))['rows']
    assert len(rows)==1 and rows[0]['frame_sequence']==0
    assert len(ops.passage_page(session,PassageFilter(start=1799990001,end=1799990003))['rows'])==2
    assert ops.passage_page(session,PassageFilter(camera="' OR 1=1 --"))['rows']==[]


def test_equal_timestamp_pagination_excludes_new_inserts(ledger):
    ops,session,add=ledger
    for index in range(7):add(index,at=1799990000.)
    first=ops.passage_page(session,limit=3)
    add(20,at=1799990000.)
    second=ops.passage_page(session,limit=3,before=first['next_cursor'],snapshot=first['snapshot'])
    third=ops.passage_page(session,limit=3,before=second['next_cursor'],snapshot=first['snapshot'])
    rows=first['rows']+second['rows']+third['rows']
    assert len(rows)==7 and len({row['event_id'] for row in rows})==7
    assert third['next_cursor'] is None
    assert len(ops.passage_page(session)['rows'])==8


def test_snapshot_excludes_insert_after_all_old_rows_deleted(ledger):
    ops,session,add=ledger
    add(0)
    first=ops.passage_page(session)
    with ops.db:ops.db.execute('DELETE FROM vehicle_passages')
    add(1)
    assert ops.passage_page(session,snapshot=first['snapshot'])['rows']==[]
    assert len(ops.passage_page(session)['rows'])==1


@pytest.mark.parametrize('filters',[PassageFilter(start=10,end=9),PassageFilter(min_confidence=float('nan')),
    PassageFilter(direction='other'),PassageFilter(min_confidence=.9,max_confidence=.2)])
def test_invalid_filters_rejected(ledger,filters):
    ops,session,_=ledger
    with pytest.raises(ValueError):ops.passage_page(session,filters)


def test_browser_filters_navigation_and_session_expiry(ledger):
    from PySide6.QtWidgets import QApplication
    from lpr.passage_browser import PassageBrowser
    app=QApplication.instance() or QApplication([])
    ops,session,add=ledger
    for index in range(102):add(index)
    browser=PassageBrowser(ops,session);browser.latest()
    assert browser.table.rowCount()==100 and browser.forward.isEnabled()
    browser.next_page();assert browser.table.rowCount()==2 and browser.back.isEnabled()
    browser.previous_page();assert browser.table.rowCount()==100
    browser.plate.setText('06');browser.apply_filters();assert browser.table.rowCount()==0
    browser.reset_filters();assert browser.table.rowCount()==100
    ops.logout(session);browser.latest()
    assert browser.table.rowCount()==0 and not browser.forward.isEnabled()
    browser.close()
