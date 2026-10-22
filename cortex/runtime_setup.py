"""Private Ollama runtime bootstrap from official, SHA-256 verified release assets."""
import hashlib
import json
import os
import pathlib
import shutil
import subprocess
import time
import urllib.request
import zipfile

def ensure_runtime(progress,cancel):
    def online():
        try:
            with urllib.request.urlopen('http://127.0.0.1:11434/api/tags',timeout=2) as r: json.load(r)
            return True
        except Exception:return False
    if online():return
    base=pathlib.Path(os.environ.get('LOCALAPPDATA',str(pathlib.Path.home())))/'IPScansCortex'/'runtime'
    executable=base/'ollama.exe'
    installed=pathlib.Path(os.environ.get('LOCALAPPDATA',''))/'Programs'/'Ollama'/'ollama.exe'
    found=shutil.which('ollama') or (str(installed) if installed.is_file() else None)
    if found: executable=pathlib.Path(found)
    if not executable.is_file():
        if os.name!='nt': raise RuntimeError('Automatic runtime currently requires Windows x64')
        progress(phase='runtime',message='Ollama motoru otomatik indiriliyor; ayrı kurulum gerekmez.',completed=0,total=0)
        req=urllib.request.Request('https://api.github.com/repos/ollama/ollama/releases/latest',headers={'User-Agent':'IPScans-Cortex'})
        with urllib.request.urlopen(req,timeout=30) as r: release=json.load(r)
        asset=next(a for a in release['assets'] if a['name']=='ollama-windows-amd64.zip')
        digest=asset.get('digest','')
        if not digest.startswith('sha256:') or len(digest)!=71: raise RuntimeError('Official asset checksum unavailable')
        url=asset['browser_download_url']
        if not url.startswith('https://github.com/ollama/ollama/releases/download/'):raise RuntimeError('Unexpected download origin')
        base.mkdir(parents=True,exist_ok=True)
        if shutil.disk_usage(base).free<asset['size']*3+5*1024**3:raise RuntimeError('Insufficient disk space')
        archive=base/'download.part'; checksum=hashlib.sha256(); total=0
        try:
            with urllib.request.urlopen(url,timeout=60) as source,archive.open('wb') as target:
                while True:
                    cancel(); block=source.read(1024*1024)
                    if not block: break
                    total+=len(block)
                    if total>asset['size']:raise RuntimeError('Unexpected asset size')
                    checksum.update(block);target.write(block)
                    progress(completed=total,total=asset['size'])
            if total!=asset['size'] or checksum.hexdigest()!=digest[7:]:raise RuntimeError('Runtime checksum mismatch')
            progress(message='Ollama motoru doğrulandı, dosyalar hazırlanıyor.')
            staging=base/'staging'; staging.mkdir(exist_ok=True)
            with zipfile.ZipFile(archive) as package:
                for item in package.infolist():
                    cancel(); dest=(staging/item.filename).resolve()
                    if not dest.is_relative_to(staging.resolve()) or ':' in item.filename:raise RuntimeError('Invalid archive path')
                    package.extract(item,staging)
            if not (staging/'ollama.exe').is_file():raise RuntimeError('Runtime missing')
            # Promote the executable last, so interrupted extraction is never considered installed.
            for item in staging.iterdir():
                if item.name!='ollama.exe':
                    if item.is_dir():shutil.copytree(item,base/item.name,dirs_exist_ok=True)
                    else:shutil.copy2(item,base/item.name)
            shutil.copy2(staging/'ollama.exe',executable)
            shutil.rmtree(staging)
        finally: archive.unlink(missing_ok=True)
    cancel(); progress(phase='runtime',message='Yerel Ollama motoru başlatılıyor.',completed=0,total=0)
    env=dict(os.environ,OLLAMA_HOST='127.0.0.1:11434',OLLAMA_NO_CLOUD='1')
    subprocess.Popen([str(executable),'serve'],stdin=subprocess.DEVNULL,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,
                     env=env,creationflags=0x08000000 if os.name=='nt' else 0)
    for _ in range(60):
        cancel()
        if online():return
        time.sleep(.5)
    raise RuntimeError('Runtime did not start')
