"""Refresh third-party notices from the exact Windows build environment."""
from importlib import metadata
from pathlib import Path
import json
import shutil
import sys

project = Path(__file__).resolve().parents[1]
target = (project / 'third-party-notices').resolve()
if not target.is_relative_to(project.resolve()) or target == project.resolve():
    raise SystemExit('Invalid notices directory')

names = [
    'PySide6', 'PySide6_Essentials', 'PySide6_Addons', 'shiboken6',
    'numpy', 'opencv-python-headless', 'onnxruntime', 'fast-plate-ocr',
    'bcrypt', 'PyYAML', 'pydantic', 'pydantic_core', 'rich',
    'markdown-it-py', 'mdurl', 'Pygments', 'typing_extensions',
    'annotated-types', 'typing-inspection', 'packaging', 'flatbuffers',
    'protobuf', 'Pillow', 'certifi', 'charset-normalizer', 'idna',
    'urllib3', 'requests',
]
retained = {name: (target / name).read_bytes() for name in ('GPL-3.0.txt', 'LGPL-3.0.txt') if (target / name).is_file()}
if target.exists():
    shutil.rmtree(target)
target.mkdir()
for name, content in retained.items():
    (target / name).write_bytes(content)
inventory = []
for name in names:
    try:
        dist = metadata.distribution(name)
    except metadata.PackageNotFoundError:
        continue
    row = {'name': dist.metadata['Name'], 'version': dist.version,
           'project_urls': dist.metadata.get_all('Project-URL') or [], 'notices': []}
    for item in dist.files or []:
        if '..' in item.parts or not any(word in str(item).lower() for word in ('license', 'copying', 'notice')):
            continue
        source = Path(dist.locate_file(item))
        if source.is_file() and source.stat().st_size < 5_000_000:
            destination = target / name / str(item)
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, destination)
            row['notices'].append(destination.relative_to(target).as_posix())
    inventory.append(row)

python_license = Path(sys.base_prefix) / 'LICENSE.txt'
if python_license.is_file():
    shutil.copy2(python_license, target / 'Python-LICENSE.txt')
(target / 'inventory.json').write_text(json.dumps(inventory, indent=2), encoding='utf-8')
(target / 'README.txt').write_text(
    'Third-party notices for IPScans LPR Pro 0.3.1 beta.\n\n'
    'Qt / PySide6 6.8.3 is dynamically linked under its applicable LGPL/GPL terms.\n'
    'Qt source: https://download.qt.io/official_releases/qt/6.8/6.8.3/\n'
    'PySide source: https://code.qt.io/cgit/pyside/pyside-setup.git/tag/?h=v6.8.3\n'
    'Python source: https://www.python.org/downloads/release/python-31316/\n'
    'PyInstaller bootloader: https://github.com/pyinstaller/pyinstaller/tree/v6.21.0\n'
    'OpenCV source: https://github.com/opencv/opencv\n'
    'ONNX Runtime source: https://github.com/microsoft/onnxruntime/tree/v1.31.0\n'
    'fast-plate-ocr source: https://github.com/ankandrew/fast-plate-ocr\n\n'
    'The source bundle includes the application and build entry point. '
    'You may modify, replace and relink LGPL-covered components and reverse engineer '
    'the application for debugging such modifications; this notice imposes no restriction '
    'on those rights. The bundled one-file EXE extracts dynamic libraries to a temporary '
    'folder; build from source to substitute libraries persistently.\n'
    'Model weights are not included; separate upstream terms apply.\n',
    encoding='utf-8',
)
print(f'Notices collected: {len(inventory)} packages')
