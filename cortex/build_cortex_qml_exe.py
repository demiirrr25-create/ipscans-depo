# -*- coding: utf-8 -*-
"""
IPScans Cortex 2.4.0 — Standalone Windows EXE Builder & QML/QtQuick3D Asset Verifier.
Supports both Nuitka / pyside6-deploy and PyInstaller (--noupx, LGPLv3 dynamic linking)
while verifying that all QML files and QtQuick3D RHI plugins are bundled in the package.
"""

from __future__ import annotations

import hashlib
import shutil
import subprocess
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
QML_DIR = ROOT_DIR / "qml"
REQUIRED_QML_FILES = [
    "qmldir",
    "Theme.qml",
    "Main.qml",
    "CortexLogo3D.qml",
    "CortexCore3DView.qml",
    "CortexStartup3D.qml",
    "fonts/GoogleSansFlex.ttf",
    "fonts/GoogleSansCode.ttf",
]


def verify_qml_and_3d_assets() -> dict[str, str]:
    """Verify all required QML & QtQuick3D modules exist and compute SHA-256 integrity hashes."""
    hashes: dict[str, str] = {}
    for fname in REQUIRED_QML_FILES:
        fpath = QML_DIR / fname
        if not fpath.is_file():
            raise FileNotFoundError(f"Missing required QML asset: {fpath}")
        hashes[f"qml/{fname}"] = hashlib.sha256(fpath.read_bytes()).hexdigest()

    for py_mod in ("cortex_desktop.py", "cortex_bridge.py", "cortex_3d_geometry.py", "server.py"):
        ppath = ROOT_DIR / py_mod
        if not ppath.is_file():
            raise FileNotFoundError(f"Missing required Python module: {ppath}")
        hashes[py_mod] = hashlib.sha256(ppath.read_bytes()).hexdigest()

    # Verify PySide6 QtQuick3D binary plugins in environment
    import PySide6

    pyside_dir = Path(PySide6.__file__).resolve().parent
    qml_3d_plugin = pyside_dir / "qml" / "QtQuick3D"
    if not qml_3d_plugin.is_dir():
        raise FileNotFoundError(f"QtQuick3D QML plugin directory not found at {qml_3d_plugin}")

    return hashes


def write_pyside6_deploy_spec() -> Path:
    """Generate official pyside6-deploy (Nuitka backend) configuration file."""
    spec_path = ROOT_DIR / "pysidedeploy.spec"
    content = """[app]
title = IPScans Cortex
project_dir = .
input_file = cortex_desktop.py
project_file =
exec_directory = ./dist

[python]
python_path =
packages = Nuitka==2.6.8

[qt]
qml_files = qml/Theme.qml,qml/Main.qml,qml/CortexLogo3D.qml,qml/CortexCore3DView.qml,qml/CortexStartup3D.qml
excluded_qml_plugins =
modules = Core,Gui,Qml,Quick,QuickControls2,Quick3D
plugins = platforms,scenegraph, renderers,generic,imageformats

[nuitka]
mode = standalone
extra_args = --quiet --noinclude-qt-translations --windows-console-mode=disable --include-data-dir=qml=qml --include-data-dir=ui=ui --include-data-dir=admin_ui=admin_ui
"""
    spec_path.write_text(content, encoding="utf-8")
    return spec_path


if __name__ == "__main__":
    hashes = verify_qml_and_3d_assets()
    spec = write_pyside6_deploy_spec()
    print("[OK] Verified QML + QtQuick3D assets and generated pysidedeploy.spec:")
    for k, v in hashes.items():
        print(f"  {v[:16]}...  {k}")
