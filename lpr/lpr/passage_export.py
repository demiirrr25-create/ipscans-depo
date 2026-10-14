"""Atomic, bounded-memory export of the full applied passage filter."""
import csv
from datetime import datetime,timezone
import os
from pathlib import Path
import tempfile

FIELDS=('event_id','at_utc','camera','line_id','direction','vehicle_type','plate','confidence','status',
        'evidence_frames','track_id','frame_sequence')


def csv_text(value):
    # Spreadsheet programs may ignore leading whitespace before a formula marker.
    if isinstance(value,str) and (value.lstrip().startswith(('=','+','-','@')) or value.startswith(('\t','\r','\n'))):
        return "'"+value
    return value


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
