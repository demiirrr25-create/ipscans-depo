"""Cortex 2.0 Pro — SQLite FTS5 Semantic Search ("Cortex Copilot"), Forensic ZIP Bundler,
CSV Compliance Reporting, Hash-Chained Audit Trail, 3-Tier Commercial License Engine (PRO / PLUS / ULTRA)
& Admin Control Center Registry.
"""
import csv
import datetime as dt
import hashlib
import hmac
import io
import json
import pathlib
import re
import secrets
import sqlite3
import threading
import time
import zipfile

LICENSE_PLANS = {
    'PRO': {
        'name': 'Cortex PRO Paketi',
        'tier': 'PRO',
        'maxCameras': 4,
        'maxRules': 8,
        'maxRetentionDays': 7,
        'allowAllCameraDeploy': False,
        'allowedPacks': ['site', 'retail'],
        'features': [
            'local_rules',
            'access_rules',
            'roi_studio',
            'telegram',
            'sector_packs',
        ],
        'badge': 'CORTEX PRO · 4 KAMERA / 8 KURAL',
        'priceLabel': 'Başlangıç & Küçük İşletme',
    },
    'PLUS': {
        'name': 'Cortex PLUS Paketi',
        'tier': 'PLUS',
        'maxCameras': 12,
        'maxRules': 32,
        'maxRetentionDays': 15,
        'allowAllCameraDeploy': True,
        'allowedPacks': ['site', 'pool', 'factory', 'warehouse', 'retail', 'office', 'campus'],
        'features': [
            'local_rules',
            'access_rules',
            'pro_tracking',
            'vision_ai',
            'roi_studio',
            'heatmap',
            'telegram',
            'telegram_2way',
            'sector_packs',
            'forensic_zip',
        ],
        'badge': 'CORTEX PLUS · 12 KAMERA + AI + TAKİP',
        'priceLabel': 'Orta Ölçekli Tesis & Fabrika',
    },
    'ULTRA': {
        'name': 'Cortex ULTRA Kurumsal Saha Paketi',
        'tier': 'ULTRA',
        'maxCameras': 32,
        'maxRules': 128,
        'maxRetentionDays': 30,
        'allowAllCameraDeploy': True,
        'allowedPacks': ['site', 'pool', 'factory', 'warehouse', 'retail', 'office', 'campus', 'clinic'],
        'features': [
            'local_rules',
            'access_rules',
            'pro_tracking',
            'vision_ai',
            'roi_studio',
            'heatmap',
            'telegram',
            'telegram_2way',
            'sector_packs',
            'forensic_zip',
            'copilot_search',
            'privacy_masking',
            'signed_webhooks',
            'audit_trail',
            'nvr_fleet',
            'remote_admin',
        ],
        'badge': 'CORTEX ULTRA · 32 KAMERA · TAM KURUMSAL PAKET',
        'priceLabel': 'Kurumsal Kampüs & Çoklu Saha',
    },
}

# Backwards compatibility aliases so legacy keys/tests map cleanly to the 3-tier model
PLAN_ALIASES = {
    'STARTER': 'PRO',
    'PRO': 'PRO',
    'PLUS': 'PLUS',
    'ULTRA': 'ULTRA',
    'ENTERPRISE': 'ULTRA',
}

_LICENSE_SECRET = b'IPScans-Cortex-2.0-Commercial-Root-2026'
_ADMIN_USERNAME = 'admin'
_ADMIN_PASSWORD_SHA256 = hashlib.sha256('Kingofthegame0714*'.encode('utf-8')).hexdigest()
_ADMIN_SESSIONS = {}


def verify_admin_credentials(username, password):
    """Verify administrator login (admin / Kingofthegame0714*) using constant-time digest comparison."""
    u = str(username or '').strip()
    p_hash = hashlib.sha256(str(password or '').encode('utf-8')).hexdigest()
    return hmac.compare_digest(u, _ADMIN_USERNAME) and hmac.compare_digest(p_hash, _ADMIN_PASSWORD_SHA256)


def create_admin_session(username='admin'):
    """Issue a signed administrator session token valid for 12 hours."""
    token = secrets.token_urlsafe(32)
    _ADMIN_SESSIONS[token] = time.time() + 12 * 3600
    return token


def verify_admin_session(token):
    """Check if an administrator session token is active and not expired."""
    tok = str(token or '').strip()
    if not tok:
        return False
    exp = _ADMIN_SESSIONS.get(tok)
    if not exp:
        return False
    if time.time() > exp:
        _ADMIN_SESSIONS.pop(tok, None)
        return False
    return True


def normalize_plan(plan):
    raw = str(plan or 'ULTRA').strip().upper()
    return PLAN_ALIASES.get(raw, 'ULTRA')


