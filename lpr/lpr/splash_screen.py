"""IPScans v2 Design System OOBE & Fast Splash Experience for LPR Pro.
Aligned with the IPScans v2 Design System (Light & Dark Mode):
- Theme-aware Spatial Particles field background
- Stage 0: Minimalist, fast "Merhaba" / "Hello" fade-in
- Stage 1: LPR Pro AI Feature Showcase with IPScans v2 cards
- Stage 2: EULA & Local Privacy Policy acceptance
- Stage 3: Fast, zero-bloat hairline loading bar transition to workspace
"""
from __future__ import annotations

import math
from pathlib import Path
import time
from typing import Callable

from PySide6.QtCore import (
    QEasingCurve,
    QPointF,
    QPropertyAnimation,
    QRectF,
    Qt,
    QTimer,
    Signal,
)
from PySide6.QtGui import (
    QBrush,
    QColor,
    QLinearGradient,
    QPainter,
    QPainterPath,
    QPixmap,
    QRadialGradient,
)
from PySide6.QtWidgets import (
    QApplication,
    QCheckBox,
    QFrame,
    QGraphicsOpacityEffect,
    QGridLayout,
    QHBoxLayout,
    QLabel,
    QPushButton,
    QStackedLayout,
    QTextEdit,
    QVBoxLayout,
    QWidget,
)

from .theme import apply_theme, create_theme_toggle_button, get_theme, get_tokens


def _smoothstep(e0: float, e1: float, x: float) -> float:
    if e1 == e0:
        return 0.0
    t_val = max(0.0, min(1.0, (x - e0) / (e1 - e0)))
    return t_val * t_val * (3.0 - 2.0 * t_val)


def _load_lpr_logo(size: int = 72) -> QPixmap:
    base = Path(__file__).resolve().parent.parent / "assets" / "logos" / "lpr-pro.png"
    if not base.exists():
        base = Path(__file__).resolve().parent.parent / "assets" / "icons" / "lpr-pro.png"
    if base.exists():
        pixmap = QPixmap(str(base))
        return pixmap.scaled(
            size,
            size,
            Qt.AspectRatioMode.KeepAspectRatio,
            Qt.TransformationMode.SmoothTransformation,
        )
    return QPixmap()


class SpatialParticlesCanvas(QWidget):
    """60 FPS fluid spatial particles canvas matching IPScans v2 Light & Dark themes."""

    def __init__(self, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self.setAttribute(Qt.WidgetAttribute.WA_TransparentForMouseEvents, True)
        self.cols = 28
        self.rows = 16
        self.particles: list[list[float]] = []

        for r in range(self.rows):
            for c in range(self.cols):
                jx = ((math.sin(r * 127.1 + c * 311.7) * 43758.5453) % 1.0)
                jy = ((math.sin(r * 269.5 + c * 183.3) * 43758.5453) % 1.0)
                uv_x = (((c + 0.5 + (jx - 0.5) * 0.72) / self.cols) * 2.0 - 1.0) * 1.02
                uv_y = (((r + 0.5 + (jy - 0.5) * 0.72) / self.rows) * 2.0 - 1.0) * 1.02
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
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing, True)
        tokens = get_tokens()
        is_light = get_theme() == "light"
        painter.fillRect(self.rect(), QColor(tokens["bg"]))

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

            c_dist = math.sqrt(uv_x * uv_x * 0.85 + uv_y * uv_y * 1.25)
            c_mask = _smoothstep(0.16, 0.46, c_dist)

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

            color_wave = (math.sin(uv_x * 2.0 + uv_y * 1.8 + self._time * 0.42 + s1 * 2.4) + 1.0) * 0.5
            if color_wave < 0.56:
                k = color_wave / 0.56
                r_col = int(47 + k * (76 - 47))
                g_col = int(107 + k * (130 - 107))
                b_col = int(255)
            else:
                k = (color_wave - 0.56) / 0.44
                r_col = int(76 + k * (123 - 76))
                g_col = int(130 + k * (97 - 130))
                b_col = int(255)

            alpha_base = 130 if is_light else 175
            alpha = int(max(10, min(140, cur_scale * alpha_base * (0.28 + 0.72 * c_mask))))
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


