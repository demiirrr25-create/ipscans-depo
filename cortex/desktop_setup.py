"""Install the frozen application for the current user and create Windows shortcuts."""
import base64
import os
import pathlib
import shutil
import subprocess
import sys

def install():
    if os.name!='nt' or not getattr(sys,'frozen',False) or '--portable' in sys.argv:return
    destination=pathlib.Path(os.environ['LOCALAPPDATA'])/'Programs'/'IPScansCortex'
    destination.mkdir(parents=True,exist_ok=True)
    executable=destination/'Cortex.exe'; source=pathlib.Path(sys.executable)
    if source.resolve()!=executable.resolve():
        pending=destination/'Cortex.new.exe';shutil.copy2(source,pending);pending.replace(executable)
    def quote(value):return "'"+str(value).replace("'","''")+"'"
    script="$ErrorActionPreference='Stop'; $s=New-Object -ComObject WScript.Shell; "
    script+="$dirs=@([Environment]::GetFolderPath('Desktop'),[Environment]::GetFolderPath('Programs')); "
    script+="foreach($d in $dirs){$link=$s.CreateShortcut((Join-Path $d 'IPScans Cortex.lnk')); $link.TargetPath="+quote(executable)+"; $link.WorkingDirectory="+quote(destination)+"; $link.Description='IPScans Cortex kamera zekası'; $link.Save()}"
    encoded=base64.b64encode(script.encode('utf-16le')).decode()
    subprocess.run(['powershell','-NoProfile','-NonInteractive','-EncodedCommand',encoded],check=True,
                   stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,creationflags=0x08000000,timeout=30)
