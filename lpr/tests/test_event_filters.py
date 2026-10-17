import os
os.environ.setdefault('QT_QPA_PLATFORM','offscreen')
import csv
from zipfile import ZipFile
from xml.etree import ElementTree as ET

import pytest
from PySide6.QtWidgets import QApplication

from test_passage_query import ledger
from lpr.event_service import EventService
from lpr.passage_browser import PassageBrowser
from lpr.passage_export import export_passages_csv,export_passages_xlsx,filter_labels
from lpr.passage_query import PassageFilter
from lpr.registry import Registry


@pytest.fixture
def events(ledger):
    ops,session,add=ledger
    registry=Registry(ops);reviews=EventService(ops)
    block_a=registry.save_block(session,'A Blok');unit_a=registry.save_unit(session,block_a,'24')
    block_b=registry.save_block(session,'B Blok');unit_b=registry.save_unit(session,block_b,'12')
    one=registry.save_resident(session,'Deniz','Yılmaz',unit_id=unit_a)
    two=registry.save_resident(session,'Ece','Yılmaz',unit_id=unit_a)
    three=registry.save_resident(session,'Ada','Örnek',unit_id=unit_b)
    registry.save_vehicle(session,'34ABC123',owner_ids=[one,two,three])
    registry.save_vehicle(session,'06AB1234',owner_ids=[three],status='visitor')
    registry.save_vehicle(session,'35AB1234',owner_ids=[one],status='unknown')
    known=add(0);visitor=add(1,plate='06AB1234',camera='b',direction='exit')
    unknown=add(2,plate='41AA111')
    low=add(3,status='review',confidence=.5,evidence_frames=1)
    corrected=add(4,plate='34ABC124',status='review',confidence=.5,evidence_frames=1)
    unread=add(5,plate='',status='unread',confidence=0,evidence_frames=0)
    explicit_unknown=add(6,plate='35AB1234')
    reviews.correct(session,corrected['event_id'],'06AB1234','First manual review')
    reviews.correct(session,corrected['event_id'],'34ABC123','Latest corrected plate')
    return dict(ops=ops,session=session,registry=registry,reviews=reviews,a=block_a,ua=unit_a,b=block_b,ub=unit_b,
        known=known,visitor=visitor,unknown=unknown,low=low,corrected=corrected,unread=unread,explicit_unknown=explicit_unknown)


def identities(page):return {row['event_id'] for row in page['rows']}


def test_registration_requires_recognized_or_manually_reviewed_evidence(events):
    e=events;ops,session=e['ops'],e['session']
    registered=ops.passage_page(session,PassageFilter(registration='registered'))
    assert identities(registered)=={e[key]['event_id'] for key in ('known','visitor','corrected')}
    unknown=ops.passage_page(session,PassageFilter(registration='unknown'))
    assert identities(unknown)=={e[key]['event_id'] for key in ('unknown','explicit_unknown')}
    review=ops.passage_page(session,PassageFilter(registration='review'))
    assert identities(review)=={e[key]['event_id'] for key in ('low','unread')}
    assert all(row['registry_vehicle_id'] is None for row in review['rows']+unknown['rows'])


def test_latest_correction_drives_search_association_and_reports_without_mutating_raw_plate(events):
    e=events;ops,session=e['ops'],e['session']
    filters=PassageFilter(plate='34 ABC 123',registration='registered',block_id=e['a'],unit_id=e['ua'])
    rows=ops.passage_page(session,filters)['rows']
    assert {row['event_id'] for row in rows}=={e['known']['event_id'],e['corrected']['event_id']}
    corrected=next(row for row in rows if row['event_id']==e['corrected']['event_id'])
    assert corrected['plate']=='34ABC123' and corrected['original_plate']=='34ABC124'
    assert corrected['corrected_plate']=='34ABC123'
    assert not ops.passage_page(session,PassageFilter(plate='34ABC124'))['rows']
    assert ops.db.execute('SELECT plate FROM vehicle_passages WHERE event_id=?',(corrected['event_id'],)).fetchone()[0]=='34ABC124'
    report=ops.passage_report(session,filters)
    assert report['total']==dict(total=2,entries=2,exits=0,recognized=1,review=1,unread=0)
    assert sum(row['total'] for row in report['daily'])==2


