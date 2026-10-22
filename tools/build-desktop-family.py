"""Reproducible Qt packaging without DLLs from unrelated applications on PATH."""
import os
from pathlib import Path
import subprocess
import sys

root=Path(__file__).resolve().parents[1]
environment=os.environ.copy()
windows=Path(environment.get('SystemRoot',r'C:\Windows'))
environment['PATH']=os.pathsep.join((str(Path(sys.executable).parent),str(Path(sys.base_prefix)),str(windows/'System32'),str(windows)))
environment['PYTHONNOUSERSITE']='1'
for key in ('PYTHONPATH','PYTHONHOME','QT_PLUGIN_PATH','QT_QPA_PLATFORM_PLUGIN_PATH'):
    environment.pop(key,None)

for folder,name,icon in [('desktop-app','IPscans-Plus','icon'),('desktop-app-pro','ipscans-network-health-pro','icon_pro')]:
    if len(sys.argv) > 1 and folder not in sys.argv[1:]:continue
    project=root/folder
    args=[sys.executable,'-m','PyInstaller','--noconfirm','--clean','--name',name,'--onefile','--windowed','--noupx',
          '--exclude-module','PySide6','--icon',f'assets/{icon}.ico','--version-file','version_info.txt','--add-data','assets;assets']
    if folder.endswith('-pro'):args+=['--paths','../desktop-app','--add-data','../desktop-app/assets;assets']
    subprocess.run(args+['main.py'],cwd=project,env=environment,check=True)
    subprocess.run([str(project/'dist'/(name+'.exe')),'--selftest'],cwd=project,env={**environment,'QT_QPA_PLATFORM':'offscreen'},check=True,timeout=60)
    print(name+' packaged selftest passed',flush=True)
