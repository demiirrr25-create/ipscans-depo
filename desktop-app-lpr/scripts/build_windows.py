"""Run from a Windows venv after installing requirements-windows.txt."""
from pathlib import Path
import subprocess,sys
project=Path(__file__).resolve().parents[1]
args=[sys.executable,'-m','PyInstaller','--noconfirm','--clean','--windowed','--onefile',
      '--name','IPScans-LPR-Pro','--distpath',str(project/'dist'),'--workpath',str(project/'build'),
      '--specpath',str(project/'build'),'--paths',str(project),
      '--collect-binaries','onnxruntime','--collect-data','fast_plate_ocr',
      '--add-data',str(project/'third-party-notices')+';third-party-notices',
      '--hidden-import','bcrypt','--hidden-import','cv2','--copy-metadata','fast-plate-ocr',
      '--copy-metadata','onnxruntime']
for name in ['torch','tensorflow','paddle','paddleocr','matplotlib','scipy','IPython','PyQt6','pytest',
             'pandas','sympy','openpyxl','onnxruntime.transformers','onnxruntime.quantization','fast_plate_ocr.train']:
    args+=['--exclude-module',name]
raise SystemExit(subprocess.call(args+[str(project/'entry.py')],cwd=project))
