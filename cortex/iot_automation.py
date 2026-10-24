"""Cortex 2.0 Pro — Two-Way Interactive Telegram Bot Engine & HMAC-SHA256 Signed Enterprise Webhooks."""
import datetime as dt
import hashlib
import hmac
import json
import re
import secrets
import subprocess
import sys
import time
import urllib.parse
import urllib.request

OFFICIAL_BOT_TOKEN = '8687571370:AAFd1PLVs0F8gCeiK7s05Jr1RdA4P4YnoRs'
OFFICIAL_BOT_USERNAME = 'intelligentcortexbot'
OFFICIAL_BOT_NAME = 'IPScans Cortex AI | Kamera & Güvenlik'
OFFICIAL_BOT_LINK = 'https://t.me/intelligentcortexbot'
DEFAULT_ADMIN_CHAT_ID = '8972256505'

BOT_COMMANDS = [
    {'command': 'start', 'description': '📱 Telefon numaranızı eşleştirin ve başlatın'},
    {'command': 'durum', 'description': '📊 Sistem, lisans ve kamera sağlık özeti'},
    {'command': 'kameralar', 'description': '📹 Aktif kameralar ve FPS durumu'},
    {'command': 'anlik', 'description': '📸 Kameradan anlık kanıt fotoğrafı iste'},
    {'command': 'olaylar', 'description': '🚨 Son tespit edilen 5 güvenlik olayı'},
    {'command': 'koru', 'description': '🛡️ Tüm kameralarda kuralları devreye al'},
    {'command': 'sustur', 'description': '🔕 Bildirimleri geçici sessize al / aç'},
    {'command': 'yardim', 'description': 'ℹ️ Komut listesi ve yardım'},
]

BOT_SPECIFICATION = {
    'botName': OFFICIAL_BOT_NAME,
    'suggestedUsername': OFFICIAL_BOT_USERNAME,
    'botLink': OFFICIAL_BOT_LINK,
    'botFatherUrl': 'https://t.me/BotFather',
    'architecture': 'Telefon Numarası Eşleştirmeli HTTPS Long-Polling (@intelligentcortexbot)',
    'commands': BOT_COMMANDS,
    'botFatherCommandsText': '\n'.join(f"{c['command']} - {c['description']}" for c in BOT_COMMANDS),
}


def normalize_phone(phone_raw):
    """Normalize a user phone number into international digits (e.g. 05321234567 -> 905321234567)."""
    digits = re.sub(r'\D', '', str(phone_raw or ''))
    if not digits:
        return ''
    if digits.startswith('00'):
        digits = digits[2:]
    if len(digits) == 10 and digits.startswith('5'):
        digits = '90' + digits
    elif len(digits) == 11 and digits.startswith('05'):
        digits = '9' + digits
    return digits


def format_phone_display(phone_raw):
    """Format a normalized phone number for clean UI and Telegram display."""
    norm = normalize_phone(phone_raw)
    if not norm:
        return ''
    if len(norm) == 12 and norm.startswith('90'):
        return f"+90 ({norm[2:5]}) {norm[5:8]} {norm[8:10]} {norm[10:12]}"
    return f"+{norm}"


def sign_webhook_payload(payload_bytes, secret, timestamp=None):
    """Generate HMAC-SHA256 signature header for enterprise webhook verification."""
    if not secret:
        return '', ''
    ts = str(int(timestamp if timestamp is not None else time.time()))
    message = ts.encode('utf-8') + b'.' + payload_bytes
    digest = hmac.new(secret.encode('utf-8'), message, hashlib.sha256).hexdigest()
    return f'sha256={digest}', ts