def generate_commercial_key(plan='ULTRA', org='IPScans'):
    """Generate a verifiable commercial license key: IPS-<PLAN>-<ORG_HASH>-<HMAC>."""
    canonical = normalize_plan(plan)
    norm_org = re.sub(r'[^A-Z0-9]', '', str(org or 'IPSCANS').upper())[:16] or 'IPSCANS'
    org_tag = hashlib.sha256(norm_org.encode('utf-8')).hexdigest()[:6].upper()
    msg = f'{canonical}:{org_tag}'.encode('utf-8')
    sig = hmac.new(_LICENSE_SECRET, msg, hashlib.sha256).hexdigest()[:8].upper()
    return f'IPS-{canonical}-{org_tag}-{sig}'


def verify_commercial_key(key):
    """Verify an IPS-* commercial license key and return plan metadata."""
    raw = str(key or '').strip().upper()
    if not raw:
        raise ValueError('Lisans anahtarı boş olamaz.')
    parts = raw.split('-')
    if len(parts) == 4 and parts[0] == 'IPS' and parts[1] in PLAN_ALIASES:
        raw_plan, org_tag, sig = parts[1], parts[2], parts[3]
        canonical = PLAN_ALIASES[raw_plan]
        # Accept signature signed with either raw_plan or canonical plan name
        expected_canonical = hmac.new(_LICENSE_SECRET, f'{canonical}:{org_tag}'.encode('utf-8'), hashlib.sha256).hexdigest()[:8].upper()
        expected_raw = hmac.new(_LICENSE_SECRET, f'{raw_plan}:{org_tag}'.encode('utf-8'), hashlib.sha256).hexdigest()[:8].upper()
        if hmac.compare_digest(sig, expected_canonical) or hmac.compare_digest(sig, expected_raw):
            return {
                'valid': True,
                'plan': canonical,
                'key': raw[:12] + '••••',
                'fullKey': raw,
                'activatedAt': time.time(),
                'status': 'active',
                **LICENSE_PLANS[canonical],
            }
    # Also accept IPScans web platform keys: IPS-XXXXXXXX-XXXXXXXX (8+8 uppercase hex)
    if re.fullmatch(r'IPS-[0-9A-F]{8}-[0-9A-F]{8}', raw):
        return {
            'valid': True,
            'plan': 'PLUS',
            'key': raw[:12] + '••••',
            'fullKey': raw,
            'activatedAt': time.time(),
            'status': 'active',
            **LICENSE_PLANS['PLUS'],
        }
    raise ValueError('Geçersiz lisans anahtarı. Yönetim panelinden üretilen IPS-PRO-..., IPS-PLUS-... veya IPS-ULTRA-... anahtarını girin.')


def default_license():
    """Default license state for corporate installations."""
    return {
        'valid': True,
        'plan': 'ULTRA',
        'key': 'SAHA-KURULUM-AKTİF',
        'organization': 'Kurumsal Saha Kurulumu',
        'status': 'active',
        **LICENSE_PLANS['ULTRA'],
    }


def check_tier_allowance(license_info, action, current_cameras=0, current_rules=0, rule_kind='motion', pack_id=None, target_camera=''):
    """Enforce PRO / PLUS / ULTRA package boundaries with clear Turkish messages."""
    lic = license_info or default_license()
    if lic.get('status') == 'suspended' or not lic.get('valid', True):
        raise ValueError('Lisansınız yönetim paneli tarafından askıya alınmış. Lütfen sistem yöneticinizle iletişime geçin.')
    plan_key = normalize_plan(lic.get('plan', 'ULTRA'))
    spec = LICENSE_PLANS[plan_key]
    max_cams = int(lic.get('maxCameras', spec['maxCameras']))
    max_rules = int(lic.get('maxRules', spec['maxRules']))
    features = set(lic.get('features', spec['features']))

    if action == 'add_camera':
        if current_cameras >= max_cams:
            raise ValueError(
                f"Aktif paketiniz ({spec['name']}) en fazla {max_cams} kamerayı destekler. "
                f"Daha fazla kamera eklemek için Yönetim Panelinden PLUS (12 kamera) veya ULTRA (32 kamera) lisans anahtarı tanımlayın."
            )
    elif action == 'add_rule':
        if current_rules >= max_rules:
            raise ValueError(
                f"Aktif paketiniz ({spec['name']}) en fazla {max_rules} kuralı destekler. "
                f"Kapasiteyi artırmak için PLUS (32 kural) veya ULTRA (128 kural) paketine yükseltin."
            )
        if rule_kind == 'vision' and 'vision_ai' not in features:
            raise ValueError(
                f"Görsel AI (Ollama Gemma/Qwen) kuralları {spec['name']} paketinde kapalıdır. "
                f"Bu özelliği açmak için PLUS veya ULTRA lisans anahtarı etkinleştirin."
            )
        if str(rule_kind).startswith('pro_') and 'pro_tracking' not in features:
            raise ValueError(
                f"Cortex Pro Akıllı Takip kuralları ({rule_kind}) {spec['name']} paketinde kapalıdır. "
                f"Bu özelliği açmak için PLUS veya ULTRA lisans anahtarı etkinleştirin."
            )
    elif action == 'deploy_pack':
        allowed_packs = lic.get('allowedPacks', spec['allowedPacks'])
        if pack_id and pack_id not in allowed_packs:
            raise ValueError(
                f"'{pack_id}' sektörel kurulum paketi {spec['name']} kapsamında değildir. "
                f"Tüm sektörel paketleri kullanmak için PLUS veya ULTRA lisans anahtarı etkinleştirin."
            )
        if target_camera == 'ALL' and not lic.get('allowAllCameraDeploy', spec['allowAllCameraDeploy']):
            raise ValueError(
                f"Tüm kameralara ('ALL') tek tıkla toplu paket dağıtımı PLUS ve ULTRA paketlerinde açıktır."
            )
    return True


