"""Authenticated camera metadata without rewriting encrypted stream credentials.

Camera identities are permanent. Removing a camera archives its configuration
so event history and calibration continue to refer to the same identity.
"""
import json
from urllib.parse import urlsplit


def _text(value, maximum, *, required=False):
    if not isinstance(value, str):
        raise ValueError('Geçersiz kamera bilgisi.')
    value = value.strip()
    if len(value) > maximum or any(ord(char) < 32 for char in value) or (required and not value):
        raise ValueError('Kamera alanlarını ve uzunluklarını kontrol edin.')
    return value


class CameraMetadata:
    def __init__(self, operations):
        self.ops = operations
        with self.ops.db:
            self.ops.db.execute('''CREATE TABLE IF NOT EXISTS camera_metadata(
                camera_id TEXT PRIMARY KEY REFERENCES cameras(id) ON DELETE CASCADE,
                brand TEXT NOT NULL DEFAULT '', model TEXT NOT NULL DEFAULT '',
                location TEXT NOT NULL DEFAULT '', host TEXT NOT NULL DEFAULT '',
                protocol TEXT NOT NULL DEFAULT 'RTSP', enabled INTEGER NOT NULL DEFAULT 1,
                mode TEXT NOT NULL DEFAULT 'software', archived INTEGER NOT NULL DEFAULT 0,
                decoder_mode TEXT NOT NULL DEFAULT 'software',
                updated_at REAL NOT NULL)''')
            if 'decoder_mode' not in {row[1] for row in self.ops.db.execute('PRAGMA table_info(camera_metadata)')}:
                self.ops.db.execute("ALTER TABLE camera_metadata ADD COLUMN decoder_mode TEXT NOT NULL DEFAULT 'software'")

    def list(self, session, *, include_archived=False):
        self.ops.check(session, 'read')
        query = '''SELECT c.id,c.name,c.direction,c.transport,
            coalesce(m.brand,'') AS brand,coalesce(m.model,'') AS model,
            coalesce(m.location,'') AS location,coalesce(m.host,'') AS host,
            coalesce(m.protocol,'RTSP') AS protocol,coalesce(m.enabled,1) AS enabled,
            coalesce(m.mode,'software') AS mode,coalesce(m.archived,0) AS archived
            ,coalesce(m.decoder_mode,'software') AS decoder_mode
            FROM cameras c LEFT JOIN camera_metadata m ON m.camera_id=c.id'''
        if not include_archived:
            query += ' WHERE coalesce(m.archived,0)=0'
        rows = [dict(row) for row in self.ops.db.execute(query + ' ORDER BY c.name,c.id')]
        for row in rows:
            row['enabled'] = bool(row['enabled'])
            row['archived'] = bool(row['archived'])
        return rows

    def get(self, session, camera_id):
        for row in self.list(session, include_archived=True):
            if row['id'] == camera_id:
                return row
        raise ValueError('Kamera bulunamadı.')

    def save(self, session, camera_id, *, name, direction, brand='', model='',
             location='', enabled=True, mode='software', decoder_mode=None):
        self.ops.check(session, 'manage')
        if direction not in ('entry', 'exit') or type(enabled) is not bool:
            raise ValueError('Geçersiz kamera yönü veya durumu.')
        # No native adapter has passed an actual camera event acceptance test.
        # A database flag must not turn on a non-existent event integration.
        if mode != 'software':
            raise ValueError('Dahili ANPR için doğrulanmış bir kamera olay adaptörü gerekiyor.')
        name = _text(name, 120, required=True)
        brand, model, location = (_text(value, 120) for value in (brand, model, location))
        old = self.get(session, camera_id)
        if decoder_mode is None:
            decoder_mode = old['decoder_mode']
        if decoder_mode not in ('software', 'auto'):
            raise ValueError('Geçersiz video çözücü tercihi.')
        if old['archived']:
            raise ValueError('Önce arşivlenmiş kamerayı geri yükleyin.')
        parts = urlsplit(self.ops.camera_source(session, camera_id))
        with self.ops.db:
            self.ops.db.execute('UPDATE cameras SET name=?,direction=? WHERE id=?',
                                (name, direction, camera_id))
            self.ops.db.execute('''INSERT INTO camera_metadata
                (camera_id,brand,model,location,host,protocol,enabled,mode,archived,decoder_mode,updated_at)
                VALUES(?,?,?,?,?,?,?,?,0,?,?) ON CONFLICT(camera_id) DO UPDATE SET
                brand=excluded.brand,model=excluded.model,location=excluded.location,
                host=excluded.host,protocol=excluded.protocol,enabled=excluded.enabled,
                mode=excluded.mode,decoder_mode=excluded.decoder_mode,updated_at=excluded.updated_at''',
                (camera_id, brand, model, location, parts.hostname or '', parts.scheme.upper(),
                 int(enabled), mode, decoder_mode, self.ops.clock()))
            changed = [key for key, value in dict(name=name, direction=direction, brand=brand,
                model=model, location=location, enabled=enabled, mode=mode, decoder_mode=decoder_mode).items() if old[key] != value]
            self.ops._audit(session.username, 'camera_metadata_saved',
                            json.dumps({'camera': camera_id, 'fields': changed}, ensure_ascii=False))
        return self.get(session, camera_id)

    def sync_address(self, session, camera_id):
        """Record only the address/protocol after an authenticated connection edit."""
        self.ops.check(session, 'manage')
        self.get(session, camera_id)
        parts = urlsplit(self.ops.camera_source(session, camera_id))
        with self.ops.db:
            self.ops.db.execute('''INSERT INTO camera_metadata(camera_id,host,protocol,updated_at)
                VALUES(?,?,?,?) ON CONFLICT(camera_id) DO UPDATE SET host=excluded.host,
                protocol=excluded.protocol,updated_at=excluded.updated_at''',
                (camera_id, parts.hostname or '', parts.scheme.upper(), self.ops.clock()))

    def archive(self, session, camera_id):
        self.ops.check(session, 'manage')
        self.get(session, camera_id)
        with self.ops.db:
            self.ops.db.execute('''INSERT INTO camera_metadata(camera_id,enabled,archived,updated_at)
                VALUES(?,0,1,?) ON CONFLICT(camera_id) DO UPDATE SET enabled=0,archived=1,
                updated_at=excluded.updated_at''', (camera_id, self.ops.clock()))
            self.ops._audit(session.username, 'camera_archived', camera_id)

    def restore(self, session, camera_id):
        self.ops.check(session, 'manage')
        self.get(session, camera_id)
        with self.ops.db:
            self.ops.db.execute('UPDATE camera_metadata SET archived=0,enabled=0,updated_at=? WHERE camera_id=?',
                                (self.ops.clock(), camera_id))
            self.ops._audit(session.username, 'camera_restored_disabled', camera_id)
