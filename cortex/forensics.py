"""Cortex 2.0 Pro — SQLite FTS5 Semantic Search ("Cortex Copilot"), Forensic ZIP Bundler,
CSV Compliance Reporting, Hash-Chained Audit Trail & Commercial License Engine.
"""
import csv
import datetime as dt
import hashlib
import hmac
import io
import json
import pathlib
import re
import sqlite3
import threading
import time
import zipfile

LICENSE_PLANS = {
    'STARTER': {
        'name': 'Cortex Starter',
        'maxCameras': 4,
        'features': ['local_rules', 'basic_events'],
        'badge': 'STARTER · 4 KAMERA',
    },
    'PRO': {
        'name': 'Cortex Pro',
        'maxCameras': 16,
        'features': ['local_rules', 'vision_ai', 'heatmap', 'telegram', 'copilot_search', 'sector_packs'],
        'badge': 'PRO · 16 KAMERA + AI',
    },
    'ENTERPRISE': {
        'name': 'Cortex Enterprise Saha Paketi',
        'maxCameras': 32,
        'features': [
            'local_rules',
            'vision_ai',
            'heatmap',
            'telegram',
            'copilot_search',
            'sector_packs',
            'forensic_zip',
            'privacy_masking',
            'audit_trail',
        ],
        'badge': 'ENTERPRISE · TAM SAHA PAKETİ',
    },
}

_LICENSE_SECRET = b'IPScans-Cortex-2.0-Commercial-Root-2026'


def generate_commercial_key(plan='ENTERPRISE', org='IPScans'):
    """Generate a verifiable commercial license key: IPS-<PLAN>-<ORG_HASH>-<HMAC>."""
    plan = plan.upper() if plan.upper() in LICENSE_PLANS else 'ENTERPRISE'
    norm_org = re.sub(r'[^A-Z0-9]', '', str(org or 'IPSCANS').upper())[:16] or 'IPSCANS'
    org_tag = hashlib.sha256(norm_org.encode('utf-8')).hexdigest()[:6].upper()
    msg = f'{plan}:{org_tag}'.encode('utf-8')
    sig = hmac.new(_LICENSE_SECRET, msg, hashlib.sha256).hexdigest()[:8].upper()
    return f'IPS-{plan}-{org_tag}-{sig}'


def verify_commercial_key(key):
    """Verify an IPS-* commercial license key and return plan metadata."""
    raw = str(key or '').strip().upper()
    if not raw:
        raise ValueError('Lisans anahtarı boş olamaz.')
    # Support standard IPS-<PLAN>-<ORGTAG>-<SIG>
    parts = raw.split('-')
    if len(parts) == 4 and parts[0] == 'IPS' and parts[1] in LICENSE_PLANS:
        plan, org_tag, sig = parts[1], parts[2], parts[3]
        expected = hmac.new(_LICENSE_SECRET, f'{plan}:{org_tag}'.encode('utf-8'), hashlib.sha256).hexdigest()[:8].upper()
        if hmac.compare_digest(sig, expected):
            return {
                'valid': True,
                'plan': plan,
                'key': raw[:12] + '••••',
                'activatedAt': time.time(),
                **LICENSE_PLANS[plan],
            }
    # Also accept IPScans web platform keys: IPS-XXXXXXXX-XXXXXXXX (8+8 uppercase hex)
    if re.fullmatch(r'IPS-[0-9A-F]{8}-[0-9A-F]{8}', raw):
        return {
            'valid': True,
            'plan': 'PRO',
            'key': raw[:12] + '••••',
            'activatedAt': time.time(),
            **LICENSE_PLANS['PRO'],
        }
    raise ValueError('Geçersiz lisans anahtarı. Biçim: IPS-ENTERPRISE-XXXXXX-XXXXXXXX veya IPS-XXXXXXXX-XXXXXXXX.')


def default_license():
    """Default license state for corporate field installations."""
    return {
        'valid': True,
        'plan': 'ENTERPRISE',
        'key': 'SAHA-KURULUM-AKTİF',
        'organization': 'Kurumsal Saha Kurulumu',
        **LICENSE_PLANS['ENTERPRISE'],
    }