class Win11LoadingBar(QWidget):
    """Precision hairline progress bar with IPScans Signal Blue sweep."""

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
        self._phase += 0.06
        diff = self._target_progress - self._progress
        if abs(diff) > 0.001:
            self._progress += diff * 0.32
        else:
            self._progress = self._target_progress
        self.update()

    def paintEvent(self, _event) -> None:  # noqa: N802
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing, True)
        is_light = get_theme() == "light"
        tokens = get_tokens()

        w = float(self.width())
        track_h = 3.5
        y = (float(self.height()) - track_h) * 0.5

        painter.setPen(Qt.PenStyle.NoPen)
        track_color = QColor(11, 13, 18, 22) if is_light else QColor(255, 255, 255, 24)
        painter.setBrush(QBrush(track_color))
        painter.drawRoundedRect(QRectF(0, y, w, track_h), 1.75, 1.75)

        fill_w = max(4.0, w * self._progress)
        sweep_offset = math.sin(self._phase * 1.5) * 0.5 + 0.5

        grad = QLinearGradient(0, y, fill_w, y)
        signal_color = QColor(tokens["signal"])
        grad.setColorAt(0.0, signal_color)
        mid = max(0.1, min(0.9, sweep_offset))
        grad.setColorAt(mid, QColor("#1D56E5") if is_light else QColor("#FFFFFF"))
        grad.setColorAt(1.0, signal_color)

        painter.setBrush(QBrush(grad))
        painter.drawRoundedRect(QRectF(0, y, fill_w, track_h), 1.75, 1.75)

        tip_x = fill_w
        tip_halo = QRadialGradient(tip_x, y + 1.75, 12.0)
        tip_halo.setColorAt(0.0, QColor(47, 107, 255, 90))
        tip_halo.setColorAt(1.0, QColor(47, 107, 255, 0))
        painter.setBrush(QBrush(tip_halo))
        painter.drawEllipse(QPointF(tip_x, y + 1.75), 12.0, 12.0)

        painter.end()


class Win11GlassCard(QFrame):
    """Elevated surface container aligned with IPScans v2 tokens."""

    def __init__(self, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self.setObjectName("Win11GlassCard")

    def paintEvent(self, event) -> None:  # noqa: N802
        super().paintEvent(event)
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing, True)
        rect = QRectF(0.5, 0.5, float(self.width()) - 1.0, float(self.height()) - 1.0)
        path = QPainterPath()
        path.addRoundedRect(rect, 22.0, 22.0)

        top_glow = QRadialGradient(float(self.width()) * 0.5, 0.0, 320.0)
        top_glow.setColorAt(0.0, QColor(47, 107, 255, 16))
        top_glow.setColorAt(1.0, QColor(0, 0, 0, 0))
        painter.fillPath(path, QBrush(top_glow))
        painter.end()


