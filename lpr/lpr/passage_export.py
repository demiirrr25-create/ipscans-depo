"""Atomic, bounded-memory export of the full applied passage filter."""
import csv
from datetime import datetime,timezone
import os
from pathlib import Path
import tempfile
from contextlib import contextmanager
from dataclasses import asdict

FIELDS=('event_id','at_utc','camera','line_id','direction','vehicle_type','plate','confidence','status',
        'evidence_frames','track_id','frame_sequence')
HEADERS=('Event ID','Timestamp (UTC)','Camera','Line','Direction','Vehicle','Plate','Confidence','Decision',
         'Evidence frames','Track ID','Frame number')


def filter_labels(filters):
    labels=('Plate contains','Camera','Direction','Vehicle type','Decision','From (UTC, inclusive)',
            'Until (UTC, exclusive)','Minimum confidence','Maximum confidence')
    rows=[]
    for label,(key,value) in zip(labels,asdict(filters).items()):
        if value is None or value=='':value='All / unset'
        elif key in {'start','end'}:value=datetime.fromtimestamp(value,timezone.utc).strftime('%Y-%m-%d %H:%M:%S')
        elif key in {'min_confidence','max_confidence'}:value=f'{value:.1%}'
        rows.append((label,str(value)))
    return rows


def csv_text(value):
    # Spreadsheet programs may ignore leading whitespace before a formula marker.
    if isinstance(value,str) and (value.lstrip().startswith(('=','+','-','@')) or value.startswith(('\t','\r','\n'))):
        return "'"+value
    return value


@contextmanager
def atomic_export(ops,session,path,extension):
    ops.check(session,'export')
    target=Path(path)
    if target.suffix.lower()!=extension:raise ValueError('Invalid output extension')
    with ops.db:ops._audit(session.username,'passage_export_started',extension[1:])
    temporary=None
    try:
        fd,name=tempfile.mkstemp(prefix='.lpr-report-',suffix=extension,dir=target.parent)
        os.close(fd);temporary=Path(name)
        yield temporary
        ops.check(session,'export')
        with temporary.open('r+b') as stream:os.fsync(stream.fileno())
        os.replace(temporary,target);temporary=None
        with ops.db:ops._audit(session.username,'passage_export_completed',extension[1:])
    except Exception:
        with ops.db:ops._audit(session.username,'passage_export_failed',extension[1:])
        raise
    finally:
        if temporary is not None:temporary.unlink(missing_ok=True)


def passage_rows(ops,session,filters,max_rows=100000):
    if type(max_rows) is not int or not 1<=max_rows<=1000000:raise ValueError('Invalid export limit')
    count=0;cursor=None;snapshot=None
    while True:
        ops.check(session,'export')
        page=ops.passage_page(session,filters,limit=500,before=cursor,snapshot=snapshot);snapshot=page['snapshot']
        for row in page['rows']:
            count+=1
            if count>max_rows:raise ValueError('Export limit exceeded; narrow the date range')
            yield row
        cursor=page['next_cursor']
        if cursor is None:break


def export_passages_xlsx(ops,session,filters,path,*,max_rows=100000):
    import xlsxwriter
    filters.sql();count=0;counts={key:0 for key in ('entry','exit','recognized','review','unread')}
    with atomic_export(ops,session,path,'.xlsx') as temporary:
        with tempfile.TemporaryDirectory(prefix='.lpr-xlsx-',dir=temporary.parent) as scratch:
            with xlsxwriter.Workbook(str(temporary),{'constant_memory':True,'strings_to_formulas':False,
                    'strings_to_urls':False,'tmpdir':scratch}) as book:
                book.set_properties({'title':'LPR Pro vehicle passage report','author':'IPScans LPR Pro'})
                summary=book.add_worksheet('Report');details=book.add_worksheet('Passages')
                header=book.add_format({'bold':True,'bg_color':'#202020','font_color':'#FFFFFF','text_wrap':True})
                percent=book.add_format({'num_format':'0.0%'});timestamp=book.add_format({'num_format':'yyyy-mm-dd hh:mm:ss'})
                summary.set_column(0,0,30);summary.set_column(1,1,75);summary.hide_gridlines(2)
                details.set_column(0,0,39);details.set_column(1,1,22);details.set_column(2,6,20);details.set_column(7,11,17)
                details.freeze_panes(1,2);details.set_row(0,32);details.write_row(0,0,HEADERS,header)
                for count,row in enumerate(passage_rows(ops,session,filters,max_rows),1):
                    counts[row['direction']]+=1;counts[row['status']]+=1
                    row['at_utc']=datetime.fromtimestamp(row['at'],timezone.utc).replace(tzinfo=None)
                    for column,key in enumerate(FIELDS):
                        if key=='at_utc':details.write_datetime(count,column,row[key],timestamp)
                        elif key=='confidence':details.write_number(count,column,row[key],percent)
                        elif isinstance(row[key],str):details.write_string(count,column,row[key])
                        else:details.write_number(count,column,row[key])
                details.autofilter(0,0,count,len(FIELDS)-1)
                summary.write_row(0,0,['LPR PRO','Vehicle passages - UTC'],header)
                summary.write_row(2,0,['Source','Local vehicle passage ledger; applied filters below'])
                summary.write_row(3,0,['Generated UTC',datetime.now(timezone.utc).isoformat()])
                end=max(2,count+1)
                summary.write(5,0,'Passages');summary.write_formula(5,1,f'COUNTA(Passages!A2:A{end})',None,count)
                for index,(key,value) in enumerate(counts.items(),6):
                    column='E' if key in {'entry','exit'} else 'I'
                    summary.write(index,0,key);summary.write_formula(index,1,f'COUNTIF(Passages!{column}2:{column}{end},"{key}")',None,value)
                summary.write_row(12,0,['Interpretation','Model decisions are not measured ground-truth OCR accuracy.'])
                summary.write_row(14,0,['Applied filter','Value'],header)
                for index,(label,value) in enumerate(filter_labels(filters),15):
                    summary.write_string(index,0,label);summary.write_string(index,1,value)
    return count


