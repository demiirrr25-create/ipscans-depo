"""A small, dependency-free custom-painted loading spinner (QPainter + QTimer),
used for the indeterminate "discovering hosts" phase of a scan — a plain
QProgressBar has no meaningful percentage at that point.
"""
from __future__ import annotations

from PyQt6.QtCore import QTimer, Qt
from PyQt6.QtGui import QColor, QPainter, QPen
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
        self._angle = (self._angle + 6) % 360
        self.update()

    def paintEvent(self, event) -> None:  # noqa: N802 (Qt override)
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        margin = 2
        rect = self.rect().adjusted(margin, margin, -margin, -margin)

        track = QPen(QColor(255, 255, 255, 40))
        track.setWidth(2)
        painter.setPen(track)
        painter.drawEllipse(rect)

        arc_pen = QPen(QColor(255, 255, 255, 230))
        arc_pen.setWidth(2)
        arc_pen.setCapStyle(Qt.PenCapStyle.RoundCap)
        painter.setPen(arc_pen)
        span = 100 * 16  # ~100 degrees, in 1/16th-degree units
        painter.drawArc(rect, -self._angle * 16, span)
