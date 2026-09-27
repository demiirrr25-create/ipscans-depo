"""Badges the free app's icon/logo with a small "PRO" pill so the Pro
product is visually distinguishable (taskbar, title bar, onboarding) without
touching or forking the original assets — drawn on top at load time.

`assets/icon_pro.ico` / `icon_pro.png` are PRE-BAKED (see the one-off
generation snippet in this project's README) rather than badged purely at
runtime, because PyInstaller's `--icon` flag embeds a .ico file into the
.exe's own Win32 resources at BUILD time — that's what Explorer/taskbar/
"pin to desktop" actually reads, before the process ever runs, so a
runtime-only QIcon badge (set via setWindowIcon) never appears there.
Runtime badging is kept as a fallback for the in-app title bar/onboarding
header and in case the pre-baked file is ever missing.
"""
from __future__ import annotations

import sys
from pathlib import Path

from PyQt6.QtCore import QRect, Qt
from PyQt6.QtGui import QColor, QFont, QIcon, QImage, QPainter, QPixmap

from app.ui.resources import load_app_icon, load_logo_pixmap


def _pro_resource_path(*parts: str) -> Path:
    base = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent.parent))
    return base.joinpath(*parts)


def _visible_content_rect(pixmap: QPixmap) -> QRect | None:
    """Bounding box of actual "ink" (opaque, non-near-white pixels).

    The free app's mark is drawn with a large safe-zone margin around a
    small centered ring (by design, ~16% of the full canvas) — left as-is,
    that same margin shrinks a corner badge into a handful of illegible
    pixels once Windows downsamples the icon to the sizes it actually
    displays (32/48px desktop icons). Returns None if the pixmap is blank.
    """
    image = pixmap.toImage().convertToFormat(QImage.Format.Format_ARGB32)
    w, h = image.width(), image.height()
    min_x, min_y, max_x, max_y = w, h, -1, -1
    for y in range(h):
        for x in range(w):
            c = image.pixelColor(x, y)
            if c.alpha() > 20 and not (c.red() > 245 and c.green() > 245 and c.blue() > 245):
                min_x, min_y = min(min_x, x), min(min_y, y)
                max_x, max_y = max(max_x, x), max(max_y, y)
    if max_x < min_x:
        return None

    margin = round(max(w, h) * 0.12)
    min_x, min_y = max(0, min_x - margin), max(0, min_y - margin)
    max_x, max_y = min(w - 1, max_x + margin), min(h - 1, max_y + margin)

    # Keep the crop square and centered on the content so the later
    # upscale-back-to-`size` step never distorts the aspect ratio.
    side = max(max_x - min_x + 1, max_y - min_y + 1)
    cx, cy = (min_x + max_x) // 2, (min_y + max_y) // 2
    left = max(0, min(w - side, cx - side // 2))
    top = max(0, min(h - side, cy - side // 2))
    return QRect(left, top, min(side, w - left), min(side, h - top))


def _with_pro_badge(pixmap: QPixmap) -> QPixmap:
    if pixmap.isNull() or pixmap.width() < 12:
        return pixmap

    size = pixmap.size()
    canvas = QPixmap(size)
    canvas.fill(Qt.GlobalColor.transparent)

    painter = QPainter(canvas)
    painter.setRenderHint(QPainter.RenderHint.Antialiasing)
    painter.drawPixmap(0, 0, pixmap)

    # A pill in the bottom-right corner — sized against the full canvas
    # (see the crop-to-content step below, which is what actually keeps
    # this legible once the icon is shrunk to real desktop-icon sizes).
    badge_h = max(8, round(min(size.width(), size.height()) * 0.24))
    badge_w = round(badge_h * 2.3)
    margin = round(size.width() * 0.03)
    rect = QRect(
        size.width() - badge_w - margin,
        size.height() - badge_h - margin,
        badge_w,
        badge_h,
    )

    painter.setPen(QColor("#000000"))
    painter.setBrush(QColor("#ffffff"))
    radius = badge_h / 2
    painter.drawRoundedRect(rect, radius, radius)

    font = QFont("Segoe UI", -1, QFont.Weight.Bold)
    font.setPixelSize(max(6, round(badge_h * 0.62)))
    painter.setFont(font)
    painter.drawText(rect, Qt.AlignmentFlag.AlignCenter, "PRO")
    painter.end()

    content_rect = _visible_content_rect(canvas)
    if content_rect is None:
        return canvas

    zoomed = canvas.copy(content_rect).scaled(
        size, Qt.AspectRatioMode.KeepAspectRatio, Qt.TransformationMode.SmoothTransformation
    )
    result = QPixmap(size)
    result.fill(Qt.GlobalColor.transparent)
    painter = QPainter(result)
    painter.setRenderHint(QPainter.RenderHint.Antialiasing)
    painter.drawPixmap((size.width() - zoomed.width()) // 2, (size.height() - zoomed.height()) // 2, zoomed)
    painter.end()
    return result


def load_pro_app_icon(size: int = 256) -> QIcon:
    ico_path = _pro_resource_path("assets", "icon_pro.ico")
    if ico_path.exists():
        return QIcon(str(ico_path))
    pixmap = load_app_icon().pixmap(size, size)
    return QIcon(_with_pro_badge(pixmap)) if not pixmap.isNull() else load_app_icon()


def load_pro_logo_pixmap(size: int = 28) -> QPixmap:
    png_path = _pro_resource_path("assets", "icon_pro.png")
    if png_path.exists():
        pixmap = QPixmap(str(png_path))
        if not pixmap.isNull():
            return pixmap.scaled(
                size, size, Qt.AspectRatioMode.KeepAspectRatio, Qt.TransformationMode.SmoothTransformation
            )
    return _with_pro_badge(load_logo_pixmap(size))
