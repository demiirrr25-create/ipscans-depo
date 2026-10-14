import csv
import pytest
from test_passage_query import ledger
from lpr.passage_query import PassageFilter
from lpr.passage_export import export_passages_csv,csv_text
from lpr.passage_export import export_passages_xlsx,export_passage_summary_pdf
from zipfile import ZipFile
from xml.etree import ElementTree as ET


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


def test_xlsx_stores_untrusted_text_as_strings_and_counts(ledger,tmp_path):
    ops,session,add=ledger
    add(0,line_id='=1+1');add(1,direction='exit')
    path=tmp_path/'report.xlsx'
    assert export_passages_xlsx(ops,session,PassageFilter(),path)==2
    ns={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
    with ZipFile(path) as archive:
        detail=ET.fromstring(archive.read('xl/worksheets/sheet2.xml'))
        assert detail.findall('.//s:f',ns)==[]
        cell=detail.find('.//s:c[@r="D3"]',ns)
        assert cell.attrib['t']=='inlineStr' and cell.find('.//s:t',ns).text=='=1+1'
        summary=ET.fromstring(archive.read('xl/worksheets/sheet1.xml'))
        assert summary.find('.//s:c[@r="B6"]/s:v',ns).text=='2'
        assert summary.find('.//s:c[@r="B7"]/s:v',ns).text=='1'
        assert detail.find('.//s:autoFilter',ns).attrib['ref']=='A1:L3'


def test_xlsx_failure_preserves_existing_destination(ledger,tmp_path):
    ops,session,add=ledger;add(0);add(1)
    path=tmp_path/'report.xlsx';path.write_bytes(b'existing')
    with pytest.raises(ValueError):export_passages_xlsx(ops,session,PassageFilter(),path,max_rows=1)
    assert path.read_bytes()==b'existing'
    assert not list(tmp_path.glob('.lpr-*'))


def test_pdf_produces_real_document_and_rejects_operator(ledger,tmp_path):
    from PySide6.QtWidgets import QApplication
    from lpr.desktop import RecognitionWindow
    app=QApplication.instance() or QApplication([])
    initializer=RecognitionWindow();initializer.close()
    ops,session,add=ledger;add(0)
    path=tmp_path/'report.pdf'
    assert export_passage_summary_pdf(ops,session,PassageFilter(),path)==1
    assert path.read_bytes().startswith(b'%PDF-')
    ops.add_user(session,'operator','operator test password','operator')
    operator=ops.login('operator','operator test password')
    with pytest.raises(PermissionError):export_passage_summary_pdf(ops,operator,PassageFilter(),tmp_path/'denied.pdf')


def test_multipage_pdf_keeps_continuation_heading_and_last_period(ledger,tmp_path):
    from PySide6.QtWidgets import QApplication
    from PySide6.QtPdf import QPdfDocument
    from lpr.desktop import RecognitionWindow
    app=QApplication.instance() or QApplication([])
    initializer=RecognitionWindow();initializer.close()
    ops,session,add=ledger
    for i in range(40):add(i,at=1799990000.-i*3600)
    path=tmp_path/'multipage.pdf';export_passage_summary_pdf(ops,session,PassageFilter(),path)
    document=QPdfDocument();assert document.load(str(path))==QPdfDocument.Error.None_
    assert document.pageCount()==3
    text=' '.join(document.getAllText(2).text().split())
    assert 'Hourly UTC (continued)' in text and '3 / 3' in text
    document.close()