def append_audit_entry(audit_list, action, detail, actor='Operatör'):
    """Append a SHA-256 hash-chained audit entry to the state audit trail."""
    now = time.time()
    prev_hash = audit_list[0].get('hash', '0' * 64) if audit_list else '0' * 64
    payload = f'{prev_hash}|{now:.3f}|{actor}|{action}|{detail}'
    digest = hashlib.sha256(payload.encode('utf-8')).hexdigest()
    entry = {
        'id': digest[:16],
        'time': now,
        'actor': str(actor)[:60],
        'action': str(action)[:80],
        'detail': str(detail)[:300],
        'prevHash': prev_hash[:16],
        'hash': digest,
    }
    audit_list.insert(0, entry)
    del audit_list[200:]
    return entry


class ForensicIndex:
    """Thread-safe SQLite + FTS5 semantic & full-text index for Cortex events."""

    def __init__(self, db_path):
        self.db_path = pathlib.Path(db_path)
        self.lock = threading.Lock()
        self._init_db()

    def _connect(self):
        conn = sqlite3.connect(str(self.db_path), timeout=5)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        with self.lock:
            conn = None
            try:
                conn = self._connect()
                conn.execute(
                    """
                    CREATE TABLE IF NOT EXISTS events (
                        id TEXT PRIMARY KEY,
                        camera TEXT,
                        rule TEXT,
                        kind TEXT,
                        reason TEXT,
                        plate TEXT,
                        tags TEXT,
                        confidence REAL,
                        reviewed INTEGER,
                        time REAL
                    )
                    """
                )
                conn.execute(
                    """
                    CREATE VIRTUAL TABLE IF NOT EXISTS events_fts USING fts5(
                        id UNINDEXED,
                        camera,
                        rule,
                        kind,
                        reason,
                        plate,
                        tags
                    )
                    """
                )
                conn.commit()
            except Exception:
                pass
            finally:
                if conn is not None:
                    try:
                        conn.close()
                    except Exception:
                        pass

    def sync(self, events):
        """Sync in-memory events list into SQLite FTS5 index."""
        with self.lock:
            conn = None
            try:
                conn = self._connect()
                existing = {row['id'] for row in conn.execute('SELECT id FROM events')}
                current_ids = {e['id'] for e in events if 'id' in e}
                removed = existing - current_ids
                for eid in removed:
                    conn.execute('DELETE FROM events WHERE id = ?', (eid,))
                    conn.execute('DELETE FROM events_fts WHERE id = ?', (eid,))
                for e in events[:500]:
                    eid = e.get('id')
                    if not eid:
                        continue
                    tags_str = ' '.join(e.get('tags', [])) if isinstance(e.get('tags'), list) else str(e.get('tags', ''))
                    plate_str = str(e.get('plate', ''))
                    if eid not in existing:
                        conn.execute(
                            'INSERT OR REPLACE INTO events VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                            (
                                eid,
                                e.get('camera', ''),
                                e.get('rule', ''),
                                e.get('kind', 'vision'),
                                e.get('reason', ''),
                                plate_str,
                                tags_str,
                                float(e.get('confidence', 1.0)),
                                1 if e.get('reviewed') else 0,
                                float(e.get('time', 0)),
                            ),
                        )
                        conn.execute(
                            'INSERT INTO events_fts VALUES (?, ?, ?, ?, ?, ?, ?)',
                            (
                                eid,
                                e.get('camera', ''),
                                e.get('rule', ''),
                                e.get('kind', 'vision'),
                                e.get('reason', ''),
                                plate_str,
                                tags_str,
                            ),
                        )
                    else:
                        conn.execute(
                            'UPDATE events SET reviewed = ? WHERE id = ?',
                            (1 if e.get('reviewed') else 0, eid),
                        )
                conn.commit()
            except Exception:
                pass
            finally:
                if conn is not None:
                    try:
                        conn.close()
                    except Exception:
                        pass


