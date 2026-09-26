"""Resolves bundled asset paths for both `python main.py` and a PyInstaller
--onefile build (where data files are unpacked to a temp dir at sys._MEIPASS).
"""
from __future__ import annotations

import sys
from pathlib import Path

from PyQt6.QtCore import Qt
from PyQt6.QtGui import QIcon, QPixmap


def resource_path(*parts: str) -> Path:
    base = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent.parent.parent))
    return base.joinpath(*parts)


def load_app_icon() -> QIcon:
    path = resource_path("assets", "icon.ico")
    if path.exists():
        return QIcon(str(path))
    png_path = resource_path("assets", "icon.png")
    return QIcon(str(png_path)) if png_path.exists() else QIcon()


def load_logo_pixmap(size: int = 28) -> QPixmap:
    path = resource_path("assets", "icon.png")
    if not path.exists():
        return QPixmap()
    pixmap = QPixmap(str(path))
    return pixmap.scaled(
        size,
        size,
        Qt.AspectRatioMode.KeepAspectRatio,
        Qt.TransformationMode.SmoothTransformation,
    )
