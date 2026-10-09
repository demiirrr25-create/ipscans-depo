"""Accessible native progress with bounded, visibility-aware animation."""
from __future__ import annotations

import ctypes
import sys

from PyQt6.QtCore import QEvent, QRectF, Qt, QVariantAnimation, QEasingCurve
from PyQt6.QtGui import QColor, QLinearGradient, QPainter, QPainterPath
from PyQt6.QtWidgets import QProgressBar


def animations_enabled() -> bool:
    if sys.platform == 'win32':
        enabled = ctypes.c_int(1)
        try:
            # Respect Windows Accessibility > Visual effects > Animation effects.
            if ctypes.windll.user32.SystemParametersInfoW(0x1042, 0, ctypes.byref(enabled), 0):
                return bool(enabled.value)
        except (AttributeError, OSError):
            pass
    return True


class ScanProgress(QProgressBar):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setFixedHeight(10)
        self.setTextVisible(False)
        self._fraction = 0.0
        self._phase = 0.0
        self._motion = animations_enabled()
        self._smooth = QVariantAnimation(self)
        self._smooth.setDuration(220)
        self._smooth.setEasingCurve(QEasingCurve.Type.OutCubic)
        self._smooth.valueChanged.connect(self._set_fraction)
        self._flow = QVariantAnimation(self)
        self._flow.setStartValue(0.0)
        self._flow.setEndValue(1.0)
        self._flow.setDuration(1900)
        self._flow.setLoopCount(-1)
        self._flow.valueChanged.connect(self._set_phase)
        self.valueChanged.connect(self._value_changed)
        if parent:
            parent.installEventFilter(self)

    def _set_fraction(self, value):
        self._fraction = float(value)
        self.update()

    def _set_phase(self, value):
        self._phase = float(value)
        self.update()

    def _value_changed(self, value):
        span = self.maximum() - self.minimum()
        fraction = max(0.0, min(1.0, (value - self.minimum()) / span)) if span else 0.0
        self._smooth.stop()
        if self._motion and self.isVisible() and not self.window().isMinimized() and fraction > self._fraction:
            self._smooth.setStartValue(self._fraction)
            self._smooth.setEndValue(fraction)
            self._smooth.start()
        else:
            self._set_fraction(fraction)

    def reset(self):
        self._smooth.stop()
        self._set_fraction(0.0)
        super().reset()

    def _sync_motion(self):
        self._motion = animations_enabled()
        if self._motion and self.isVisible() and not self.window().isMinimized():
            if self._flow.state() != QVariantAnimation.State.Running:
                self._flow.start()
        else:
            self._flow.stop()
            self._smooth.stop()
            self._phase = 0.5
            self._value_changed(self.value())

    def showEvent(self, event):
        super().showEvent(event)
        self._sync_motion()

    def hideEvent(self, event):
        self._flow.stop()
        self._smooth.stop()
        super().hideEvent(event)

    def eventFilter(self, watched, event):
        if event.type() == QEvent.Type.WindowStateChange:
            self._sync_motion()
        return super().eventFilter(watched, event)

    def paintEvent(self, event):
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        track = QRectF(self.rect())
        path = QPainterPath()
        path.addRoundedRect(track, 5, 5)
        painter.fillPath(path, QColor('#25272c'))
        painter.setClipPath(path)
        busy = self.minimum() == self.maximum()
        width = track.width() * (0.28 if busy else self._fraction)
        left = ((track.width() + width) * self._phase - width) if busy else 0
        fill = QRectF(left, 0, width, track.height())
        gradient = QLinearGradient(left, 0, left + max(width, 1), 0)
        gradient.setColorAt(0, QColor('#777b85'))
        gradient.setColorAt(0.65, QColor('#d5d7de'))
        gradient.setColorAt(1, QColor('#ffffff'))
        painter.setPen(Qt.PenStyle.NoPen)
        painter.setBrush(gradient)
        painter.drawRoundedRect(fill, 5, 5)
        if not busy and width > 0 and self._motion:
            glint = (width + 120) * self._phase - 120
            shine = QLinearGradient(glint, 0, glint + 120, 0)
            shine.setColorAt(0, QColor(255, 255, 255, 0))
            shine.setColorAt(0.5, QColor(255, 255, 255, 70))
            shine.setColorAt(1, QColor(255, 255, 255, 0))
            painter.fillRect(QRectF(0, 0, width, track.height()), shine)
