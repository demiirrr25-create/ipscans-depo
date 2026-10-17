"""IPscans Premium Startup Splash Screen.
Inspired by Apple & Linear software design:
- Pure obsidian black (#000000) canvas
- Central IPScans vector insignia with dynamic ambient halo
- Minimalist hairline progress indicator
- Real initialization stage callbacks (zero fake delays)
- Smooth cross-fade transition to the main workspace
"""
from __future__ import annotations

import math
from typing import Callable

from PyQt6.QtCore import (
    QEasingCurve,
    QPointF,
    QPropertyAnimation,
    QRectF,
    Qt,
    QTimer,
    pyqtSignal,
)
from PyQt6.QtGui import (
    QBrush,
    QColor,
    QFont,
    QLinearGradient,
    QPainter,
    QPainterPath,
    QPen,
    QPixmap,
    QRadialGradient,
)
from PyQt6.QtWidgets import QApplication, QWidget

from app.ui.resources import load_logo_pixmap


class IPScansSplash(QWidget):
    """Ultra-premium frameless dark splash screen for IPScans applications."""

    step_completed = pyqtSignal(int, str)

    def __init__(
        self,
        app_name: str = "IPscans+",
        edition_label: str = "ANTIGRAVITY NETWORK INTELLIGENCE · v4.3.0",
        parent: QWidget | None = None,
    ) -> None:
        super().__init__(parent)
        self._app_name = app_name
        self._edition_label = edition_label
        self._progress = 0.0
        self._target_progress = 0.0
        self._status_text = "Initializing runtime components..."
        self._phase = 0.0
        self._logo_pixmap: QPixmap = load_logo_pixmap(72)

        self.setWindowFlags(
            Qt.WindowType.FramelessWindowHint
            | Qt.WindowType.WindowStaysOnTopHint
            | Qt.WindowType.SplashScreen
        )
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground, True)
        self.setFixedSize(540, 350)

        # Center on primary screen
        screen = QApplication.primaryScreen()
        if screen:
            geom = screen.geometry()
            self.move(
                (geom.width() - self.width()) // 2,
                (geom.height() - self.height()) // 2,
            )

        # Smooth ticker for micro-interactions & progress interpolation
        self._anim_timer = QTimer(self)
        self._anim_timer.setInterval(16)  # ~60fps smooth rendering
        self._anim_timer.timeout.connect(self._on_tick)
        self._anim_timer.start()

    def set_progress(self, progress: float, status: str = "") -> None:
        """Sets target progress [0.0 - 1.0] and stage description."""
        self._target_progress = max(0.0, min(1.0, progress))
        if status:
            self._status_text = status
        self.update()

    def _on_tick(self) -> None:
        self._phase += 0.04
        # Smooth asymptotic interpolation towards target progress
        diff = self._target_progress - self._progress
        if abs(diff) > 0.002:
            self._progress += diff * 0.18
        else:
            self._progress = self._target_progress
        self.update()

    def finish_and_show(self, main_window: QWidget, on_finish: Callable[[], None] | None = None) -> None:
        """Completes progress to 100% and smoothly fades out while revealing the main window."""
        self._target_progress = 1.0
        self._status_text = "Workspace ready"
        self.update()

        fade_anim = QPropertyAnimation(self, b"windowOpacity")
        fade_anim.setDuration(220)
        fade_anim.setStartValue(1.0)
        fade_anim.setEndValue(0.0)
        fade_anim.setEasingCurve(QEasingCurve.Type.OutCubic)

        def _cleanup():
            self._anim_timer.stop()
            self.close()
            main_window.show()
            main_window.raise_()
            main_window.activateWindow()
            if on_finish:
                on_finish()

        fade_anim.finished.connect(_cleanup)
        fade_anim.start()
        # Keep animation alive
        self._fade_anim = fade_anim

    def paintEvent(self, _event) -> None:  # noqa: N802
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing, True)
        painter.setRenderHint(QPainter.RenderHint.SmoothPixmapTransform, True)

        width_f = float(self.width())
        height_f = float(self.height())
        rect = QRectF(0.5, 0.5, width_f - 1.0, height_f - 1.0)
        corner_radius = 24.0

        # Background Path
        path = QPainterPath()
        path.addRoundedRect(rect, corner_radius, corner_radius)

        # 1. Pure obsidian background
        painter.fillPath(path, QBrush(QColor(0, 0, 0)))

        # 2. Subtle ambient halo behind center logo
        cx = width_f / 2.0
        cy = 118.0
        halo = QRadialGradient(cx, cy, 140.0)
        halo.setColorAt(0.0, QColor(255, 255, 255, 14))
        halo.setColorAt(0.4, QColor(255, 255, 255, 5))
        halo.setColorAt(1.0, QColor(0, 0, 0, 0))
        painter.fillPath(path, QBrush(halo))

        # 3. Outer hairline border
        painter.setPen(QPen(QColor(255, 255, 255, 26), 1.0))
        painter.drawPath(path)

        # 4. Animated subtle orbital shimmer ring around logo
        ring_radius = 48.0
        ring_rect = QRectF(cx - ring_radius, cy - ring_radius, ring_radius * 2.0, ring_radius * 2.0)
        angle_deg = (self._phase * 45.0) % 360.0

        # Faint orbital track
        painter.setPen(QPen(QColor(255, 255, 255, 15), 1.0))
        painter.setBrush(Qt.BrushStyle.NoBrush)
        painter.drawEllipse(ring_rect)

        # Moving orbital highlight arc
        painter.setPen(QPen(QColor(255, 255, 255, 140), 1.5, Qt.PenStyle.SolidLine, Qt.PenCapStyle.RoundCap))
        painter.drawArc(ring_rect, int(angle_deg * 16), int(75 * 16))

        # 5. Logo Mark Rendering
        if not self._logo_pixmap.isNull():
            logo_x = cx - float(self._logo_pixmap.width()) / 2.0
            logo_y = cy - float(self._logo_pixmap.height()) / 2.0
            painter.drawPixmap(int(logo_x), int(logo_y), self._logo_pixmap)
        else:
            # Fallback vector monogram
            painter.setPen(Qt.PenStyle.NoPen)
            painter.setBrush(QBrush(QColor(255, 255, 255, 220)))
            painter.drawEllipse(QPointF(cx, cy), 16.0, 16.0)

        # 6. Typography — Application Title
        title_font = QFont("Segoe UI", 21)
        title_font.setWeight(QFont.Weight.DemiBold)
        title_font.setLetterSpacing(QFont.SpacingType.AbsoluteSpacing, -0.4)
        painter.setFont(title_font)
        painter.setPen(QColor(255, 255, 255))
        title_rect = QRectF(20.0, 186.0, width_f - 40.0, 30.0)
        painter.drawText(title_rect, int(Qt.AlignmentFlag.AlignCenter), self._app_name)

        # 7. Typography — Edition & Version Badge
        badge_font = QFont("Segoe UI", 8)
        badge_font.setWeight(QFont.Weight.Bold)
        badge_font.setLetterSpacing(QFont.SpacingType.AbsoluteSpacing, 1.8)
        painter.setFont(badge_font)
        painter.setPen(QColor(130, 135, 145))
        badge_rect = QRectF(20.0, 220.0, width_f - 40.0, 18.0)
        painter.drawText(badge_rect, int(Qt.AlignmentFlag.AlignCenter), self._edition_label.upper())

        # 8. Minimalist Hairline Progress Track
        track_width = 280.0
        track_height = 2.0
        track_x = (width_f - track_width) / 2.0
        track_y = 265.0

        # Background track
        painter.setPen(Qt.PenStyle.NoPen)
        painter.setBrush(QBrush(QColor(255, 255, 255, 20)))
        painter.drawRoundedRect(
            QRectF(track_x, track_y, track_width, track_height),
            track_height / 2.0,
            track_height / 2.0,
        )

        # Active indicator fill
        current_fill_w = max(4.0, track_width * self._progress)
        fill_grad = QLinearGradient(track_x, track_y, track_x + current_fill_w, track_y)
        fill_grad.setColorAt(0.0, QColor(255, 255, 255, 160))
        fill_grad.setColorAt(1.0, QColor(255, 255, 255, 255))
        painter.setBrush(QBrush(fill_grad))
        painter.drawRoundedRect(
            QRectF(track_x, track_y, current_fill_w, track_height),
            track_height / 2.0,
            track_height / 2.0,
        )

        # 9. Real Initializing Stage Status Label
        status_font = QFont("Segoe UI", 9)
        painter.setFont(status_font)
        painter.setPen(QColor(154, 160, 166))
        status_rect = QRectF(20.0, 280.0, width_f - 40.0, 22.0)
        painter.drawText(status_rect, int(Qt.AlignmentFlag.AlignCenter), self._status_text)

        painter.end()