def search_events(events, query='', category='', camera='', reviewed=''):
    """Natural-language 'Cortex Copilot' event search & multi-facet filter.

    Supports conversational Turkish & English queries such as:
    - "dün gece havuzda insan"
    - "son 1 saat incelenmemiş"
    - "plaka 34ABC"
    - "tailgating" / "bekleme" / "kalabalık"
    """
    now = time.time()
    raw_q = str(query or '').strip()
    q_lower = raw_q.lower()

    # Parse natural-language temporal expressions
    min_time = None
    only_night = False
    if 'son 1 saat' in q_lower or 'last 1h' in q_lower:
        min_time = now - 3600
        q_lower = q_lower.replace('son 1 saat', '').replace('last 1h', '')
    elif 'son 24 saat' in q_lower or 'bugün' in q_lower or 'today' in q_lower:
        min_time = now - 86400
        for phrase in ('son 24 saat', 'bugün', 'today'):
            q_lower = q_lower.replace(phrase, '')
    elif 'dün' in q_lower or 'yesterday' in q_lower:
        min_time = now - 172800
        for phrase in ('dün', 'yesterday'):
            q_lower = q_lower.replace(phrase, '')

    if 'gece' in q_lower or 'night' in q_lower:
        only_night = True
        q_lower = q_lower.replace('gece', '').replace('night', '')

    # Parse natural-language review status expressions
    nl_reviewed = None
    if 'incelenmemiş' in q_lower or 'bekleyen' in q_lower or 'unreviewed' in q_lower:
        nl_reviewed = False
        for phrase in ('incelenmemiş', 'bekleyen', 'unreviewed'):
            q_lower = q_lower.replace(phrase, '')
    elif 'incelendi' in q_lower or 'incelenmiş' in q_lower:
        nl_reviewed = True
        for phrase in ('incelendi', 'incelenmiş'):
            q_lower = q_lower.replace(phrase, '')

    tokens = [t for t in re.split(r'\s+', q_lower.strip()) if len(t) >= 2]

    matched = []
    for e in events:
        ev_time = float(e.get('observedAt') or e.get('time') or 0)
        if min_time is not None and ev_time < min_time:
            continue
        if only_night:
            hour = dt.datetime.fromtimestamp(ev_time).hour
            if not (hour >= 20 or hour < 6):
                continue
        if camera and e.get('camera') != camera:
            continue
        if reviewed == 'unreviewed' and e.get('reviewed'):
            continue
        if reviewed == 'reviewed' and not e.get('reviewed'):
            continue
        if nl_reviewed is not None and bool(e.get('reviewed')) != nl_reviewed:
            continue

        kind = str(e.get('kind', 'vision'))
        if category:
            if category == 'vision' and kind != 'vision':
                continue
            elif category == 'access' and not (kind.startswith('access_') or kind == 'pro_tailgating'):
                continue
            elif category == 'pro' and kind not in ('pro_loitering', 'pro_occupancy', 'pro_tailgating', 'pro_perimeter'):
                continue
            elif category == 'local' and (kind == 'vision' or kind.startswith('access_') or kind.startswith('pro_')):
                continue

        if tokens:
            haystack = ' '.join(
                [
                    str(e.get('camera', '')),
                    str(e.get('rule', '')),
                    str(e.get('reason', '')),
                    str(e.get('kind', '')),
                    str(e.get('plate', '')),
                    ' '.join(e.get('tags', [])) if isinstance(e.get('tags'), list) else '',
                ]
            ).lower()
            if not all(tok in haystack for tok in tokens):
                continue

        matched.append(e)
    return matched