def test_location_conditions_use_same_owner_and_do_not_duplicate_multi_owner_events(events):
    e=events;ops,session=e['ops'],e['session']
    assert not ops.passage_page(session,PassageFilter(block_id=e['a'],unit_id=e['ub']))['rows']
    filters=PassageFilter(block_id=e['b'],unit_id=e['ub'])
    page=ops.passage_page(session,filters,limit=1)
    rows=list(page['rows'])
    while page['next_cursor']:
        page=ops.passage_page(session,filters,limit=1,before=page['next_cursor'],snapshot=page['snapshot']);rows+=page['rows']
    assert len(rows)==3 and len({row['event_id'] for row in rows})==3
    assert ops.passage_report(session,filters)['total']['total']==3


def test_csv_xlsx_export_exactly_applied_registry_filters_and_latest_plate(events,tmp_path):
    e=events;ops,session=e['ops'],e['session']
    filters=PassageFilter(registration='registered',block_id=e['a'],unit_id=e['ua'],camera='a',direction='entry',
        start=1799990000,end=1799990005)
    csv_path=tmp_path/'events.csv';xlsx_path=tmp_path/'events.xlsx'
    assert export_passages_csv(ops,session,filters,csv_path)==2
    with csv_path.open(encoding='utf-8-sig',newline='') as stream:rows=list(csv.DictReader(stream))
    assert {row['event_id'] for row in rows}=={e['known']['event_id'],e['corrected']['event_id']}
    assert {row['plate'] for row in rows}=={'34ABC123'}
    assert export_passages_xlsx(ops,session,filters,xlsx_path)==2
    ns={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
    with ZipFile(xlsx_path) as archive:
        details=ET.fromstring(archive.read('xl/worksheets/sheet2.xml'))
        for cell in ('G2','G3'):assert details.find(f'.//s:c[@r="{cell}"]//s:t',ns).text=='34ABC123'
        summary=ET.fromstring(archive.read('xl/worksheets/sheet1.xml'))
        assert summary.find('.//s:c[@r="B6"]/s:v',ns).text=='2'
    labels=dict(filter_labels(filters))
    assert labels['Vehicle registration']=='registered' and labels['Block ID']==str(e['a']) and labels['Unit ID']==str(e['ua'])


def test_browser_filters_corrected_plate_and_does_not_show_low_confidence_location(events):
    app=QApplication.instance() or QApplication([])
    e=events;browser=PassageBrowser(e['ops'],e['session']);browser.latest()
    low=next(index for index in range(browser.table.rowCount()) if browser.table.item(index,8).text()==e['low']['event_id'])
    assert browser.table.item(low,9).text()=='Eşleştirme bekliyor'
    assert browser.table.item(low,10).text()=='—' and browser.table.item(low,11).text()=='—'
    browser.registration.setCurrentIndex(browser.registration.findData('registered'))
    browser.block.setCurrentIndex(browser.block.findData(e['a']))
    browser.unit.setCurrentIndex(browser.unit.findData(e['ua']))
    browser.apply_filters()
    assert browser.table.rowCount()==2
    corrected=next(index for index in range(2) if browser.table.item(index,8).text()==e['corrected']['event_id'])
    assert browser.table.item(corrected,5).text()=='34ABC123'
    assert '34ABC124' in browser.table.item(corrected,5).toolTip()
    assert 'Düzeltilmiş' in browser.table.item(corrected,7).text()
    assert browser.filters.block_id==e['a'] and browser.filters.unit_id==e['ua']
    browser.reset_filters();assert browser.table.rowCount()==7
    browser.close();app.processEvents()


def test_filters_remain_readable_but_export_role_is_enforced(events,tmp_path):
    e=events;ops=e['ops']
    ops.add_user(e['session'],'operator','operator filter test password','operator')
    operator=ops.login('operator','operator filter test password')
    filters=PassageFilter(registration='registered',block_id=e['a'])
    assert len(ops.passage_page(operator,filters)['rows'])==2
    with pytest.raises(PermissionError):export_passages_csv(ops,operator,filters,tmp_path/'denied.csv')
    assert not (tmp_path/'denied.csv').exists()


def test_old_ledger_without_registry_or_review_schema_has_safe_empty_location_result(ledger):
    ops,session,add=ledger;add(0)
    assert ops.passage_page(session,PassageFilter(block_id=1))['rows']==[]
    assert ops.passage_report(session,PassageFilter(unit_id=1))['total']['total']==0
    assert len(ops.passage_page(session,PassageFilter(registration='unknown'))['rows'])==1


@pytest.mark.parametrize('filters',[PassageFilter(registration="' OR 1=1 --"),PassageFilter(block_id='1'),
    PassageFilter(block_id=True),PassageFilter(unit_id=-1)])
def test_invalid_registry_filters_rejected(ledger,filters):
    ops,session,_=ledger
    with pytest.raises(ValueError):ops.passage_page(session,filters)
