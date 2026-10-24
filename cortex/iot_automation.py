"""Cortex 2.0 Pro — Two-Way Interactive Telegram Bot Engine & HMAC-SHA256 Signed Enterprise Webhooks."""
import datetime as dt
import hashlib
import hmac
import json
import secrets
import time
import urllib.parse
import urllib.request

BOT_COMMANDS = [
    {'command': 'start', 'description': 'Cortex güvenlik botunu başlat ve Chat ID bilgini göster'},
    {'command': 'durum', 'description': 'Sistem sağlığı, aktif paket (PRO/PLUS/ULTRA) ve kamera özeti'},
    {'command': 'kameralar', 'description': 'Tüm kameraların canlı bağlantı ve analiz durumunu listele'},
    {'command': 'anlik', 'description': 'Kameradan anlık JPEG fotoğraf çek ve gönder (/anlik [kamera])'},
    {'command': 'olaylar', 'description': 'Son 5 güvenlik alarmını zaman ve kural detayıyla listele'},
    {'command': 'koru', 'description': 'Tüm olay kurallarını ve bildirimleri aktif duruma getir (Arm)'},
    {'command': 'sustur', 'description': 'Bildirimleri geçici olarak duraklat / güvenli moda al (Disarm)'},
    {'command': 'yardim', 'description': 'Kullanılabilir tüm Cortex Telegram komutlarını göster'},
]

BOT_SPECIFICATION = {
    'botName': 'IPScans Cortex Güvenlik & Komuta Botu',
    'suggestedUsername': 'IPScansCortex_Bot',
    'botFatherUrl': 'https://t.me/BotFather',
    'architecture': 'HTTPS Long-Polling (getUpdates + sendPhoto · Port yönlendirme gerektirmez)',
    'commands': BOT_COMMANDS,
    'botFatherCommandsText': '\n'.join(f"{c['command']} - {c['description']}" for c in BOT_COMMANDS),
}


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


def verify_telegram_bot(bot_token):
    """Verify token via getMe and register interactive command menu via setMyCommands."""
    me = _tg_api(bot_token, 'getMe', timeout=6)
    try:
        _tg_api(bot_token, 'deleteWebhook', {'drop_pending_updates': False}, timeout=5)
        _tg_api(bot_token, 'setMyCommands', {'commands': BOT_COMMANDS}, timeout=5)
    except Exception:
        pass
    return {
        'id': me.get('id'),
        'username': me.get('username', ''),
        'firstName': me.get('first_name', 'Cortex Bot'),
        'link': f"https://t.me/{me.get('username')}" if me.get('username') else '',
    }


def discover_telegram_chat(bot_token):
    """Auto-discover the operator's Chat ID from recent /start or text messages sent to the bot."""
    updates = _tg_api(bot_token, 'getUpdates', {'limit': 25, 'timeout': 1}, timeout=6) or []
    for item in reversed(updates):
        msg = item.get('message') or item.get('edited_message') or {}
        chat = msg.get('chat') or {}
        if chat.get('id') is not None:
            return {
                'chatId': str(chat['id']),
                'title': chat.get('title') or chat.get('first_name') or chat.get('username') or 'Operatör',
                'username': chat.get('username', ''),
                'lastText': msg.get('text', ''),
                'updateId': item.get('update_id', 0),
            }
    raise ValueError('Henüz bota gönderilmiş bir mesaj bulunamadı. Lütfen Telegram’da botunuzu açıp /start yazın ve tekrar tıklayın.')


def send_telegram_alert(bot_token, chat_id, event, frame_bytes=None):
    """Send instant event notification (with JPEG photo if available) via Telegram Bot API."""
    token = str(bot_token or '').strip()
    chat = str(chat_id or '').strip()
    if not token or not chat or ':' not in token:
        raise ValueError('Geçerli bir Telegram Bot Token ve Chat ID girin.')
    caption = (
        f"🚨 IPScans Cortex Alarmı\n"
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
        body = json.dumps({'chat_id': chat, 'text': caption}).encode('utf-8')
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
    """Poll Telegram getUpdates once and respond to incoming commands from authorized chat."""
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
        chat = msg.get('chat') or {}
        chat_id = str(chat.get('id', ''))
        if not text or not chat_id:
            continue
        # Allow /start from any chat so the operator can see their Chat ID; restrict other commands if authorized_chat_id is set
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
        )
    return new_offset
