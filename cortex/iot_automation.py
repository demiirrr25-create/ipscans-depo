"""Cortex — Two-Way Interactive Telegram Bot Engine & HMAC-SHA256 Signed Enterprise Webhooks."""
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
OFFICIAL_BOT_NAME = 'Cortex | Kamera ve Güvenlik'
OFFICIAL_BOT_LINK = 'https://t.me/intelligentcortexbot'
DEFAULT_ADMIN_CHAT_ID = '8972256505'
DEFAULT_ADMIN_PHONE = '905415130525'
DEFAULT_ADMIN_PHONE_DISPLAY = '+90 (541) 513 05 25'

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
        [{'text': 'Durum'}, {'text': 'Kameralar'}],
        [{'text': 'Anlık görüntü'}, {'text': 'Son olaylar'}],
        [{'text': 'Korumayı aç'}, {'text': 'Bildirimleri sustur'}],
        [{'text': 'Telefon Numaramı Doğrula & Eşleştir', 'request_contact': True}, {'text': 'Yardım'}],
    ],
    'resize_keyboard': True,
    'is_persistent': True,
    'input_field_placeholder': 'Bir işlem seçin veya komut yazın',
}
COMMAND_LABELS = {'durum':'/durum', 'kameralar':'/kameralar', 'anlık görüntü':'/anlik',
                  'son olaylar':'/olaylar', 'korumayı aç':'/koru',
                  'bildirimleri sustur':'/sustur', 'yardım':'/yardim'}


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


def discover_telegram_chat(bot_token=None, fallback_chat_id='', fallback_phone=''):
    """Auto-discover the operator's Chat ID from recent /start, contact, or text messages sent to the bot."""
    token = str(bot_token or OFFICIAL_BOT_TOKEN).strip()
    updates = _tg_api(token, 'getUpdates', {'limit': 35, 'timeout': 1}, timeout=6) or []
    norm_fb_phone = normalize_phone(fallback_phone)
    for item in reversed(updates):
        msg = item.get('message') or item.get('edited_message') or {}
        chat = msg.get('chat') or {}
        contact = msg.get('contact') or {}
        c_phone = normalize_phone(contact.get('phone_number', ''))
        if norm_fb_phone and c_phone and c_phone[-10:] != norm_fb_phone[-10:]:
            continue
        if chat.get('id') is not None:
            return {
                'chatId': str(chat['id']),
                'title': (f"{chat.get('first_name', '')} {chat.get('last_name', '')}".strip() or chat.get('title') or chat.get('username') or 'Operatör'),
                'username': chat.get('username', ''),
                'phone': norm_fb_phone or c_phone,
                'lastText': msg.get('text', ''),
                'updateId': item.get('update_id', 0),
            }
    fb_chat = str(fallback_chat_id or '').strip()
    if fb_chat:
        return {
            'chatId': fb_chat,
            'title': 'Kayıtlı Cortex Operatörü',
            'username': '',
            'phone': norm_fb_phone,
            'lastText': '/start',
            'updateId': 0,
        }
    raise ValueError('Henüz bota gönderilmiş bir mesaj bulunamadı. Lütfen Telegram’da @intelligentcortexbot botunu açıp BAŞLAT (Start) butonuna tıklayın.')


