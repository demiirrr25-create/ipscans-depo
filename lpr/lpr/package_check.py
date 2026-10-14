"""Packaged-runtime check using synthetic data in a fresh caller-selected folder."""
from pathlib import Path
import json
import tempfile
import uuid


def check_package(output):
    from PySide6.QtWidgets import QApplication
    from PySide6.QtPdf import QPdfDocument
    from .application import ProductWindow
    from .operations import Operations
    from .passage_export import export_passages_csv,export_passages_xlsx,export_passage_summary_pdf
    from .passage_query import PassageFilter
    from . import __version__
    target=Path(output).resolve();target.mkdir(parents=True,exist_ok=False)
    app=QApplication.instance() or QApplication([])
    result={'version':__version__,'source':'synthetic_package_check','real_camera_test':False}
    with tempfile.TemporaryDirectory(prefix='database-',dir=target) as folder:
        ops=Operations(Path(folder)/'test.db');window=None
        try:
            ops.setup('package-test','temporary package check password')
            session=ops.login('package-test','temporary package check password')
            ops.save_camera(session,'test-camera','Synthetic test camera','rtsp://192.0.2.1/test','entry')
            for index in range(40):
                ops.record_vehicle_passage(session,dict(event_id=str(uuid.uuid4()),at=ops.clock()-index*3600,
                    camera='test-camera',line_id='test-line',direction='entry' if index%2 else 'exit',track_id=str(index),
                    vehicle_type='car',plate='',confidence=0,status='unread',evidence_frames=0,frame_sequence=index))
            window=ProductWindow(ops,session);window.show();app.processEvents()
            window.tabs.setCurrentWidget(window.widgets['passages'][0]);app.processEvents()
            window.grab().save(str(target/'synthetic-ui.png'))
            result['visible_passages']=window.passage_browser.table.rowCount()
            for kind,exporter in [('csv',export_passages_csv),('xlsx',export_passages_xlsx),('pdf',export_passage_summary_pdf)]:
                result[kind+'_rows']=exporter(ops,session,PassageFilter(),target/('synthetic-report.'+kind))
            pdf=QPdfDocument();pdf.load(str(target/'synthetic-report.pdf'))
            result['pdf_pages']=pdf.pageCount();pdf.close()
            result['passed']=result['visible_passages']==40 and all(result[k+'_rows']==40 for k in ('csv','xlsx','pdf')) and result['pdf_pages']>=2
        finally:
            if window is not None:window.close();app.processEvents()
            ops.close()
    (target/'result.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
    return result
