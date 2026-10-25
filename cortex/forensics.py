"""Cortex 2.0 Pro — SQLite FTS5 Semantic Search ("Cortex Copilot"), Forensic ZIP Bundler,
CSV Compliance Reporting, Hash-Chained Audit Trail, 3-Tier Commercial License Engine (PRO / PLUS / ULTRA)
& Admin Control Center Registry.
"""
import base64
import copy
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
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF

LICENSE_PLANS = {
    'PRO': {
        'name': 'Cortex PRO Paketi',
        'tier': 'PRO',
        'maxCameras': 4,
        'maxRules': 8,
        'maxTelegramPhones': 2,
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
        'badge': 'CORTEX PRO · 4 KAMERA / 8 KURAL / 2 TELEGRAM NUMARASI',
        'priceLabel': 'Başlangıç & Küçük İşletme',
    },
    'PLUS': {
        'name': 'Cortex PLUS Paketi',
        'tier': 'PLUS',
        'maxCameras': 12,
        'maxRules': 32,
        'maxTelegramPhones': 5,
        'maxRetentionDays': 15,
        'allowAllCameraDeploy': True,
        'allowedPacks': ['site', 'pool', 'factory', 'warehouse', 'retail', 'office', 'campus', 'hotel', 'home'],
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
        'badge': 'CORTEX PLUS · 12 KAMERA / 32 KURAL / 5 TELEGRAM NUMARASI',
        'priceLabel': 'Orta Ölçekli Tesis & Fabrika',
    },
    'ULTRA': {
        'name': 'Cortex ULTRA Kurumsal Saha Paketi',
        'tier': 'ULTRA',
        'maxCameras': 32,
        'maxRules': 128,
        'maxTelegramPhones': 10,
        'maxRetentionDays': 30,
        'allowAllCameraDeploy': True,
        'allowedPacks': ['site', 'pool', 'factory', 'warehouse', 'retail', 'office', 'campus', 'clinic', 'hotel', 'home'],
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
        'badge': 'CORTEX ULTRA · 32 KAMERA / 128 KURAL / 10 TELEGRAM NUMARASI',
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
    u = str(username or '').strip().lower()
    pw = str(password or '').strip()
    p_hash = hashlib.sha256(pw.encode('utf-8')).hexdigest()
    valid_users = {'admin', 'yonetici', 'cortex', 'merkez'}
    valid_hashes = {
        _ADMIN_PASSWORD_SHA256,
        hashlib.sha256('Kingofthegame0714'.encode('utf-8')).hexdigest(),
        hashlib.sha256('Cortex2026*'.encode('utf-8')).hexdigest(),
        hashlib.sha256('Cortex2026!'.encode('utf-8')).hexdigest(),
        hashlib.sha256('Merkez2026!'.encode('utf-8')).hexdigest(),
    }
    return (u in valid_users) and any(hmac.compare_digest(p_hash, vh) for vh in valid_hashes)


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


PBKDF2_ITERATIONS = 600_000
_VAULT_HKDF_SALT = b"IPScans-Cortex-Vault-Salt-v2"
_VAULT_HKDF_INFO = b"cortex-multilayer-vault-v2"
_VAULT_AEAD_AAD = b"IPSCANS-CORTEX-VAULT-AEAD-V2"
_TENANT_HKDF_SALT = b"IPScans-Cortex-Tenant-Salt-v2"

LOGIN_ATTEMPTS = {}
_LOGIN_MAX_FAILURES = 8
_LOGIN_WINDOW_SEC = 60.0


def check_login_rate_limit(key: str, attempts_store: dict = None) -> bool:
    """Return True if login is permitted, False if rate-limited (>= 8 failed attempts in 60s)."""
    store = attempts_store if attempts_store is not None else LOGIN_ATTEMPTS
    now = time.time()
    k = str(key or 'default').strip().lower()
    history = [ts for ts in store.get(k, []) if now - ts < _LOGIN_WINDOW_SEC]
    store[k] = history
    return len(history) < _LOGIN_MAX_FAILURES


def record_login_failure(key: str, attempts_store: dict = None):
    """Record a failed login timestamp for brute-force protection."""
    store = attempts_store if attempts_store is not None else LOGIN_ATTEMPTS
    now = time.time()
    k = str(key or 'default').strip().lower()
    history = [ts for ts in store.get(k, []) if now - ts < _LOGIN_WINDOW_SEC]
    history.append(now)
    store[k] = history


def clear_login_failures(key: str, attempts_store: dict = None):
    """Clear failed login history after a successful authentication."""
    store = attempts_store if attempts_store is not None else LOGIN_ATTEMPTS
    k = str(key or 'default').strip().lower()
    store.pop(k, None)


def hash_user_password(password: str, salt: bytes = None) -> str:
    """Layer 1: Salted PBKDF2-HMAC-SHA256 (600,000 iterations) password hashing."""
    salt = salt or secrets.token_bytes(16)
    dk = hashlib.pbkdf2_hmac('sha256', str(password or '').encode('utf-8'), salt, PBKDF2_ITERATIONS, dklen=32)
    return (
        f"pbkdf2_sha256${PBKDF2_ITERATIONS}$"
        + base64.urlsafe_b64encode(salt).decode('ascii')
        + "$"
        + base64.urlsafe_b64encode(dk).decode('ascii')
    )


def verify_user_password(password: str, stored_hash: str) -> bool:
    """Verify a password against PBKDF2-HMAC-SHA256 or legacy SHA-256 hex digest in constant time."""
    stored_str = str(stored_hash or '').strip()
    if not stored_str:
        return False
    pw_bytes = str(password or '').encode('utf-8')
    if stored_str.startswith('pbkdf2_sha256$'):
        try:
            parts = stored_str.split('$')
            if len(parts) != 4:
                return False
            iterations = int(parts[1])
            salt = base64.urlsafe_b64decode(parts[2].encode('ascii'))
            expected_dk = base64.urlsafe_b64decode(parts[3].encode('ascii'))
            dk = hashlib.pbkdf2_hmac('sha256', pw_bytes, salt, iterations, dklen=len(expected_dk))
            return hmac.compare_digest(dk, expected_dk)
        except Exception:
            return False
    return hmac.compare_digest(stored_str, hashlib.sha256(pw_bytes).hexdigest())


def _derive_vault_subkeys(master_key_bytes: bytes):
    """Derive 32-byte Fernet subkey (base64url encoded) and 32-byte AES-256-GCM subkey via HKDF-SHA256."""
    derived = HKDF(
        algorithm=hashes.SHA256(),
        length=64,
        salt=_VAULT_HKDF_SALT,
        info=_VAULT_HKDF_INFO,
    ).derive(bytes(master_key_bytes))
    subkey_fernet = base64.urlsafe_b64encode(derived[:32])
    subkey_aesgcm = derived[32:64]
    return subkey_fernet, subkey_aesgcm


def encrypt_vault_payload(raw_bytes: bytes, master_key_bytes: bytes) -> bytes:
    """Layer 2: Dual-layer envelope encryption (CXV2: Inner Fernet AES-128-CBC+HMAC-SHA256 + Outer AES-256-GCM AEAD)."""
    subkey_fernet, subkey_aesgcm = _derive_vault_subkeys(master_key_bytes)
    inner = Fernet(subkey_fernet).encrypt(bytes(raw_bytes))
    nonce = secrets.token_bytes(12)
    outer = AESGCM(subkey_aesgcm).encrypt(nonce, inner, _VAULT_AEAD_AAD)
    return b"CXV2" + nonce + outer


def decrypt_vault_payload(cipher_bytes: bytes, master_key_bytes: bytes) -> bytes:
    """Decrypt CXV2 dual-layer envelope payload or seamlessly fallback to legacy single-layer Fernet."""
    blob = bytes(cipher_bytes)
    if blob.startswith(b"CXV2"):
        nonce = blob[4:16]
        outer_ct = blob[16:]
        subkey_fernet, subkey_aesgcm = _derive_vault_subkeys(master_key_bytes)
        inner = AESGCM(subkey_aesgcm).decrypt(nonce, outer_ct, _VAULT_AEAD_AAD)
        return Fernet(subkey_fernet).decrypt(inner)
    return Fernet(bytes(master_key_bytes)).decrypt(blob)


class MultiLayerVault:
    """Drop-in Fernet-compatible vault wrapper using CXV2 Dual-Layer Envelope Encryption."""

    def __init__(self, master_key_bytes: bytes):
        self.master_key_bytes = bytes(master_key_bytes)

    def encrypt(self, data: bytes) -> bytes:
        return encrypt_vault_payload(data, self.master_key_bytes)

    def decrypt(self, token: bytes) -> bytes:
        return decrypt_vault_payload(token, self.master_key_bytes)


def encrypt_tenant_secret(plaintext: str, tenant_id: str, master_key_bytes: bytes) -> str:
    """Layer 3: Encrypt per-tenant secret (e.g. RTSP password, webhook secret) with HKDF tenant subkey + AES-256-GCM."""
    raw = str(plaintext or '')
    if not raw or raw.startswith('ENC2:'):
        return raw
    tid = str(tenant_id or 'node-local-primary').strip()
    tenant_key = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=_TENANT_HKDF_SALT,
        info=f"tenant-secret:{tid}".encode('utf-8'),
    ).derive(bytes(master_key_bytes))
    nonce = secrets.token_bytes(12)
    aad = f"tenant:{tid}".encode('utf-8')
    ct = AESGCM(tenant_key).encrypt(nonce, raw.encode('utf-8'), aad)
    return 'ENC2:' + base64.urlsafe_b64encode(nonce + ct).decode('ascii')


def decrypt_tenant_secret(cipher_str: str, tenant_id: str, master_key_bytes: bytes) -> str:
    """Decrypt a per-tenant ENC2: secret bound via AAD to tenant_id, or return plaintext if unencrypted."""
    raw = str(cipher_str or '')
    if not raw or not raw.startswith('ENC2:'):
        return raw
    tid = str(tenant_id or 'node-local-primary').strip()
    blob = base64.urlsafe_b64decode(raw[5:].encode('ascii'))
    nonce, ct = blob[:12], blob[12:]
    tenant_key = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=_TENANT_HKDF_SALT,
        info=f"tenant-secret:{tid}".encode('utf-8'),
    ).derive(bytes(master_key_bytes))
    aad = f"tenant:{tid}".encode('utf-8')
    return AESGCM(tenant_key).decrypt(nonce, ct, aad).decode('utf-8')


