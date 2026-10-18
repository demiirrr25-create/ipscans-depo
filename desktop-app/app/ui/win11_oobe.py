"""IPScans Windows 11 Pro Out of Box Experience (OOBE) & Cinematic Splash.
Directly inspired by Windows 11 Pro first-party setup and ipscans.com design system:
- Fullscreen pure obsidian black (#000000) canvas
- ipscans.com native Spatial Particles field background (60 FPS fluid simulation)
- Stage 0: Minimalist, elegant "Hello" / "Merhaba" soft breathing fade-in
- Stage 1: Application Feature Showcase with glassmorphic cards and crisp iconography
- Stage 2: EULA & Local Privacy Policy acceptance with custom scrollable terms & checkbox
- Stage 3: Ultra-premium luminous sweep hairline loading bar
- Smooth cross-fade transition to MainWindow
"""
from __future__ import annotations

import math
import time
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
from PyQt6.QtWidgets import (
    QApplication,
    QCheckBox,
    QFrame,
    QGraphicsOpacityEffect,
    QGridLayout,
    QHBoxLayout,
    QLabel,
    QPushButton,
    QScrollArea,
    QStackedLayout,
    QTextEdit,
    QVBoxLayout,
    QWidget,
)

from app.i18n import (
    DEFAULT_LANGUAGE,
    get_privacy_body,
    get_saved_language,
    get_terms_body,
    save_language,
    t,
)
from app.ui.privacy_dialog import (
    accept_privacy,
    accept_terms,
    has_accepted_privacy,
    has_accepted_terms,
)
from app.ui.resources import load_logo_pixmap


def _smoothstep(e0: float, e1: float, x: float) -> float:
    if e1 == e0:
        return 0.0
    t_val = max(0.0, min(1.0, (x - e0) / (e1 - e0)))
    return t_val * t_val * (3.0 - 2.0 * t_val)


