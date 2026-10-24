"""Cortex 2.0 Pro — Enterprise Multi-Channel Alerts (Telegram Bot & HMAC-SHA256 Signed Webhooks)."""
import hashlib
import hmac
import json
import secrets
import time
import urllib.parse
import urllib.request


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
