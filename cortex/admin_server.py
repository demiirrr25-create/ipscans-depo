"""IPScans Cortex 2.0.0-pro — Bağımsız Geliştirici & Lisans Yönetim Merkezi (Port 8766).

Ana Cortex uygulamasından (Port 8765) tamamen ayrı bir portta (127.0.0.1:8766) ve ayrı bir
EXE (CortexAdmin.exe) olarak çalışır. %LOCALAPPDATA%\\IPScansCortex\\config.enc (vault.key)
şifreli veri kasasını paylaşarak yazılımcının tanımladığı müşteri hesaplarını, Cortex giriş
kullanıcı adı/şifrelerini, PRO / PLUS / ULTRA paketlerini, kamera/kural kotalarını ve
Telegram telefon numarası limitlerini (2 / 5 / 10) anında Cortex.exe üzerinde zorunlu kılar.
"""
import base64
import copy
import hashlib
import hmac
import http.server
import json
import os
import pathlib
import re
import secrets
import shutil
import socket
import subprocess
import sys
import threading
import time
import urllib.parse
import uuid
import webbrowser
from cryptography.fernet import Fernet

import forensics
import iot_automation

VERSION = "2.4.0"
ROOT = pathlib.Path(getattr(sys, '_MEIPASS', pathlib.Path(__file__).parent))
DATA = pathlib.Path(
    os.environ.get(
        'CORTEX_DATA',
        str(pathlib.Path(os.environ.get('LOCALAPPDATA', str(pathlib.Path.home()))) / 'IPScansCortex'),
    )
)
DATA.mkdir(parents=True, exist_ok=True)
KEY = DATA / 'vault.key'
if not KEY.exists():
    KEY.write_bytes(Fernet.generate_key())
VAULT = forensics.MultiLayerVault(KEY.read_bytes())
LOCK = threading.RLock()
TOKEN = secrets.token_urlsafe(32)
PORT = int(os.environ.get('CORTEX_ADMIN_PORT', '8766'))
CORTEX_CLIENT_PORT = int(os.environ.get('CORTEX_PORT', '8765'))
LOGIN_ATTEMPTS = {}

# 3-Tier Commercial Plans with Telegram Bot Phone Quotas (PRO: 2, PLUS: 5, ULTRA: 10)
ADMIN_PLANS = {
    'PRO': {
        **forensics.LICENSE_PLANS['PRO'],
        'maxCameras': 4,
        'maxRules': 8,
        'maxTelegramPhones': 2,
        'badge': 'CORTEX PRO · 4 KAMERA / 8 KURAL / 2 TELEGRAM NUMARASI',
        'summary': '4 Kamera · 8 Kural · 2 Telegram Numarası · 7 Gün Arşiv',
    },
    'PLUS': {
        **forensics.LICENSE_PLANS['PLUS'],
        'maxCameras': 12,
        'maxRules': 32,
        'maxTelegramPhones': 5,
        'badge': 'CORTEX PLUS · 12 KAMERA / 32 KURAL / 5 TELEGRAM NUMARASI',
        'summary': '12 Kamera · 32 Kural · 5 Telegram Numarası · Görsel AI & Akıllı Takip',
    },
    'ULTRA': {
        **forensics.LICENSE_PLANS['ULTRA'],
        'maxCameras': 32,
        'maxRules': 128,
        'maxTelegramPhones': 10,
        'badge': 'CORTEX ULTRA · 32 KAMERA / 128 KURAL / 10 TELEGRAM NUMARASI',
        'summary': '32 Kamera · 128 Kural · 10 Telegram Numarası · Tam Kurumsal Saha Paketi',
    },
}

DEFAULT_CUSTOMER_CREDENTIALS = {
    'node-local-primary': ('cortex', 'Cortex2026*'),
    'cust-marmara-site': ('marmara', 'Marmara2026*'),
    'cust-anadolu-fabrika': ('anadolu', 'Anadolu2026*'),
    'cust-kuzey-depo': ('kuzey', 'Kuzey2026*'),
}


class InputError(ValueError):
    """Explicitly authored validation message safe to display in the Admin UI."""


def _slug_username(text, fallback='musteri'):
    raw = str(text or '').lower()
    tr_map = str.maketrans('çğıöşüÇĞİÖŞÜ', 'cgiosuCGIOSU')
    raw = raw.translate(tr_map)
    cleaned = re.sub(r'[^a-z0-9]+', '_', raw).strip('_')
    return (cleaned[:24] or fallback)


def _hash_password(password):
    return forensics.hash_user_password(password)


def normalize_customer_record(c, idx=0):
    """Ensure every customer entry has login credentials, license key, and 3-tier + Telegram quotas."""
    now = time.time()
    cid = str(c.get('id') or f'cust-{uuid.uuid4().hex[:8]}').strip()
    org = str(c.get('organization') or 'Kurumsal Müşteri').strip()
    plan = forensics.normalize_plan(c.get('plan', 'ULTRA'))
    spec = ADMIN_PLANS.get(plan, ADMIN_PLANS['ULTRA'])

    default_user, default_pw = DEFAULT_CUSTOMER_CREDENTIALS.get(
        cid, (_slug_username(org, f'musteri{idx + 1}'), 'Cortex2026!')
    )
    username = str(c.get('username') or default_user).strip()
    pw_hint = str(c.get('passwordHint') or c.get('password') or default_pw)
    pw_hash = str(c.get('passwordHash') or _hash_password(pw_hint))

    lic_key = str(c.get('key') or c.get('licenseKey') or '').strip()
    if not lic_key or lic_key == 'SAHA-KURULUM-AKTİF':
        lic_key = forensics.generate_commercial_key(plan, org)

    max_cams = max(1, int(c.get('maxCameras') or spec['maxCameras']))
    max_rules = max(1, int(c.get('maxRules') or spec['maxRules']))
    max_tg_phones = max(2, int(c.get('maxTelegramPhones') or spec['maxTelegramPhones']))

    issued_at = float(c.get('issuedAt') or c.get('createdAt') or (now - 86400))
    expires_at = float(c.get('expiresAt') or (now + 365 * 86400))
    days_remaining = max(0, int(round((expires_at - now) / 86400)))
    status = 'suspended' if c.get('status') == 'suspended' else 'active'

    c.update({
        'id': cid,
        'organization': org,
        'username': username,
        'passwordHash': pw_hash,
        'passwordHint': pw_hint,
        'contact': str(c.get('contact') or 'Belirtilmedi').strip(),
        'plan': plan,
        'planName': spec['name'],
        'key': lic_key,
        'licenseKey': lic_key,
        'status': status,
        'maxCameras': max_cams,
        'maxRules': max_rules,
        'maxTelegramPhones': max_tg_phones,
        'camerasUsed': int(c.get('camerasUsed', 0)),
        'rulesUsed': int(c.get('rulesUsed', 0)),
        'telegramPhonesUsed': int(c.get('telegramPhonesUsed', 0)),
        'createdAt': issued_at,
        'issuedAt': issued_at,
        'expiresAt': expires_at,
        'daysRemaining': days_remaining,
        'lastSeen': float(c.get('lastSeen') or c.get('lastHeartbeat') or now),
        'lastHeartbeat': float(c.get('lastHeartbeat') or c.get('lastSeen') or now),
        'version': str(c.get('version') or VERSION),
        'health': str(c.get('health') or c.get('healthNote') or 'Lisans ve kullanıcı hesabı aktif'),
        'healthNote': str(c.get('healthNote') or c.get('health') or 'Lisans ve kullanıcı hesabı aktif'),
        'isLocalNode': bool(c.get('isLocalNode', cid == 'node-local-primary')),
    })
    return c


