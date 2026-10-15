"""Authenticated, additive resident and vehicle registry. No barrier commands.

Names never identify a resident automatically: relationships use resident IDs.
Legacy grants retain their restrictions and are never replaced by this module.
"""
from contextlib import contextmanager
import csv
from datetime import datetime, timezone
import json
import math
import os
from pathlib import Path
import sqlite3
import tempfile
import zipfile
from xml.etree import ElementTree as ET

from .core import normalize_plate, valid_tr_plate
from .passage_export import csv_text

STATUSES = ('registered', 'unknown', 'visitor', 'staff', 'temporary', 'blocked', 'inactive')
VEHICLE_TYPES = ('car', 'motorcycle', 'bus', 'truck', 'other')
FIELDS = ('plate', 'status', 'make', 'model', 'color', 'vehicle_type', 'entry_allowed',
          'exit_allowed', 'valid_from', 'valid_until', 'notes', 'owners')
MAX_IMPORT_ROWS = 5000


def _text(value, label, maximum=120, required=False):
    if not isinstance(value, str):
        raise ValueError(f'{label}: metin gerekli')
    value = value.strip()
    if (required and not value) or len(value) > maximum or any(ord(c) < 32 for c in value):
        raise ValueError(f'{label}: geçersiz veya çok uzun değer')
    return value


def _time(value):
    if value is None or value == '':
        return None
    if isinstance(value, str):
        try:
            # File format accepts explicit UTC/offset dates, never ambiguous local times.
            parsed = datetime.fromisoformat(value.replace('Z', '+00:00'))
            if parsed.tzinfo is None:
                raise ValueError()
            value = parsed.timestamp()
        except ValueError:
            raise ValueError('Tarih ISO 8601 biçiminde saat dilimi içermeli') from None
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or not 0 <= value <= 253402300799:
        raise ValueError('Geçersiz tarih')
    return float(value)


def _id(value):
    if type(value) is not int or value <= 0:
        raise ValueError('Geçersiz kayıt kimliği')
    return value