# =========================================================================
# 1. Native Spatial Particles Canvas (1:1 port of ipscans.com SpatialParticles)
# =========================================================================
class SpatialParticlesCanvas(QWidget):
    """60 FPS fluid spatial particles canvas matching ipscans.com homepage."""

    def __init__(self, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self.setAttribute(Qt.WidgetAttribute.WA_TransparentForMouseEvents, True)
        self.cols = 28
        self.rows = 16
        self.particles: list[list[float]] = []

        # Deterministic pseudo-random distribution matching web canvas
        for r in range(self.rows):
            for c in range(self.cols):
                jx = ((math.sin(r * 127.1 + c * 311.7) * 43758.5453) % 1.0)
                jy = ((math.sin(r * 269.5 + c * 183.3) * 43758.5453) % 1.0)
                uv_x = (((c + 0.5 + (jx - 0.5) * 0.72) / self.cols) * 2.0 - 1.0) * 1.02
                uv_y = (((r + 0.5 + (jy - 0.5) * 0.72) / self.rows) * 2.0 - 1.0) * 1.02
                # [uv_x, uv_y, cur_x, cur_y, scale, seed1, seed2]
                self.particles.append([uv_x, uv_y, uv_x, uv_y, 0.18, abs(jx), abs(jy)])

        self._start_time = time.monotonic()
        self._time = 0.0

        self._timer = QTimer(self)
        self._timer.setInterval(16)
        self._timer.timeout.connect(self._on_tick)
        self._timer.start()

    def _on_tick(self) -> None:
        self._time = time.monotonic() - self._start_time
        self.update()

    def paintEvent(self, _event) -> None:  # noqa: N802
        from app.ui.styles import get_current_theme, get_tokens
        theme = get_current_theme()
        tk = get_tokens(theme)

        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing, True)
        painter.fillRect(self.rect(), QColor(tk["bg_canvas"]))

        w = float(self.width())
        h = float(self.height())
        if w <= 10 or h <= 10:
            painter.end()
            return

        half_w = w * 0.5
        half_h = h * 0.5
        aspect = w / max(1.0, h)
        ring_radius = 0.56 + math.sin(self._time * 0.7) * 0.05
        drift_x = math.sin(self._time * 0.42 + 1.1) * 0.28 + math.cos(self._time * 0.23) * 0.12
        drift_y = math.cos(self._time * 0.48 + 0.6) * 0.2 + math.sin(self._time * 0.31) * 0.08
        time_scaled = self._time * 0.45
        aspect_scale_x = 0.92 if aspect > 1.0 else aspect
        aspect_scale_y = (1.0 / min(aspect, 1.45)) if aspect > 1.0 else 1.0

        painter.setPen(Qt.PenStyle.NoPen)

        for p in self.particles:
            uv_x, uv_y, cur_x, cur_y, scale, s1, s2 = p

            # Center exclusion zone so dialog content stays crisp
            c_dist = math.sqrt(uv_x * uv_x * 0.85 + uv_y * uv_y * 1.25)
            c_mask = _smoothstep(0.16, 0.46, c_dist)

            # Wave displacement
            w_x = math.sin(uv_x * 4.4 + time_scaled * 2.1 + s1 * 3.8) * 0.018
            w_y = math.cos(uv_y * 4.4 + time_scaled * 1.9 + s2 * 3.8) * 0.018

            dx = (uv_x + w_x - drift_x) * aspect_scale_x
            dy = (uv_y + w_y - drift_y) * aspect_scale_y
            dist = math.sqrt(dx * dx + dy * dy)

            t1 = max(0.0, _smoothstep(ring_radius - 0.42, ring_radius, dist) - _smoothstep(ring_radius, ring_radius + 0.32, dist))
            t_scale = (0.16 + t1 * 0.38) * (0.35 + 0.65 * c_mask)
            p[4] += (t_scale - scale) * 0.14
            cur_scale = p[4]

            push = t1 * 0.14
            ang = math.atan2(dy, dx)
            p[2] += (uv_x + w_x + math.cos(ang) * push * 0.28 - cur_x) * 0.18
            p[3] += (uv_y + w_y + math.sin(ang) * push * 0.28 - cur_y) * 0.18

            # Color wave
            color_wave = (math.sin(uv_x * 2.0 + uv_y * 1.8 + self._time * 0.42 + s1 * 2.4) + 1.0) * 0.5
            if color_wave < 0.56:
                k = color_wave / 0.56
                r_col = int(44 + k * (113 - 44))
                g_col = int(100 + k * (137 - 100))
                b_col = int(237 + k * (255 - 237))
            else:
                k = (color_wave - 0.56) / 0.44
                r_col = int(113 + k * (183 - 113))
                g_col = int(137 + k * (191 - 137))
                b_col = int(255 + k * (217 - 255))

            alpha = int(max(10, min(140, cur_scale * 180 * (0.28 + 0.72 * c_mask))))
            if alpha < 12:
                continue

            rot = ang + math.sin(uv_x * 3.8 + time_scaled * 1.2) * 0.48
            pill_l = max(3.0, cur_scale * 8.0)
            pill_t = max(1.5, cur_scale * 2.6)

            painter.save()
            painter.translate(half_w + p[2] * half_w, half_h + p[3] * half_h)
            painter.rotate(math.degrees(rot))
            painter.setBrush(QBrush(QColor(r_col, g_col, b_col, alpha)))
            painter.drawRoundedRect(QRectF(-pill_l * 0.5, -pill_t * 0.5, pill_l, pill_t), pill_t * 0.5, pill_t * 0.5)
            painter.restore()

        painter.end()