def export_passage_summary_pdf(ops,session,filters,path):
    from html import escape
    from PySide6.QtCore import QMarginsF,QRectF,Qt
    from PySide6.QtGui import QPdfWriter,QPageSize,QTextDocument,QFont,QPainter
    filters.sql()
    with atomic_export(ops,session,path,'.pdf') as temporary:
        report=ops.passage_report(session,filters)
        sections=['<h1>LPR PRO - Vehicle passage report</h1>',
            '<p>UTC | '+escape(datetime.now(timezone.utc).isoformat())+'</p>',
            '<p>Source: local vehicle passage ledger. Counts describe stored model decisions, not measured OCR accuracy.</p>',
            '<h2>Applied filters</h2><p>'+escape('; '.join(f'{key}: {value}' for key,value in filter_labels(filters) if value!='All / unset'))+'</p>']
        pages=[];page_rows=8
        for title,rows in [('Total',[dict(bucket='All matching',**report['total'])]),('Camera',report['cameras']),
                ('Daily UTC',report['daily']),('Hourly UTC',report['hourly'])]:
            for offset in range(0,max(1,len(rows)),25):
                chunk=rows[offset:offset+25]
                if page_rows+len(chunk)+3>25:
                    pages.append(''.join(sections));sections=['<p><b>LPR PRO - Vehicle passages | UTC</b></p>'];page_rows=2
                sections.append('<h2>'+title+(' (continued)' if offset else '')+'</h2><table width="100%" cellspacing="0" cellpadding="3" border="1"><thead><tr>')
                sections.append(''.join('<th>'+label+'</th>' for label in ('Period / camera','Total','Entry','Exit','Recognized','Review','Unread'))+'</tr></thead>')
                for row in chunk:
                    sections.append('<tr>'+''.join('<td>'+escape(str(row[key]))+'</td>' for key in ('bucket','total','entries','exits','recognized','review','unread'))+'</tr>')
                if not rows:sections.append('<tr><td colspan="7">No matching passages</td></tr>')
                sections.append('</table>')
                page_rows+=len(chunk)+3
        pages.append(''.join(sections))
        writer=QPdfWriter(str(temporary));writer.setResolution(96);writer.setPageSize(QPageSize(QPageSize.PageSizeId.A4))
        writer.setPageMargins(QMarginsF(12,12,12,12));writer.setTitle('LPR Pro vehicle passage report');writer.setCreator('IPScans LPR Pro')
        painter=QPainter(writer)
        if not painter.isActive():raise OSError('Cannot start PDF painter')
        try:
            for index,html in enumerate(pages):
                if index and not writer.newPage():raise OSError('Cannot create PDF page')
                document=QTextDocument();document.setDefaultFont(QFont('Segoe UI',9))
                document.setDefaultStyleSheet('h1 {font-size:18pt;} h2 {font-size:12pt;} th {background:#eeeeee;} td,th {border-color:#bbbbbb;}')
                document.setHtml(html);document.setTextWidth(writer.width())
                if document.size().height()>writer.height()-35:raise ValueError('Report page overflow; narrow the report filter')
                painter.save()
                document.drawContents(painter,QRectF(0,0,writer.width(),writer.height()-35))
                painter.restore()
                painter.setFont(QFont('Segoe UI',8))
                painter.drawText(QRectF(0,writer.height()-25,writer.width(),20),Qt.AlignmentFlag.AlignRight,f'{index+1} / {len(pages)}')
        finally:painter.end()
        del writer
        if temporary.stat().st_size<100:raise OSError('Empty PDF output')
    return report['total']['total']


def export_passages_csv(ops,session,filters,path,*,max_rows=100000):
    ops.check(session,'export')
    if type(max_rows) is not int or not 1<=max_rows<=1000000:raise ValueError('Invalid export limit')
    target=Path(path)
    if target.suffix.lower()!='.csv':raise ValueError('CSV extension required')
    filters.sql()
    with ops.db:ops._audit(session.username,'passage_export_started','csv')
    temporary=None;count=0
    try:
        fd,name=tempfile.mkstemp(prefix='.lpr-report-',suffix='.csv',dir=target.parent)
        temporary=Path(name)
        with os.fdopen(fd,'w',encoding='utf-8-sig',newline='') as stream:
            writer=csv.DictWriter(stream,fieldnames=FIELDS);writer.writeheader()
            cursor=None;snapshot=None
            while True:
                ops.check(session,'export')
                page=ops.passage_page(session,filters,limit=500,before=cursor,snapshot=snapshot)
                snapshot=page['snapshot']
                for row in page['rows']:
                    count+=1
                    if count>max_rows:raise ValueError('Export limit exceeded; select a shorter date range')
                    row['at_utc']=datetime.fromtimestamp(row['at'],timezone.utc).isoformat()
                    writer.writerow({key:csv_text(row[key]) for key in FIELDS})
                cursor=page['next_cursor']
                if cursor is None:break
            stream.flush();os.fsync(stream.fileno())
        ops.check(session,'export')
        os.replace(temporary,target);temporary=None
        with ops.db:ops._audit(session.username,'passage_export_completed',f'csv:{count}')
        return count
    except Exception:
        with ops.db:ops._audit(session.username,'passage_export_failed','csv')
        raise
    finally:
        if temporary is not None:temporary.unlink(missing_ok=True)