def _default_state():
    return {
        'activeTenantId': 'node-local-primary',
        'tenantWorkspaces': {},
        'cameras': [],
        'rules': [],
        'events': [],
        'devices': [],
        'model': 'gemma3:4b',
        'retention': 7,
        'webhook': '',
        'webhookSecret': '',
        'autostart': False,
        'aiInterval': 1,
        'soundAlert': True,
        'smartCascade': True,
        'safeMode': False,
        'telegram': {
            'botToken': iot_automation.OFFICIAL_BOT_TOKEN,
            'chatId': '',
            'phone': '',
            'phoneDisplay': '',
            'phones': [],
            'phoneDirectory': {},
            'knownChats': {},
            'enabled': True,
            'botUsername': iot_automation.OFFICIAL_BOT_USERNAME,
            'lastUpdateId': 0,
            'maxPhones': 10,
        },
        'telegramBotLog': [],
        'license': forensics.default_license(),
        'customers': forensics.default_customer_registry(),
        'issuedLicenses': [],
        'audit': [],
    }


STATE = _default_state()
deduplicate_customers = forensics.deduplicate_customers


def _sanitize_admin_telegram(tg_dict: dict, tenant_id: str) -> dict:
    """Enforce strict ownerId isolation on a Telegram state dict in the Admin server."""
    tid = str(tenant_id or 'node-local-primary').strip() or 'node-local-primary'
    if not isinstance(tg_dict, dict):
        tg_dict = forensics.default_tenant_workspace(tid)['telegram']
    tg_owner = str(tg_dict.get('ownerId') or '').strip()
    if tg_owner and tg_owner != tid:
        tg_dict['phone'] = ''
        tg_dict['phoneDisplay'] = ''
        tg_dict['chatId'] = ''
        tg_dict['phones'] = []
        tg_dict['phoneDirectory'] = {}
        tg_dict['knownChats'] = {}
    tg_dict['ownerId'] = tid
    raw_phones = tg_dict.get('phones') if isinstance(tg_dict.get('phones'), list) else []
    filtered = []
    for p in raw_phones:
        if not isinstance(p, dict):
            continue
        p_owner = str(p.get('ownerId') or '').strip()
        if tid != 'node-local-primary':
            if p.get('title') == 'Varsayılan Yönetici Hattı':
                continue
            if p_owner != tid:
                continue
        else:
            if p_owner and p_owner != tid:
                continue
        p_copy = dict(p)
        p_copy['ownerId'] = tid
        filtered.append(p_copy)
    tg_dict['phones'] = filtered
    if not filtered:
        tg_dict['phone'] = ''
        tg_dict['phoneDisplay'] = ''
        tg_dict['chatId'] = ''
        tg_dict['phoneDirectory'] = {}
        tg_dict['knownChats'] = {}
    return tg_dict


def load_state():
    """Read and decrypt the shared %LOCALAPPDATA%\\IPScansCortex\\config.enc state from disk."""
    with LOCK:
        fresh = _default_state()
        enc_file = DATA / 'config.enc'
        if enc_file.exists():
            try:
                decrypted = json.loads(VAULT.decrypt(enc_file.read_bytes()))
                if isinstance(decrypted, dict):
                    fresh.update(decrypted)
            except Exception:
                pass

        fresh.setdefault('customers', forensics.default_customer_registry())
        if not isinstance(fresh['customers'], list) or not fresh['customers']:
            fresh['customers'] = forensics.default_customer_registry()

        fresh.setdefault('issuedLicenses', [])
        fresh.setdefault('audit', [])
        fresh.setdefault('license', forensics.default_license())
        fresh.setdefault('tenantWorkspaces', {})

        lic = fresh['license']
        tier = forensics.normalize_plan(lic.get('plan', 'ULTRA'))
        spec = ADMIN_PLANS.get(tier, ADMIN_PLANS['ULTRA'])
        lic.setdefault('plan', tier)
        lic.setdefault('tier', tier)
        lic.setdefault('maxCameras', spec['maxCameras'])
        lic.setdefault('maxRules', spec['maxRules'])
        lic.setdefault('maxTelegramPhones', spec['maxTelegramPhones'])

        active_cust_id = str(fresh.get('activeTenantId') or lic.get('customerId') or 'node-local-primary').strip()
        fresh['activeTenantId'] = active_cust_id
        workspaces = fresh.get('tenantWorkspaces') if isinstance(fresh.get('tenantWorkspaces'), dict) else {}

        max_uid = int((fresh.get('telegram') or {}).get('lastUpdateId', 0) or 0)
        for tid_k, ws_v in list(workspaces.items()):
            if isinstance(ws_v, dict) and isinstance(ws_v.get('telegram'), dict):
                max_uid = max(max_uid, int(ws_v['telegram'].get('lastUpdateId', 0) or 0))
                _sanitize_admin_telegram(ws_v['telegram'], tid_k)

        tg = fresh.setdefault('telegram', {})
        _sanitize_admin_telegram(tg, active_cust_id)
        tg['lastUpdateId'] = max(int(tg.get('lastUpdateId', 0) or 0), max_uid)
        for tid_k, ws_v in list(workspaces.items()):
            if isinstance(ws_v, dict) and isinstance(ws_v.get('telegram'), dict):
                ws_v['telegram']['lastUpdateId'] = max(int(ws_v['telegram'].get('lastUpdateId', 0) or 0), max_uid)

        phones_list = tg.get('phones') if isinstance(tg.get('phones'), list) else []
        tg_count = len(phones_list)

        deduplicate_customers(fresh['customers'])
        valid_cust_ids = {c.get('id') for c in fresh['customers'] if isinstance(c, dict) and c.get('id')}
        if active_cust_id not in valid_cust_ids and fresh['customers']:
            active_cust_id = str(fresh['customers'][0].get('id') or 'node-local-primary').strip()
            fresh['activeTenantId'] = active_cust_id
        for idx, cust in enumerate(fresh['customers']):
            normalize_customer_record(cust, idx)
            cust['isLocalNode'] = (cust['id'] == active_cust_id)
            ws = workspaces.get(cust['id']) if isinstance(workspaces, dict) else None
            if cust['id'] == active_cust_id:
                cust['camerasUsed'] = len(fresh.get('cameras', []))
                cust['rulesUsed'] = len(fresh.get('rules', []))
                cust['telegramPhonesUsed'] = tg_count
            elif isinstance(ws, dict):
                cust['camerasUsed'] = len(ws.get('cameras', []))
                cust['rulesUsed'] = len(ws.get('rules', []))
                ws_tg = ws.get('telegram') if isinstance(ws.get('telegram'), dict) else {}
                ws_phones = ws_tg.get('phones') if isinstance(ws_tg.get('phones'), list) else []
                cust['telegramPhonesUsed'] = len(ws_phones)
            else:
                cust['camerasUsed'] = 0
                cust['rulesUsed'] = 0
                cust['telegramPhonesUsed'] = 0

        STATE.clear()
        STATE.update(fresh)
        return STATE


