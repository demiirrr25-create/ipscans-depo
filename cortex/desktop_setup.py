"""Install the frozen application for the current user and create Windows shortcuts."""
import base64
import hashlib
import os
import pathlib
import shutil
import subprocess
import sys

def install():
    if os.name!='nt' or not getattr(sys,'frozen',False) or '--portable' in sys.argv:return
    source=pathlib.Path(sys.executable)
    # Immutable version folders let an upgrade succeed while the old EXE is
    # locked by a running session. A changed path also refreshes Windows icons.
    with source.open('rb') as stream:
        identity=hashlib.file_digest(stream,'sha256').hexdigest()[:16]
    destination=pathlib.Path(os.environ['LOCALAPPDATA'])/'Programs'/'IPScansCortex'/'versions'/identity
    destination.mkdir(parents=True,exist_ok=True)
    executable=destination/'Cortex.exe'
    if source.resolve()!=executable.resolve() and not executable.exists():
        pending=destination/'Cortex.new.exe';shutil.copy2(source,pending);pending.replace(executable)
    def quote(value):return "'"+str(value).replace("'","''")+"'"
    script="$ErrorActionPreference='Stop'; $s=New-Object -ComObject WScript.Shell; "
    script+="$dirs=@([Environment]::GetFolderPath('Desktop'),[Environment]::GetFolderPath('Programs')); "
    script+="foreach($d in $dirs){$link=$s.CreateShortcut((Join-Path $d 'IPScans Cortex.lnk')); $link.TargetPath="+quote(executable)+"; $link.WorkingDirectory="+quote(destination)+"; $link.IconLocation="+quote(str(executable)+',0')+"; $link.Description='IPScans Cortex kamera zekası'; $link.Save()}"
    encoded=base64.b64encode(script.encode('utf-16le')).decode()
    subprocess.run(['powershell','-NoProfile','-NonInteractive','-EncodedCommand',encoded],check=True,
                   stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,creationflags=0x08000000,timeout=30)