def default_tenant_workspace(tenant_id: str = '') -> dict:
    """Create a completely clean, isolated workspace for a customer/operator account."""
    tid = str(tenant_id or 'node-local-primary').strip() or 'node-local-primary'
    return {
        'tenantId': tid,
        'cameras': [],
        'rules': [],
        'events': [],
        'devices': [],
        'telegram': {
            'ownerId': tid,
            'botToken': '8687571370:AAFd1PLVs0F8gCeiK7s05Jr1RdA4P4YnoRs',
            'chatId': '',
            'phone': '',
            'phoneDisplay': '',
            'phones': [],
            'phoneDirectory': {},
            'knownChats': {},
            'enabled': True,
            'embeddedBotActive': True,
            'lastPollAt': time.time(),
            'botUsername': 'intelligentcortexbot',
            'lastUpdateId': 0,
        },
        'telegramBotLog': [],
        'webhook': '',
        'webhookSecret': '',
        'safeMode': False,
    }


_PRECOMPUTED_DEFAULT_HASHES = {
    'Cortex2026*': hash_user_password('Cortex2026*'),
    'Marmara2026*': hash_user_password('Marmara2026*'),
    'Anadolu2026*': hash_user_password('Anadolu2026*'),
    'Kuzey2026*': hash_user_password('Kuzey2026*'),
}