def save_state():
    """Atomically encrypt and write STATE to %LOCALAPPDATA%\\IPScansCortex\\config.enc."""
    with LOCK:
        deduplicate_customers(STATE.setdefault('customers', []))
        tmp = DATA / 'config.tmp'
        tmp.write_bytes(VAULT.encrypt(json.dumps(STATE, ensure_ascii=False).encode('utf-8')))
        tmp.replace(DATA / 'config.enc')


def audit(action, detail, actor='admin'):
    with LOCK:
        forensics.append_audit_entry(STATE.setdefault('audit', []), action, detail, actor)


def apply_customer_to_local(cust):
    """Activate the given customer account, isolated workspace, package, and quotas on the local Cortex station."""
    with LOCK:
        normalize_customer_record(cust)
        plan = forensics.normalize_plan(cust.get('plan', 'ULTRA'))
        spec = ADMIN_PLANS.get(plan, ADMIN_PLANS['ULTRA'])
        is_active = cust.get('status', 'active') != 'suspended'

        workspaces = STATE.setdefault('tenantWorkspaces', {})
        prev_tid = str(STATE.get('activeTenantId') or STATE.get('license', {}).get('customerId') or 'node-local-primary').strip()
        if prev_tid and (prev_tid != cust['id'] or prev_tid not in workspaces):
            prev_tg = copy.deepcopy(STATE.get('telegram', forensics.default_tenant_workspace(prev_tid)['telegram']))
            _sanitize_admin_telegram(prev_tg, prev_tid)
            workspaces[prev_tid] = {
                'tenantId': prev_tid,
                'cameras': [{**c, 'ownerId': prev_tid} for c in copy.deepcopy(STATE.get('cameras', [])) if isinstance(c, dict) and c.get('ownerId', prev_tid) == prev_tid],
                'rules': [{**r, 'ownerId': prev_tid} for r in copy.deepcopy(STATE.get('rules', [])) if isinstance(r, dict) and r.get('ownerId', prev_tid) == prev_tid],
                'events': [{**e, 'ownerId': prev_tid} for e in copy.deepcopy(STATE.get('events', [])) if isinstance(e, dict) and e.get('ownerId', prev_tid) == prev_tid],
                'devices': [{**d, 'ownerId': prev_tid} for d in copy.deepcopy(STATE.get('devices', [])) if isinstance(d, dict) and d.get('ownerId', prev_tid) == prev_tid],
                'telegram': prev_tg,
                'telegramBotLog': copy.deepcopy(STATE.get('telegramBotLog', [])),
                'webhook': str(STATE.get('webhook', '')),
                'webhookSecret': str(STATE.get('webhookSecret', '')),
                'safeMode': bool(STATE.get('safeMode', False)),
            }

        target_ws = workspaces.get(cust['id'])
        if not isinstance(target_ws, dict):
            target_ws = forensics.default_tenant_workspace(cust['id'])
            workspaces[cust['id']] = copy.deepcopy(target_ws)
        else:
            target_ws = copy.deepcopy(target_ws)

        STATE['cameras'] = [{**c, 'ownerId': cust['id']} for c in target_ws.get('cameras', []) if isinstance(c, dict) and c.get('ownerId', cust['id']) == cust['id']]
        STATE['rules'] = [{**r, 'ownerId': cust['id']} for r in target_ws.get('rules', []) if isinstance(r, dict) and r.get('ownerId', cust['id']) == cust['id']]
        STATE['events'] = [{**e, 'ownerId': cust['id']} for e in target_ws.get('events', []) if isinstance(e, dict) and e.get('ownerId', cust['id']) == cust['id']]
        STATE['devices'] = [{**d, 'ownerId': cust['id']} for d in target_ws.get('devices', []) if isinstance(d, dict) and d.get('ownerId', cust['id']) == cust['id']]
        target_tg = copy.deepcopy(target_ws.get('telegram') or forensics.default_tenant_workspace(cust['id'])['telegram'])
        _sanitize_admin_telegram(target_tg, cust['id'])
        STATE['telegram'] = target_tg
        workspaces[cust['id']]['telegram'] = copy.deepcopy(target_tg)
        STATE['telegramBotLog'] = list(target_ws.get('telegramBotLog', []))
        STATE['webhook'] = str(target_ws.get('webhook', ''))
        STATE['webhookSecret'] = str(target_ws.get('webhookSecret', ''))

        STATE['activeTenantId'] = cust['id']

        lic_obj = {
            **spec,
            'valid': is_active,
            'plan': plan,
            'tier': plan,
            'name': spec['name'],
            'key': cust['key'],
            'fullKey': cust['key'],
            'licenseKey': cust['key'],
            'organization': cust['organization'],
            'username': cust['username'],
            'passwordHash': cust['passwordHash'],
            'passwordHint': cust['passwordHint'],
            'customerId': cust['id'],
            'contact': cust.get('contact', ''),
            'status': cust.get('status', 'active'),
            'maxCameras': int(cust['maxCameras']),
            'maxRules': int(cust['maxRules']),
            'maxTelegramPhones': int(cust['maxTelegramPhones']),
            'activatedAt': time.time(),
            'expiresAt': float(cust.get('expiresAt', time.time() + 365 * 86400)),
            'badge': f"CORTEX {plan} · {cust['maxCameras']} KAMERA / {cust['maxRules']} KURAL / {cust['maxTelegramPhones']} TG NUMARA",
        }
        STATE['license'] = lic_obj
        STATE['safeMode'] = not is_active
        STATE.setdefault('telegram', {})['maxPhones'] = int(cust['maxTelegramPhones'])

        cust['camerasUsed'] = len(STATE['cameras'])
        cust['rulesUsed'] = len(STATE['rules'])
        cust['telegramPhonesUsed'] = len(STATE['telegram'].get('phones', []))

        for item in STATE.get('customers', []):
            item['isLocalNode'] = (item.get('id') == cust['id'])
        return lic_obj