class Registry:
    def __init__(self, ops):
        self.ops, self.db = ops, ops.db
        # Additive migration: existing grants, passages and accounts are untouched.
        self.db.executescript('''
        CREATE TABLE IF NOT EXISTS blocks(
            id INTEGER PRIMARY KEY, name TEXT NOT NULL COLLATE NOCASE UNIQUE);
        CREATE TABLE IF NOT EXISTS units(
            id INTEGER PRIMARY KEY, block_id INTEGER NOT NULL REFERENCES blocks(id) ON DELETE RESTRICT,
            number TEXT NOT NULL COLLATE NOCASE, UNIQUE(block_id, number));
        CREATE TABLE IF NOT EXISTS residents(
            id INTEGER PRIMARY KEY, first_name TEXT NOT NULL, last_name TEXT NOT NULL,
            phone TEXT NOT NULL DEFAULT '', unit_id INTEGER REFERENCES units(id) ON DELETE RESTRICT,
            created_at REAL NOT NULL, updated_at REAL NOT NULL);
        CREATE INDEX IF NOT EXISTS residents_unit ON residents(unit_id);
        CREATE TABLE IF NOT EXISTS vehicles(
            id INTEGER PRIMARY KEY, plate TEXT NOT NULL UNIQUE, status TEXT NOT NULL,
            make TEXT NOT NULL DEFAULT '', model TEXT NOT NULL DEFAULT '', color TEXT NOT NULL DEFAULT '',
            vehicle_type TEXT NOT NULL DEFAULT 'car', entry_allowed INTEGER NOT NULL DEFAULT 0,
            exit_allowed INTEGER NOT NULL DEFAULT 0, valid_from REAL, valid_until REAL,
            notes TEXT NOT NULL DEFAULT '', created_at REAL NOT NULL, updated_at REAL NOT NULL,
            legacy_plate TEXT REFERENCES grants(plate) ON DELETE RESTRICT);
        CREATE INDEX IF NOT EXISTS vehicles_status ON vehicles(status);
        CREATE TABLE IF NOT EXISTS vehicle_owners(
            vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
            resident_id INTEGER NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
            PRIMARY KEY(vehicle_id, resident_id));
        CREATE INDEX IF NOT EXISTS vehicle_owner_resident ON vehicle_owners(resident_id, vehicle_id);
        ''')
        # Mark once, otherwise deleting a migrated vehicle would resurrect it on restart.
        with self.db:
            if not self.db.execute("SELECT 1 FROM settings WHERE key='registry_grants_migrated_v1'").fetchone():
                for row in self.db.execute('SELECT * FROM grants').fetchall():
                    plate = normalize_plate(row['plate'])
                    if not valid_tr_plate(plate):
                        continue
                    state = 'blocked' if row['blocked'] else {'resident': 'registered', 'staff': 'staff', 'visitor': 'visitor'}.get(row['category'], 'unknown')
                    self.db.execute('''INSERT OR IGNORE INTO vehicles
                        (plate,status,entry_allowed,exit_allowed,valid_from,valid_until,created_at,updated_at,legacy_plate)
                        VALUES(?,?,?,?,?,?,?,?,?)''', (plate, state,
                        int(row['direction'] in ('entry', 'both') and not row['blocked']),
                        int(row['direction'] in ('exit', 'both') and not row['blocked']),
                        row['valid_from'], row['valid_until'], ops.clock(), ops.clock(), row['plate']))
                self.db.execute("INSERT INTO settings(key,value) VALUES('registry_grants_migrated_v1','1')")
                ops._audit('system', 'registry_migration', 'v1')

    @contextmanager
    def _write(self, session, action, identifier=''):
        self.ops.check(session, 'manage')
        # Savepoints compose with atomic imports; nested `with db` would commit early.
        self.db.execute('SAVEPOINT registry_write')
        try:
            yield
            self.ops._audit(session.username, action, str(identifier))
            self.db.execute('RELEASE registry_write')
        except Exception:
            self.db.execute('ROLLBACK TO registry_write')
            self.db.execute('RELEASE registry_write')
            raise

    def blocks(self, session):
        self.ops.check(session, 'read')
        return [dict(r) for r in self.db.execute('SELECT * FROM blocks ORDER BY name,id')]

    def units(self, session, block_id=None):
        self.ops.check(session, 'read')
        args = () if block_id is None else (_id(block_id),)
        where = '' if block_id is None else ' WHERE block_id=?'
        return [dict(r) for r in self.db.execute('SELECT units.*,blocks.name AS block FROM units JOIN blocks ON blocks.id=block_id' + where + ' ORDER BY block,number,units.id', args)]

    def save_block(self, session, name, block_id=None):
        name = _text(name, 'Blok', required=True)
        try:
            with self._write(session, 'registry_block_saved', block_id or 'new'):
                if block_id is None:
                    return self.db.execute('INSERT INTO blocks(name) VALUES(?)', (name,)).lastrowid
                if not self.db.execute('UPDATE blocks SET name=? WHERE id=?', (name, _id(block_id))).rowcount:
                    raise ValueError('Blok bulunamadı')
                return block_id
        except sqlite3.IntegrityError:
            raise ValueError('Bu blok zaten kayıtlı') from None

    def save_unit(self, session, block_id, number, unit_id=None):
        number = _text(number, 'Daire', 40, True)
        try:
            with self._write(session, 'registry_unit_saved', unit_id or 'new'):
                if unit_id is None:
                    return self.db.execute('INSERT INTO units(block_id,number) VALUES(?,?)', (_id(block_id), number)).lastrowid
                if not self.db.execute('UPDATE units SET block_id=?,number=? WHERE id=?', (_id(block_id), number, _id(unit_id))).rowcount:
                    raise ValueError('Daire bulunamadı')
                return unit_id
        except sqlite3.IntegrityError:
            raise ValueError('Blok bulunamadı veya daire zaten kayıtlı') from None

    def save_resident(self, session, first_name, last_name, *, unit_id=None, phone='', resident_id=None):
        first_name, last_name = _text(first_name, 'Ad', required=True), _text(last_name, 'Soyad', required=True)
        phone = _text(phone, 'Telefon', 40)
        if unit_id is not None:
            _id(unit_id)
        try:
            with self._write(session, 'registry_resident_saved', resident_id or 'new'):
                values = (first_name, last_name, phone, unit_id, self.ops.clock())
                if resident_id is None:
                    return self.db.execute('INSERT INTO residents(first_name,last_name,phone,unit_id,updated_at,created_at) VALUES(?,?,?,?,?,?)', (*values, self.ops.clock())).lastrowid
                if not self.db.execute('UPDATE residents SET first_name=?,last_name=?,phone=?,unit_id=?,updated_at=? WHERE id=?', (*values, _id(resident_id))).rowcount:
                    raise ValueError('Sakin bulunamadı')
                return resident_id
        except sqlite3.IntegrityError:
            raise ValueError('Daire bulunamadı') from None

    def _resident_rows(self, session, sql, args=()):
        # Operations staff need name/address matching, not residents' phone numbers.
        fields = 'r.id,r.first_name,r.last_name,r.unit_id,b.name AS block,u.number AS unit'
        if session.role == 'admin':
            fields += ',r.phone'
        return [dict(r) for r in self.db.execute('SELECT ' + fields + ''' FROM residents r
            LEFT JOIN units u ON u.id=r.unit_id LEFT JOIN blocks b ON b.id=u.block_id ''' + sql, args)]

    def residents(self, session, query='', *, limit=100, offset=0):
        self.ops.check(session, 'read')
        self._pagination(limit, offset)
        term = '%' + self._like(_text(query, 'Arama')) + '%'
        return self._resident_rows(session, "WHERE r.first_name LIKE ? ESCAPE '\\' OR r.last_name LIKE ? ESCAPE '\\' ORDER BY r.last_name,r.first_name,r.id LIMIT ? OFFSET ?", (term, term, limit, offset))

    def resident(self, session, resident_id):
        self.ops.check(session, 'read')
        rows = self._resident_rows(session, 'WHERE r.id=?', (_id(resident_id),))
        return rows[0] if rows else None

    def save_vehicle(self, session, plate, *, status='registered', make='', model='', color='', vehicle_type='car',
                     entry_allowed=False, exit_allowed=False, valid_from=None, valid_until=None, notes='',
                     owner_ids=(), vehicle_id=None):
        plate = normalize_plate(_text(plate, 'Plaka', 32, True))
        if not valid_tr_plate(plate):
            raise ValueError('Geçerli bir Türkiye sivil araç plakası girin')
        if status not in STATUSES or vehicle_type not in VEHICLE_TYPES:
            raise ValueError('Geçersiz araç statüsü veya türü')
        if type(entry_allowed) is not bool or type(exit_allowed) is not bool:
            raise ValueError('Giriş ve çıkış izni açıkça seçilmeli')
        valid_from, valid_until = _time(valid_from), _time(valid_until)
        if valid_from is not None and valid_until is not None and valid_until <= valid_from:
            raise ValueError('İzin bitişi başlangıçtan sonra olmalı')
        if status == 'temporary' and (valid_from is None or valid_until is None):
            raise ValueError('Geçici izin için başlangıç ve bitiş gerekli')
        owner_ids = tuple(owner_ids)
        if len(owner_ids) > 32 or len(set(owner_ids)) != len(owner_ids):
            raise ValueError('En fazla 32 farklı yetkili kişi seçin')
        for owner_id in owner_ids:
            _id(owner_id)
        values = (plate, status, _text(make, 'Marka', 80), _text(model, 'Model', 80), _text(color, 'Renk', 60),
                  vehicle_type, int(entry_allowed), int(exit_allowed), valid_from, valid_until,
                  _text(notes, 'Açıklama', 2000), self.ops.clock())
        try:
            with self._write(session, 'registry_vehicle_saved', vehicle_id or 'new'):
                if vehicle_id is None:
                    vehicle_id = self.db.execute('''INSERT INTO vehicles
                        (plate,status,make,model,color,vehicle_type,entry_allowed,exit_allowed,valid_from,valid_until,notes,updated_at,created_at)
                        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)''', (*values, self.ops.clock())).lastrowid
                else:
                    old = self.db.execute('SELECT plate,legacy_plate FROM vehicles WHERE id=?', (_id(vehicle_id),)).fetchone()
                    if old is None:
                        raise ValueError('Araç bulunamadı')
                    if old['legacy_plate'] and plate != old['plate']:
                        raise ValueError('Eski izinle bağlı plaka değiştirilemez; yeni araç kaydı oluşturun')
                    self.db.execute('''UPDATE vehicles SET plate=?,status=?,make=?,model=?,color=?,vehicle_type=?,
                        entry_allowed=?,exit_allowed=?,valid_from=?,valid_until=?,notes=?,updated_at=? WHERE id=?''', (*values, vehicle_id))
                    self.db.execute('DELETE FROM vehicle_owners WHERE vehicle_id=?', (vehicle_id,))
                self.db.executemany('INSERT INTO vehicle_owners(vehicle_id,resident_id) VALUES(?,?)', [(vehicle_id, owner) for owner in owner_ids])
                return vehicle_id
        except sqlite3.IntegrityError as exc:
            if 'vehicles.plate' in str(exc):
                raise ValueError('Bu plaka zaten kayıtlı; mevcut aracı düzenleyin') from None
            raise ValueError('Yetkili kişi bulunamadı; kayıt değiştirilmedi') from None

    def delete(self, session, kind, identifier):
        tables = {'vehicle': 'vehicles', 'resident': 'residents', 'unit': 'units', 'block': 'blocks'}
        if kind not in tables:
            raise ValueError('Geçersiz kayıt türü')
        try:
            with self._write(session, 'registry_' + kind + '_deleted', _id(identifier)):
                if not self.db.execute('DELETE FROM ' + tables[kind] + ' WHERE id=?', (identifier,)).rowcount:
                    raise ValueError('Kayıt bulunamadı')
        except sqlite3.IntegrityError:
            raise ValueError('Bağlı kayıtlar var; önce daire veya sakin bağlantılarını değiştirin') from None

    @staticmethod
    def _like(value):
        return value.replace('\\', '\\\\').replace('%', '\\%').replace('_', '\\_')

    @staticmethod
    def _pagination(limit, offset):
        if type(limit) is not int or not 1 <= limit <= 500 or type(offset) is not int or offset < 0:
            raise ValueError('Geçersiz sayfa boyutu')

    def _decorate(self, session, row):
        result = dict(row)
        result['owners'] = self._resident_rows(session, '''JOIN vehicle_owners vo ON vo.resident_id=r.id
            WHERE vo.vehicle_id=? ORDER BY r.last_name,r.first_name,r.id''', (result['id'],))
        if session.role != 'admin':
            result.pop('notes', None)
        result['entry_allowed'] = bool(result['entry_allowed'])
        result['exit_allowed'] = bool(result['exit_allowed'])
        result['access'] = self._access(result)
        return result

    def _access(self, row):
        now, reason = self.ops.clock(), 'allowed_record'
        if row['status'] in ('blocked', 'inactive', 'unknown'):
            reason = row['status']
        elif (row['valid_from'] is not None and now < row['valid_from']) or (row['valid_until'] is not None and now >= row['valid_until']):
            reason = 'outside_validity'
        entry, exit_ = bool(row['entry_allowed']), bool(row['exit_allowed'])
        grant = self.db.execute('SELECT * FROM grants WHERE plate=?', (row['legacy_plate'] or row['plate'],)).fetchone()
        if row['legacy_plate'] or grant is not None:
            if grant is None or grant['blocked'] or not grant['valid_from'] <= now < grant['valid_until'] or (grant['remaining'] is not None and grant['remaining'] <= 0):
                reason = 'legacy_grant_restricted'
            elif grant['direction'] == 'entry':
                exit_ = False
            elif grant['direction'] == 'exit':
                entry = False
        if reason != 'allowed_record':
            entry = exit_ = False
        return {'entry_allowed': entry, 'exit_allowed': exit_, 'reason': reason, 'barrier_command': False}

    def vehicle(self, session, vehicle_id):
        self.ops.check(session, 'read')
        row = self.db.execute('''SELECT v.*,(SELECT MAX(at) FROM vehicle_passages p WHERE p.plate=v.plate) AS last_passage
            FROM vehicles v WHERE v.id=?''', (_id(vehicle_id),)).fetchone()
        return self._decorate(session, row) if row else None

    def lookup(self, session, plate):
        self.ops.check(session, 'read')
        plate = normalize_plate(_text(plate, 'Plaka', 32))
        if not valid_tr_plate(plate):
            return None
        row = self.db.execute('''SELECT v.*,(SELECT MAX(at) FROM vehicle_passages p WHERE p.plate=v.plate) AS last_passage
            FROM vehicles v WHERE plate=?''', (plate,)).fetchone()
        return self._decorate(session, row) if row else None

    def page(self, session, query='', *, status='', block_id=None, unit_id=None, passed_after=None, passed_before=None, limit=100, offset=0):
        self.ops.check(session, 'read')
        self._pagination(limit, offset)
        clauses, args = [], []
        query = _text(query, 'Arama')
        if query:
            term, plate = '%' + self._like(query) + '%', '%' + self._like(normalize_plate(query)) + '%'
            clauses.append("""(v.plate LIKE ? ESCAPE '\\' OR EXISTS(SELECT 1 FROM vehicle_owners vo
                JOIN residents r ON r.id=vo.resident_id LEFT JOIN units u ON u.id=r.unit_id
                LEFT JOIN blocks b ON b.id=u.block_id WHERE vo.vehicle_id=v.id AND
                (r.first_name||' '||r.last_name LIKE ? ESCAPE '\\' OR b.name LIKE ? ESCAPE '\\' OR u.number LIKE ? ESCAPE '\\')))""")
            args += [plate, term, term, term]
        if status:
            if status not in STATUSES:
                raise ValueError('Geçersiz statü')
            clauses.append('v.status=?'); args.append(status)
        for value, column in ((block_id, 'u.block_id'), (unit_id, 'r.unit_id')):
            if value is not None:
                clauses.append('EXISTS(SELECT 1 FROM vehicle_owners vo JOIN residents r ON r.id=vo.resident_id LEFT JOIN units u ON u.id=r.unit_id WHERE vo.vehicle_id=v.id AND ' + column + '=?)')
                args.append(_id(value))
        for value, operator in ((passed_after, '>='), (passed_before, '<')):
            if value is not None:
                clauses.append('(SELECT MAX(at) FROM vehicle_passages p WHERE p.plate=v.plate)' + operator + '?')
                args.append(_time(value))
        where = ' WHERE ' + ' AND '.join(clauses) if clauses else ''
        total = self.db.execute('SELECT COUNT(*) FROM vehicles v' + where, args).fetchone()[0]
        rows = self.db.execute('''SELECT v.*,(SELECT MAX(at) FROM vehicle_passages p WHERE p.plate=v.plate) AS last_passage
            FROM vehicles v''' + where + ' ORDER BY v.plate,v.id LIMIT ? OFFSET ?', (*args, limit, offset)).fetchall()
        return {'rows': [self._decorate(session, row) for row in rows], 'total': total}

    def import_rows(self, session, rows):
        self.ops.check(session, 'manage')
        count = 0
        with self._write(session, 'registry_import'):
            for count, row in enumerate(rows, 1):
                if count > MAX_IMPORT_ROWS:
                    raise ValueError('Tek aktarımda en fazla 5000 araç yükleyin')
                try:
                    if not isinstance(row, dict) or set(row) - set(FIELDS) or not row.get('plate'):
                        raise ValueError('Geçersiz sütunlar veya eksik plaka')
                    owners = row.get('owners') or '[]'
                    owners = json.loads(owners) if isinstance(owners, str) else owners
                    if not isinstance(owners, list) or len(owners) > 32:
                        raise ValueError('Yetkili kişiler JSON listesi olmalı')
                    owner_ids = []
                    for person in owners:
                        if not isinstance(person, dict) or set(person) - {'id', 'first_name', 'last_name', 'phone', 'block', 'unit'}:
                            raise ValueError('Geçersiz yetkili kişi alanları')
                        if person.get('id') is not None:
                            existing = self.resident(session, person['id'])
                            if existing is None or any(person.get(k) is not None and person[k] != existing.get(k) for k in ('first_name', 'last_name', 'phone', 'block', 'unit')):
                                raise ValueError('Sakin kimliği mevcut kişiyle eşleşmiyor')
                            owner_ids.append(existing['id']); continue
                        unit_id = None
                        if person.get('unit') and not person.get('block'):
                            raise ValueError('Daire için blok gerekli')
                        if person.get('block'):
                            name = _text(person['block'], 'Blok', required=True)
                            found = self.db.execute('SELECT id FROM blocks WHERE name=?', (name,)).fetchone()
                            block_id = found[0] if found else self.save_block(session, name)
                            if person.get('unit'):
                                number = _text(person['unit'], 'Daire', 40, True)
                                found = self.db.execute('SELECT id FROM units WHERE block_id=? AND number=?', (block_id, number)).fetchone()
                                unit_id = found[0] if found else self.save_unit(session, block_id, number)
                        owner_ids.append(self.save_resident(session, person.get('first_name', ''), person.get('last_name', ''), phone=person.get('phone', ''), unit_id=unit_id))
                    def flag(key):
                        value = row.get(key, '')
                        if value in ('', None, '0', 0, False): return False
                        if value in ('1', 1, True): return True
                        raise ValueError('İzin sütunları 0 veya 1 olmalı')
                    self.save_vehicle(session, row['plate'], status=row.get('status') or 'registered',
                        make=row.get('make', ''), model=row.get('model', ''), color=row.get('color', ''),
                        vehicle_type=row.get('vehicle_type') or 'car', entry_allowed=flag('entry_allowed'),
                        exit_allowed=flag('exit_allowed'), valid_from=row.get('valid_from'), valid_until=row.get('valid_until'),
                        notes=row.get('notes', ''), owner_ids=owner_ids)
                except (ValueError, TypeError, KeyError) as exc:
                    raise ValueError(f'Satır {count + 1}: {exc}') from None
        return count

    def import_file(self, session, path):
        self.ops.check(session, 'manage')
        path = Path(path)
        if path.stat().st_size > 10 * 1024 * 1024:
            raise ValueError('İçe aktarma dosyası en fazla 10 MB olabilir')
        if path.suffix.lower() == '.csv':
            with path.open('r', encoding='utf-8-sig', newline='') as stream:
                reader = csv.DictReader(stream)
                if not reader.fieldnames or len(set(reader.fieldnames)) != len(reader.fieldnames) or set(reader.fieldnames) - set(FIELDS):
                    raise ValueError('CSV başlıkları geçersiz')
                return self.import_rows(session, reader)
        if path.suffix.lower() == '.xlsx':
            return self.import_rows(session, _xlsx_rows(path))
        raise ValueError('UTF-8 CSV veya XLSX dosyası seçin')

    def export_file(self, session, path, **filters):
        self.ops.check(session, 'export')
        target = Path(path)
        if target.suffix.lower() not in ('.csv', '.xlsx'):
            raise ValueError('CSV veya XLSX uzantısı gerekli')
        rows = self.page(session, limit=1, **filters)
        if rows['total'] > 100000:
            raise ValueError('En fazla 100000 araç dışa aktarılabilir; filtreleri daraltın')
        temporary = None
        try:
            fd, name = tempfile.mkstemp(prefix='.lpr-registry-', suffix=target.suffix, dir=target.parent)
            os.close(fd); temporary = Path(name)
            def values():
                offset = 0
                while True:
                    self.ops.check(session, 'export')
                    page = self.page(session, limit=500, offset=offset, **filters)
                    for row in page['rows']:
                        result = {key: row.get(key, '') for key in FIELDS}
                        result['owners'] = json.dumps([{key: owner[key] for key in ('id', 'first_name', 'last_name', 'block', 'unit', 'phone') if key in owner} for owner in row['owners']], ensure_ascii=False)
                        for key in ('valid_from', 'valid_until'):
                            result[key] = datetime.fromtimestamp(row[key], timezone.utc).isoformat() if row[key] is not None else ''
                        for key in ('entry_allowed', 'exit_allowed'):
                            result[key] = int(row[key])
                        yield [result[key] for key in FIELDS]
                    offset += len(page['rows'])
                    if not page['rows'] or offset >= page['total']: break
            count = 0
            if target.suffix.lower() == '.csv':
                with temporary.open('w', encoding='utf-8-sig', newline='') as stream:
                    writer = csv.writer(stream); writer.writerow(FIELDS)
                    for count, row in enumerate(values(), 1): writer.writerow([csv_text(value) for value in row])
            else:
                import xlsxwriter
                with xlsxwriter.Workbook(str(temporary), {'constant_memory': True, 'strings_to_formulas': False, 'strings_to_urls': False}) as workbook:
                    sheet = workbook.add_worksheet('Vehicles'); sheet.freeze_panes(1, 1); sheet.set_column(0, len(FIELDS) - 1, 22)
                    sheet.write_row(0, 0, FIELDS)
                    for count, row in enumerate(values(), 1): sheet.write_row(count, 0, row)
                    sheet.autofilter(0, 0, count, len(FIELDS) - 1)
            self.ops.check(session, 'export')
            with temporary.open('r+b') as stream: os.fsync(stream.fileno())
            os.replace(temporary, target); temporary = None
            with self.db: self.ops._audit(session.username, 'registry_export', str(count))
            return count
        finally:
            if temporary is not None: temporary.unlink(missing_ok=True)


