"""Badges the free app's icon/logo with a small "PRO" pill so the Pro
product is visually distinguishable (taskbar, title bar, onboarding) without
touching or forking the original assets — drawn on top at load time.
"""
from __future__ import annotations

from PyQt6.QtCore import QRect, Qt
from PyQt6.QtGui import QColor, QFont, QIcon, QPainter, QPixmap

from app.ui.resources import load_app_icon, load_logo_pixmap


def _with_pro_badge(pixmap: QPixmap) -> QPixmap:
    if pixmap.isNull() or pixmap.width() < 12:
        return pixmap

    size = pixmap.size()
    result = QPixmap(size)
    result.fill(Qt.GlobalColor.transparent)

    painter = QPainter(result)
    painter.setRenderHint(QPainter.RenderHint.Antialiasing)
    painter.drawPixmap(0, 0, pixmap)

    # A small pill in the bottom-right corner — deliberately modest (~22%
    # of the icon's height) so it reads as a badge, not a redesign of the
    # mark itself.
    badge_h = max(8, round(min(size.width(), size.height()) * 0.22))
    badge_w = round(badge_h * 2.3)
    margin = round(size.width() * 0.04)
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
    font.setPixelSize(max(6, round(badge_h * 0.58)))
    painter.setFont(font)
    painter.drawText(rect, Qt.AlignmentFlag.AlignCenter, "PRO")
    painter.end()
    return result


def load_pro_app_icon(size: int = 256) -> QIcon:
    pixmap = load_app_icon().pixmap(size, size)
    return QIcon(_with_pro_badge(pixmap)) if not pixmap.isNull() else load_app_icon()


def load_pro_logo_pixmap(size: int = 28) -> QPixmap:
    return _with_pro_badge(load_logo_pixmap(size))
