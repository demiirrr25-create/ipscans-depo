"""Monochrome vector device glyphs rendered at the OS display scale."""
from __future__ import annotations

from functools import lru_cache

from PyQt6.QtCore import Qt, QByteArray
from PyQt6.QtGui import QIcon, QPainter, QPixmap
from PyQt6.QtSvg import QSvgRenderer

_SHAPES = {
    "Router": '<rect x="7" y="21" width="34" height="14" rx="3"/><path d="M13 15v6m22-6v6M15 28h4m7 0h4"/>',
    "Gateway": '<rect x="7" y="21" width="34" height="14" rx="3"/><path d="M13 15v6m22-6v6M15 28h4m7 0h4"/>',
    "Switch": '<rect x="5" y="17" width="38" height="20" rx="2"/><path d="M10 24h5m4 0h5m4 0h5M10 30h5m4 0h5m4 0h5"/>',
    "PoE Switch": '<rect x="5" y="17" width="38" height="20" rx="2"/><path d="M12 24h8m8 0h8m-16 6 4-7-1 6h5"/>',
    "Access Point": '<rect x="18" y="30" width="12" height="6" rx="2"/><path d="M10 22a21 21 0 0 1 28 0M16 27a13 13 0 0 1 16 0M24 30v-3"/>',
    "IP Camera": '<rect x="8" y="17" width="24" height="15" rx="3"/><circle cx="23" cy="24.5" r="4"/><path d="m32 20 9-4v17l-9-4M17 32v5h18"/>',
    "NVR": '<rect x="7" y="12" width="34" height="27" rx="3"/><path d="M13 19h22M13 27h22M13 34h17"/>',
    "DVR": '<rect x="7" y="12" width="34" height="27" rx="3"/><path d="M13 19h22M13 27h22M13 34h17"/>',
    "Computer": '<rect x="7" y="11" width="34" height="24" rx="2"/><path d="M24 35v5m-9 0h18"/>',
    "Server": '<rect x="12" y="7" width="24" height="34" rx="2"/><path d="M17 16h14m-14 8h14m-14 8h14"/>',
    "NAS": '<rect x="12" y="7" width="24" height="34" rx="2"/><path d="M17 16h14m-14 8h14m-14 8h14"/>',
    "Printer": '<rect x="7" y="18" width="34" height="20" rx="2"/><path d="M14 18v-8h20v8M14 30h20v11H14z"/>',
    "Unknown": '<rect x="10" y="10" width="28" height="28" rx="5"/><path d="M19 20a5 5 0 1 1 8 4l-3 3v2m0 4v1"/>',
}


@lru_cache(maxsize=24)
def icon_for_type(device_type: str) -> QIcon:
    drawing = _SHAPES.get(device_type, _SHAPES["Unknown"])
    icon = QIcon()
    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" '
        'fill="none" stroke="#fff" stroke-width="2.5" '
        f'stroke-linecap="round" stroke-linejoin="round">{drawing}</svg>'
    ).encode()
    renderer = QSvgRenderer(QByteArray(svg))
    for size in (24, 48, 96):
        pixmap = QPixmap(size, size)
        pixmap.fill(Qt.GlobalColor.transparent)
        painter = QPainter(pixmap)
        renderer.render(painter)
        painter.end()
        icon.addPixmap(pixmap)
    return icon
