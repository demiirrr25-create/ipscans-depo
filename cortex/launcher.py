"""Windows entry point: install without loading data, reuse one process, report startup errors."""
import ctypes
import hashlib
import json
import os
from pathlib import Path
import shutil
import sys
import time
import traceback
import urllib.request
import webbrowser

VERSION = '2.4.0'

def data_directory():
    return Path(os.environ.get('CORTEX_DATA', str(Path(os.environ.get('LOCALAPPDATA', str(Path.home()))) / 'IPScansCortex')))

def notify(message):
    if os.name == 'nt':
        ctypes.windll.user32.MessageBoxW(None, message, 'IPScans Cortex', 0x10)
    else:
        print(message, file=sys.stderr)

def existing_instance(port):
    try:
        opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
        with opener.open(f'http://127.0.0.1:{port}/api/health', timeout=.5) as response:
            result=json.loads(response.read(1024))
        return result.get('application') == 'IPScans Cortex'
    except Exception:
        return False

def main():
    if os.name == 'nt':
        try:
            ctypes.windll.shell32.SetCurrentProcessExplicitAppUserModelID('ipscans.cortex.desktop.2.4')
            ctypes.windll.shcore.SetProcessDpiAwareness(2)
        except Exception:
            pass
    # Installation must work even if an existing configuration cannot be read.
    if '--install-only' in sys.argv:
        import desktop_setup
        desktop_setup.install()
        return
    if '--self-test' in sys.argv:
        import server
        server.main()
        return
    port=int(os.environ.get('CORTEX_PORT','8765'))
    handle=None
    if os.name == 'nt':
        kernel=ctypes.WinDLL('kernel32',use_last_error=True)
        kernel.CreateMutexW.argtypes=[ctypes.c_void_p,ctypes.c_bool,ctypes.c_wchar_p]
        kernel.CreateMutexW.restype=ctypes.c_void_p
        kernel.CloseHandle.argtypes=[ctypes.c_void_p]
        name=hashlib.sha256(str(data_directory().resolve()).lower().encode()).hexdigest()[:24]
        handle=kernel.CreateMutexW(None,False,'Local\\IPScansCortex-'+name)
        if not handle: raise OSError('Cortex oturum kilidi oluşturulamadı.')
        if ctypes.get_last_error()==183:
            kernel.CloseHandle(handle)
            for _ in range(40):
                if existing_instance(port):
                    if '--no-browser' not in sys.argv: webbrowser.open(f'http://127.0.0.1:{port}/')
                    return
                time.sleep(.2)
            notify('Cortex zaten başlatılıyor. Birkaç saniye sonra masaüstü kısayoluna yeniden tıklayın.')
            return
    try:
        directory=data_directory();directory.mkdir(parents=True,exist_ok=True)
        config=directory/'config.enc'
        backup=directory/f'config.before-{VERSION}.enc'
        if config.exists() and not backup.exists(): shutil.copy2(config,backup)
        if '--web' in sys.argv:
            import server
            server.main()
        else:
            import cortex_desktop
            cortex_desktop.main([a for a in sys.argv[1:] if a != '--native'])
    finally:
        if handle: kernel.CloseHandle(handle)

def entry():
    try:
        main()
    except Exception:
        directory=data_directory();directory.mkdir(parents=True,exist_ok=True)
        log=directory/'startup-error.log'
        log.write_text(traceback.format_exc(),encoding='utf-8')
        notify('Cortex başlatılamadı. Mevcut ayarlarınız silinmedi.\n\n'
               'Destek için hata kaydı:\n'+str(log))
        raise SystemExit(1)

if __name__ == '__main__': entry()
