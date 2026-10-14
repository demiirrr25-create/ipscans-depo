"""Run from a Windows venv after installing requirements-windows.txt."""
from pathlib import Path
import os, subprocess, sys
project=Path(__file__).resolve().parents[1]
system_root=Path(os.environ.get('SystemRoot', r'C:\Windows'))
environment=os.environ.copy()
environment['PATH']=os.pathsep.join((str(Path(sys.executable).parent),str(Path(sys.base_prefix)),str(system_root/'System32'),str(system_root)))
environment['PYTHONNOUSERSITE']='1'
environment['PYINSTALLER_CONFIG_DIR']=str(project/'build'/'pyinstaller-cache')
for key in ('PYTHONPATH','PYTHONHOME','QT_PLUGIN_PATH','QT_QPA_PLATFORM_PLUGIN_PATH'):
    environment.pop(key,None)
args=[sys.executable,'-m','PyInstaller','--noconfirm','--clean','--noupx','--windowed','--onefile',
      '--name','IPScans-LPR-Pro','--distpath',str(project/'dist'),'--workpath',str(project/'build'),
      '--specpath',str(project/'build'),'--paths',str(project),
      '--icon',str(project/'assets'/'icons'/'lpr-pro.ico'),
      '--add-data',str(project/'assets')+';assets',
      '--collect-binaries','onnxruntime','--collect-data','fast_plate_ocr',
      '--add-data',str(project/'third-party-notices')+';third-party-notices',
      '--hidden-import','bcrypt','--hidden-import','cv2','--copy-metadata','fast-plate-ocr',
      '--copy-metadata','onnxruntime']
for name in ['torch','tensorflow','paddle','paddleocr','matplotlib','scipy','IPython','PyQt6','pytest',
             'pandas','sympy','openpyxl','onnxruntime.transformers','onnxruntime.quantization','fast_plate_ocr.train']:
    args+=['--exclude-module',name]
result=subprocess.call(args+[str(project/'entry.py')],cwd=project,env=environment)
if result==0:
    analysis=(project/'build'/'IPScans-LPR-Pro'/'Analysis-00.toc').read_text(encoding='utf-8')
    if 'codex-runtimes' in analysis.lower() or 'libheif' in analysis.lower():
        raise SystemExit('Build rejected: unrelated runtime DLL was bundled')
raise SystemExit(result)