# =========================================================================
# 2. Ultra-Premium Luminous Hairline Loading Bar
# =========================================================================
class Win11LoadingBar(QWidget):
    """Precision hairline progress bar with moving luminous gradient sweep."""

    def __init__(self, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self.setFixedHeight(12)
        self.setFixedWidth(360)
        self._progress = 0.0
        self._target_progress = 0.0
        self._phase = 0.0

        self._timer = QTimer(self)
        self._timer.setInterval(16)
        self._timer.timeout.connect(self._on_tick)
        self._timer.start()

    def set_progress(self, target: float) -> None:
        self._target_progress = max(0.0, min(1.0, target))
        self.update()

    def _on_tick(self) -> None:
        self._phase += 0.04
        diff = self._target_progress - self._progress
        if abs(diff) > 0.001:
            self._progress += diff * 0.18
        else:
            self._progress = self._target_progress
        self.update()

    def paintEvent(self, _event) -> None:  # noqa: N802
        from app.ui.styles import get_tokens
        tk = get_tokens()

        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing, True)

        w = float(self.width())
        track_h = 3.5
        y = (float(self.height()) - track_h) * 0.5

        # Background track
        painter.setPen(Qt.PenStyle.NoPen)
        painter.setBrush(QBrush(QColor(tk["border_default"])))
        painter.drawRoundedRect(QRectF(0, y, w, track_h), 1.75, 1.75)

        # Luminous progress fill
        fill_w = max(4.0, w * self._progress)
        sweep_offset = (math.sin(self._phase * 1.5) * 0.5 + 0.5)

        grad = QLinearGradient(0, y, fill_w, y)
        grad.setColorAt(0.0, QColor(tk["accent_primary"]))
        mid = max(0.1, min(0.9, sweep_offset))
        grad.setColorAt(mid, QColor(tk["accent_hover"]))
        grad.setColorAt(1.0, QColor(tk["accent_primary"]))

        painter.setBrush(QBrush(grad))
        painter.drawRoundedRect(QRectF(0, y, fill_w, track_h), 1.75, 1.75)

        painter.end()


# =========================================================================
# 3. Glassmorphic Surface Container (ipscans.com Theme)
# =========================================================================
class Win11GlassCard(QFrame):
    """Surface card with hairline border and subtle gradient."""

    def __init__(self, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self.setObjectName("Win11GlassCard")
        self.apply_theme()

    def apply_theme(self, theme: str | None = None) -> None:
        from app.ui.styles import get_tokens
        tk = get_tokens(theme)
        self.setStyleSheet(
            f"""
            QFrame#Win11GlassCard {{
                background-color: {tk['bg_surface']};
                border: 1px solid {tk['border_default']};
                border-radius: 24px;
            }}
            """
        )

    def paintEvent(self, event) -> None:  # noqa: N802
        super().paintEvent(event)
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing, True)
        rect = QRectF(0.5, 0.5, float(self.width()) - 1.0, float(self.height()) - 1.0)
        path = QPainterPath()
        path.addRoundedRect(rect, 24.0, 24.0)

        top_glow = QRadialGradient(float(self.width()) * 0.5, 0.0, 320.0)
        top_glow.setColorAt(0.0, QColor(47, 107, 255, 14))
        top_glow.setColorAt(0.5, QColor(47, 107, 255, 5))
        top_glow.setColorAt(1.0, QColor(0, 0, 0, 0))
        painter.fillPath(path, QBrush(top_glow))
        painter.end()


