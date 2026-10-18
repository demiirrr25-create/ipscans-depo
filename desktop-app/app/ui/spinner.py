"""A small, dependency-free custom-painted loading spinner (QPainter + QTimer)
with a smooth fading "comet trail" arc — theme-aware for Light and Dark mode.
"""
from __future__ import annotations

from PyQt6.QtCore import QPointF, QTimer, Qt
from PyQt6.QtGui import QBrush, QColor, QConicalGradient, QPainter, QPen
from PyQt6.QtWidgets import QWidget

from app.ui.styles import ThemeManager, get_current_theme, get_tokens


class Spinner(QWidget):
    def __init__(self, size: int = 18, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self._angle = 0
        self._size = size
        self.setFixedSize(size, size)
        self._timer = QTimer(self)
        self._timer.timeout.connect(self._tick)
        self._timer.setInterval(16)  # ~60fps
        ThemeManager.instance().theme_changed.connect(lambda _: self.update())

    def start(self) -> None:
        self.show()
        self._timer.start()

    def stop(self) -> None:
        self._timer.stop()
        self.hide()

    def _tick(self) -> None:
        self._angle = (self._angle + 4) % 360
        self.update()

    def paintEvent(self, event) -> None:  # noqa: N802 (Qt override)
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        width = max(2, self._size // 9)
        margin = width
        rect = self.rect().adjusted(margin, margin, -margin, -margin)

        tokens = get_tokens()
        is_light = get_current_theme() == "light"
        base_col = QColor(tokens["signal"])
        track_col = QColor(11, 13, 18, 35) if is_light else QColor(255, 255, 255, 30)

        track = QPen(track_col)
        track.setWidth(width)
        track.setCapStyle(Qt.PenCapStyle.RoundCap)
        painter.setPen(track)
        painter.drawEllipse(rect)

        gradient = QConicalGradient(QPointF(rect.center()), -self._angle)
        c0 = QColor(base_col)
        c0.setAlpha(0)
        c1 = QColor(base_col)
        c1.setAlpha(100)
        c2 = QColor(base_col)
        c2.setAlpha(245)
        gradient.setColorAt(0.0, c0)
        gradient.setColorAt(0.75, c1)
        gradient.setColorAt(0.97, c2)
        gradient.setColorAt(1.0, c0)
        arc_pen = QPen(QBrush(gradient), width)
        arc_pen.setCapStyle(Qt.PenCapStyle.RoundCap)
        painter.setPen(arc_pen)
        painter.drawArc(rect, 0, 360 * 16)
