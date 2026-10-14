import csv
import pytest
from test_passage_query import ledger
from lpr.passage_query import PassageFilter
from lpr.passage_export import export_passages_csv,csv_text


def test_report_counts_status_direction_and_utc_groups(ledger):
    ops,session,add=ledger
    add(0);add(1,direction='exit',camera='b')
    add(2,at=1799990000.-86400,status='review',confidence=.5,evidence_frames=1)
    add(3,plate='',status='unread',confidence=0,evidence_frames=0)
    report=ops.passage_report(session)
    assert report['total']==dict(total=4,entries=3,exits=1,recognized=2,review=1,unread=1)
    assert len(report['daily'])==2
    assert sum(row['total'] for row in report['hourly'])==4
    assert len(report['cameras'])==2
    assert ops.passage_report(session,PassageFilter(camera='b'))['total']['total']==1


def test_csv_exports_beyond_one_page_and_escapes_spreadsheet_formulas(ledger,tmp_path):
    ops,session,add=ledger
    for i in range(503):add(i,line_id=' =1+1')
    path=tmp_path/'passages.csv'
    assert export_passages_csv(ops,session,PassageFilter(),path)==503
    with path.open(encoding='utf-8-sig',newline='') as stream:rows=list(csv.DictReader(stream))
    assert len(rows)==503 and len({row['event_id'] for row in rows})==503
    assert rows[0]['line_id']=="' =1+1"
    assert rows[0]['at_utc'].endswith('+00:00')
    assert any(row['action']=='passage_export_completed' for row in ops.audit(session))


def test_export_limit_keeps_existing_file_and_removes_temporary(ledger,tmp_path):
    ops,session,add=ledger
    add(0);add(1)
    path=tmp_path/'passages.csv';path.write_text('existing')
    with pytest.raises(ValueError):export_passages_csv(ops,session,PassageFilter(),path,max_rows=1)
    assert path.read_text()=='existing'
    assert not list(tmp_path.glob('.lpr-report-*'))
    assert ops.audit(session)[0]['action']=='passage_export_failed'


def test_operator_can_view_report_but_cannot_export(ledger,tmp_path):
    ops,admin,add=ledger;add(0)
    ops.add_user(admin,'operator','operator test password','operator')
    session=ops.login('operator','operator test password')
    assert ops.passage_report(session)['total']['total']==1
    with pytest.raises(PermissionError):export_passages_csv(ops,session,PassageFilter(),tmp_path/'denied.csv')
    assert not (tmp_path/'denied.csv').exists()


@pytest.mark.parametrize('text',['=1',' +1','\t@a','\n-2','@SUM(A1)','-1'])
def test_csv_untrusted_text_is_not_a_formula(text):
    assert csv_text(text).startswith("'")
