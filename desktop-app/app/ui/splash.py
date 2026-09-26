"""Startup welcome splash: the app logo plus a short greeting, shown for a
moment before the main window appears.
"""
from __future__ import annotations

from PyQt6.QtCore import QPropertyAnimation, Qt
from PyQt6.QtGui import QColor, QFont, QPainter, QPixmap
from PyQt6.QtWidgets import QSplashScreen

from app.ui.resources import resource_path

WIDTH, HEIGHT = 480, 300


def _build_pixmap() -> QPixmap:
    pixmap = QPixmap(WIDTH, HEIGHT)
    pixmap.fill(QColor("#000000"))

    painter = QPainter(pixmap)
    painter.setRenderHint(QPainter.RenderHint.Antialiasing)

    border_pen = painter.pen()
    border_pen.setColor(QColor(255, 255, 255, 30))
    border_pen.setWidth(1)
    painter.setPen(border_pen)
    painter.drawRect(pixmap.rect().adjusted(0, 0, -1, -1))

    logo_path = resource_path("assets", "icon.png")
    if logo_path.exists():
        logo = QPixmap(str(logo_path)).scaled(
            72,
            72,
            Qt.AspectRatioMode.KeepAspectRatio,
            Qt.TransformationMode.SmoothTransformation,
        )
        painter.drawPixmap((WIDTH - logo.width()) // 2, 56, logo)

    painter.setPen(QColor("#ffffff"))
    title_font = QFont("Segoe UI", 20, QFont.Weight.Bold)
    painter.setFont(title_font)
    painter.drawText(0, 148, WIDTH, 36, Qt.AlignmentFlag.AlignCenter, "ipscans")

    painter.setPen(QColor(255, 255, 255, 210))
    subtitle_font = QFont("Segoe UI", 12)
    painter.setFont(subtitle_font)
    painter.drawText(
        0, 182, WIDTH, 24, Qt.AlignmentFlag.AlignCenter, "Welcome to ipscans Network Scanner"
    )

    painter.setPen(QColor(255, 255, 255, 110))
    hint_font = QFont("Segoe UI", 9)
    painter.setFont(hint_font)
    painter.drawText(
        0, HEIGHT - 34, WIDTH, 20, Qt.AlignmentFlag.AlignCenter, "Starting up..."
    )

    painter.end()
    return pixmap


class WelcomeSplash(QSplashScreen):
    def __init__(self) -> None:
        super().__init__(_build_pixmap())
        self.setWindowFlag(Qt.WindowType.WindowStaysOnTopHint)
        self.setWindowOpacity(0.0)
        self._fade_in = QPropertyAnimation(self, b"windowOpacity")
        self._fade_in.setDuration(280)
        self._fade_in.setStartValue(0.0)
        self._fade_in.setEndValue(1.0)

    def show(self) -> None:  # noqa: D102 (Qt override)
        super().show()
        self._fade_in.start()
