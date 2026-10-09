"""Read-only, bounded service identity. No redirects, credential guessing or TLS bypass."""
import html
import ipaddress
import re
import socket
import time
import requests


def http_identity(ip, ports, stopped):
    host = f'[{ip}]' if ipaddress.ip_address(ip).version == 6 else ip
    with requests.Session() as session:
        session.trust_env = False  # Local network metadata must not go to a system proxy.
        for port in (443, 80):
            if port not in ports or stopped():
                continue
            try:
                with session.get(f'{"https" if port == 443 else "http"}://{host}/',
                                 timeout=(.6, .6), allow_redirects=False, stream=True,
                                 headers={'User-Agent': 'IPscans/4.1 device discovery', 'Accept': 'text/html'}) as response:
                    if not 200 <= response.status_code < 300:
                        continue
                    body = bytearray()
                    deadline = time.monotonic() + 1.2
                    if 'text/html' in response.headers.get('Content-Type', ''):
                        for chunk in response.iter_content(1024):
                            if stopped() or time.monotonic() > deadline:
                                break
                            body.extend(chunk[:8192-len(body)])
                            if len(body) >= 8192 or b'</title>' in body.lower():
                                break
                    title = re.search(r'<title[^>]*>(.*?)</title>', body.decode('utf-8', errors='replace'), re.I | re.S)
                    return (html.unescape(re.sub(r'\s+', ' ', title[1])).strip()[:160] if title else None,
                            response.headers.get('Server', '')[:160] or None)
            except (requests.RequestException, OSError, ValueError):
                continue
    return None, None


def rtsp_identity(ip, stopped):
    if stopped():
        return None
    try:
        with socket.create_connection((ip, 554), timeout=.6) as connection:
            connection.sendall(b'OPTIONS * RTSP/1.0\r\nCSeq: 1\r\nUser-Agent: IPscans/4.1\r\n\r\n')
            response = connection.recv(4096).decode('utf-8', errors='replace')
            if response.startswith('RTSP/1.0 '):
                server = re.search(r'^Server:\s*(.+)$', response, re.I | re.M)
                return server[1].strip()[:160] if server else 'RTSP/1.0 response'
    except OSError:
        pass
    return None