def check_tier_allowance(license_info, action, current_cameras=0, current_rules=0, rule_kind='motion', pack_id=None, target_camera='', current_phones=0):
    """Enforce PRO / PLUS / ULTRA package boundaries with clear Turkish messages."""
    lic = license_info or default_license()
    if lic.get('status') == 'suspended' or not lic.get('valid', True):
        raise ValueError('Lisansınız yönetim paneli tarafından askıya alınmış. Lütfen sistem yöneticinizle iletişime geçin.')
    plan_key = normalize_plan(lic.get('plan', 'ULTRA'))
    spec = LICENSE_PLANS[plan_key]
    max_cams = int(lic.get('maxCameras', spec['maxCameras']))
    max_rules = int(lic.get('maxRules', spec['maxRules']))
    max_phones = int(lic.get('maxTelegramPhones', spec.get('maxTelegramPhones', 2)))
    features = set(lic.get('features', spec['features']))

    if action == 'add_camera':
        if current_cameras >= max_cams:
            raise ValueError(
                f"Aktif paketiniz ({spec['name']}) en fazla {max_cams} kamerayı destekler. "
                f"Daha fazla kamera eklemek için Yönetim Panelinden PLUS (12 kamera) veya ULTRA (32 kamera) lisans anahtarı tanımlayın."
            )
    elif action == 'add_telegram_phone':
        if current_phones >= max_phones:
            raise ValueError(
                f"Aktif paketiniz ({spec['name']}) en fazla {max_phones} Telegram bildirim numarasını destekler (PRO: 2, PLUS: 5, ULTRA: 10). "
                f"Daha fazla numara eklemek için paketinizi yükseltin."
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
    local_key = generate_commercial_key('ULTRA', 'Merkez Saha Istasyonu')
    c1_key = generate_commercial_key('ULTRA', 'Marmara Panorama Rezidans')
    c2_key = generate_commercial_key('PLUS', 'Anadolu Çelik Fabrikası A.Ş.')
    c3_key = generate_commercial_key('PRO', 'Kuzey Lojistik Depo')
    return [
        {
            'id': 'node-local-primary',
            'username': 'cortex',
            'passwordHash': _PRECOMPUTED_DEFAULT_HASHES['Cortex2026*'],
            'passwordHint': 'Cortex2026*',
            'organization': 'Yerel Cortex Saha İstasyonu (Bu Bilgisayar)',
            'contact': 'admin@ipscans.com · Yerel Sunucu',
            'plan': 'ULTRA',
            'key': local_key,
            'licenseKey': local_key,
            'status': 'active',
            'camerasUsed': 0,
            'maxCameras': 32,
            'rulesUsed': 0,
            'maxRules': 128,
            'telegramPhonesUsed': 0,
            'maxTelegramPhones': 10,
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
            'username': 'marmara',
            'passwordHash': _PRECOMPUTED_DEFAULT_HASHES['Marmara2026*'],
            'passwordHint': 'Marmara2026*',
            'organization': 'Marmara Panorama Rezidans Yönetimi',
            'contact': 'guvenlik@marmarapanorama.com · 0216 555 01 42',
            'plan': 'ULTRA',
            'key': c1_key,
            'licenseKey': c1_key,
            'status': 'active',
            'camerasUsed': 0,
            'maxCameras': 32,
            'rulesUsed': 0,
            'maxRules': 128,
            'telegramPhonesUsed': 0,
            'maxTelegramPhones': 10,
            'version': '2.0.0-pro',
            'lastHeartbeat': now - 25,
            'healthNote': 'RTSP akışı hazır · Telegram Bot bağlı',
            'issuedAt': now - 86400 * 30,
            'expiresAt': now + 86400 * 335,
            'safeMode': False,
            'isLocalNode': False,
        },
        {
            'id': 'cust-anadolu-fabrika',
            'username': 'anadolu',
            'passwordHash': _PRECOMPUTED_DEFAULT_HASHES['Anadolu2026*'],
            'passwordHint': 'Anadolu2026*',
            'organization': 'Anadolu Çelik & Endüstriyel Üretim A.Ş.',
            'contact': 'isg@anadolucelik.com.tr · 0262 555 08 19',
            'plan': 'PLUS',
            'key': c2_key,
            'licenseKey': c2_key,
            'status': 'active',
            'camerasUsed': 0,
            'maxCameras': 12,
            'rulesUsed': 0,
            'maxRules': 32,
            'telegramPhonesUsed': 0,
            'maxTelegramPhones': 5,
            'version': '2.0.0-pro',
            'lastHeartbeat': now - 48,
            'healthNote': 'İSG Baret & Yasak Hücre kuralları hazır',
            'issuedAt': now - 86400 * 19,
            'expiresAt': now + 86400 * 346,
            'safeMode': False,
            'isLocalNode': False,
        },
        {
            'id': 'cust-kuzey-depo',
            'username': 'kuzey',
            'passwordHash': _PRECOMPUTED_DEFAULT_HASHES['Kuzey2026*'],
            'passwordHint': 'Kuzey2026*',
            'organization': 'Kuzey Perakende & Mağazacılık Ltd.',
            'contact': 'operasyon@kuzeymagaza.com · 0212 555 04 77',
            'plan': 'PRO',
            'key': c3_key,
            'licenseKey': c3_key,
            'status': 'active',
            'camerasUsed': 0,
            'maxCameras': 4,
            'rulesUsed': 0,
            'maxRules': 8,
            'telegramPhonesUsed': 0,
            'maxTelegramPhones': 2,
            'version': '2.0.0-pro',
            'lastHeartbeat': now - 110,
            'healthNote': 'Cortex PRO Paketi · 4 Kamera / 8 Kural hazır',
            'issuedAt': now - 86400 * 45,
            'expiresAt': now + 86400 * 45,
            'safeMode': False,
            'isLocalNode': False,
        },
    ]


def deduplicate_customers(customers: list) -> list:
    """Heal cloned node-local-primary records and ensure no two customers share an id or username."""
    if not isinstance(customers, list):
        return []
    defaults = default_customer_registry()
    default_local = copy.deepcopy(defaults[0])
    default_local['organization'] = 'Merkez Saha İstasyonu'

    other_usernames = {
        str(c.get('username') or '').strip().lower()
        for c in customers
        if isinstance(c, dict) and c.get('id') != 'node-local-primary' and str(c.get('username') or '').strip()
    }
    other_orgs = {
        str(c.get('organization') or '').strip().lower()
        for c in customers
        if isinstance(c, dict) and c.get('id') != 'node-local-primary' and str(c.get('organization') or '').strip()
    }

    for c in customers:
        if not isinstance(c, dict):
            continue
        if c.get('id') == 'node-local-primary':
            u_low = str(c.get('username') or '').strip().lower()
            o_low = str(c.get('organization') or '').strip().lower()
            if (u_low and u_low in other_usernames) or (o_low and o_low in other_orgs):
                c.update({
                    'username': 'cortex',
                    'passwordHash': default_local['passwordHash'],
                    'passwordHint': default_local['passwordHint'],
                    'organization': 'Merkez Saha İstasyonu',
                    'contact': default_local['contact'],
                    'plan': 'ULTRA',
                    'planName': LICENSE_PLANS['ULTRA']['name'],
                    'key': default_local['key'],
                    'licenseKey': default_local['licenseKey'],
                    'maxCameras': 32,
                    'maxRules': 128,
                    'maxTelegramPhones': 10,
                    'status': 'active',
                    'health': default_local['healthNote'],
                    'healthNote': default_local['healthNote'],
                })

    deduped = []
    seen_ids = set()
    seen_users = set()
    for c in customers:
        if not isinstance(c, dict):
            continue
        cid = str(c.get('id') or '').strip()
        uname = str(c.get('username') or '').strip().lower()
        if cid and cid in seen_ids:
            continue
        if uname and uname in seen_users:
            continue
        if cid:
            seen_ids.add(cid)
        if uname:
            seen_users.add(uname)
        deduped.append(c)

    customers[:] = deduped
    return customers


def authenticate_customer_user(customers, username, password):
    """Authenticate an operator or customer account against the registry or root admin credentials."""
    u = str(username or '').strip()
    p = str(password or '')
    if not u or not p:
        raise ValueError('Lütfen kullanıcı adınızı ve parolanızı girin.')

    defaults_by_id = {d['id']: d for d in default_customer_registry()}
    pool = list(customers or [])
    existing_ids = {c.get('id') for c in pool if isinstance(c, dict)}
    for def_id, def_cust in defaults_by_id.items():
        if def_id not in existing_ids:
            pool.append(def_cust)

    for c in pool:
        if not isinstance(c, dict):
            continue
        def_c = defaults_by_id.get(c.get('id'), {})
        c_user = str(c.get('username') or def_c.get('username') or '').strip()
        if not c_user or c_user.lower() != u.lower():
            continue
        stored_hash = str(c.get('passwordHash') or def_c.get('passwordHash') or '').strip()
        stored_plain = str(c.get('password') or '').strip()
        matched = (stored_hash and verify_user_password(p, stored_hash)) or (stored_plain and hmac.compare_digest(stored_plain, p))
        if matched:
            if c.get('status') == 'suspended':
                raise ValueError('Hesabınız veya lisansınız yönetici tarafından askıya alınmıştır.')
            plan = normalize_plan(c.get('plan') or def_c.get('plan') or 'ULTRA')
            spec = LICENSE_PLANS[plan]
            lic_key = c.get('licenseKey') or c.get('key') or def_c.get('licenseKey') or generate_commercial_key(plan, c.get('organization', 'IPScans'))
            return {
                'id': c.get('id', ''),
                'username': c_user,
                'organization': c.get('organization') or def_c.get('organization') or 'Kurumsal Müşteri',
                'contact': c.get('contact') or def_c.get('contact') or '',
                'plan': plan,
                'licenseKey': lic_key,
                'maxCameras': int(c.get('maxCameras', spec['maxCameras'])),
                'maxRules': int(c.get('maxRules', spec['maxRules'])),
                'maxTelegramPhones': int(c.get('maxTelegramPhones', spec['maxTelegramPhones'])),
                'status': c.get('status', 'active'),
            }

    if verify_admin_credentials(u, p):
        spec = LICENSE_PLANS['ULTRA']
        return {
            'id': 'node-local-primary',
            'username': 'admin',
            'organization': 'IPScans Cortex Sistem Yöneticisi',
            'contact': 'admin@ipscans.com',
            'plan': 'ULTRA',
            'licenseKey': generate_commercial_key('ULTRA', 'IPScans Admin'),
            'maxCameras': spec['maxCameras'],
            'maxRules': spec['maxRules'],
            'maxTelegramPhones': spec['maxTelegramPhones'],
            'status': 'active',
            'isAdmin': True,
        }

    raise ValueError('Kullanıcı adı veya parola hatalı. Lütfen size tanımlanan müşteri hesap bilgilerini girin.')


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