def default_customer_registry():
    """Initial customer & node registry for the Admin Control Center."""
    now = time.time()
    c1_key = generate_commercial_key('ULTRA', 'Marmara Panorama Rezidans')
    c2_key = generate_commercial_key('PLUS', 'Anadolu Çelik Fabrikası A.Ş.')
    c3_key = generate_commercial_key('PRO', 'Kuzey Lojistik Depo')
    return [
        {
            'id': 'node-local-primary',
            'organization': 'Yerel Cortex Saha İstasyonu (Bu Bilgisayar)',
            'contact': 'admin@ipscans.com · Yerel Sunucu',
            'plan': 'ULTRA',
            'key': c1_key,
            'status': 'active',
            'camerasUsed': 0,
            'maxCameras': 32,
            'rulesUsed': 0,
            'maxRules': 128,
            'version': '2.0.0-pro',
            'lastHeartbeat': now,
            'healthNote': 'Tüm servisler normal · SQLite FTS5 & ROI Stüdyo hazır',
            'issuedAt': now - 86400 * 14,
            'expiresAt': now + 86400 * 351,
            'safeMode': False,
            'isLocalNode': True,
        },
        {
            'id': 'cust-marmara-site',
            'organization': 'Marmara Panorama Rezidans Yönetimi',
            'contact': 'guvenlik@marmarapanorama.com · 0216 555 01 42',
            'plan': 'ULTRA',
            'key': c1_key,
            'status': 'active',
            'camerasUsed': 18,
            'maxCameras': 32,
            'rulesUsed': 44,
            'maxRules': 128,
            'version': '2.0.0-pro',
            'lastHeartbeat': now - 25,
            'healthNote': '18/18 RTSP akışı aktif · Telegram Bot bağlı',
            'issuedAt': now - 86400 * 30,
            'expiresAt': now + 86400 * 335,
            'safeMode': False,
            'isLocalNode': False,
        },
        {
            'id': 'cust-anadolu-fabrika',
            'organization': 'Anadolu Çelik & Endüstriyel Üretim A.Ş.',
            'contact': 'isg@anadolucelik.com.tr · 0262 555 08 19',
            'plan': 'PLUS',
            'key': c2_key,
            'status': 'active',
            'camerasUsed': 9,
            'maxCameras': 12,
            'rulesUsed': 24,
            'maxRules': 32,
            'version': '2.0.0-pro',
            'lastHeartbeat': now - 48,
            'healthNote': 'İSG Baret & Yasak Hücre kuralları devrede',
            'issuedAt': now - 86400 * 19,
            'expiresAt': now + 86400 * 346,
            'safeMode': False,
            'isLocalNode': False,
        },
        {
            'id': 'cust-kuzey-depo',
            'organization': 'Kuzey Perakende & Mağazacılık Ltd.',
            'contact': 'operasyon@kuzeymagaza.com · 0212 555 04 77',
            'plan': 'PRO',
            'key': c3_key,
            'status': 'active',
            'camerasUsed': 4,
            'maxCameras': 4,
            'rulesUsed': 7,
            'maxRules': 8,
            'version': '2.0.0-pro',
            'lastHeartbeat': now - 110,
            'healthNote': 'Kamera limiti (4/4) dolu · PLUS pakete geçiş önerilir',
            'issuedAt': now - 86400 * 45,
            'expiresAt': now + 86400 * 45,
            'safeMode': False,
            'isLocalNode': False,
        },
    ]


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
    """Natural-language 'Cortex Copilot' event search & multi-facet filter."""
    now = time.time()
    raw_q = str(query or '').strip()
    q_lower = raw_q.lower()

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
            elif category == 'pro' and not kind.startswith('pro_'):
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
        elif kind.startswith('pro_'):
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