def build_admin_state_payload():
    """Return full developer control center state after reloading latest config.enc."""
    with LOCK:
        load_state()
        tg = STATE.get('telegram', {})
        phones_list = tg.get('phones') if isinstance(tg.get('phones'), list) else []
        phone_dir = tg.get('phoneDirectory') if isinstance(tg.get('phoneDirectory'), dict) else {}
        lic = STATE.get('license', forensics.default_license())
        plan = forensics.normalize_plan(lic.get('plan', 'ULTRA'))
        spec = ADMIN_PLANS.get(plan, ADMIN_PLANS['ULTRA'])
        local_lic = {
            **spec,
            **lic,
            'plan': plan,
            'tier': plan,
            'maxCameras': int(lic.get('maxCameras', spec['maxCameras'])),
            'maxRules': int(lic.get('maxRules', spec['maxRules'])),
            'maxTelegramPhones': int(lic.get('maxTelegramPhones', spec['maxTelegramPhones'])),
        }
        return {
            'ok': True,
            'version': VERSION,
            'adminPort': PORT,
            'cortexClientPort': CORTEX_CLIENT_PORT,
            'cortexClientUrl': f'http://127.0.0.1:{CORTEX_CLIENT_PORT}',
            'dataDir': str(DATA),
            'customers': list(STATE.get('customers', [])),
            'issuedLicenses': list(STATE.get('issuedLicenses', []))[:100],
            'plans': ADMIN_PLANS,
            'localLicense': local_lic,
            'safeMode': bool(STATE.get('safeMode', False)),
            'camerasCount': len(STATE.get('cameras', [])),
            'rulesCount': len(STATE.get('rules', [])),
            'eventsCount': len(STATE.get('events', [])),
            'telegram': {
                'enabled': bool(tg.get('enabled', True)),
                'botUsername': tg.get('botUsername') or iot_automation.OFFICIAL_BOT_USERNAME,
                'botLink': iot_automation.OFFICIAL_BOT_LINK,
                'phone': tg.get('phone', ''),
                'phoneDisplay': tg.get('phoneDisplay') or iot_automation.format_phone_display(tg.get('phone', '')),
                'phones': phones_list,
                'chatId': tg.get('chatId', ''),
                'phoneDirectory': phone_dir,
                'boundPhonesCount': len(phones_list),
                'maxPhones': int(local_lic.get('maxTelegramPhones', spec['maxTelegramPhones'])),
                'spec': iot_automation.BOT_SPECIFICATION,
            },
            'audit': list(STATE.get('audit', []))[:60],
            'diskFreeGB': round(shutil.disk_usage(DATA).free / 1024**3, 1),
        }


