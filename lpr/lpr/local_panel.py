"""Loopback-only operator panel; one server thread owns its SQLite connection."""
import base64
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, HTTPServer
import json
import secrets
import threading

from .ai_assistant import Assistant, MODELS
from .event_service import EventService
from .operations import Operations


class LocalPanel:
    def __init__(self, path):
        self.path = path
        self.ai = Assistant()
        self.ready = threading.Event()
        self.error = None
        self.server = None
        self.thread = threading.Thread(target=self.run, daemon=True)
        self.thread.start()
        if not self.ready.wait(10):
            raise RuntimeError('Yerel panel başlatılamadı')
        if self.error:
            raise RuntimeError(str(self.error))

    @property
    def url(self):
        return 'http://127.0.0.1:'+str(self.server.server_port)

    def run(self):
        ops = None
        try:
            ops = Operations(self.path)
            events = EventService(ops)
            owner = self
            csrf = {}

            class Handler(BaseHTTPRequestHandler):
                def setup(self):
                    super().setup()
                    self.connection.settimeout(5)

                def log_message(self, *args):
                    pass

                def send(self, status, value, cookie=None):
                    html = isinstance(value, str)
                    raw = value.encode() if html else json.dumps(value, ensure_ascii=False).encode()
                    self.send_response(status)
                    self.send_header('Content-Type', 'text/html; charset=utf-8' if html else 'application/json; charset=utf-8')
                    self.send_header('Content-Length', str(len(raw)))
                    self.send_header('Cache-Control', 'no-store')
                    self.send_header('X-Content-Type-Options', 'nosniff')
                    self.send_header('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; script-src 'unsafe-inline'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'")
                    if cookie:
                        self.send_header('Set-Cookie', cookie)
                    self.end_headers()
                    self.wfile.write(raw)

                def session(self):
                    cookie = SimpleCookie(self.headers.get('Cookie', ''))
                    token = cookie['lpr_session'].value if 'lpr_session' in cookie else ''
                    stored = ops.sessions.get(token)
                    if not stored:
                        raise PermissionError('Oturum açın')
                    ops.check(stored[0], 'read')
                    return stored[0]

                def do_GET(self):
                    self.dispatch(False)

                def do_POST(self):
                    self.dispatch(True)

                def dispatch(self, post):
                    try:
                        if self.headers.get('Host') != owner.url.removeprefix('http://'):
                            self.send(403, {'error': 'Geçersiz yerel adres'}); return
                        if self.headers.get('Sec-Fetch-Site') == 'cross-site':
                            self.send(403, {'error': 'Siteler arası istek reddedildi'}); return
                        data = {}
                        if post:
                            if self.headers.get('Origin') != owner.url:
                                self.send(403, {'error': 'Geçersiz kaynak'}); return
                            size = int(self.headers.get('Content-Length', '0'))
                            if not 0 < size <= 8192:
                                raise ValueError('İstek boyutu geçersiz')
                            data = json.loads(self.rfile.read(size))
                            if not isinstance(data, dict):
                                raise ValueError('Geçersiz istek')
                        route = self.path.split('?')[0]
                        if not post and route == '/':
                            from .panel_html import HTML
                            self.send(200, HTML); return
                        if post and route == '/api/login':
                            # Expired browser sessions are pruned on login; no unbounded token cache.
                            for key, (_, expiry) in list(ops.sessions.items()):
                                if expiry < ops.clock():
                                    ops.sessions.pop(key, None); csrf.pop(key, None)
                            if len(ops.sessions) >= 32:
                                raise ValueError('Açık oturum sınırına ulaşıldı')
                            session = ops.login(str(data.get('username', ''))[:64], str(data.get('password', ''))[:256])
                            csrf[session.token] = secrets.token_urlsafe(32)
                            self.send(200, {'csrf': csrf[session.token]},
                                'lpr_session='+session.token+'; HttpOnly; SameSite=Strict; Path=/'); return
                        session = self.session()
                        if post and not secrets.compare_digest(self.headers.get('X-CSRF-Token', ''), csrf.get(session.token, '!')):
                            self.send(403, {'error': 'Oturumu yenileyin'}); return
                        settings = owner.settings(ops)
                        if not post and route == '/api/state':
                            ai_state = owner.ai.snapshot()
                            if settings['enabled'] and ai_state['phase'] in ('idle', 'disabled'):
                                ai_state.update(message='AI etkin. Motoru hazırlayın veya kanıtlı bir olayı inceleyin.')
                            elif not settings['enabled']:
                                ai_state.update(message='AI kapalı', result=None)
                            self.send(200, {'username': session.username, 'role': session.role, 'csrf': csrf[session.token],
                                'events': events.latest(session, 100), 'cameras': ops.cameras(session),
                                'settings': settings, 'models': MODELS, 'ai': ai_state}); return
                        if post and route == '/api/logout':
                            csrf.pop(session.token, None); ops.logout(session)
                            self.send(200, {}, 'lpr_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'); return
                        if post and route == '/api/event':
                            value = events.details(session, str(data.get('id', '')))
                            value['images'] = {k: base64.b64encode(v).decode() for k, v in value['images'].items() if v}
                            self.send(200, value); return
                        if post and route == '/api/correct':
                            events.correct(session, str(data.get('id', '')), str(data.get('plate', '')), str(data.get('reason', '')))
                            self.send(200, {}); return
                        if post and route == '/api/settings':
                            ops.check(session, 'manage')
                            if type(data.get('enabled')) is not bool or data.get('model') not in MODELS:
                                raise ValueError('Geçersiz AI ayarı')
                            value = {'enabled': data['enabled'], 'model': data['model']}
                            with ops.db:
                                ops.db.execute('INSERT INTO settings VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', ('assistant', json.dumps(value)))
                                ops._audit(session.username, 'ai_settings', json.dumps(value))
                            if not value['enabled']:
                                owner.ai.stop()
                            self.send(200, value); return
                        if post and route in ('/api/prepare', '/api/review'):
                            ops.check(session, 'manage' if route.endswith('prepare') else 'review')
                            if not settings['enabled']:
                                raise ValueError('AI desteği ayarlardan kapalı')
                            event = events.details(session, str(data.get('id', ''))) if route.endswith('review') else None
                            if event and not any(event['images'].values()):
                                raise ValueError('Görsel kanıt yok; AI tahmini oluşturulmadı')
                            owner.ai.start(settings['model'], event)
                            with ops.db:
                                ops._audit(session.username, 'ai_review_requested' if event else 'ai_prepare', event['event_id'] if event else settings['model'])
                            self.send(202, {}); return
                        self.send(404, {'error': 'Bulunamadı'})
                    except PermissionError as error:
                        self.send(401, {'error': str(error)})
                    except (ValueError, KeyError, TypeError) as error:
                        self.send(400, {'error': str(error)[:200]})
                    except (BrokenPipeError, ConnectionResetError, TimeoutError):
                        pass
                    except Exception:
                        self.send(500, {'error': 'İşlem tamamlanamadı; tekrar deneyin'})

            self.server = HTTPServer(('127.0.0.1', 0), Handler)
            self.ready.set()
            self.server.serve_forever(poll_interval=.2)
        except Exception as error:
            self.error = error
            self.ready.set()
        finally:
            if self.server:
                self.server.server_close()
            if ops:
                ops.close()

    @staticmethod
    def settings(ops):
        row = ops.db.execute('SELECT value FROM settings WHERE key=?', ('assistant',)).fetchone()
        return json.loads(row[0]) if row else {'enabled': False, 'model': MODELS[0]}

    def close(self):
        self.ai.stop()
        if self.server:
            self.server.shutdown()
        self.thread.join(timeout=6)


def open_panel(window):
    """One server per application, surviving desktop lock/re-authentication."""
    from PySide6.QtWidgets import QApplication
    from PySide6.QtCore import QUrl
    from PySide6.QtGui import QDesktopServices
    app = QApplication.instance()
    if not getattr(app, 'local_panel', None):
        app.local_panel = LocalPanel(window.ops.path)
        app.aboutToQuit.connect(app.local_panel.close)
    if not QDesktopServices.openUrl(QUrl(app.local_panel.url)):
        raise RuntimeError('Tarayıcı açılamadı. Adres: '+app.local_panel.url)
