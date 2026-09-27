"""A small, dependency-free custom-painted loading spinner (QPainter + QTimer)
with a smooth fading "comet trail" arc — used for the indeterminate
"discovering hosts" phase of a scan and throughout the startup flow. A plain
QProgressBar has no meaningful percentage at that point, and this reads as
noticeably more modern than a flat static arc.
"""
from __future__ import annotations

from PyQt6.QtCore import QPointF, QTimer, Qt
from PyQt6.QtGui import QBrush, QColor, QConicalGradient, QPainter, QPen
from PyQt6.QtWidgets import QWidget


class Spinner(QWidget):
    def __init__(self, size: int = 18, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self._angle = 0
        self._size = size
        self.setFixedSize(size, size)
        self._timer = QTimer(self)
        self._timer.timeout.connect(self._tick)
        self._timer.setInterval(16)  # ~60fps

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

        track = QPen(QColor(255, 255, 255, 30))
        track.setWidth(width)
        track.setCapStyle(Qt.PenCapStyle.RoundCap)
        painter.setPen(track)
        painter.drawEllipse(rect)

        # Comet trail: a conic gradient that fades from bright to transparent
        # around the ring, rotated by the current angle, instead of a flat
        # fixed-length arc — reads as a smoother, more modern loading motion.
        # QConicalGradient requires QPointF — QRect.center() returns a plain
        # QPoint, which PyQt6 (unlike PyQt5) will not implicitly convert.
        gradient = QConicalGradient(QPointF(rect.center()), -self._angle)
        gradient.setColorAt(0.0, QColor(255, 255, 255, 0))
        gradient.setColorAt(0.75, QColor(255, 255, 255, 90))
        gradient.setColorAt(0.97, QColor(255, 255, 255, 235))
        gradient.setColorAt(1.0, QColor(255, 255, 255, 0))
        arc_pen = QPen(QBrush(gradient), width)
        arc_pen.setCapStyle(Qt.PenCapStyle.RoundCap)
        painter.setPen(arc_pen)
        painter.drawArc(rect, 0, 360 * 16)
