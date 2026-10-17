"""Build the current-user preview installer with an explicitly selected Inno compiler."""
import argparse
from pathlib import Path
import subprocess
import re

parser=argparse.ArgumentParser()
parser.add_argument('--compiler',required=True)
args=parser.parse_args()
root=Path(__file__).resolve().parents[1]
version=re.search(r'__version__ = "([^"]+)"',(root/'lpr/__init__.py').read_text()).group(1)
script=root/'deployment/windows/LPRPro.iss'
if f'#define ProductVersion "{version}"' not in script.read_text(encoding='utf-8'):
    raise SystemExit('Installer and application versions disagree')
if not (root/'dist/IPScans-LPR-Pro.exe').is_file():raise SystemExit('Build the desktop executable first')
raise SystemExit(subprocess.call([str(Path(args.compiler).resolve()),str(script)]))