# =========================================================================
# 4. Windows 11 Pro Full-Screen OOBE & Splash Window
# =========================================================================
class Win11OOBEWindow(QWidget):
    """Windows 11 Pro Out of Box Experience and cinematic splash entry point."""

    step_completed = pyqtSignal(int, str)

    def __init__(
        self,
        app_name: str = "IPscans+",
        edition_label: str = "HIGH PERFORMANCE NETWORK INTELLIGENCE",
        mode: str = "oobe",  # "oobe" | "splash"
        language: str = "tr",
        target_window: QWidget | None = None,
        parent: QWidget | None = None,
    ) -> None:
        super().__init__(parent)
        self._app_name = app_name
        self._edition_label = edition_label
        self._mode = mode
        self.lang = language
        self._target_window = target_window
        self._status_text = "Çalışma alanı hazırlanıyor..."
        self._step_index = 0
        self._logo_pixmap = load_logo_pixmap(64)

        self.setWindowFlags(
            Qt.WindowType.FramelessWindowHint
            | Qt.WindowType.WindowStaysOnTopHint
            | Qt.WindowType.SplashScreen
        )
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground, False)

        screen = QApplication.primaryScreen()
        if screen:
            self.setGeometry(screen.geometry())
        else:
            self.resize(1920, 1080)

        self._canvas = SpatialParticlesCanvas(self)

        self._stack = QStackedLayout()
        self._stack.setStackingMode(QStackedLayout.StackingMode.StackOne)

        self._build_hello_stage()
        self._build_showcase_stage()
        self._build_agreement_stage()
        self._build_loading_stage()

        root = QVBoxLayout(self)
        root.setContentsMargins(0, 0, 0, 0)
        root.addLayout(self._stack)

        from app.ui.styles import ThemeManager, get_current_theme
        self.apply_theme(get_current_theme())
        ThemeManager.instance().theme_changed.connect(self.apply_theme)

        self._stack.setCurrentIndex(0)
        if self._mode == "splash":
            QTimer.singleShot(250, self._auto_advance_hello)
        else:
            QTimer.singleShot(450, self._auto_advance_hello)

    def apply_theme(self, theme: str | None = None) -> None:
        from app.ui.styles import get_tokens
        tk = get_tokens(theme)
        if hasattr(self, "_hello_title"):
            self._hello_title.setStyleSheet(
                f"font-family: 'Segoe UI Variable Display', 'Segoe UI', -apple-system, sans-serif; "
                f"font-size: 68px; font-weight: 600; color: {tk['text_primary']}; letter-spacing: -0.6px; "
                f"background: transparent;"
            )
        if hasattr(self, "_showcase_title"):
            self._showcase_title.setStyleSheet(
                f"font-family: 'Segoe UI Variable Display', 'Segoe UI', -apple-system, sans-serif; "
                f"font-size: 38px; font-weight: 600; color: {tk['text_primary']}; letter-spacing: -0.6px; "
                f"background: transparent;"
            )
        if hasattr(self, "_showcase_sub"):
            self._showcase_sub.setStyleSheet(
                f"font-family: 'Segoe UI Variable Text', 'Segoe UI', -apple-system, sans-serif; "
                f"font-size: 14px; color: {tk['text_secondary']}; letter-spacing: -0.1px; background: transparent;"
            )
        for tile, t_lbl, d_lbl in getattr(self, "_showcase_tiles", []):
            tile.setStyleSheet(
                f"""
                QFrame {{
                    background-color: {tk['bg_surface']};
                    border: 1px solid {tk['border_default']};
                    border-radius: 12px;
                }}
                QFrame:hover {{
                    background-color: {tk['bg_hover']};
                    border-color: {tk['border_strong']};
                }}
                """
            )
            t_lbl.setStyleSheet(f"font-size: 13px; font-weight: 600; color: {tk['text_primary']}; background: transparent; border: none;")
            d_lbl.setStyleSheet(f"font-size: 11.5px; color: {tk['text_secondary']}; line-height: 1.4; background: transparent; border: none;")

        if hasattr(self, "_agreement_checkbox"):
            self._agreement_checkbox.setStyleSheet(
                f"""
                QCheckBox {{
                    color: {tk['text_secondary']};
                    font-size: 12.5px;
                    font-weight: 500;
                    spacing: 10px;
                    background: transparent;
                }}
                QCheckBox:hover {{
                    color: {tk['text_primary']};
                }}
                QCheckBox::indicator {{
                    width: 18px;
                    height: 18px;
                    border: 1.5px solid {tk['border_strong']};
                    border-radius: 4px;
                    background-color: {tk['bg_surface']};
                }}
                QCheckBox::indicator:checked {{
                    background-color: {tk['accent_primary']};
                    border-color: {tk['accent_primary']};
                    image: none;
                }}
                """
            )
        if hasattr(self, "_accept_btn"):
            self._accept_btn.setStyleSheet(
                f"""
                QPushButton {{
                    background-color: {tk['accent_primary']};
                    color: {tk['text_inverse']};
                    border: none;
                    border-radius: 20px;
                    padding: 12px 42px;
                    font-family: 'Segoe UI Variable Display', 'Segoe UI', sans-serif;
                    font-size: 13.5px;
                    font-weight: 700;
                    letter-spacing: -0.2px;
                }}
                QPushButton:hover {{
                    background-color: {tk['accent_hover']};
                }}
                QPushButton:disabled {{
                    background-color: {tk['bg_elevated']};
                    color: {tk['text_tertiary']};
                }}
                """
            )
        if hasattr(self, "_loading_title_lbl"):
            self._loading_title_lbl.setStyleSheet(
                f"font-family: 'Segoe UI Variable Display', 'Segoe UI', sans-serif; "
                f"font-size: 32px; font-weight: 700; color: {tk['text_primary']}; letter-spacing: -0.5px;"
            )
        if hasattr(self, "_loading_edition_lbl"):
            self._loading_edition_lbl.setStyleSheet(
                f"font-family: 'Segoe UI Variable Text', 'Segoe UI', sans-serif; "
                f"font-size: 9px; font-weight: 600; color: {tk['text_secondary']}; letter-spacing: 2.0px;"
            )
        if hasattr(self, "_status_lbl"):
            self._status_lbl.setStyleSheet(
                f"font-family: 'Segoe UI Variable Text', 'Segoe UI', sans-serif; "
                f"font-size: 11px; color: {tk['text_secondary']};"
            )
        self._canvas.update()
        self.update()

    def set_target_window(self, target_window: QWidget) -> None:
        self._target_window = target_window

    def resizeEvent(self, event) -> None:  # noqa: N802
        super().resizeEvent(event)
        self._canvas.setGeometry(self.rect())

    def mousePressEvent(self, event) -> None:  # noqa: N802
        if self._stack.currentIndex() == 0:
            self._auto_advance_hello()
            event.accept()
            return
        super().mousePressEvent(event)

    def keyPressEvent(self, event) -> None:  # noqa: N802
        if event.key() == Qt.Key.Key_Escape:
            if hasattr(self, "_on_finish_callback") and self._on_finish_callback:
                self._on_finish_callback()
            elif self._target_window is not None:
                self.finish_and_show(self._target_window)
            else:
                self.close()
            event.accept()
            return
        if self._stack.currentIndex() == 0 and event.key() in (Qt.Key.Key_Space, Qt.Key.Key_Return, Qt.Key.Key_Enter):
            self._auto_advance_hello()
            event.accept()
            return
        super().keyPressEvent(event)

    # ----------------------------------------------------------- Stage 0: Hello
    def _build_hello_stage(self) -> None:
        stage = QWidget()
        layout = QVBoxLayout(stage)
        layout.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.setContentsMargins(0, 0, 0, 0)

        hello_text = "Merhaba" if self.lang == "tr" else "Hello"
        self._hello_title = QLabel(hello_text)
        self._hello_title.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(self._hello_title)

        opacity = QGraphicsOpacityEffect(stage)
        stage.setGraphicsEffect(opacity)
        self._hello_opacity = opacity

        anim = QPropertyAnimation(opacity, b"opacity")
        anim.setDuration(240)
        anim.setStartValue(0.0)
        anim.setEndValue(1.0)
        anim.setEasingCurve(QEasingCurve.Type.OutCubic)
        anim.start()
        self._hello_anim = anim

        self._stack.addWidget(stage)

    def _auto_advance_hello(self) -> None:
        if self._stack.currentIndex() != 0:
            return
        if hasattr(self, "_hello_opacity"):
            fade_out = QPropertyAnimation(self._hello_opacity, b"opacity")
            fade_out.setDuration(150)
            fade_out.setStartValue(1.0)
            fade_out.setEndValue(0.0)
            fade_out.setEasingCurve(QEasingCurve.Type.InCubic)
            if self._mode == "splash":
                fade_out.finished.connect(lambda: self.start_launch_sequence(self._target_window))
            else:
                fade_out.finished.connect(self._reveal_showcase_stage)
            fade_out.start()
            self._hello_fade_out = fade_out
        else:
            if self._mode == "splash":
                self.start_launch_sequence(self._target_window)
            else:
                self._reveal_showcase_stage()

    def _reveal_showcase_stage(self) -> None:
        self._go_stage(1)
        if hasattr(self, "_showcase_opacity"):
            anim = QPropertyAnimation(self._showcase_opacity, b"opacity")
            anim.setDuration(240)
            anim.setStartValue(0.0)
            anim.setEndValue(1.0)
            anim.setEasingCurve(QEasingCurve.Type.OutCubic)
            anim.start()
            self._showcase_anim = anim

    # ------------------------------------------------- Stage 1: Feature Showcase
    def _build_showcase_stage(self) -> None:
        stage = QWidget()
        stage_layout = QVBoxLayout(stage)
        stage_layout.setAlignment(Qt.AlignmentFlag.AlignCenter)
        stage_layout.setContentsMargins(0, 0, 0, 0)

        content = QWidget()
        content.setMaximumWidth(880)
        c_layout = QVBoxLayout(content)
        c_layout.setAlignment(Qt.AlignmentFlag.AlignCenter)
        c_layout.setContentsMargins(24, 20, 24, 20)
        c_layout.setSpacing(14)

        logo_lbl = QLabel()
        logo_lbl.setAlignment(Qt.AlignmentFlag.AlignCenter)
        logo_lbl.setPixmap(load_logo_pixmap(64))
        c_layout.addWidget(logo_lbl)
        c_layout.addSpacing(2)

        self._showcase_title = QLabel(self._app_name)
        self._showcase_title.setAlignment(Qt.AlignmentFlag.AlignCenter)
        c_layout.addWidget(self._showcase_title)

        sub_text = (
            "Yüksek Performanslı Yerel Ağ Keşfi & Canlı Topoloji İstasyonu"
            if self.lang == "tr"
            else "High-Performance Network Intelligence & Live Topology Station"
        )
        self._showcase_sub = QLabel(sub_text)
        self._showcase_sub.setAlignment(Qt.AlignmentFlag.AlignCenter)
        c_layout.addWidget(self._showcase_sub)
        c_layout.addSpacing(10)

        grid = QGridLayout()
        grid.setSpacing(12)

        features = [
            ("⚡", "Milisaniye Hassasiyetinde Keşif", "ICMP, TCP, ARP ve mDNS protokolleriyle sıfır gecikmeli aktif cihaz tespiti."),
            ("🗺️", "Canlı Ağ Haritası & Topoloji", "Cihazlar ve anahtarlar arasındaki gerçek bağlantı rotalarını gösteren interaktif harita."),
            ("🔒", "%100 Yerel Bellek & Gizlilik", "Sıfır bulut bağımlılığı. Verileriniz tamamen bilgisayarınızda kalır, dışarı aktarılmaz."),
            ("📊", "Kurumsal Rapor Çıktıları", "PDF, HTML, CSV ve JSON formatlarında tek tıkla ağ denetim dökümü alın."),
        ] if self.lang == "tr" else [
            ("⚡", "Sub-Millisecond Discovery", "Zero-latency active device detection via ICMP, TCP, ARP, and mDNS protocols."),
            ("🗺️", "Live Topology Mapping", "Interactive graph visualization of physical device routes and switches."),
            ("🔒", "100% Local Privacy", "Zero cloud dependency. All telemetry data stays strictly inside local memory."),
            ("📊", "Audit-Ready Reports", "One-click audit documentation in PDF, HTML, CSV, and JSON formats."),
        ]

        self._showcase_tiles: list[tuple[QFrame, QLabel, QLabel]] = []
        for i, (icon_text, feat_title, feat_desc) in enumerate(features):
            tile = QFrame()
            t_box = QVBoxLayout(tile)
            t_box.setContentsMargins(14, 11, 14, 11)
            t_box.setSpacing(4)

            h_box = QHBoxLayout()
            ico = QLabel(icon_text)
            ico.setStyleSheet("font-size: 16px; background: transparent;")
            h_box.addWidget(ico)
            t_lbl = QLabel(feat_title)
            h_box.addWidget(t_lbl)
            h_box.addStretch()
            t_box.addLayout(h_box)

            d_lbl = QLabel(feat_desc)
            d_lbl.setWordWrap(True)
            t_box.addWidget(d_lbl)

            self._showcase_tiles.append((tile, t_lbl, d_lbl))
            grid.addWidget(tile, i // 2, i % 2)

        c_layout.addLayout(grid)
        c_layout.addSpacing(10)

        agree_lbl = (
            "Kullanıcı Sözleşmesi ve Yerel Gizlilik Politikası'nı okudum, kabul ediyorum."
            if self.lang == "tr"
            else "I have read and agree to the Terms of Service and Local Privacy Policy."
        )
        self._agreement_checkbox = QCheckBox(agree_lbl)
        self._agreement_checkbox.setChecked(True)
        self._agreement_checkbox.stateChanged.connect(self._on_agreement_toggled)
        c_layout.addWidget(self._agreement_checkbox, alignment=Qt.AlignmentFlag.AlignCenter)
        c_layout.addSpacing(6)

        btn_box = QHBoxLayout()
        btn_box.setAlignment(Qt.AlignmentFlag.AlignCenter)

        launch_lbl = "Uygulamayı Başlat  →" if self.lang == "tr" else "Start Application  →"
        self._accept_btn = QPushButton(launch_lbl)
        self._accept_btn.setCursor(Qt.CursorShape.PointingHandCursor)
        self._accept_btn.clicked.connect(self._on_accept_and_launch)
        btn_box.addWidget(self._accept_btn)
        c_layout.addLayout(btn_box)

        c_layout.addSpacing(4)
        esc_hint = QLabel("Atlamak için ESC" if self.lang == "tr" else "Press ESC to skip")
        esc_hint.setAlignment(Qt.AlignmentFlag.AlignCenter)
        esc_hint.setStyleSheet("font-size: 10px; color: #676F82; background: transparent;")
        c_layout.addWidget(esc_hint)

        opacity = QGraphicsOpacityEffect(stage)
        stage.setGraphicsEffect(opacity)
        self._showcase_opacity = opacity

        stage_layout.addWidget(content)
        self._stack.addWidget(stage)

    # ---------------------------------------------------- Stage 2: EULA Fallback
    def _build_agreement_stage(self) -> None:
        stage = QWidget()
        stage_layout = QVBoxLayout(stage)
        stage_layout.setAlignment(Qt.AlignmentFlag.AlignCenter)

        card = Win11GlassCard()
        card.setFixedSize(840, 560)
        card_layout = QVBoxLayout(card)
        card_layout.setContentsMargins(36, 32, 36, 32)
        card_layout.setSpacing(14)

        top_row = QHBoxLayout()
        brand_icon = QLabel()
        brand_icon.setPixmap(load_logo_pixmap(32))
        top_row.addWidget(brand_icon)

        brand_lbl = QLabel(self._app_name)
        brand_lbl.setObjectName("TitleText")
        top_row.addWidget(brand_lbl)
        top_row.addStretch()

        card_layout.addLayout(top_row)

        title = QLabel("Kullanıcı Sözleşmesi ve Gizlilik Politikası")
        title.setObjectName("TitleText")
        card_layout.addWidget(title)

        terms_view = QTextEdit()
        terms_view.setReadOnly(True)
        terms_view.setPlainText(
            "KULLANICI SÖZLEŞMESİ (EULA)\n\n"
            + get_terms_body(self.lang)
            + "\n\n"
            + "—" * 40
            + "\n\nGİZLİLİK POLİTİKASI (PRIVACY POLICY)\n\n"
            + get_privacy_body(self.lang)
        )
        card_layout.addWidget(terms_view, stretch=1)

        bottom = QHBoxLayout()
        back_btn = QPushButton("←  Geri")
        back_btn.clicked.connect(lambda: self._go_stage(1))
        bottom.addWidget(back_btn)
        bottom.addStretch()

        stage_launch = QPushButton("Kabul Et ve Başlat  →")
        stage_launch.setObjectName("PrimaryAction")
        stage_launch.clicked.connect(self._on_accept_and_launch)
        bottom.addWidget(stage_launch)
        card_layout.addLayout(bottom)

        stage_layout.addWidget(card)
        self._stack.addWidget(stage)

    def _on_agreement_toggled(self, state: int) -> None:
        is_checked = state == Qt.CheckState.Checked.value or state == 2
        self._accept_btn.setEnabled(is_checked)

    def _on_accept_and_launch(self) -> None:
        from PyQt6.QtCore import QSettings
        accept_terms()
        accept_privacy()
        save_language(self.lang)
        QSettings("ipscans", "NetworkScanner").setValue("oobe_v5_completed", True)
        self.start_launch_sequence(self._target_window)

    def start_launch_sequence(
        self,
        target_window: QWidget | None = None,
        on_finish: Callable[[], None] | None = None,
    ) -> None:
        """Runs a snappy launch sequence without blocking startup."""
        if target_window is not None:
            self._target_window = target_window
        if on_finish is not None:
            self._on_finish_callback = on_finish

        self._go_stage(3)
        self.set_progress(
            0.35,
            "Sistem ve donanım bileşenleri doğrulanıyor..." if self.lang == "tr" else "Verifying system and hardware components...",
        )
        QTimer.singleShot(80, lambda: self.set_progress(
            0.75,
            "Ağ bağdaştırıcıları ve aktif alt ağlar taranıyor..." if self.lang == "tr" else "Scanning network adapters and active subnets...",
        ))
        QTimer.singleShot(160, lambda: self.set_progress(
            1.00,
            "Çalışma alanı hazır" if self.lang == "tr" else "Workspace ready",
        ))

        if self._target_window is not None:
            QTimer.singleShot(200, lambda: self.finish_and_show(self._target_window, getattr(self, "_on_finish_callback", None)))
        elif hasattr(self, "_on_finish_callback") and self._on_finish_callback is not None:
            QTimer.singleShot(200, self._on_finish_callback)

    # ---------------------------------------------------- Stage 3: Loading / Ready
    def _build_loading_stage(self) -> None:
        stage = QWidget()
        layout = QVBoxLayout(stage)
        layout.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.setSpacing(14)

        logo_lbl = QLabel()
        logo_lbl.setAlignment(Qt.AlignmentFlag.AlignCenter)
        logo_lbl.setPixmap(load_logo_pixmap(72))
        layout.addWidget(logo_lbl)
        layout.addSpacing(10)

        self._loading_title_lbl = QLabel(self._app_name)
        self._loading_title_lbl.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(self._loading_title_lbl)

        self._loading_edition_lbl = QLabel(self._edition_label.upper())
        self._loading_edition_lbl.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(self._loading_edition_lbl)
        layout.addSpacing(18)

        self._loading_bar = Win11LoadingBar()
        bar_box = QHBoxLayout()
        bar_box.setAlignment(Qt.AlignmentFlag.AlignCenter)
        bar_box.addWidget(self._loading_bar)
        layout.addLayout(bar_box)

        self._status_lbl = QLabel(self._status_text)
        self._status_lbl.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(self._status_lbl)

        layout.addSpacing(20)
        esc_hint = QLabel("Atlamak için ESC")
        esc_hint.setAlignment(Qt.AlignmentFlag.AlignCenter)
        esc_hint.setStyleSheet("font-size: 10px; color: #676F82;")
        layout.addWidget(esc_hint)

        self._stack.addWidget(stage)

    # ------------------------------------------------------------- Navigation
    def _go_stage(self, index: int) -> None:
        self._step_index = index
        self._stack.setCurrentIndex(index)

    def set_progress(self, progress: float, status: str = "") -> None:
        """Sets progress (0.0 - 1.0) and status on the loading bar."""
        if hasattr(self, "_loading_bar"):
            self._loading_bar.set_progress(progress)
        if status and hasattr(self, "_status_lbl"):
            self._status_text = status
            self._status_lbl.setText(status)
        self.update()

    def finish_and_show(self, target_window: QWidget, on_finish: Callable[[], None] | None = None) -> None:
        """Smoothly cross-fades out and reveals the target window."""
        self._on_finish_callback = on_finish
        self.set_progress(1.0, "Çalışma alanı hazır")

        fade_anim = QPropertyAnimation(self, b"windowOpacity")
        fade_anim.setDuration(180)
        fade_anim.setStartValue(1.0)
        fade_anim.setEndValue(0.0)
        fade_anim.setEasingCurve(QEasingCurve.Type.OutCubic)

        def _cleanup():
            self._canvas._timer.stop()
            self.close()
            target_window.show()
            target_window.raise_()
            target_window.activateWindow()
            if on_finish:
                on_finish()

        fade_anim.finished.connect(_cleanup)
        fade_anim.start()
        self._fade_anim = fade_anim



# Backward-compatible aliases for existing imports and selftests
IPScansSplash = Win11OOBEWindow