class AdminHandler(http.server.BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def send(self, status, data, mime='application/json; charset=utf-8', headers=None):
        if isinstance(data, (dict, list)):
            data = json.dumps(data, ensure_ascii=False).encode('utf-8')
        elif isinstance(data, str):
            data = data.encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', mime)
        self.send_header('Content-Length', str(len(data)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('X-Frame-Options', 'DENY')
        self.send_header('Referrer-Policy', 'no-referrer')
        self.send_header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
        if headers:
            for hk, hv in headers.items():
                self.send_header(hk, hv)
        self.end_headers()
        self.wfile.write(data)

    def allowed(self):
        return self.headers.get('Host') in (f'127.0.0.1:{PORT}', f'localhost:{PORT}')

    def admin_auth(self, d=None):
        hdr = self.headers.get('X-Admin-Token', '').strip()
        body_tok = d.get('adminToken', '').strip() if isinstance(d, dict) else ''
        u = urllib.parse.urlsplit(self.path)
        qs_tok = urllib.parse.parse_qs(u.query).get('adminToken', [''])[0].strip()
        cookie_tok = ''
        for part in self.headers.get('Cookie', '').split(';'):
            part = part.strip()
            if part.startswith('cortex_admin_session='):
                cookie_tok = part.split('=', 1)[1].strip()
        token = hdr or body_tok or qs_tok or cookie_tok
        return forensics.verify_admin_session(token)

    def do_GET(self):
        if not self.allowed():
            return self.send(403, {'error': 'Host reddedildi. Yalnızca 127.0.0.1 üzerinden erişilebilir.'})
        u = urllib.parse.urlsplit(self.path)
        path = u.path

        if path == '/bootstrap':
            qs = urllib.parse.parse_qs(u.query)
            if not secrets.compare_digest(qs.get('token', [''])[0], TOKEN):
                return self.send(403, {'error': 'Geçersiz başlatma anahtarı.'})
            self.send_response(303)
            self.send_header('Set-Cookie', f'cortex_admin={TOKEN}; HttpOnly; SameSite=Strict; Path=/')
            self.send_header('Location', '/')
            self.end_headers()
            return

        if path == '/api/admin/state':
            if not self.admin_auth():
                return self.send(403, {'error': 'Geliştirici oturumu gerekli. Lütfen admin hesabıyla giriş yapın.'})
            return self.send(200, build_admin_state_payload())

        if path == '/api/admin/health':
            return self.send(200, {'ok': True, 'service': 'CortexAdmin', 'port': PORT, 'version': VERSION})

        if path == '/logo.svg':
            logo_file = ROOT / 'admin_ui' / 'logo.svg'
            if not logo_file.exists():
                logo_file = ROOT / 'ui' / 'logo.svg'
            if logo_file.exists():
                return self.send(200, logo_file.read_bytes(), 'image/svg+xml')
            return self.send(404, {})

        assets = {
            '/': ('index.html', 'text/html; charset=utf-8'),
            '/index.html': ('index.html', 'text/html; charset=utf-8'),
            '/app.js': ('app.js', 'text/javascript; charset=utf-8'),
            '/style.css': ('style.css', 'text/css; charset=utf-8'),
        }
        if path in assets:
            fname, mime = assets[path]
            fpath = ROOT / 'admin_ui' / fname
            if not fpath.exists():
                return self.send(404, {'error': f'Arayüz dosyası bulunamadı: {fname}'})
            extra_headers = {'Set-Cookie': f'cortex_admin={TOKEN}; HttpOnly; SameSite=Strict; Path=/'} if path in ('/', '/index.html') else None
            return self.send(200, fpath.read_bytes(), mime, headers=extra_headers)

        return self.send(404, {'error': 'Bulunamadı'})

    def do_POST(self):
        if not self.allowed():
            return self.send(403, {'error': 'Host reddedildi.'})
        origin = self.headers.get('Origin', '')
        if origin and origin not in (f'http://127.0.0.1:{PORT}', f'http://localhost:{PORT}'):
            return self.send(403, {'error': 'Kaynak (Origin) reddedildi.'})

        try:
            length = int(self.headers.get('Content-Length', 0))
            if not 0 <= length < 65536:
                raise InputError('İstek boyutu geçersiz.')
            d = json.loads(self.rfile.read(length)) if length > 0 else {}
            if not isinstance(d, dict):
                raise InputError('JSON nesnesi bekleniyor.')
            path = urllib.parse.urlsplit(self.path).path

            if path == '/api/admin/login':
                username = str(d.get('username', '')).strip()
                password = str(d.get('password', ''))
                client_ip = self.client_address[0] if self.client_address else '127.0.0.1'
                rate_key = f"admin:{client_ip}:{username.lower() or 'anon'}"
                if not forensics.check_login_rate_limit(rate_key, LOGIN_ATTEMPTS):
                    return self.send(429, {'error': 'Çok fazla başarısız giriş denemesi. Lütfen 60 saniye bekleyin.'})
                load_state()
                if not forensics.verify_admin_credentials(username, password):
                    forensics.record_login_failure(rate_key, LOGIN_ATTEMPTS)
                    audit('Geliştirici Girişi Reddedildi', f"Kullanıcı denemesi: {username}", actor='Güvenlik')
                    save_state()
                    return self.send(403, {'error': 'Geliştirici kullanıcı adı veya şifresi hatalı.'})
                forensics.clear_login_failures(rate_key, LOGIN_ATTEMPTS)
                adm_token = forensics.create_admin_session(username)
                audit('Geliştirici Oturumu Açıldı', f'Bağımsız Yönetim Merkezi (Port {PORT})', actor='admin')
                save_state()
                payload = build_admin_state_payload()
                payload['adminToken'] = adm_token
                payload['username'] = 'admin'
                payload['message'] = 'IPScans Cortex Geliştirici & Lisans Yönetim Merkezine hoş geldiniz.'
                return self.send(
                    200,
                    payload,
                    headers={'Set-Cookie': f'cortex_admin_session={adm_token}; HttpOnly; SameSite=Strict; Path=/'},
                )

            if path == '/api/admin/state':
                if not self.admin_auth(d):
                    return self.send(403, {'error': 'Geliştirici oturumu gerekli. Lütfen admin hesabıyla giriş yapın.'})
                return self.send(200, build_admin_state_payload())

            if path == '/api/admin/customer-save':
                if not self.admin_auth(d):
                    return self.send(403, {'error': 'Müşteri ve lisans tanımlamak için geliştirici oturumu gerekli.'})
                with LOCK:
                    load_state()
                    cust_id = str(d.get('id') or '').strip()
                    org = str(d.get('organization') or '').strip()[:100]
                    if not org:
                        raise InputError('Lütfen Müşteri / Kurum Adı girin.')

                    username = str(d.get('username') or '').strip()[:50]
                    if not username or len(username) < 2:
                        raise InputError('Cortex Giriş Kullanıcı Adı en az 2 karakter olmalıdır.')
                    if any(ch.isspace() for ch in username):
                        raise InputError('Kullanıcı adı boşluk içeremez (Örn: marmara_guvenlik).')

                    customers = STATE.setdefault('customers', [])
                    existing = next((c for c in customers if c.get('id') == cust_id), None) if cust_id else None

                    # Check username uniqueness across other customer records (excluding node-local-primary mirror)
                    duplicate_user = next(
                        (
                            c for c in customers
                            if c.get('username', '').lower() == username.lower()
                            and c.get('id') != (existing['id'] if existing else '')
                            and c.get('id') != 'node-local-primary'
                        ),
                        None,
                    )
                    if duplicate_user:
                        raise InputError(f"'{username}' kullanıcı adı zaten '{duplicate_user.get('organization')}' müşterisine tanımlı.")

                    raw_password = str(d.get('password') or '').strip()
                    if not existing and not raw_password:
                        raise InputError('Yeni müşteri hesabı için Cortex Giriş Şifresi belirleyin.')
                    if raw_password and len(raw_password) < 4:
                        raise InputError('Cortex Giriş Şifresi en az 4 karakter olmalıdır.')

                    plan = forensics.normalize_plan(d.get('plan', existing.get('plan', 'ULTRA') if existing else 'ULTRA'))
                    spec = ADMIN_PLANS.get(plan, ADMIN_PLANS['ULTRA'])

                    max_cams = int(d.get('maxCameras') if d.get('maxCameras') not in (None, '') else spec['maxCameras'])
                    max_rules = int(d.get('maxRules') if d.get('maxRules') not in (None, '') else spec['maxRules'])
                    max_tg_phones = int(
                        d.get('maxTelegramPhones') if d.get('maxTelegramPhones') not in (None, '') else spec['maxTelegramPhones']
                    )
                    if not 1 <= max_cams <= 256:
                        raise InputError('Maksimum kamera kotası 1 ile 256 arasında olmalıdır.')
                    if not 1 <= max_rules <= 1024:
                        raise InputError('Maksimum kural kotası 1 ile 1024 arasında olmalıdır.')
                    if not 2 <= max_tg_phones <= 100:
                        raise InputError('Telegram bot numara kotası en az 2 (2–100 arası) olmalıdır.')

                    days = int(d.get('days') if d.get('days') not in (None, '') else 365)
                    if not 1 <= days <= 3650:
                        raise InputError('Lisans süresi 1 ile 3650 gün arasında olmalıdır.')

                    status = 'suspended' if str(d.get('status', 'active')).strip().lower() == 'suspended' else 'active'
                    contact = str(d.get('contact') or (existing.get('contact') if existing else '') or 'Belirtilmedi').strip()[:100]
                    assign_to_local = bool(d.get('assignToLocal', False))
                    regenerate_key = bool(d.get('regenerateKey', False))

                    now = time.time()
                    if existing and not regenerate_key and existing.get('plan') == plan and existing.get('key'):
                        lic_key = existing['key']
                    else:
                        lic_key = forensics.generate_commercial_key(plan, org)

                    pw_hint = raw_password if raw_password else (existing.get('passwordHint') or 'Cortex2026!')
                    if raw_password or not (existing and str(existing.get('passwordHash', '')).startswith('pbkdf2_sha256$')):
                        pw_hash = _hash_password(pw_hint)
                    else:
                        pw_hash = existing['passwordHash']
                    expires_at = now + days * 86400

                    if existing:
                        existing.update({
                            'organization': org,
                            'username': username,
                            'passwordHash': pw_hash,
                            'passwordHint': pw_hint,
                            'contact': contact,
                            'plan': plan,
                            'planName': spec['name'],
                            'key': lic_key,
                            'licenseKey': lic_key,
                            'maxCameras': max_cams,
                            'maxRules': max_rules,
                            'maxTelegramPhones': max_tg_phones,
                            'status': status,
                            'expiresAt': expires_at,
                            'daysRemaining': days,
                            'lastSeen': now,
                            'lastHeartbeat': now,
                            'health': f"{plan} Paketi · {max_cams} Kamera / {max_rules} Kural / {max_tg_phones} TG Numara",
                            'healthNote': f"{plan} Paketi · {max_cams} Kamera / {max_rules} Kural / {max_tg_phones} TG Numara",
                        })
                        saved_cust = normalize_customer_record(existing)
                        STATE.setdefault('tenantWorkspaces', {}).setdefault(
                            saved_cust['id'], forensics.default_tenant_workspace(saved_cust['id'])
                        )
                        action_title = 'Müşteri Hesabı Güncellendi'
                    else:
                        new_cust = {
                            'id': cust_id if cust_id else f'cust-{uuid.uuid4().hex[:8]}',
                            'organization': org,
                            'username': username,
                            'passwordHash': pw_hash,
                            'passwordHint': pw_hint,
                            'contact': contact,
                            'plan': plan,
                            'planName': spec['name'],
                            'key': lic_key,
                            'licenseKey': lic_key,
                            'status': status,
                            'camerasUsed': 0,
                            'maxCameras': max_cams,
                            'rulesUsed': 0,
                            'maxRules': max_rules,
                            'telegramPhonesUsed': 0,
                            'maxTelegramPhones': max_tg_phones,
                            'createdAt': now,
                            'issuedAt': now,
                            'expiresAt': expires_at,
                            'daysRemaining': days,
                            'lastSeen': now,
                            'lastHeartbeat': now,
                            'version': VERSION,
                            'health': f"{plan} Paketi tanımlandı · @{username} girişe hazır",
                            'healthNote': f"{plan} Paketi tanımlandı · @{username} girişe hazır",
                            'isLocalNode': False,
                        }
                        saved_cust = normalize_customer_record(new_cust)
                        STATE.setdefault('tenantWorkspaces', {})[saved_cust['id']] = forensics.default_tenant_workspace(saved_cust['id'])
                        customers.insert(0, saved_cust)
                        action_title = 'Yeni Müşteri & Kullanıcı Tanımlandı'

                    license_record = {
                        'id': uuid.uuid4().hex[:12],
                        'customerId': saved_cust['id'],
                        'key': lic_key,
                        'plan': plan,
                        'planName': spec['name'],
                        'organization': org,
                        'username': username,
                        'contact': contact,
                        'maxCameras': max_cams,
                        'maxRules': max_rules,
                        'maxTelegramPhones': max_tg_phones,
                        'createdAt': now,
                        'expiresAt': expires_at,
                        'status': status,
                    }
                    STATE.setdefault('issuedLicenses', []).insert(0, license_record)
                    del STATE['issuedLicenses'][100:]

                    if assign_to_local or STATE.get('license', {}).get('customerId') == saved_cust['id']:
                        apply_customer_to_local(saved_cust)

                    audit(
                        action_title,
                        f"{org} (@{username}) · Paket: {plan} · Kota: {max_cams} Kam / {max_rules} Kural / {max_tg_phones} TG · Anahtar: {lic_key}",
                        actor='admin',
                    )
                    save_state()

                payload = build_admin_state_payload()
                saved_cust = next((c for c in payload.get('customers', []) if c.get('id') == saved_cust['id']), saved_cust)
                payload.update({
                    'customer': saved_cust,
                    'key': lic_key,
                    'record': license_record,
                    'message': (
                        f"{org} (@{username}) müşteri hesabı, şifresi ve {plan} lisansı kaydedildi"
                        + (" ve yerel Cortex uygulamasına atandı." if assign_to_local else ".")
                    ),
                })
                return self.send(200, payload)

            if path == '/api/admin/customer-delete':
                if not self.admin_auth(d):
                    return self.send(403, {'error': 'Geliştirici oturumu gerekli.'})
                target_id = str(d.get('id') or d.get('customerId') or '').strip()
                if not target_id:
                    raise InputError('Silinecek müşteri kimliği (id) gerekli.')
                if target_id == 'node-local-primary':
                    raise InputError('Yerel ana istasyon kaydı silinemez; düzenleyebilir veya başka bir müşteri atayabilirsiniz.')
                with LOCK:
                    load_state()
                    customers = STATE.setdefault('customers', [])
                    target = next((c for c in customers if c.get('id') == target_id), None)
                    if not target:
                        raise InputError('Silinecek müşteri kaydı bulunamadı.')
                    STATE['customers'] = [c for c in customers if c.get('id') != target_id]
                    STATE.get('tenantWorkspaces', {}).pop(target_id, None)
                    if STATE.get('activeTenantId') == target_id:
                        local_node = next((c for c in STATE['customers'] if c.get('id') == 'node-local-primary'), None)
                        if local_node:
                            apply_customer_to_local(local_node)
                    audit('Müşteri Hesabı Silindi', f"{target.get('organization')} (@{target.get('username')})", actor='admin')
                    save_state()
                payload = build_admin_state_payload()
                payload['deletedId'] = target_id
                payload['message'] = f"{target.get('organization')} müşteri hesabı silindi."
                return self.send(200, payload)

            if path in ('/api/admin/license-generate', '/api/license-generate'):
                if not self.admin_auth(d):
                    return self.send(403, {'error': 'Geliştirici oturumu gerekli.'})
                with LOCK:
                    load_state()
                    plan = forensics.normalize_plan(d.get('plan', 'PRO'))
                    spec = ADMIN_PLANS.get(plan, ADMIN_PLANS['PRO'])
                    org = str(d.get('organization', 'Kurumsal Müşteri')).strip()[:80] or 'Kurumsal Müşteri'
                    username = str(d.get('username') or _slug_username(org)).strip()[:40]
                    password = str(d.get('password') or 'Cortex2026!').strip()
                    contact = str(d.get('contact', '')).strip()[:80]
                    days = int(d.get('days', 365) or 365)
                    max_cams = int(d.get('maxCameras') or spec['maxCameras'])
                    max_rules = int(d.get('maxRules') or spec['maxRules'])
                    max_tg = max(2, int(d.get('maxTelegramPhones') or spec['maxTelegramPhones']))
                    key = forensics.generate_commercial_key(plan, org)
                    now = time.time()
                    record = {
                        'id': uuid.uuid4().hex[:12],
                        'key': key,
                        'plan': plan,
                        'planName': spec['name'],
                        'organization': org,
                        'username': username,
                        'contact': contact,
                        'maxCameras': max_cams,
                        'maxRules': max_rules,
                        'maxTelegramPhones': max_tg,
                        'createdAt': now,
                        'expiresAt': now + days * 86400,
                        'status': 'active',
                    }
                    STATE.setdefault('issuedLicenses', []).insert(0, record)
                    customers = STATE.setdefault('customers', [])
                    existing = next(
                        (
                            c for c in customers
                            if c.get('id') != 'node-local-primary'
                            and (
                                c.get('organization', '').lower() == org.lower()
                                or c.get('username', '').lower() == username.lower()
                            )
                        ),
                        None,
                    )
                    if existing:
                        existing.update({
                            'organization': org,
                            'username': username,
                            'passwordHint': password,
                            'passwordHash': _hash_password(password),
                            'contact': contact or existing.get('contact') or 'Belirtilmedi',
                            'plan': plan,
                            'key': key,
                            'licenseKey': key,
                            'status': 'active',
                            'maxCameras': max_cams,
                            'maxRules': max_rules,
                            'maxTelegramPhones': max_tg,
                            'expiresAt': record['expiresAt'],
                        })
                        cust = normalize_customer_record(existing)
                        STATE.setdefault('tenantWorkspaces', {}).setdefault(
                            cust['id'], forensics.default_tenant_workspace(cust['id'])
                        )
                    else:
                        cust = normalize_customer_record({
                            'id': 'cust-' + uuid.uuid4().hex[:8],
                            'organization': org,
                            'username': username,
                            'passwordHint': password,
                            'passwordHash': _hash_password(password),
                            'contact': contact or 'Belirtilmedi',
                            'plan': plan,
                            'key': key,
                            'licenseKey': key,
                            'status': 'active',
                            'camerasUsed': 0,
                            'rulesUsed': 0,
                            'telegramPhonesUsed': 0,
                            'maxCameras': max_cams,
                            'maxRules': max_rules,
                            'maxTelegramPhones': max_tg,
                            'createdAt': now,
                            'expiresAt': record['expiresAt'],
                            'isLocalNode': False,
                        })
                        STATE.setdefault('tenantWorkspaces', {})[cust['id']] = forensics.default_tenant_workspace(cust['id'])
                        customers.insert(0, cust)
                    audit('Yönetici Lisans Üretti', f"Paket: {plan} · Müşteri: {org} (@{username}) · Anahtar: {key}", actor='admin')
                    save_state()
                payload = build_admin_state_payload()
                payload.update({'key': key, 'plan': plan, 'organization': org, 'record': record, 'customer': cust})
                return self.send(200, payload)

            if path == '/api/admin/action':
                if not self.admin_auth(d):
                    return self.send(403, {'error': 'Geliştirici oturumu gerekli.'})
                action = str(d.get('action', '')).strip()
                cust_id = str(d.get('customerId', 'node-local-primary')).strip()

                with LOCK:
                    load_state()
                    customers = STATE.setdefault('customers', [])
                    cust = next((c for c in customers if c.get('id') == cust_id), None)

                    if action == 'run_diagnostics':
                        vault_ok = KEY.is_file()
                        enc_ok = (DATA / 'config.enc').is_file()
                        db_ok = (DATA / 'cortex_forensics.db').is_file()
                        disk_gb = round(shutil.disk_usage(DATA).free / 1024**3, 1)
                        msg = (
                            f"Tanılama Başarılı · Şifreli Kasa={'OK' if vault_ok else 'YOK'} · "
                            f"Veri={len( customers )} Müşteri / {len(STATE.get('cameras', []))} Kamera / {len(STATE.get('rules', []))} Kural · "
                            f"Boş Disk={disk_gb} GB"
                        )
                        if cust:
                            cust['health'] = msg
                            cust['healthNote'] = msg
                            cust['lastSeen'] = time.time()
                        audit('Sistem Tanılama Çalıştırıldı', msg, actor='admin')
                        save_state()
                        payload = build_admin_state_payload()
                        payload.update({
                            'message': msg,
                            'diagnostics': {
                                'vaultKey': vault_ok,
                                'configEnc': enc_ok,
                                'forensicDb': db_ok,
                                'diskFreeGB': disk_gb,
                            },
                        })
                        return self.send(200, payload)

                    if not cust:
                        raise InputError('Müşteri kaydı bulunamadı.')

                    if action == 'assign_to_local':
                        lic_obj = apply_customer_to_local(cust)
                        msg = (
                            f"{cust['organization']} (@{cust['username']}) hesabı ve {cust['plan']} paketi "
                            f"({cust['maxCameras']} Kamera, {cust['maxRules']} Kural, {cust['maxTelegramPhones']} Telegram Numarası) "
                            f"yerel Cortex uygulamasına atandı."
                        )
                        cust['health'] = 'Yerel Cortex istasyonuna atandı · Aktif'
                        cust['healthNote'] = cust['health']

                    elif action == 'upgrade_plan':
                        new_plan = forensics.normalize_plan(d.get('plan', 'ULTRA'))
                        spec = ADMIN_PLANS.get(new_plan, ADMIN_PLANS['ULTRA'])
                        new_key = forensics.generate_commercial_key(new_plan, cust['organization'])
                        max_cams = int(d.get('maxCameras') or spec['maxCameras'])
                        max_rules = int(d.get('maxRules') or spec['maxRules'])
                        max_tg = max(2, int(d.get('maxTelegramPhones') or spec['maxTelegramPhones']))
                        cust.update({
                            'plan': new_plan,
                            'planName': spec['name'],
                            'key': new_key,
                            'licenseKey': new_key,
                            'maxCameras': max_cams,
                            'maxRules': max_rules,
                            'maxTelegramPhones': max_tg,
                            'status': 'active',
                            'health': f"{new_plan} paketine yükseltildi ({max_cams} Kam / {max_rules} Kural / {max_tg} TG)",
                            'healthNote': f"{new_plan} paketine yükseltildi ({max_cams} Kam / {max_rules} Kural / {max_tg} TG)",
                        })
                        if cust.get('isLocalNode') or cust_id == 'node-local-primary' or STATE.get('license', {}).get('customerId') == cust_id:
                            apply_customer_to_local(cust)
                        msg = (
                            f"{cust['organization']} paketi {new_plan} ({max_cams} Kamera / {max_rules} Kural / {max_tg} Telegram Numarası) "
                            f"seviyesine güncellendi. Yeni Anahtar: {new_key}"
                        )

                    elif action == 'reset_password':
                        new_pw = str(d.get('password') or '').strip()
                        new_user = str(d.get('username') or cust.get('username') or '').strip()
                        if not new_pw or len(new_pw) < 4:
                            raise InputError('Yeni şifre en az 4 karakter olmalıdır.')
                        if new_user:
                            cust['username'] = new_user
                        cust['passwordHint'] = new_pw
                        cust['passwordHash'] = _hash_password(new_pw)
                        if cust.get('isLocalNode') or STATE.get('license', {}).get('customerId') == cust_id:
                            apply_customer_to_local(cust)
                        msg = f"{cust['organization']} (@{cust['username']}) giriş şifresi güncellendi."

                    elif action == 'update_quotas':
                        max_cams = max(1, int(d.get('maxCameras', cust.get('maxCameras', 4))))
                        max_rules = max(1, int(d.get('maxRules', cust.get('maxRules', 8))))
                        max_tg = max(2, int(d.get('maxTelegramPhones', cust.get('maxTelegramPhones', 2))))
                        cust.update({
                            'maxCameras': max_cams,
                            'maxRules': max_rules,
                            'maxTelegramPhones': max_tg,
                            'health': f"Kotalar güncellendi: {max_cams} Kamera / {max_rules} Kural / {max_tg} TG Numara",
                            'healthNote': f"Kotalar güncellendi: {max_cams} Kamera / {max_rules} Kural / {max_tg} TG Numara",
                        })
                        if cust.get('isLocalNode') or cust_id == 'node-local-primary' or STATE.get('license', {}).get('customerId') == cust_id:
                            apply_customer_to_local(cust)
                        msg = f"{cust['organization']} kotaları ({max_cams} Kamera, {max_rules} Kural, {max_tg} Telegram Numarası) olarak güncellendi."

                    elif action in ('toggle_suspend', 'toggle_safe_mode'):
                        cust['status'] = 'active' if cust.get('status') == 'suspended' else 'suspended'
                        cust['health'] = 'Lisans askıya alındı' if cust['status'] == 'suspended' else 'Lisans aktif · Çevrimiçi'
                        cust['healthNote'] = cust['health']
                        if cust.get('isLocalNode') or cust_id == 'node-local-primary' or STATE.get('license', {}).get('customerId') == cust_id:
                            apply_customer_to_local(cust)
                        msg = f"{cust['organization']} hesabı {'askıya alındı' if cust['status'] == 'suspended' else 'tekrar aktifleştirildi'}."

                    elif action == 'extend_license':
                        add_days = int(d.get('days', 30) or 30)
                        cust['expiresAt'] = max(float(cust.get('expiresAt', time.time())), time.time()) + add_days * 86400
                        cust['status'] = 'active'
                        normalize_customer_record(cust)
                        if cust.get('isLocalNode') or cust_id == 'node-local-primary' or STATE.get('license', {}).get('customerId') == cust_id:
                            apply_customer_to_local(cust)
                        msg = f"{cust['organization']} lisans süresi +{add_days} gün uzatıldı."

                    elif action == 'restart_telegram':
                        STATE.setdefault('telegram', {})['lastUpdateId'] = 0
                        STATE['telegram']['enabled'] = True
                        cust['telegramActive'] = True
                        cust['health'] = 'Telegram Bot long-polling bağlantısı yenilendi'
                        cust['healthNote'] = cust['health']
                        msg = f"{cust['organization']}: Telegram Bot iletişim motoru sıfırlandı."

                    else:
                        raise InputError(f'Geçersiz yönetici aksiyonu: {action}')

                    audit('Yönetici Müdahalesi', f"{cust['organization']} ({action}) -> {msg}", actor='admin')
                    save_state()

                payload = build_admin_state_payload()
                payload.update({'message': msg, 'customer': cust})
                return self.send(200, payload)

            return self.send(404, {'error': 'API uç noktası bulunamadı.'})
        except InputError as e:
            return self.send(400, {'error': str(e)})
        except (ValueError, KeyError, StopIteration) as e:
            return self.send(400, {'error': f'Geçersiz giriş verisi: {e}'})
        except Exception as e:
            return self.send(503, {'error': f'İşlem tamamlanamadı: {e}'})


class LocalAdminServer(http.server.ThreadingHTTPServer):
    allow_reuse_address = False

    def server_bind(self):
        if os.name == 'nt':
            self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
        super().server_bind()


def install_admin_desktop():
    """Install CortexAdmin.exe to %LOCALAPPDATA%\\Programs\\IPScansCortexAdmin\\CortexAdmin.exe and create Desktop/Start Menu shortcuts."""
    if os.name != 'nt' or '--portable' in sys.argv:
        return None
    local_app_data = pathlib.Path(os.environ.get('LOCALAPPDATA', str(pathlib.Path.home())))
    destination = local_app_data / 'Programs' / 'IPScansCortexAdmin'
    destination.mkdir(parents=True, exist_ok=True)
    executable = destination / 'CortexAdmin.exe'

    source = None
    if getattr(sys, 'frozen', False):
        source = pathlib.Path(sys.executable)
    else:
        for candidate in (
            ROOT.parent / 'dist' / 'CortexAdmin.exe',
            ROOT / 'dist' / 'CortexAdmin.exe',
            executable,
        ):
            if candidate.is_file():
                source = candidate
                break

    if source and source.is_file():
        try:
            if source.resolve() != executable.resolve():
                pending = destination / 'CortexAdmin.new.exe'
                shutil.copy2(source, pending)
                try:
                    pending.replace(executable)
                except OSError:
                    # If locked by an older running CortexAdmin.exe, terminate stale instance and retry
                    subprocess.run(
                        ['taskkill', '/F', '/IM', 'CortexAdmin.exe', '/FI', f'PID ne {os.getpid()}'],
                        stdout=subprocess.DEVNULL,
                        stderr=subprocess.DEVNULL,
                        timeout=5,
                        creationflags=0x08000000,
                    )
                    time.sleep(0.5)
                    pending.replace(executable)
        except Exception:
            pass

    target_path = executable if executable.is_file() else (ROOT.parent / 'baslat_cortex_yonetim.bat')
    work_dir = destination if executable.is_file() else ROOT.parent
    icon_source = executable if executable.is_file() else pathlib.Path(sys.executable)

    def quote(val):
        return "'" + str(val).replace("'", "''") + "'"

    script = "$ErrorActionPreference='Stop'; $s=New-Object -ComObject WScript.Shell; "
    script += "$dirs=@([Environment]::GetFolderPath('Desktop'),[Environment]::GetFolderPath('Programs')); "
    script += (
        "foreach($d in $dirs){"
        "$link=$s.CreateShortcut((Join-Path $d 'IPScans Cortex Yönetim Merkezi.lnk')); "
        f"$link.TargetPath={quote(target_path)}; "
        f"$link.WorkingDirectory={quote(work_dir)}; "
        f"$link.IconLocation={quote(str(icon_source) + ',0')}; "
        "$link.Description='IPScans Cortex Geliştirici ve Lisans Yönetim Merkezi (Port 8766)'; "
        "$link.Save()}"
    )
    encoded = base64.b64encode(script.encode('utf-16le')).decode()
    subprocess.run(
        ['powershell', '-NoProfile', '-NonInteractive', '-EncodedCommand', encoded],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        creationflags=0x08000000,
        timeout=30,
    )
    return executable


def _terminate_stale_admin_on_port(port):
    """Terminate stale CortexAdmin.exe or process holding the admin port so the new instance binds cleanly."""
    if os.name != 'nt':
        return
    try:
        subprocess.run(
            ['taskkill', '/F', '/IM', 'CortexAdmin.exe', '/FI', f'PID ne {os.getpid()}'],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            timeout=5,
            creationflags=0x08000000,
        )
    except Exception:
        pass
    try:
        cmd = (
            f"Get-NetTCPConnection -LocalPort {int(port)} -State Listen -ErrorAction SilentlyContinue | "
            f" Select-Object -ExpandProperty OwningProcess"
        )
        res = subprocess.run(
            ['powershell', '-NoProfile', '-NonInteractive', '-Command', cmd],
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            timeout=5,
            creationflags=0x08000000,
            text=True,
        )
        for line in (res.stdout or '').splitlines():
            pid_str = line.strip()
            if pid_str.isdigit() and int(pid_str) != os.getpid() and int(pid_str) > 4:
                subprocess.run(
                    ['taskkill', '/F', '/PID', pid_str],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    timeout=5,
                    creationflags=0x08000000,
                )
    except Exception:
        pass


def main():
    load_state()
    if (DATA / 'config.enc').exists():
        save_state()
    if '--self-test' in sys.argv:
        assert (ROOT / 'admin_ui' / 'index.html').is_file(), 'admin_ui/index.html missing'
        assert (ROOT / 'admin_ui' / 'app.js').is_file(), 'admin_ui/app.js missing'
        assert (ROOT / 'admin_ui' / 'style.css').is_file(), 'admin_ui/style.css missing'
        assert KEY.is_file(), 'vault.key missing'
        test_key = forensics.generate_commercial_key('ULTRA', 'SelfTest')
        assert forensics.verify_commercial_key(test_key)['plan'] == 'ULTRA'
        print(
            json.dumps({
                'service': 'CortexAdmin',
                'version': VERSION,
                'port': PORT,
                'adminUi': 'ok',
                'vault': 'ok',
                'plans': list(ADMIN_PLANS.keys()),
            })
        )
        return

    if '--install-only' in sys.argv:
        install_admin_desktop()
        return

    if '--no-browser' not in sys.argv and getattr(sys, 'frozen', False):
        try:
            install_admin_desktop()
        except Exception:
            pass

    server = None
    try:
        server = LocalAdminServer(('127.0.0.1', PORT), AdminHandler)
    except OSError:
        if os.name == 'nt' and '--self-test' not in sys.argv:
            _terminate_stale_admin_on_port(PORT)
            time.sleep(0.8)
            try:
                server = LocalAdminServer(('127.0.0.1', PORT), AdminHandler)
            except OSError:
                server = None
        if server is None:
            text = (
                f'IPScans Cortex Yönetim Merkezi başlatılamadı: yerel port ({PORT}) kullanımda. '
                f'Önce eski Yönetim Merkezi penceresini kapatın.'
            )
            print(text)
            if os.name == 'nt' and '--no-browser' not in sys.argv:
                import ctypes
                ctypes.windll.user32.MessageBoxW(None, text, 'IPScans Cortex Yönetim Merkezi', 0x10)
            return

    url = f'http://127.0.0.1:{PORT}/bootstrap?token={TOKEN}'
    if '--no-browser' not in sys.argv:
        webbrowser.open(url)
    print(f'IPScans Cortex Yönetim Merkezi — http://127.0.0.1:{PORT} — Kapatmak için bu pencereyi kapatın.')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == '__main__':
    main()
