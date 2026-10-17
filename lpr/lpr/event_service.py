"""Passage review and durable, encrypted delivery for transient database failures."""
import json
import sqlite3
import uuid
from pathlib import Path
from .core import normalize_plate,valid_tr_plate
from .security import protect_secret,unprotect_secret


class EventService:
    def __init__(self,ops):
        self.ops=ops
        ops.db.executescript('''
        CREATE TABLE IF NOT EXISTS passage_reviews(id INTEGER PRIMARY KEY,event_id TEXT NOT NULL
            REFERENCES vehicle_passages(event_id) ON DELETE CASCADE,at REAL NOT NULL,actor TEXT NOT NULL,
            plate TEXT NOT NULL,reason TEXT NOT NULL);
        CREATE INDEX IF NOT EXISTS passage_reviews_event ON passage_reviews(event_id,id DESC);
        CREATE TABLE IF NOT EXISTS passage_media(event_id TEXT PRIMARY KEY REFERENCES vehicle_passages(event_id)
            ON DELETE CASCADE,vehicle BLOB,plate BLOB);
        ''')

    def latest(self,session,limit=30):
        self.ops.check(session,'read')
        if not 1<=limit<=100:raise ValueError('Invalid limit')
        rows=[dict(r) for r in self.ops.db.execute('''SELECT v.*,c.name AS camera_name,
            (SELECT plate FROM passage_reviews r WHERE r.event_id=v.event_id ORDER BY r.id DESC LIMIT 1) AS corrected_plate
            FROM vehicle_passages v JOIN cameras c ON c.id=v.camera ORDER BY v.at DESC,v.event_id DESC LIMIT ?''',(limit,))]
        return rows

    def details(self,session,event_id):
        self.ops.check(session,'read')
        row=self.ops.db.execute('SELECT v.*,c.name AS camera_name FROM vehicle_passages v JOIN cameras c ON c.id=v.camera WHERE event_id=?',(event_id,)).fetchone()
        if row is None:raise ValueError('Unknown event')
        value=dict(row)
        value['corrections']=[dict(r) for r in self.ops.db.execute('SELECT at,actor,plate,reason FROM passage_reviews WHERE event_id=? ORDER BY id',(event_id,))]
        image=self.ops.db.execute('SELECT vehicle,plate FROM passage_media WHERE event_id=?',(event_id,)).fetchone()
        value['images']=dict(image) if image else {}
        return value

    def correct(self,session,event_id,plate,reason):
        self.ops.check(session,'review');plate=normalize_plate(plate);reason=reason.strip()
        if not valid_tr_plate(plate) or not 3<=len(reason)<=500:raise ValueError('Valid plate and reason required')
        self.details(session,event_id)
        with self.ops.db:
            self.ops.db.execute('INSERT INTO passage_reviews(event_id,at,actor,plate,reason) VALUES(?,?,?,?,?)',
                (event_id,self.ops.clock(),session.username,plate,reason))
            self.ops._audit(session.username,'passage_corrected',event_id)

    def confirm(self,session,event_id,reason):
        self.ops.check(session,'review')
        data=self.details(session,event_id)
        plate=data['corrections'][-1]['plate'] if data['corrections'] else data['plate']
        if not valid_tr_plate(plate) or not 3<=len(reason.strip())<=350:raise ValueError('Valid plate and confirmation reason required')
        return self.ops.confirm_passage(session,plate,data['direction'],reason.strip()+' · Event '+event_id,
            str(uuid.uuid5(uuid.UUID(event_id),'manual-passage')))

    def persist(self,session,event):
        import base64
        images=event.get('_images',{})
        if not isinstance(images,dict) or set(images)-{'vehicle','plate'}:raise ValueError('Invalid evidence images')
        values=[]
        if images:
            for key in ('vehicle','plate'):
                encoded=images.get(key)
                if encoded is not None and (not isinstance(encoded,str) or len(encoded)>400000):raise ValueError('Invalid evidence image')
                data=base64.b64decode(encoded,validate=True) if encoded else None
                if data and (len(data)>300000 or not data.startswith(b'\xff\xd8')):raise ValueError('Invalid evidence image')
                values.append(data)
        self.ops.record_vehicle_passage(session,event)
        # A retry after a partial failure is safe: passage identity is immutable.
        if images:
            with self.ops.db:
                self.ops.db.execute('INSERT OR IGNORE INTO passage_media(event_id,vehicle,plate) VALUES(?,?,?)',(event['event_id'],*values))


class DurablePassageQueue:
    """Separate SQLite journal remains usable while the operational database is locked."""
    def __init__(self,path,*,maximum=1000,max_bytes=128*1024*1024):
        self.maximum=maximum
        self.max_bytes=max_bytes
        self.db=sqlite3.connect(str(path),timeout=.25)
        self.db.execute('PRAGMA journal_mode=WAL');self.db.execute('PRAGMA synchronous=FULL')
        self.db.execute('CREATE TABLE IF NOT EXISTS pending(id TEXT PRIMARY KEY,payload TEXT NOT NULL)')

    def enqueue(self,event):
        key=str(uuid.UUID(event['event_id']))
        if key!=event['event_id']:raise ValueError('Invalid event id')
        payload=json.dumps(event,separators=(',',':'),allow_nan=False)
        if len(payload)>900000:raise ValueError('Event too large')
        old=self.db.execute('SELECT payload FROM pending WHERE id=?',(key,)).fetchone()
        if old:
            if unprotect_secret(old[0])!=payload:raise ValueError('Conflicting queued event')
            return
        protected=protect_secret(payload)
        current=self.db.execute('SELECT coalesce(sum(length(payload)),0) FROM pending').fetchone()[0]
        if self.pending>=self.maximum or current+len(protected)>self.max_bytes:raise RuntimeError('Event delivery queue is full')
        with self.db:self.db.execute('INSERT INTO pending VALUES(?,?)',(key,protected))

    @property
    def pending(self):return self.db.execute('SELECT count(*) FROM pending').fetchone()[0]

    def drain(self,deliver,limit=8):
        delivered=0
        for key,payload in self.db.execute('SELECT id,payload FROM pending ORDER BY rowid LIMIT ?',(limit,)).fetchall():
            deliver(json.loads(unprotect_secret(payload)))
            with self.db:self.db.execute('DELETE FROM pending WHERE id=?',(key,))
            delivered+=1
        return delivered

    def close(self):self.db.close()