def _xlsx_rows(path):
    """Bounded values-only XLSX reader; formulas and external links are rejected."""
    ns = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
    with zipfile.ZipFile(path) as book:
        infos = book.infolist()
        if len(infos) > 200 or sum(info.file_size for info in infos) > 30 * 1024 * 1024:
            raise ValueError('Excel dosyası boyut sınırını aşıyor')
        if any(info.filename.startswith('xl/externalLinks/') for info in infos):
            raise ValueError('Excel dış bağlantıları desteklenmiyor')
        def xml(name):
            data = book.read(name)
            if b'<!DOCTYPE' in data.upper() or b'<!ENTITY' in data.upper():
                raise ValueError('Geçersiz Excel XML içeriği')
            return ET.fromstring(data)
        shared = []
        if 'xl/sharedStrings.xml' in book.namelist():
            shared = [''.join(node.itertext()) for node in xml('xl/sharedStrings.xml').findall('s:si', ns)]
            if len(shared) > 100000: raise ValueError('Çok fazla Excel metni')
        # Select the first worksheet via the workbook relationship, not a guessed file.
        workbook = xml('xl/workbook.xml')
        first = workbook.find('s:sheets/s:sheet', ns)
        if first is None: raise ValueError('Excel çalışma sayfası bulunamadı')
        rid = first.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')
        rels = xml('xl/_rels/workbook.xml.rels')
        rel = next((item for item in rels if item.get('Id') == rid), None)
        if rel is None or rel.get('TargetMode') == 'External': raise ValueError('Geçersiz Excel sayfa bağlantısı')
        target = rel.get('Target', '')
        name = target.lstrip('/') if target.startswith('/') else 'xl/' + target
        if '..' in name.split('/') or not name.startswith('xl/worksheets/'):
            raise ValueError('Geçersiz Excel sayfa yolu')
        sheet = xml(name)
        headers = None
        for index, row in enumerate(sheet.findall('s:sheetData/s:row', ns)):
            if index > MAX_IMPORT_ROWS: raise ValueError('Tek aktarımda en fazla 5000 araç yükleyin')
            values = [''] * len(FIELDS)
            seen_columns = set()
            for cell in row.findall('s:c', ns):
                if cell.find('s:f', ns) is not None: raise ValueError('Formüller desteklenmiyor; değer olarak yapıştırın')
                letters = ''.join(c for c in cell.get('r', '') if c.isalpha())
                column = 0
                for char in letters: column = column * 26 + ord(char.upper()) - 64
                if not 1 <= column <= len(FIELDS): raise ValueError('Excel sütun sınırı aşıldı')
                if column in seen_columns: raise ValueError('Excel satırında yinelenen hücre')
                seen_columns.add(column)
                raw = cell.findtext('s:v', default='', namespaces=ns)
                if cell.get('t') == 's':
                    try:
                        shared_index = int(raw)
                        if not 0 <= shared_index < len(shared): raise ValueError()
                        raw = shared[shared_index]
                    except ValueError: raise ValueError('Geçersiz Excel metin başvurusu') from None
                elif cell.get('t') == 'inlineStr':
                    inline = cell.find('s:is', ns)
                    if inline is None: raise ValueError('Geçersiz Excel metni')
                    raw = ''.join(inline.itertext())
                if len(raw) > 100000: raise ValueError('Excel hücresi çok uzun')
                values[column - 1] = raw
            if headers is None:
                while values and not values[-1]: values.pop()
                if not values or len(set(values)) != len(values) or set(values) - set(FIELDS) or 'plate' not in values:
                    raise ValueError('Excel başlıkları geçersiz')
                headers = values
            elif any(values):
                if any(values[len(headers):]): raise ValueError('Başlıksız Excel verisi')
                yield dict(zip(headers, values))