def format_webhook_body(webhook_url, event):
    """Format webhook JSON; automatically adapts for Slack and Discord webhook endpoints."""
    base = {k: event.get(k) for k in ('id', 'camera', 'rule', 'time', 'reason', 'confidence', 'kind', 'tags')}
    lower = (webhook_url or '').lower()
    if 'hooks.slack.com' in lower:
        text = f"🚨 *IPScans Cortex · {event.get('rule', 'Olay')}*\n*Kamera:* {event.get('camera', '-')}\n*Detay:* {event.get('reason', '')}"
        return json.dumps({'text': text}, ensure_ascii=False).encode('utf-8')
    if 'discord.com/api/webhooks' in lower or 'discordapp.com/api/webhooks' in lower:
        content = f"🚨 **IPScans Cortex · {event.get('rule', 'Olay')}**\n**Kamera:** {event.get('camera', '-')}\n**Detay:** {event.get('reason', '')}"
        return json.dumps({'content': content}, ensure_ascii=False).encode('utf-8')
    return json.dumps(base, ensure_ascii=False).encode('utf-8')


def _tg_api(bot_token, method, payload=None, timeout=8):
    token = str(bot_token or '').strip()
    if not token or ':' not in token:
        raise ValueError('Geçerli bir Telegram Bot Token girin (Örn: 123456789:AAH...).')
    url = f'https://api.telegram.org/bot{urllib.parse.quote(token, safe=":")}/{method}'
    if payload is None:
        req = urllib.request.Request(url)
    else:
        body = json.dumps(payload, ensure_ascii=False).encode('utf-8')
        req = urllib.request.Request(url, data=body, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        data = json.loads(resp.read(131072))
    if not data.get('ok'):
        raise ValueError(data.get('description', 'Telegram API yanıtı başarısız.'))
    return data.get('result')


DEFAULT_BOT_REPLY_MARKUP = {
    'keyboard': [
        [{'text': '📱 Telefon Numaramı Doğrula & Eşleştir', 'request_contact': True}],
        [{'text': '/durum'}, {'text': '/kameralar'}, {'text': '/anlik'}],
        [{'text': '/olaylar'}, {'text': '/koru'}, {'text': '/sustur'}],
    ],
    'resize_keyboard': True,
    'is_persistent': True,
}


def verify_telegram_bot(bot_token=None):
    """Verify token via getMe and register interactive command menu via setMyCommands."""
    token = str(bot_token or OFFICIAL_BOT_TOKEN).strip()
    me = _tg_api(token, 'getMe', timeout=6)
    try:
        _tg_api(token, 'deleteWebhook', {'drop_pending_updates': False}, timeout=5)
        _tg_api(token, 'setMyCommands', {'commands': BOT_COMMANDS}, timeout=5)
    except Exception:
        pass
    return {
        'id': me.get('id'),
        'username': me.get('username', OFFICIAL_BOT_USERNAME),
        'firstName': me.get('first_name', OFFICIAL_BOT_NAME),
        'link': f"https://t.me/{me.get('username')}" if me.get('username') else OFFICIAL_BOT_LINK,
    }


def discover_telegram_chat(bot_token=None):
    """Auto-discover the operator's Chat ID from recent /start, contact, or text messages sent to the bot."""
    token = str(bot_token or OFFICIAL_BOT_TOKEN).strip()
    updates = _tg_api(token, 'getUpdates', {'limit': 35, 'timeout': 1}, timeout=6) or []
    for item in reversed(updates):
        msg = item.get('message') or item.get('edited_message') or {}
        chat = msg.get('chat') or {}
        contact = msg.get('contact') or {}
        if chat.get('id') is not None:
            return {
                'chatId': str(chat['id']),
                'title': chat.get('title') or chat.get('first_name') or chat.get('username') or 'Operatör',
                'username': chat.get('username', ''),
                'phone': normalize_phone(contact.get('phone_number', '')),
                'lastText': msg.get('text', ''),
                'updateId': item.get('update_id', 0),
            }
    raise ValueError('Henüz bota gönderilmiş bir mesaj bulunamadı. Lütfen Telegram’da @intelligentcortexbot botunu açıp BAŞLAT (Start) butonuna tıklayın.')


def bind_telegram_phone(phone_raw, bot_token=None, existing_directory=None, fallback_chat_id='', open_desktop_link=False, send_welcome=True):
    """Bind a user phone number to @intelligentcortexbot and send instant confirmation."""
    norm_phone = normalize_phone(phone_raw)
    if len(norm_phone) < 10:
        raise ValueError('Lütfen geçerli bir telefon numarası girin (Örn: 0532 123 45 67 veya +90 5XX XXX XX XX).')
    token = str(bot_token or OFFICIAL_BOT_TOKEN).strip()
    directory = dict(existing_directory or {})
    deep_link = f"https://t.me/{OFFICIAL_BOT_USERNAME}?start=phone_{norm_phone}"
    tg_protocol = f"tg://resolve?domain={OFFICIAL_BOT_USERNAME}&start=phone_{norm_phone}"

    if open_desktop_link and sys.platform.startswith('win'):
        try:
            subprocess.Popen(['cmd', '/c', 'start', '', tg_protocol], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            time.sleep(1.2)
        except Exception:
            pass

    matched_chat_id = str(directory.get(norm_phone) or '').strip()
    matched_title = 'Cortex Kullanıcısı'
    latest_private_chat_id = ''
    latest_private_title = ''

    try:
        updates = _tg_api(token, 'getUpdates', {'limit': 50, 'timeout': 1}, timeout=6) or []
        for item in updates:
            msg = item.get('message') or item.get('edited_message') or {}
            chat = msg.get('chat') or {}
            cid = str(chat.get('id') or '').strip()
            if not cid:
                continue
            title = (
                f"{chat.get('first_name', '')} {chat.get('last_name', '')}".strip()
                or chat.get('title')
                or chat.get('username')
                or 'Operatör'
            )
            latest_private_chat_id = cid
            latest_private_title = title

            contact = msg.get('contact') or {}
            c_phone = normalize_phone(contact.get('phone_number', ''))
            if c_phone:
                directory[c_phone] = cid
                if c_phone == norm_phone or c_phone[-10:] == norm_phone[-10:]:
                    matched_chat_id = cid
                    matched_title = title

            text = str(msg.get('text') or '').strip()
            if text:
                digits_in_text = normalize_phone(text)
                if len(digits_in_text) >= 10:
                    directory[digits_in_text] = cid
                    if digits_in_text == norm_phone or digits_in_text[-10:] == norm_phone[-10:]:
                        matched_chat_id = cid
                        matched_title = title
    except Exception:
        pass

    if not matched_chat_id:
        matched_chat_id = latest_private_chat_id or str(fallback_chat_id or '').strip() or DEFAULT_ADMIN_CHAT_ID
        if latest_private_title:
            matched_title = latest_private_title

    if matched_chat_id:
        directory[norm_phone] = matched_chat_id

    phone_display = format_phone_display(norm_phone)
    notified = False
    if send_welcome and matched_chat_id:
        try:
            welcome_text = (
                f"✅ IPScans Cortex 2.0 Pro — Telefon Numaranız Eşleştirildi!\n\n"
                f"📱 Bildirim Hattı: {phone_display}\n"
                f"👤 Hesap: {matched_title} (ID: {matched_chat_id})\n"
                f"🤖 Resmi Bot: @{OFFICIAL_BOT_USERNAME}\n\n"
                f"Artık Cortex üzerindeki tüm güvenlik ihlalleri, ROI bölge alarmları ve "
                f"anlık kamera fotoğrafları doğrudan bu numaraya bağlı Telegram hesabınıza iletilecektir.\n\n"
                f"👇 Aşağıdaki hızlı komuta butonlarını hemen kullanabilirsiniz:"
            )
            _tg_api(
                token,
                'sendMessage',
                {
                    'chat_id': matched_chat_id,
                    'text': welcome_text,
                    'reply_markup': DEFAULT_BOT_REPLY_MARKUP,
                },
                timeout=8,
            )
            notified = True
        except Exception:
            notified = False

    return {
        'ok': True,
        'phone': norm_phone,
        'phoneDisplay': phone_display,
        'chatId': matched_chat_id,
        'title': matched_title,
        'notified': notified,
        'botUsername': OFFICIAL_BOT_USERNAME,
        'botLink': OFFICIAL_BOT_LINK,
        'deepLink': deep_link,
        'tgProtocol': tg_protocol,
        'directory': directory,
    }


def send_telegram_alert(bot_token, chat_id, event, frame_bytes=None, phone_number=''):
    """Send instant event notification (with JPEG photo if available) via Telegram Bot API."""
    token = str(bot_token or '').strip()
    chat = str(chat_id or '').strip()
    if not token or not chat or ':' not in token:
        raise ValueError('Geçerli bir Telegram Bot Token ve Chat ID girin.')
    phone_line = f"📱 Numara: {format_phone_display(phone_number)}\n" if phone_number else ''
    caption = (
        f"🚨 IPScans Cortex Alarmı\n"
        f"{phone_line}"
        f"📹 Kamera: {event.get('camera', '-')}\n"
        f"⚡ Kural: {event.get('rule', '-')}\n"
        f"📝 Detay: {event.get('reason', '-')[:600]}"
    )

    if frame_bytes and frame_bytes.startswith(b'\xff\xd8'):
        boundary = '----CortexBoundary' + secrets.token_hex(8)
        parts = []
        for field_name, val in (('chat_id', chat), ('caption', caption)):
            parts.append(
                f'--{boundary}\r\n'
                f'Content-Disposition: form-data; name="{field_name}"\r\n\r\n'
                f'{val}\r\n'.encode('utf-8')
            )
        parts.append(
            f'--{boundary}\r\n'
            f'Content-Disposition: form-data; name="photo"; filename="event.jpg"\r\n'
            f'Content-Type: image/jpeg\r\n\r\n'.encode('utf-8')
            + frame_bytes
            + f'\r\n--{boundary}--\r\n'.encode('utf-8')
        )
        body = b''.join(parts)
        url = f'https://api.telegram.org/bot{ urllib.parse.quote(token, safe=":") }/sendPhoto'
        req = urllib.request.Request(
            url,
            data=body,
            headers={'Content-Type': f'multipart/form-data; boundary={boundary}'},
        )
    else:
        url = f'https://api.telegram.org/bot{ urllib.parse.quote(token, safe=":") }/sendMessage'
        body = json.dumps({'chat_id': chat, 'text': caption, 'reply_markup': DEFAULT_BOT_REPLY_MARKUP}).encode('utf-8')
        req = urllib.request.Request(url, data=body, headers={'Content-Type': 'application/json'})

    with urllib.request.urlopen(req, timeout=8) as resp:
        result = json.loads(resp.read(65536))
    if not result.get('ok'):
        raise ValueError('Telegram API yanıtı başarısız.')
    return True


def process_bot_command(text, state_snapshot, chat_id='YEREL-SIMULATOR', action_callback=None):
    """Execute a two-way Cortex Telegram bot command and return structured response text."""
    raw = str(text or '').strip()
    if not raw:
        raw = '/yardim'
    parts = raw.split(maxsplit=1)
    cmd = parts[0].lower().split('@')[0]
    arg = parts[1].strip() if len(parts) > 1 else ''

    cameras = state_snapshot.get('cameras', [])
    rules = state_snapshot.get('rules', [])
    events = state_snapshot.get('events', [])
    lic = state_snapshot.get('license', {})
    plan_name = lic.get('name', 'Cortex ULTRA')
    safe_mode = bool(state_snapshot.get('safeMode', False))
    active_rules = sum(1 for r in rules if r.get('enabled'))

    if cmd in ('/start', 'start'):
        return {
            'command': '/start',
            'reply': (
                f"🛡️ IPScans Cortex 2.0 Pro Komuta Botu Aktif!\n\n"
                f"🔑 Sohbet Kimliğiniz (Chat ID): {chat_id}\n"
                f"📦 Aktif Paket: {plan_name}\n"
                f"📹 Kameralar: {len(cameras)} kayıtlı · ⚡ Kurallar: {active_rules}/{len(rules)} aktif\n"
                f"🔒 Mod: {'⏸ Güvenli Mod (Susturuldu)' if safe_mode else '🟢 Tam Koruma Devrede'}\n\n"
                f"Komutlar:\n"
                f"• /durum — Sistem ve lisans özeti\n"
                f"• /kameralar — Kamera durum listesi\n"
                f"• /anlik — Kameradan anlık fotoğraf çek\n"
                f"• /olaylar — Son 5 güvenlik alarmı\n"
                f"• /koru — Tüm kuralları devreye al\n"
                f"• /sustur — Bildirimleri duraklat"
            ),
        }

    if cmd in ('/durum', '/status', 'durum', 'status'):
        now = time.time()
        last_24h = sum(1 for e in events if now - float(e.get('time', 0)) <= 86400)
        unrev = sum(1 for e in events if not e.get('reviewed'))
        return {
            'command': '/durum',
            'reply': (
                f"📊 IPScans Cortex 2.0 Pro Sistem Durumu\n"
                f"────────────────────\n"
                f"📦 Lisans Paketi: {plan_name} ({lic.get('plan', 'ULTRA')})\n"
                f"📹 Kamera Kapasitesi: {len(cameras)} / {lic.get('maxCameras', 32)}\n"
                f"⚡ Aktif Kural: {active_rules} / {lic.get('maxRules', 128)}\n"
                f"🚨 Son 24 Saat Olay: {last_24h} ({unrev} incelenmemiş)\n"
                f"🧠 Görsel AI Modeli: {state_snapshot.get('model', 'gemma3:4b')}\n"
                f"💾 Boş Disk Alanı: {state_snapshot.get('diskFreeGB', '-')} GB\n"
                f"🛡️ Çalışma Modu: {'⏸ Güvenli Mod' if safe_mode else '🟢 Tam Koruma'}"
            ),
        }

    if cmd in ('/kameralar', '/cameras', 'kameralar', 'cameras'):
        if not cameras:
            return {'command': '/kameralar', 'reply': '📹 Henüz kayıtlı kamera bulunmuyor. Cortex panelinden RTSP/ONVIF kamera ekleyebilirsiniz.'}
        lines = [f"📹 Kayıtlı Kameralar ({len(cameras)} adet):"]
        for idx, c in enumerate(cameras, 1):
            st = c.get('status', 'Bekliyor')
            icon = '🟢' if st == 'Bağlı' else ('⏸' if not c.get('enabled', True) else '🔴')
            lines.append(f"{idx}. {icon} {c.get('name', 'Kamera')} — {st} ({c.get('analysis', '-')})")
        lines.append("\n📸 Anlık kare almak için: /anlik <kamera_adı>")
        return {'command': '/kameralar', 'reply': '\n'.join(lines)}

    if cmd in ('/olaylar', '/events', 'olaylar', 'events'):
        if not events:
            return {'command': '/olaylar', 'reply': '✅ Kayıtlı güvenlik olayı bulunmuyor.'}
        lines = ['🚨 Son Güvenlik Alarmları (İlk 5):']
        for idx, e in enumerate(events[:5], 1):
            ts = dt.datetime.fromtimestamp(float(e.get('time', time.time()))).strftime('%H:%M:%S')
            rev = '✓' if e.get('reviewed') else '●'
            lines.append(f"{idx}. [{ts}] {rev} {e.get('camera', '-')} · {e.get('rule', '-')}\n   └ {str(e.get('reason', ''))[:110]}")
        return {'command': '/olaylar', 'reply': '\n'.join(lines)}

    if cmd in ('/koru', '/arm', 'koru', 'arm'):
        if action_callback:
            action_callback('arm_all', arg)
        return {
            'command': '/koru',
            'reply': '🟢 Tüm kamera kuralları ve anlık bildirimler TAM KORUMA moduna alındı.',
        }

    if cmd in ('/sustur', '/disarm', 'sustur', 'disarm'):
        if action_callback:
            action_callback('disarm_all', arg)
        return {
            'command': '/sustur',
            'reply': '⏸ Güvenli Mod etkinleştirildi: ağır bildirimler geçici olarak duraklatıldı. Tekrar açmak için /koru yazın.',
        }

    if cmd in ('/anlik', '/snapshot', '/snap', 'anlik', 'snapshot'):
        target_cam = None
        if arg:
            target_cam = next((c for c in cameras if arg.lower() in c.get('name', '').lower() or arg == c.get('id')), None)
        if not target_cam and cameras:
            target_cam = cameras[0]
        if not target_cam:
            return {'command': '/anlik', 'reply': '📸 Fotoğraf çekilecek aktif kamera bulunamadı.'}
        return {
            'command': '/anlik',
            'cameraId': target_cam.get('id'),
            'cameraName': target_cam.get('name', 'Kamera'),
            'reply': f"📸 {target_cam.get('name', 'Kamera')} kamerasından anlık görüntü yakalandı ({dt.datetime.now().strftime('%H:%M:%S')}).",
        }

    return {
        'command': '/yardim',
        'reply': (
            "🤖 IPScans Cortex Telegram Bot Komutları:\n"
            "• /start — Bot bağlantısını ve Chat ID bilgisini doğrula\n"
            "• /durum — Sistem sağlığı, lisans paketi ve 24s özet\n"
            "• /kameralar — Tüm kameraların anlık bağlantı durumu\n"
            "• /anlik [kamera] — Kameradan canlı fotoğraf gönder\n"
            "• /olaylar — Son 5 güvenlik olayını listele\n"
            "• /koru — Tüm kuralları ve alarmları devreye al\n"
            "• /sustur — Bildirimleri geçici olarak duraklat"
        ),
    }


def poll_telegram_updates(bot_token, authorized_chat_id, last_update_id, state_snapshot, action_callback=None, frame_provider=None):
    """Poll Telegram getUpdates once and respond to incoming commands or phone-pairing messages."""
    token = str(bot_token or '').strip()
    if not token or ':' not in token:
        return last_update_id
    updates = _tg_api(token, 'getUpdates', {'offset': int(last_update_id) + 1, 'limit': 10, 'timeout': 2}, timeout=6) or []
    new_offset = int(last_update_id)
    for item in updates:
        uid = int(item.get('update_id', 0))
        if uid > new_offset:
            new_offset = uid
        msg = item.get('message') or {}
        text = str(msg.get('text', '')).strip()
        contact = msg.get('contact') or {}
        chat = msg.get('chat') or {}
        chat_id = str(chat.get('id', ''))
        if not chat_id:
            continue

        # 1. Handle Contact Share button ("📱 Telefon Numaramı Doğrula & Eşleştir")
        c_phone = normalize_phone(contact.get('phone_number', ''))
        if c_phone:
            if action_callback:
                action_callback('bind_phone', {'phone': c_phone, 'chatId': chat_id})
            send_telegram_alert(
                token,
                chat_id,
                {
                    'camera': 'Cortex Numara Eşleştirme',
                    'rule': 'Telefon Doğrulandı',
                    'reason': f"✅ Telefon numaranız ({format_phone_display(c_phone)}) doğrulandı ve Cortex bildirim hattı olarak kaydedildi!",
                },
                phone_number=c_phone,
            )
            continue

        if not text:
            continue

        # 2. Handle /start phone_<digits> or plain phone number sent in chat
        maybe_digits = normalize_phone(text)
        if len(maybe_digits) >= 10 and (text.lower().startswith('/start') or re.fullmatch(r'[\+\d\s\-\(\)]{10,18}', text)):
            if action_callback:
                action_callback('bind_phone', {'phone': maybe_digits, 'chatId': chat_id})

        # Allow /start from any chat so the operator can pair; restrict other commands if authorized_chat_id is set
        if authorized_chat_id and str(authorized_chat_id).strip() and chat_id != str(authorized_chat_id).strip() and not text.lower().startswith('/start'):
            continue
        res = process_bot_command(text, state_snapshot, chat_id=chat_id, action_callback=action_callback)
        frame_bytes = None
        if res.get('cameraId') and frame_provider:
            frame_bytes = frame_provider(res['cameraId'])
        send_telegram_alert(
            token,
            chat_id,
            {
                'camera': res.get('cameraName', 'Cortex Komuta Merkezi'),
                'rule': f"Komut Yanıtı ({res.get('command', '/komut')})",
                'reason': res['reply'],
            },
            frame_bytes=frame_bytes,
            phone_number=state_snapshot.get('telegramPhone', ''),
        )
    return new_offset
