"""IPScans Cinematic Windows 11 Full-Screen Welcome Experience.
Designed to meet Windows 11 Pro first-party setup standards:
- Full-screen pure obsidian black (#000000) canvas
- Dynamic ambient silk ribbon wave backdrop
- Center vector insignia with luminous breathing pulse
- Segoe UI Variable typography with high-contrast hierarchy
- 60fps smooth easing hairline progress indicator
- Real initialization stage callbacks (zero artificial delay)
- Safe Escape key dismissal and smooth cross-fade reveal
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
    """Full-screen Windows 11 Pro cinematic splash and startup experience."""

    step_completed = pyqtSignal(int, str)

    def __init__(
        self,
        app_name: str = "IPscans+",
        edition_label: str = "HIGH PERFORMANCE NETWORK INTELLIGENCE",
        parent: QWidget | None = None,
    ) -> None:
        super().__init__(parent)
        self._app_name = app_name
        self._edition_label = edition_label
        self._progress = 0.0
        self._target_progress = 0.0
        self._status_text = "Initializing system hardware probes..."
        self._phase = 0.0
        self._logo_pixmap: QPixmap = load_logo_pixmap(96)

        # Full-screen frameless presentation
        self.setWindowFlags(
            Qt.WindowType.FramelessWindowHint
            | Qt.WindowType.WindowStaysOnTopHint
            | Qt.WindowType.SplashScreen
        )
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground, False)

        # Cover entire primary screen
        screen = QApplication.primaryScreen()
        if screen:
            geom = screen.geometry()
            self.setGeometry(geom)
        else:
            self.resize(1920, 1080)

        # 60fps high-precision animation timer
        self._anim_timer = QTimer(self)
        self._anim_timer.setInterval(16)
        self._anim_timer.timeout.connect(self._on_tick)
        self._anim_timer.start()

    def set_progress(self, progress: float, status: str = "") -> None:
        """Sets target progress [0.0 - 1.0] and stage description."""
        self._target_progress = max(0.0, min(1.0, progress))
        if status:
            self._status_text = status
        self.update()

    def _on_tick(self) -> None:
        self._phase += 0.035
        # Smooth interpolation towards target progress
        diff = self._target_progress - self._progress
        if abs(diff) > 0.002:
            self._progress += diff * 0.22
        else:
            self._progress = self._target_progress
        self.update()

    def finish_and_show(self, main_window: QWidget, on_finish: Callable[[], None] | None = None) -> None:
        """Fades out smoothly and reveals the main workspace."""
        self._target_progress = 1.0
        self._status_text = "Workspace ready"
        self.update()

        fade_anim = QPropertyAnimation(self, b"windowOpacity")
        fade_anim.setDuration(260)
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
        self._fade_anim = fade_anim

    def keyPressEvent(self, event) -> None:  # noqa: N802
        if event.key() == Qt.Key.Key_Escape:
            self._anim_timer.stop()
            self.close()
            event.accept()
            return
        super().keyPressEvent(event)

    def paintEvent(self, _event) -> None:  # noqa: N802
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing, True)
        painter.setRenderHint(QPainter.RenderHint.SmoothPixmapTransform, True)

        w = float(self.width())
        h = float(self.height())
        cx = w / 2.0
        cy = h / 2.0 - 30.0

        # 1. Pure obsidian black backdrop
        painter.fillRect(self.rect(), QBrush(QColor(0, 0, 0)))

        # 2. Ambient harmonic silk ribbon waves (Windows 11 Setup Silk effect)
        for layer in range(3):
            phase_offset = self._phase + layer * 1.4
            y_base = h * (0.42 + layer * 0.16)

            wave_path = QPainterPath()
            wave_path.moveTo(0, h)
            wave_path.lineTo(0, y_base + math.sin(phase_offset) * 26)

            cp1_x = w * 0.32
            cp1_y = y_base + math.sin(phase_offset + 1.2) * 38 - 30
            cp2_x = w * 0.68
            cp2_y = y_base + math.cos(phase_offset + 2.0) * 34 + 30
            end_x = w
            end_y = y_base + math.sin(phase_offset + 3.0) * 26

            wave_path.cubicTo(cp1_x, cp1_y, cp2_x, cp2_y, end_x, end_y)
            wave_path.lineTo(w, h)
            wave_path.closeSubpath()

            wave_grad = QLinearGradient(0, y_base - 40, w, h)
            if layer == 0:
                wave_grad.setColorAt(0.0, QColor(255, 255, 255, 14))
                wave_grad.setColorAt(0.5, QColor(180, 190, 210, 8))
                wave_grad.setColorAt(1.0, QColor(0, 0, 0, 0))
            elif layer == 1:
                wave_grad.setColorAt(0.0, QColor(255, 255, 255, 10))
                wave_grad.setColorAt(0.6, QColor(160, 175, 195, 5))
                wave_grad.setColorAt(1.0, QColor(0, 0, 0, 0))
            else:
                wave_grad.setColorAt(0.0, QColor(255, 255, 255, 7))
                wave_grad.setColorAt(0.7, QColor(140, 150, 170, 3))
                wave_grad.setColorAt(1.0, QColor(0, 0, 0, 0))

            painter.fillPath(wave_path, QBrush(wave_grad))

            # Crest line
            crest = QPainterPath()
            crest.moveTo(0, y_base + math.sin(phase_offset) * 26)
            crest.cubicTo(cp1_x, cp1_y, cp2_x, cp2_y, end_x, end_y)
            painter.setPen(QPen(QColor(255, 255, 255, int(28 - layer * 7)), 1.2))
            painter.drawPath(crest)

        # 3. Dynamic ambient breathing halo behind central insignia
        pulse = math.sin(self._phase * 1.8) * 0.5 + 0.5
        halo_radius = 180.0 + pulse * 24.0
        halo = QRadialGradient(cx, cy - 20.0, halo_radius)
        halo.setColorAt(0.0, QColor(255, 255, 255, int(22 + pulse * 14)))
        halo.setColorAt(0.35, QColor(200, 210, 230, int(8 + pulse * 6)))
        halo.setColorAt(1.0, QColor(0, 0, 0, 0))
        painter.setPen(Qt.PenStyle.NoPen)
        painter.setBrush(QBrush(halo))
        painter.drawEllipse(QPointF(cx, cy - 20.0), halo_radius, halo_radius)

        # 4. Central Vector Mark with Shimmer Orbit
        ring_radius = 58.0
        ring_rect = QRectF(cx - ring_radius, cy - 20.0 - ring_radius, ring_radius * 2.0, ring_radius * 2.0)
        angle_deg = (self._phase * 50.0) % 360.0

        # Fine orbital track
        painter.setPen(QPen(QColor(255, 255, 255, 20), 1.0))
        painter.setBrush(Qt.BrushStyle.NoBrush)
        painter.drawEllipse(ring_rect)

        # Luminous orbital highlight arc
        painter.setPen(QPen(QColor(255, 255, 255, 180), 2.0, Qt.PenStyle.SolidLine, Qt.PenCapStyle.RoundCap))
        painter.drawArc(ring_rect, int(angle_deg * 16), int(75 * 16))

        # Central Pixmap
        if not self._logo_pixmap.isNull():
            logo_x = cx - float(self._logo_pixmap.width()) / 2.0
            logo_y = cy - 20.0 - float(self._logo_pixmap.height()) / 2.0
            painter.drawPixmap(int(logo_x), int(logo_y), self._logo_pixmap)
        else:
            painter.setPen(Qt.PenStyle.NoPen)
            painter.setBrush(QBrush(QColor(255, 255, 255, 230)))
            painter.drawEllipse(QPointF(cx, cy - 20.0), 22.0, 22.0)

        # 5. Application Title (Segoe UI Variable Display)
        title_font = QFont("Segoe UI Variable Display", 32)
        if not title_font.exactMatch():
            title_font = QFont("Segoe UI", 32)
        title_font.setWeight(QFont.Weight.Bold)
        title_font.setLetterSpacing(QFont.SpacingType.AbsoluteSpacing, -0.6)
        painter.setFont(title_font)
        painter.setPen(QColor(255, 255, 255))
        title_rect = QRectF(cx - 300.0, cy + 60.0, 600.0, 48.0)
        painter.drawText(title_rect, int(Qt.AlignmentFlag.AlignCenter), self._app_name)

        # 6. Edition & Subtitle Badge
        edition_font = QFont("Segoe UI Variable Text", 9)
        if not edition_font.exactMatch():
            edition_font = QFont("Segoe UI", 9)
        edition_font.setWeight(QFont.Weight.DemiBold)
        edition_font.setLetterSpacing(QFont.SpacingType.AbsoluteSpacing, 2.0)
        painter.setFont(edition_font)
        painter.setPen(QColor(161, 161, 161))
        edition_rect = QRectF(cx - 300.0, cy + 112.0, 600.0, 20.0)
        painter.drawText(edition_rect, int(Qt.AlignmentFlag.AlignCenter), self._edition_label.upper())

        # 7. Precision Hairline Progress Indicator
        track_w = 340.0
        track_h = 2.5
        track_x = cx - track_w / 2.0
        track_y = cy + 155.0

        # Base track
        painter.setPen(Qt.PenStyle.NoPen)
        painter.setBrush(QBrush(QColor(255, 255, 255, 22)))
        painter.drawRoundedRect(QRectF(track_x, track_y, track_w, track_h), 1.25, 1.25)

        # Animated luminous progress
        active_w = max(4.0, track_w * self._progress)
        prog_grad = QLinearGradient(track_x, track_y, track_x + active_w, track_y)
        prog_grad.setColorAt(0.0, QColor(255, 255, 255, 140))
        prog_grad.setColorAt(1.0, QColor(255, 255, 255, 255))
        painter.setBrush(QBrush(prog_grad))
        painter.drawRoundedRect(QRectF(track_x, track_y, active_w, track_h), 1.25, 1.25)

        # 8. Real-time Status Description
        status_font = QFont("Segoe UI Variable Text", 10)
        if not status_font.exactMatch():
            status_font = QFont("Segoe UI", 10)
        painter.setFont(status_font)
        painter.setPen(QColor(140, 145, 155))
        status_rect = QRectF(cx - 300.0, cy + 172.0, 600.0, 24.0)
        painter.drawText(status_rect, int(Qt.AlignmentFlag.AlignCenter), self._status_text)

        # 9. Top-Right "Esc" Pill to Skip
        esc_font = QFont("Segoe UI", 8)
        esc_font.setWeight(QFont.Weight.Medium)
        painter.setFont(esc_font)
        painter.setPen(QColor(110, 110, 110))
        painter.drawText(
            QRectF(w - 140.0, 24.0, 110.0, 24.0),
            int(Qt.AlignmentFlag.AlignRight | Qt.AlignmentFlag.AlignVCenter),
            "Press ESC to skip",
        )

        # 10. Bottom Brand Watermark
        brand_font = QFont("Segoe UI", 9)
        brand_font.setWeight(QFont.Weight.Medium)
        brand_font.setLetterSpacing(QFont.SpacingType.AbsoluteSpacing, 1.2)
        painter.setFont(brand_font)
        painter.setPen(QColor(70, 70, 70))
        painter.drawText(
            QRectF(0, h - 44.0, w, 24.0),
            int(Qt.AlignmentFlag.AlignCenter),
            "IPSCANS · SYSTEM INFRASTRUCTURE",
        )

        painter.end()