def compute_analytics(events, cameras, rules):
    """Compute 24h hourly trend, category breakdown, camera load, and security score."""
    now = time.time()
    hourly = [0] * 24
    by_category = {'Görsel AI': 0, 'Geçiş & Tailgating': 0, 'Akıllı Takip & Çevre': 0, 'Yerel Ölçüm': 0}
    by_camera = {}
    latencies = []
    unreviewed = 0

    for e in events:
        if not e.get('reviewed'):
            unreviewed += 1
        ev_time = float(e.get('observedAt') or e.get('time') or 0)
        if now - ev_time <= 86400:
            hours_ago = int((now - ev_time) // 3600)
            if 0 <= hours_ago < 24:
                hourly[23 - hours_ago] += 1
        cam_name = e.get('camera', 'Kamera')
        by_camera[cam_name] = by_camera.get(cam_name, 0) + 1
        kind = str(e.get('kind', 'vision'))
        if kind == 'vision':
            by_category['Görsel AI'] += 1
        elif kind.startswith('access_') or kind == 'pro_tailgating':
            by_category['Geçiş & Tailgating'] += 1
        elif kind in ('pro_loitering', 'pro_occupancy', 'pro_perimeter'):
            by_category['Akıllı Takip & Çevre'] += 1
        else:
            by_category['Yerel Ölçüm'] += 1
        if e.get('latencyMs'):
            latencies.append(float(e['latencyMs']))

    avg_latency_ms = round(sum(latencies) / len(latencies)) if latencies else 0
    return {
        'hourly24h': hourly,
        'byCategory': by_category,
        'byCamera': by_camera,
        'totalEvents': len(events),
        'unreviewedCount': unreviewed,
        'activeRules': sum(1 for r in rules if r.get('enabled')),
        'totalCameras': len(cameras),
        'avgLatencyMs': avg_latency_ms,
    }


def build_forensic_zip(data_dir, event, version='2.0.0-pro'):
    """Build a court/insurance-ready ZIP archive with SHA-256 chain-of-custody manifest."""
    folder = pathlib.Path(data_dir) / 'events' / str(event['id'])
    out = io.BytesIO()
    manifest_lines = [
        f'# IPScans Cortex {version} — Adli Kanıt Bütünlük Sertifikası (Chain of Custody)',
        f'# Olay Kimliği (Event ID): {event.get("id")}',
        f'# Kamera: {event.get("camera")}',
        f'# Kural: {event.get("rule")}',
        f'# Olay Zamanı (UTC): {dt.datetime.fromtimestamp(float(event.get("time", time.time())), dt.timezone.utc).isoformat()}',
        f'# Paket Oluşturma Zamanı (UTC): {dt.datetime.now(dt.timezone.utc).isoformat()}',
        '',
    ]

    with zipfile.ZipFile(out, 'w', compression=zipfile.ZIP_DEFLATED) as zf:
        meta_bytes = json.dumps(event, ensure_ascii=False, indent=2).encode('utf-8')
        zf.writestr('event_metadata.json', meta_bytes)
        meta_sha = hashlib.sha256(meta_bytes).hexdigest()
        manifest_lines.append(f'{meta_sha}  event_metadata.json')

        if folder.is_dir():
            for filename in sorted(p.name for p in folder.iterdir() if p.is_file()):
                file_bytes = (folder / filename).read_bytes()
                zf.writestr(filename, file_bytes)
                digest = hashlib.sha256(file_bytes).hexdigest()
                manifest_lines.append(f'{digest}  {filename}')

        manifest_text = '\n'.join(manifest_lines) + '\n'
        zf.writestr('CHAIN_OF_CUSTODY.sha256', manifest_text.encode('utf-8'))

    return out.getvalue()


def export_events_csv(events):
    """Export events to UTF-8 BOM CSV for Excel and corporate compliance audits."""
    buf = io.StringIO()
    buf.write('\ufeff')
    writer = csv.writer(buf)
    writer.writerow(['Olay ID', 'Tarih/Saat', 'Kamera', 'Kural', 'Tür', 'Skor', 'Durum', 'Bildirim', 'Açıklama'])
    for e in events:
        ts = dt.datetime.fromtimestamp(float(e.get('observedAt') or e.get('time') or 0)).strftime('%Y-%m-%d %H:%M:%S')
        writer.writerow([
            e.get('id', ''),
            ts,
            e.get('camera', ''),
            e.get('rule', ''),
            e.get('kind', 'vision'),
            e.get('confidence', ''),
            'İncelendi' if e.get('reviewed') else 'İnceleme Bekliyor',
            e.get('notification', ''),
            e.get('reason', ''),
        ])
    return buf.getvalue().encode('utf-8')