class LPRProSplash(QWidget):
    """Fast, theme-aware IPScans v2 OOBE & Splash Screen for LPR Pro."""

    step_completed = Signal(int, str)

    def __init__(
        self,
        app_name: str = "IPScans LPR Pro",
        edition_label: str = "AI LICENSE PLATE RECOGNITION & TELEMETRY",
        mode: str = "splash",  # "oobe" | "splash"
        target_window: QWidget | None = None,
        on_finish: Callable[[], None] | None = None,
        parent: QWidget | None = None,
        lang: str = "tr",
    ) -> None:
        super().__init__(parent)
        self.lang = lang
        self._app_name = app_name
        self._edition_label = edition_label
        self._mode = mode
        self._target_window = target_window
        self._on_finish_callback = on_finish
        self._status_text = "İstasyon bileşenleri başlatılıyor..."
        self._logo_pixmap = _load_lpr_logo(72)

        self.setWindowFlags(
            Qt.WindowType.FramelessWindowHint
            | Qt.WindowType.WindowStaysOnTopHint
            | Qt.WindowType.SplashScreen
        )
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground, False)
        apply_theme(self)

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

        self._stack.setCurrentIndex(0)
        if self._mode == "splash":
            QTimer.singleShot(80, self._auto_advance_hello)
        else:
            QTimer.singleShot(350, self._auto_advance_hello)

    def set_target_window(self, target_window: QWidget) -> None:
        self._target_window = target_window

    def set_on_finish(self, on_finish: Callable[[], None]) -> None:
        self._on_finish_callback = on_finish

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
                self.close()
                self._on_finish_callback()
            elif hasattr(self, "_target_window") and self._target_window:
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
        self._hello_title.setObjectName("title")
        self._hello_title.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(self._hello_title)

        opacity = QGraphicsOpacityEffect(stage)
        stage.setGraphicsEffect(opacity)
        self._hello_opacity = opacity

        anim = QPropertyAnimation(opacity, b"opacity")
        anim.setDuration(150)
        anim.setStartValue(0.0)
        anim.setEndValue(1.0)
        anim.setEasingCurve(QEasingCurve.Type.OutCubic)
        anim.start()
        self._hello_anim = anim

        self._stack.addWidget(stage)

    def _auto_advance_hello(self) -> None:
        if self._stack.currentIndex() != 0:
            return
        if self._mode == "splash":
            self.start_launch_sequence(
                getattr(self, "_target_window", None),
                getattr(self, "_on_finish_callback", None),
            )
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

        top_bar = QHBoxLayout()
        top_bar.addStretch()
        self.theme_toggle_btn = create_theme_toggle_button(stage)
        top_bar.addWidget(self.theme_toggle_btn)
        c_layout.addLayout(top_bar)

        logo_lbl = QLabel()
        logo_lbl.setAlignment(Qt.AlignmentFlag.AlignCenter)
        logo_lbl.setPixmap(_load_lpr_logo(64))
        c_layout.addWidget(logo_lbl)
        c_layout.addSpacing(2)

        title = QLabel(self._app_name)
        title.setObjectName("title")
        title.setAlignment(Qt.AlignmentFlag.AlignCenter)
        c_layout.addWidget(title)

        sub = QLabel("Yapay Zekâ Destekli Gerçek Zamanlı Plaka Tanıma & Telemetri İstasyonu")
        sub.setObjectName("muted")
        sub.setAlignment(Qt.AlignmentFlag.AlignCenter)
        c_layout.addWidget(sub)
        c_layout.addSpacing(10)

        grid = QGridLayout()
        grid.setSpacing(12)

        features = [
            ("🚘", "Yüksek Doğrulukta OCR & PTS", "ONNX sinir ağları ile yüksek hızda araç plakası algılama ve karakter okuma."),
            ("📹", "Canlı Kamera Duvarı & RTSP", "Çoklu kamera akışını düşük gecikmeyle çözme ve tetik çizgisi kalibrasyonu."),
            ("🛡️", "Bariyer & Röle Otomasyonu", "Kayıtlı sakin ve izinli araçlarda otomatik kapı açma tetikleyicisi."),
            ("📋", "Şifreli Yerel Veritabanı", "Tüm geçiş logları ve delil fotoğrafları yerel diskte güvenle saklanır."),
        ]

        for i, (icon_text, feat_title, feat_desc) in enumerate(features):
            tile = QFrame()
            tile.setObjectName("card")
            t_box = QVBoxLayout(tile)
            t_box.setContentsMargins(14, 11, 14, 11)
            t_box.setSpacing(4)

            h_box = QHBoxLayout()
            ico = QLabel(icon_text)
            h_box.addWidget(ico)
            t_lbl = QLabel(feat_title)
            t_lbl.setObjectName("pageTitle")
            h_box.addWidget(t_lbl)
            h_box.addStretch()
            t_box.addLayout(h_box)

            d_lbl = QLabel(feat_desc)
            d_lbl.setObjectName("muted")
            d_lbl.setWordWrap(True)
            t_box.addWidget(d_lbl)

            grid.addWidget(tile, i // 2, i % 2)

        c_layout.addLayout(grid)
        c_layout.addSpacing(10)

        self._showcase_agreement_checkbox = QCheckBox(
            "Kullanıcı Sözleşmesi ve Yerel Gizlilik Politikası'nı okudum, kabul ediyorum."
        )
        self._showcase_agreement_checkbox.setChecked(True)
        self._showcase_agreement_checkbox.stateChanged.connect(self._on_agreement_toggled)
        c_layout.addWidget(self._showcase_agreement_checkbox, alignment=Qt.AlignmentFlag.AlignCenter)
        c_layout.addSpacing(6)

        btn_box = QHBoxLayout()
        btn_box.setAlignment(Qt.AlignmentFlag.AlignCenter)

        self._showcase_accept_btn = QPushButton("Uygulamayı Başlat  →")
        self._showcase_accept_btn.setObjectName("primaryBtn")
        self._showcase_accept_btn.setCursor(Qt.CursorShape.PointingHandCursor)
        self._showcase_accept_btn.clicked.connect(self._on_accept_and_launch)
        btn_box.addWidget(self._showcase_accept_btn)
        c_layout.addLayout(btn_box)

        c_layout.addSpacing(4)
        esc_hint = QLabel("Atlamak için ESC")
        esc_hint.setObjectName("muted")
        esc_hint.setAlignment(Qt.AlignmentFlag.AlignCenter)
        c_layout.addWidget(esc_hint)

        opacity = QGraphicsOpacityEffect(stage)
        stage.setGraphicsEffect(opacity)
        self._showcase_opacity = opacity

        stage_layout.addWidget(content)
        self._stack.addWidget(stage)

    # ---------------------------------------------------- Stage 2: EULA Agreement
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
        brand_icon.setPixmap(_load_lpr_logo(32))
        top_row.addWidget(brand_icon)

        brand_lbl = QLabel(self._app_name)
        brand_lbl.setObjectName("brand")
        top_row.addWidget(brand_lbl)
        top_row.addStretch()

        pills = QLabel("✓  01 Tanıtım      ●  02 Sözleşme      ○  03 Başlat")
        pills.setObjectName("section")
        top_row.addWidget(pills)
        card_layout.addLayout(top_row)

        title = QLabel("Kullanıcı Sözleşmesi ve Gizlilik Politikası")
        title.setObjectName("pageTitle")
        card_layout.addWidget(title)

        sub = QLabel("IPScans LPR Pro yazılımını kullanmadan önce istasyon veri koşullarını onaylayın.")
        sub.setObjectName("muted")
        card_layout.addWidget(sub)

        terms_view = QTextEdit()
        terms_view.setReadOnly(True)
        combined_text = (
            "IPSCANS LPR PRO KULLICI SÖZLEŞMESİ (EULA)\n\n"
            "1. Yalnızca yetkili olduğunuz özel mülk, otopark veya işletme alanlarında plaka tanıma yapınız.\n"
            "2. Kamera görüntüsü ve araç kayıtları tamamen yerel veritabanında (SQLite) şifreli tutulur.\n"
            "3. Sistem üçüncü taraf bulut sunucularına canlı video veya kişisel veri aktarmaz.\n"
            "4. Plaka logları ve saklama süreleri yerel operatör politikasına göre belirlenir.\n\n"
            + "—" * 40
            + "\n\nYEREL GİZLİLİK POLİTİKASI (LOCAL PRIVACY POLICY)\n\n"
            "Tüm optik karakter tanıma (OCR) modelleri bilgisayarınızın donanımında yerel olarak çalıştırılır. "
            "IPScans sunucularına herhangi bir plaka metni veya görseli iletilmez."
        )
        terms_view.setPlainText(combined_text)
        card_layout.addWidget(terms_view, stretch=1)

        self._agreement_checkbox = QCheckBox("Kullanıcı Sözleşmesi ve Gizlilik Politikası'nı okudum, kabul ediyorum.")
        self._agreement_checkbox.stateChanged.connect(self._on_agreement_toggled)
        card_layout.addWidget(self._agreement_checkbox)

        bottom = QHBoxLayout()
        back_btn = QPushButton("←  Geri")
        back_btn.setObjectName("secondaryBtn")
        back_btn.setCursor(Qt.CursorShape.PointingHandCursor)
        back_btn.clicked.connect(lambda: self._go_stage(1))
        bottom.addWidget(back_btn)
        bottom.addStretch()

        self._accept_btn = QPushButton("Kabul Et ve Başlat  →")
        self._accept_btn.setObjectName("primaryBtn")
        self._accept_btn.setCursor(Qt.CursorShape.PointingHandCursor)
        self._accept_btn.setEnabled(False)
        self._accept_btn.clicked.connect(self._on_accept_and_launch)
        bottom.addWidget(self._accept_btn)
        card_layout.addLayout(bottom)

        stage_layout.addWidget(card)
        self._stack.addWidget(stage)

    def _on_agreement_toggled(self, state: int) -> None:
        is_checked = state == Qt.CheckState.Checked.value or state == 2
        if hasattr(self, "_accept_btn"):
            self._accept_btn.setEnabled(is_checked)
        if hasattr(self, "_showcase_accept_btn"):
            self._showcase_accept_btn.setEnabled(is_checked)

    def _on_accept_and_launch(self) -> None:
        self.start_launch_sequence(
            getattr(self, "_target_window", None),
            getattr(self, "_on_finish_callback", None),
        )

    def start_launch_sequence(
        self,
        target_window: QWidget | None = None,
        on_finish: Callable[[], None] | None = None,
    ) -> None:
        """Runs a fast, responsive launch sequence with zero artificial delay."""
        if target_window is not None:
            self._target_window = target_window
        if on_finish is not None:
            self._on_finish_callback = on_finish

        self._go_stage(3)
        self.set_progress(0.25, "İstasyon grafik ve tema motoru başlatılıyor...")
        QTimer.singleShot(40, lambda: self.set_progress(0.65, "RTSP ve ONNX plaka tanıma bileşenleri hazırlanıyor..."))
        QTimer.singleShot(90, lambda: self.set_progress(1.00, "İstasyon hazır"))

        if getattr(self, "_target_window", None) is not None:
            QTimer.singleShot(
                140,
                lambda: self.finish_and_show(
                    self._target_window,
                    getattr(self, "_on_finish_callback", None),
                ),
            )
        elif getattr(self, "_on_finish_callback", None) is not None:
            QTimer.singleShot(140, self._on_finish_callback)

    # ---------------------------------------------------- Stage 3: Loading
    def _build_loading_stage(self) -> None:
        stage = QWidget()
        layout = QVBoxLayout(stage)
        layout.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.setSpacing(14)

        logo_lbl = QLabel()
        logo_lbl.setAlignment(Qt.AlignmentFlag.AlignCenter)
        logo_lbl.setPixmap(self._logo_pixmap)
        layout.addWidget(logo_lbl)
        layout.addSpacing(10)

        title_lbl = QLabel(self._app_name)
        title_lbl.setObjectName("title")
        title_lbl.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(title_lbl)

        edition_lbl = QLabel(self._edition_label.upper())
        edition_lbl.setObjectName("section")
        edition_lbl.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(edition_lbl)
        layout.addSpacing(18)

        self._loading_bar = Win11LoadingBar()
        bar_box = QHBoxLayout()
        bar_box.setAlignment(Qt.AlignmentFlag.AlignCenter)
        bar_box.addWidget(self._loading_bar)
        layout.addLayout(bar_box)

        self._status_lbl = QLabel(self._status_text)
        self._status_lbl.setObjectName("muted")
        self._status_lbl.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(self._status_lbl)

        layout.addSpacing(20)
        esc_hint = QLabel("Atlamak için ESC")
        esc_hint.setObjectName("muted")
        esc_hint.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(esc_hint)

        self._stack.addWidget(stage)

    # ------------------------------------------------------------- Navigation
    def _go_stage(self, index: int) -> None:
        self._stack.setCurrentIndex(index)

    def set_progress(self, progress: float, status: str = "") -> None:
        if hasattr(self, "_loading_bar"):
            self._loading_bar.set_progress(progress)
        if status and hasattr(self, "_status_lbl"):
            self._status_text = status
            self._status_lbl.setText(status)
        self.update()

    def finish_and_show(self, target_window: QWidget, on_finish: Callable[[], None] | None = None) -> None:
        self._on_finish_callback = on_finish
        self.set_progress(1.0, "İstasyon hazır")

        self._canvas._timer.stop()
        self.close()
        target_window.show()
        target_window.raise_()
        target_window.activateWindow()
        if on_finish:
            on_finish()


SplashScreen = LPRProSplash