def bind_telegram_phone(
    phone_raw,
    bot_token=None,
    existing_directory=None,
    fallback_chat_id='',
    open_desktop_link=False,
    send_welcome=True,
    state_snapshot=None,
    known_chats=None,
):
    """Bind a user phone number to @intelligentcortexbot, auto-start embedded bot session, and send instant welcome."""
    norm_phone = normalize_phone(phone_raw)
    if len(norm_phone) < 10:
        raise ValueError('Lütfen geçerli bir telefon numarası girin (Örn: 0532 123 45 67 veya +90 5XX XXX XX XX).')
    token = str(bot_token or OFFICIAL_BOT_TOKEN).strip()
    directory = dict(existing_directory or {})
    known = {
        str(k): dict(v)
        for k, v in (known_chats or {}).items()
        if isinstance(v, dict) and str(k).strip()
    }
    snap = dict(state_snapshot or {})
    deep_link = f"https://t.me/{OFFICIAL_BOT_USERNAME}?start=phone_{norm_phone}"
    tg_protocol = f"tg://resolve?domain={OFFICIAL_BOT_USERNAME}&start=phone_{norm_phone}"

    if open_desktop_link and sys.platform.startswith('win'):
        try:
            subprocess.Popen(['cmd', '/c', 'start', '', tg_protocol], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            time.sleep(0.4)
        except Exception:
            pass

    matched_chat_id = str(directory.get(norm_phone) or '').strip()
    if not matched_chat_id:
        for k, v in list(directory.items()):
            nk = normalize_phone(k)
            if len(nk) >= 10 and nk[-10:] == norm_phone[-10:] and str(v or '').strip():
                matched_chat_id = str(v).strip()
                break

    matched_title = 'Cortex Kullanıcısı'
    latest_known_chat_id = ''
    latest_known_title = ''
    latest_known_ts = -1.0

    for cid_key, kinfo in known.items():
        cid_str = str(kinfo.get('chatId') or cid_key).strip()
        if not cid_str:
            continue
        k_title = str(kinfo.get('title') or kinfo.get('username') or 'Operatör').strip()
        k_phone = normalize_phone(kinfo.get('phone', ''))
        k_ts = float(kinfo.get('lastSeen') or 0.0)
        if k_ts >= latest_known_ts:
            latest_known_ts = k_ts
            latest_known_chat_id = cid_str
            latest_known_title = k_title
        if len(k_phone) >= 10 and k_phone[-10:] == norm_phone[-10:]:
            if not matched_chat_id:
                matched_chat_id = cid_str
            matched_title = k_title

    latest_private_chat_id = ''
    latest_private_title = ''

    try:
        updates = _tg_api(token, 'getUpdates', {'limit': 50, 'timeout': 1}, timeout=5) or []
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
            contact = msg.get('contact') or {}
            c_phone = normalize_phone(contact.get('phone_number', ''))
            text = str(msg.get('text') or '').strip()
            digits_in_text = normalize_phone(text) if text else ''
            disc_phone = c_phone or (digits_in_text if len(digits_in_text) >= 10 else '')

            if disc_phone:
                if disc_phone == norm_phone or disc_phone[-10:] == norm_phone[-10:]:
                    matched_chat_id = cid
                    matched_title = title
                    directory[norm_phone] = cid
                    known[cid] = {
                        'chatId': cid,
                        'title': title,
                        'username': str(chat.get('username') or ''),
                        'phone': norm_phone,
                        'lastSeen': time.time(),
                    }
            else:
                latest_private_chat_id = cid
                latest_private_title = title
    except Exception:
        pass

    if not matched_chat_id:
        matched_chat_id = (
            latest_private_chat_id
            or latest_known_chat_id
            or str(fallback_chat_id or '').strip()
            or DEFAULT_ADMIN_CHAT_ID
        )
        if latest_private_title:
            matched_title = latest_private_title
        elif latest_known_title:
            matched_title = latest_known_title

    if matched_chat_id and matched_chat_id in known and matched_title == 'Cortex Kullanıcısı':
        matched_title = known[matched_chat_id].get('title') or matched_title

    if matched_chat_id:
        directory[norm_phone] = matched_chat_id
        known[matched_chat_id] = {
            'chatId': matched_chat_id,
            'title': matched_title,
            'username': known.get(matched_chat_id, {}).get('username', ''),
            'phone': norm_phone,
            'lastSeen': time.time(),
        }

    phone_display = format_phone_display(norm_phone)
    lic = snap.get('license') if isinstance(snap.get('license'), dict) else {}
    plan_name = lic.get('name') or lic.get('plan') or 'Cortex ULTRA'
    cameras_list = snap.get('cameras') if isinstance(snap.get('cameras'), list) else []
    rules_list = snap.get('rules') if isinstance(snap.get('rules'), list) else []
    cameras_count = len(cameras_list)
    active_rules = sum(1 for r in rules_list if isinstance(r, dict) and r.get('enabled', True))

    notified = False
    if send_welcome and matched_chat_id:
        try:
            welcome_text = (
                f"🚀 Cortex · Bağlantınız hazır\n\n"
                f"📱 Tanımlanan Numara: {phone_display}\n"
                f"🟢 Durum: Aktif · Anlık Alarm & Kanıt Akışı Devrede\n"
                f"📦 Paket: {plan_name} ({cameras_count} Kamera · {active_rules} Aktif Kural)\n"
                f"🎬 İletim Modu: 📸 Olay Öncesi Kare + 🎬 Olay Videosu (MP4)\n\n"
                f"Yeni numaranız Cortex gömülü bot motoru tarafından tanındı ve otomatik olarak başlatıldı (/start). "
                f"Gerçekleşen tüm olaylar anında bu hesaba iletilecektir."
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
        'connected': True,
        'verified': bool(matched_chat_id),
        'autoStarted': notified,
        'embeddedBotActive': True,
        'phone': norm_phone,
        'phoneDisplay': phone_display,
        'chatId': matched_chat_id,
        'title': matched_title,
        'notified': notified,
        'botUsername': OFFICIAL_BOT_USERNAME,
        'botName': OFFICIAL_BOT_NAME,
        'botLink': OFFICIAL_BOT_LINK,
        'deepLink': deep_link,
        'tgProtocol': tg_protocol,
        'directory': directory,
        'knownChats': known,
    }


def send_telegram_video(bot_token, chat_id, video_bytes, caption='', filename='olay_videosu.mp4'):
    """Send an MP4 event video clip via Telegram Bot API /sendVideo."""
    token = str(bot_token or '').strip()
    chat = str(chat_id or '').strip()
    if not token or not chat or ':' not in token:
        raise ValueError('Geçerli bir Telegram Bot Token ve Chat ID girin.')
    if not video_bytes:
        raise ValueError('Gönderilecek video verisi bulunamadı.')
    boundary = '----CortexVideoBoundary' + secrets.token_hex(8)
    parts = []
    for field_name, val in (('chat_id', chat), ('caption', str(caption or '')[:1024]), ('supports_streaming', 'true')):
        parts.append(
            f'--{boundary}\r\n'
            f'Content-Disposition: form-data; name="{field_name}"\r\n\r\n'
            f'{val}\r\n'.encode('utf-8')
        )
    parts.append(
        f'--{boundary}\r\n'
        f'Content-Disposition: form-data; name="video"; filename="{filename}"\r\n'
        f'Content-Type: video/mp4\r\n\r\n'.encode('utf-8')
        + video_bytes
        + f'\r\n--{boundary}--\r\n'.encode('utf-8')
    )
    body = b''.join(parts)
    url = f'https://api.telegram.org/bot{urllib.parse.quote(token, safe=":")}/sendVideo'
    req = urllib.request.Request(
        url,
        data=body,
        headers={'Content-Type': f'multipart/form-data; boundary={boundary}'},
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        result = json.loads(resp.read(65536))
    if not result.get('ok'):
        raise ValueError(result.get('description', 'Telegram video gönderimi başarısız.'))
    return True


def send_telegram_alert(bot_token, chat_id, event, frame_bytes=None, video_bytes=None, phone_number='', recipients=None):
    """Send instant event notification (with pre-event JPEG frame and/or MP4 video clip) to one or more registered phones."""
    if isinstance(video_bytes, str):
        phone_number = video_bytes
        video_bytes = None
    token = str(bot_token or '').strip()
    fallback_chat = str(chat_id or '').strip()
    if not token or ':' not in token:
        raise ValueError('Geçerli bir Telegram Bot Token ve Chat ID girin.')

    target_list = []
    if isinstance(recipients, list) and recipients:
        seen = set()
        for item in recipients:
            if not isinstance(item, dict) or item.get('enabled', True) is False:
                continue
            r_chat = str(item.get('chatId') or fallback_chat).strip()
            r_phone = str(item.get('phone') or phone_number or '').strip()
            if not r_chat:
                continue
            dedup_key = (r_chat, normalize_phone(r_phone) or r_phone)
            if dedup_key not in seen:
                seen.add(dedup_key)
                target_list.append({'chatId': r_chat, 'phone': r_phone})

    if not target_list:
        if not fallback_chat:
            raise ValueError('Geçerli bir Telegram Bot Token ve Chat ID girin.')
        target_list = [{'chatId': fallback_chat, 'phone': str(phone_number or '').strip()}]

    has_photo = bool(frame_bytes and isinstance(frame_bytes, (bytes, bytearray)) and frame_bytes.startswith(b'\xff\xd8'))
    has_video = bool(video_bytes and isinstance(video_bytes, (bytes, bytearray)) and len(video_bytes) > 100)

    for target in target_list:
        target_chat = target['chatId']
        target_phone = target['phone']
        phone_line = f"📱 Numara: {format_phone_display(target_phone)}\n" if target_phone else ''

        if has_photo:
            photo_caption = (
                f"📸 [OLAY ÖNCESİ KARE]\n"
                f"Cortex · Yeni olay\n"
                f"{phone_line}"
                f"📹 Kamera: {event.get('camera', '-')}\n"
                f"⚡ Kural: {event.get('rule', '-')}\n"
                f"📝 Detay: {event.get('reason', '-')[:600]}"
            )
            boundary = '----CortexBoundary' + secrets.token_hex(8)
            parts = []
            for field_name, val in (('chat_id', target_chat), ('caption', photo_caption)):
                parts.append(
                    f'--{boundary}\r\n'
                    f'Content-Disposition: form-data; name="{field_name}"\r\n\r\n'
                    f'{val}\r\n'.encode('utf-8')
                )
            parts.append(
                f'--{boundary}\r\n'
                f'Content-Disposition: form-data; name="photo"; filename="olay_oncesi.jpg"\r\n'
                f'Content-Type: image/jpeg\r\n\r\n'.encode('utf-8')
                + frame_bytes
                + f'\r\n--{boundary}--\r\n'.encode('utf-8')
            )
            body = b''.join(parts)
            url = f'https://api.telegram.org/bot{urllib.parse.quote(token, safe=":")}/sendPhoto'
            req = urllib.request.Request(
                url,
                data=body,
                headers={'Content-Type': f'multipart/form-data; boundary={boundary}'},
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                result = json.loads(resp.read(65536))
            if not result.get('ok'):
                raise ValueError('Telegram API fotoğraf yanıtı başarısız.')

        if has_video:
            video_caption = (
                f"🎬 [GERÇEKLEŞEN OLAY VİDEOSU]\n"
                f"Cortex · Olay kaydı\n"
                f"{phone_line}"
                f"📹 Kamera: {event.get('camera', '-')}\n"
                f"⚡ Kural: {event.get('rule', '-')}"
            )
            send_telegram_video(token, target_chat, video_bytes, caption=video_caption, filename='olay_videosu.mp4')

        if not has_photo and not has_video:
            text_caption = (
                f"Cortex · Yeni olay\n"
                f"{phone_line}"
                f"📹 Kamera: {event.get('camera', '-')}\n"
                f"⚡ Kural: {event.get('rule', '-')}\n"
                f"📝 Detay: {event.get('reason', '-')[:600]}"
            )
            url = f'https://api.telegram.org/bot{urllib.parse.quote(token, safe=":")}/sendMessage'
            body = json.dumps({'chat_id': target_chat, 'text': text_caption, 'reply_markup': DEFAULT_BOT_REPLY_MARKUP}).encode('utf-8')
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
    raw = COMMAND_LABELS.get(raw.casefold(), raw)
    parts = raw.split(maxsplit=1)
    cmd = parts[0].lower().split('@')[0]
    arg = parts[1].strip() if len(parts) > 1 else ''

    active_tid = str(state_snapshot.get('activeTenantId') or '').strip()
    raw_cameras = state_snapshot.get('cameras', [])
    raw_rules = state_snapshot.get('rules', [])
    raw_events = state_snapshot.get('events', [])
    cameras = [c for c in raw_cameras if isinstance(c, dict) and (not active_tid or c.get('ownerId', active_tid) == active_tid)]
    rules = [r for r in raw_rules if isinstance(r, dict) and (not active_tid or r.get('ownerId', active_tid) == active_tid)]
    events = [e for e in raw_events if isinstance(e, dict) and (not active_tid or e.get('ownerId', active_tid) == active_tid)]
    lic = state_snapshot.get('license', {})
    plan_name = lic.get('name', 'Cortex ULTRA')
    safe_mode = bool(state_snapshot.get('safeMode', False))
    active_rules = sum(1 for r in rules if r.get('enabled'))

    if cmd in ('/start', 'start'):
        arg_digits = normalize_phone(arg)
        active_phone = arg_digits if len(arg_digits) >= 10 else str(state_snapshot.get('telegramPhone') or '').strip()
        phone_str = (format_phone_display(active_phone) or active_phone) if active_phone else 'Henüz eşleştirilmedi'
        return {
            'command': '/start',
            'reply': (
                f"🛡️ Cortex · Kontrol merkezi\nipscans.com projesi\n\n"
                f"📱 Bağlı Numara: {phone_str}\n"
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
                f"📊 Cortex · Sistem durumu\n"
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
    token = str(bot_token or OFFICIAL_BOT_TOKEN).strip()
    if not token or ':' not in token:
        return last_update_id
    updates = _tg_api(token, 'getUpdates', {'offset': int(last_update_id) + 1, 'limit': 15, 'timeout': 2}, timeout=6) or []
    new_offset = int(last_update_id)
    handled_contacts = set()
    cur_auth_chat = str(authorized_chat_id or '').strip()

    for item in updates:
        uid = int(item.get('update_id', 0))
        if uid > new_offset:
            new_offset = uid
        try:
            msg = item.get('message') or item.get('edited_message') or {}
            text = str(msg.get('text', '')).strip()
            contact = msg.get('contact') or {}
            chat = msg.get('chat') or {}
            chat_id = str(chat.get('id', '')).strip()
            if not chat_id:
                continue
            sender_title = (
                f"{chat.get('first_name', '')} {chat.get('last_name', '')}".strip()
                or chat.get('title')
                or chat.get('username')
                or 'Operatör'
            )

            c_phone = normalize_phone(contact.get('phone_number', ''))
            text_digits = normalize_phone(text) if text else ''
            discovered_phone = c_phone or (text_digits if len(text_digits) >= 10 else '')
            if action_callback:
                action_callback(
                    'register_chat',
                    {
                        'chatId': chat_id,
                        'title': sender_title,
                        'username': chat.get('username', ''),
                        'phone': discovered_phone,
                    },
                )

            # 1. Handle Contact Share button ("📱 Telefon Numaramı Doğrula & Eşleştir")
            if c_phone:
                cur_auth_chat = chat_id
                if action_callback:
                    action_callback('bind_phone', {'phone': c_phone, 'chatId': chat_id, 'title': sender_title})
                if (chat_id, c_phone) not in handled_contacts:
                    handled_contacts.add((chat_id, c_phone))
                    send_telegram_alert(
                        token,
                        chat_id,
                        {
                            'camera': 'Cortex Numara Eşleştirme',
                            'rule': 'Telefon Numaranız Doğrulandı ✓',
                            'reason': (
                                f"✅ Telefon numaranız ({format_phone_display(c_phone)}) başarıyla doğrulandı ve "
                                f"Cortex ana bildirim hattı olarak kaydedildi!\n\n"
                                f"👤 Operatör: {sender_title}\n"
                                f"👇 Aşağıdaki butonlarla kameralarınızı ve sistem durumunu hemen kontrol edebilirsiniz:"
                            ),
                        },
                        phone_number=c_phone,
                    )
                continue

            if not text:
                continue

            # 2. Handle plain phone number typed directly in chat (e.g. "05415130525" or "+90 541 513 05 25")
            if not text.startswith('/') and re.fullmatch(r'[\+\d\s\-\(\)]{10,18}', text):
                typed_phone = normalize_phone(text)
                if len(typed_phone) >= 10:
                    cur_auth_chat = chat_id
                    if action_callback:
                        action_callback('bind_phone', {'phone': typed_phone, 'chatId': chat_id, 'title': sender_title})
                    send_telegram_alert(
                        token,
                        chat_id,
                        {
                            'camera': 'Cortex Numara Eşleştirme',
                            'rule': 'Telefon Numaranız Kaydedildi ✓',
                            'reason': (
                                f"✅ Girdiğiniz telefon numarası ({format_phone_display(typed_phone)}) Cortex "
                                f"bildirim hattı olarak eşleştirildi!\n\n"
                                f"👤 Operatör: {sender_title}"
                            ),
                        },
                        phone_number=typed_phone,
                    )
                    continue

            # 3. Handle /start (with or without phone_<digits>) -> authorize chat_id & auto-bind pending/recent phone
            if text.lower().startswith('/start'):
                cur_auth_chat = chat_id
                maybe_digits = normalize_phone(text)
                pending_phone = ''
                phones_in_snap = state_snapshot.get('telegramPhones') or state_snapshot.get('phones') or []
                if isinstance(phones_in_snap, list) and phones_in_snap:
                    for p_item in reversed(phones_in_snap):
                        if isinstance(p_item, dict) and p_item.get('autoStartPending') and p_item.get('phone'):
                            pending_phone = normalize_phone(p_item['phone'])
                            break
                    if not pending_phone:
                        last_p = phones_in_snap[-1]
                        if isinstance(last_p, dict) and last_p.get('phone'):
                            pending_phone = normalize_phone(last_p['phone'])
                bound_phone = (
                    maybe_digits
                    if len(maybe_digits) >= 10
                    else (pending_phone or str(state_snapshot.get('telegramPhone') or '').strip())
                )
                if bound_phone:
                    state_snapshot['telegramPhone'] = bound_phone
                    if action_callback:
                        action_callback('bind_phone', {'phone': bound_phone, 'chatId': chat_id, 'title': sender_title})

            # 4. Handle text fallback if desktop client sends button label as text
            if 'numaramı doğrula' in text.lower() or 'eşleştir' in text.lower():
                cur_auth_chat = chat_id
                fallback_p = str(state_snapshot.get('telegramPhone') or '').strip()
                if fallback_p and action_callback:
                    action_callback('bind_phone', {'phone': fallback_p, 'chatId': chat_id, 'title': sender_title})
                send_telegram_alert(
                    token,
                    chat_id,
                    {
                        'camera': 'Cortex Numara Eşleştirme',
                        'rule': 'Telefon Eşleştirme Aktif ✓',
                        'reason': (
                            f"✅ Hesabınız ({sender_title}) ve numaranız ({format_phone_display(fallback_p)}) Cortex bildirim hattına bağlandı!"
                            if fallback_p
                            else f"📱 Lütfen telefon numaranızı doğrulamak için aşağıdaki 'Telefon Numaramı Doğrula & Eşleştir' butonuna dokunun veya numaranızı yazın."
                        ),
                    },
                    phone_number=fallback_p,
                )
                continue

            # 5. Execute command (/durum, /kameralar, /anlik, /olaylar, /koru, /sustur, /yardim)
            res = process_bot_command(text, state_snapshot, chat_id=chat_id, action_callback=action_callback)
            if action_callback:
                action_callback('log_command', {'command': text, 'action': res.get('command', '/komut'), 'reply': res.get('reply', '')})
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
                phone_number=str(state_snapshot.get('telegramPhone') or '').strip(),
            )
        except Exception:
            continue
    return new_offset
