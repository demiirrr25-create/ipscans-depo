"""Google Antigravity Pure Black (#000000) Design System for IPscans+ Desktop.
Applied globally (including QMessageBox/QToolTip popups) so every surface,
welcome dialog, pill button, and table shares the exact ipscans.com theme.
"""
from __future__ import annotations

import math

from PyQt6.QtCore import QRectF, Qt, QTimer
from PyQt6.QtGui import QBrush, QColor, QFont, QLinearGradient, QPainter, QPainterPath, QPen
from PyQt6.QtWidgets import QWidget

DARK_QSS = """
* {
    font-family: "Segoe UI", "Inter", Arial, sans-serif;
    color: #e8eaed;
    outline: none;
}

#AppRoot, QStackedWidget {
    background-color: #000000;
}

QPushButton:focus, QListWidget:focus, QTableView:focus, QCheckBox:focus {
    border: 1px solid rgba(255, 255, 255, 0.55);
}

QListWidget {
    background: #0d0e12;
    border: 1px solid rgba(255, 255, 255, 0.10);
    border-radius: 16px;
    padding: 6px;
}
QListWidget::item {
    padding: 12px 10px;
    border-radius: 10px;
}
QListWidget::item:selected {
    background: #ffffff;
    color: #000000;
}

QGraphicsView {
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 20px;
    background: #06070a;
}

#RootCard, #SplashCard, QFrame#ScanCard, QFrame#WelcomeHeroCard {
    background-color: #0d0e12;
    border: 1px solid rgba(255, 255, 255, 0.10);
    border-radius: 20px;
}

#TitleBar {
    background: transparent;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

QLabel {
    font-size: 12px;
    color: #9aa0a6;
    background: transparent;
}

QLabel#TitleText {
    font-size: 26px;
    font-weight: 600;
    letter-spacing: -0.4px;
    color: #ffffff;
}

QLabel#SubtitleText {
    font-size: 12px;
    color: #9aa0a6;
}

QLabel#VersionBadge {
    color: #e8eaed;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 13px;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.10em;
    padding: 6px 12px;
}

#OptionsCard {
    background: #0d0e12;
    border: 1px solid rgba(255, 255, 255, 0.10);
    border-radius: 18px;
}

#SegmentBar {
    background: #090a0d;
    border: 1px solid rgba(255, 255, 255, 0.10);
    border-radius: 18px;
}
QPushButton#SegmentButton {
    background: transparent;
    color: #9aa0a6;
    border: none;
    border-radius: 14px;
    padding: 8px 16px;
    font-size: 12px;
    font-weight: 600;
}
QPushButton#SegmentButton:hover {
    background: rgba(255, 255, 255, 0.06);
    color: #ffffff;
}
QPushButton#SegmentButton:checked {
    background: #ffffff;
    color: #000000;
}

/* Onboarding wizard's language-picker step */
QPushButton#LanguageOption {
    background: #0d0e12;
    color: #e8eaed;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 18px;
    font-size: 13px;
    font-weight: 500;
    padding: 10px 16px;
}
QPushButton#LanguageOption:hover {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.24);
    color: #ffffff;
}
QPushButton#LanguageOption:checked {
    background: #ffffff;
    color: #000000;
    border: 1px solid #ffffff;
    font-weight: 600;
}

QPushButton#WindowButton {
    background: transparent;
    border: none;
    border-radius: 14px;
    color: #9aa0a6;
    padding: 4px 10px;
}
QPushButton#WindowButton:hover {
    background: rgba(255, 255, 255, 0.08);
    color: #ffffff;
}

QRadioButton {
    font-size: 13px;
    spacing: 6px;
    padding: 2px 0;
}
QRadioButton::indicator {
    width: 16px;
    height: 16px;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.35);
    background: #090a0d;
}
QRadioButton::indicator:checked {
    border: 1px solid #ffffff;
    background: qradialgradient(cx:0.5, cy:0.5, radius:0.5,
        stop:0 #ffffff, stop:0.5 #ffffff, stop:0.6 transparent, stop:1 transparent);
}

QCheckBox {
    font-size: 13px;
    spacing: 8px;
    color: #e8eaed;
}
QCheckBox::indicator {
    width: 16px;
    height: 16px;
    border-radius: 5px;
    border: 1px solid rgba(255, 255, 255, 0.35);
    background: #090a0d;
}
QCheckBox::indicator:checked {
    border: 1px solid #ffffff;
    background: #ffffff;
}
QCheckBox::indicator:disabled {
    border: 1px solid rgba(255, 255, 255, 0.15);
}

QLineEdit, QComboBox {
    background: #090a0d;
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 18px;
    padding: 10px 16px;
    font-size: 13px;
    color: #ffffff;
    selection-background-color: #ffffff;
    selection-color: #000000;
}
QLineEdit:focus, QComboBox:focus {
    border: 1px solid rgba(255, 255, 255, 0.50);
}

QComboBox QAbstractItemView {
    background-color: #0d0e12;
    color: #ffffff;
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 12px;
    outline: none;
    selection-background-color: rgba(255, 255, 255, 0.14);
    selection-color: #ffffff;
    padding: 4px;
}
QComboBox QAbstractItemView::item {
    padding: 7px 12px;
    min-height: 22px;
}
QComboBox QAbstractItemView::item:hover {
    background-color: rgba(255, 255, 255, 0.10);
}

QMenu {
    background-color: #0d0e12;
    color: #ffffff;
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 12px;
    padding: 6px;
}
QMenu::item {
    padding: 7px 20px;
    border-radius: 8px;
}
QMenu::item:selected {
    background-color: #ffffff;
    color: #000000;
}
QMenu::separator {
    height: 1px;
    background: rgba(255, 255, 255, 0.10);
    margin: 4px 8px;
}

QPushButton {
    background: rgba(255, 255, 255, 0.06);
    color: #e8eaed;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 18px;
    padding: 10px 18px;
    font-size: 12px;
    font-weight: 500;
}
QPushButton:hover {
    background: rgba(255, 255, 255, 0.11);
    border-color: rgba(255, 255, 255, 0.26);
    color: #ffffff;
}
QPushButton:disabled {
    color: #6f7480;
    background: rgba(255, 255, 255, 0.02);
    border-color: rgba(255, 255, 255, 0.06);
}

QPushButton#PrimaryButton {
    background: #ffffff;
    color: #000000;
    border: 1px solid #ffffff;
    border-radius: 18px;
    padding: 10px 24px;
    font-weight: 600;
    font-size: 13px;
}
QPushButton#PrimaryButton:hover {
    background: #e6eaf0;
    border-color: #e6eaf0;
}
QPushButton#PrimaryButton:pressed {
    background: #cfd5df;
}
QPushButton#PrimaryButton:disabled {
    background: rgba(255, 255, 255, 0.18);
    color: rgba(0, 0, 0, 0.55);
    border-color: transparent;
}

QPushButton#GhostButton {
    background: rgba(255, 255, 255, 0.05);
    color: #e8eaed;
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 18px;
    padding: 10px 18px;
    font-size: 13px;
}
QPushButton#GhostButton:hover {
    background: rgba(255, 255, 255, 0.10);
    border: 1px solid rgba(255, 255, 255, 0.28);
    color: #ffffff;
}

QTabWidget::pane {
    background-color: #0d0e12;
    border: 1px solid rgba(255, 255, 255, 0.10);
    border-radius: 18px;
}
QTabBar::tab {
    background: #0d0e12;
    color: #9aa0a6;
    padding: 10px 22px;
    border: 1px solid rgba(255, 255, 255, 0.10);
    border-radius: 18px;
    margin-left: 6px;
    font-weight: 500;
}
QTabBar::tab:selected {
    color: #000000;
    background: #ffffff;
    border: 1px solid #ffffff;
    font-weight: 600;
}
QTabBar::tab:!selected:hover {
    background: rgba(255, 255, 255, 0.08);
    color: #ffffff;
}

QLabel#ResultsHeading {
    color: #e8eaed;
    font-size: 13px;
    padding: 4px 0 10px;
}

QTableView {
    background: #0d0e12;
    alternate-background-color: #111318;
    border: 1px solid rgba(255, 255, 255, 0.10);
    border-radius: 20px;
    gridline-color: rgba(255, 255, 255, 0.05);
    font-size: 13px;
}
QTableView QAbstractScrollArea, QTreeWidget QAbstractScrollArea {
    background-color: #0d0e12;
}
QTreeWidget {
    background-color: #0d0e12;
    alternate-background-color: #111318;
    color: #ffffff;
    border: 1px solid rgba(255, 255, 255, 0.10);
    border-radius: 18px;
}
QTreeWidget::item {
    padding: 7px;
    min-height: 22px;
}
QTreeWidget::item:selected {
    background-color: rgba(255, 255, 255, 0.14);
    color: #ffffff;
}
QTableView::item {
    padding: 9px 12px;
    border: none;
}
QTableView::item:selected {
    background: rgba(50, 121, 249, 0.22);
    color: #ffffff;
}
QTableView::item:hover {
    background: rgba(255, 255, 255, 0.05);
}
QHeaderView::section {
    background: #090a0d;
    color: #9aa0a6;
    padding: 13px 10px;
    border: none;
    border-bottom: 1px solid rgba(255, 255, 255, 0.10);
    font-size: 11px;
    font-weight: 600;
}

QScrollBar:vertical {
    background: transparent;
    width: 10px;
}
QScrollBar::handle:vertical {
    background: rgba(255, 255, 255, 0.18);
    border-radius: 5px;
    min-height: 24px;
}
QScrollBar::handle:vertical:hover {
    background: rgba(255, 255, 255, 0.30);
}
QScrollBar::add-line, QScrollBar::sub-line {
    height: 0;
}
QScrollBar:horizontal {
    background: #090a0d;
    height: 10px;
}
QScrollBar::handle:horizontal {
    background: rgba(255, 255, 255, 0.22);
    border-radius: 5px;
    min-width: 24px;
}
QScrollBar::add-line:horizontal, QScrollBar::sub-line:horizontal {
    width: 0;
}
QScrollBar::add-page:horizontal, QScrollBar::sub-page:horizontal {
    background: #090a0d;
}

QLabel#StatusLabel {
    color: #9aa0a6;
    font-size: 12px;
    padding-top: 2px;
}

QLabel#SectionLabel {
    color: #9aa0a6;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
}

QProgressBar {
    background: rgba(255, 255, 255, 0.08);
    border: none;
    border-radius: 4px;
    height: 6px;
    text-align: center;
    color: transparent;
}
QProgressBar::chunk {
    border-radius: 4px;
    background: #ffffff;
}

QTextEdit {
    background-color: #090a0d;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 16px;
    padding: 12px;
    font-size: 12px;
    color: #e8eaed;
    selection-background-color: #ffffff;
    selection-color: #000000;
}

QToolTip {
    background: #0d0e12;
    color: #ffffff;
    border: 1px solid rgba(255, 255, 255, 0.18);
    padding: 5px 10px;
    border-radius: 8px;
}

QDialog, QMessageBox {
    background-color: #000000;
}
QMessageBox QLabel {
    color: #ffffff;
    background: transparent;
}
QDialog QPushButton, QMessageBox QPushButton {
    background: #ffffff;
    color: #000000;
    border: none;
    border-radius: 16px;
    padding: 8px 18px;
    min-width: 68px;
    font-weight: 600;
}
QDialog QPushButton:hover, QMessageBox QPushButton:hover {
    background: #e6eaf0;
}

/* Windows 11 Setup & Feature Tour components */
QPushButton#TourButton {
    background: rgba(255, 255, 255, 0.05);
    color: #e8eaed;
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 14px;
    padding: 7px 16px;
    font-size: 12px;
    font-weight: 500;
}
QPushButton#TourButton:hover {
    background: rgba(255, 255, 255, 0.12);
    border-color: rgba(255, 255, 255, 0.3);
    color: #ffffff;
}

QDialog#Win11SetupWindow {
    background-color: #07080c;
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 20px;
}

QFrame#Win11Card {
    background: #0d0f14;
    border: 1px solid rgba(255, 255, 255, 0.10);
    border-radius: 18px;
}

QPushButton#Win11Primary {
    background: #ffffff;
    color: #000000;
    border: none;
    border-radius: 12px;
    padding: 10px 24px;
    font-size: 13px;
    font-weight: 600;
}
QPushButton#Win11Primary:hover {
    background: #e8ebf0;
}
QPushButton#Win11Primary:disabled {
    background: rgba(255, 255, 255, 0.2);
    color: rgba(0, 0, 0, 0.4);
}

QPushButton#Win11Ghost {
    background: transparent;
    color: #9aa0a6;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 12px;
    padding: 10px 20px;
    font-size: 13px;
}
QPushButton#Win11Ghost:hover {
    background: rgba(255, 255, 255, 0.06);
    color: #ffffff;
    border-color: rgba(255, 255, 255, 0.25);
}

QFrame#Win11FeatureCard {
    background: rgba(255, 255, 255, 0.025);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 14px;
    padding: 14px 16px;
}
QFrame#Win11FeatureCard:hover {
    border-color: rgba(255, 255, 255, 0.20);
    background: rgba(255, 255, 255, 0.045);
}
"""


class AntigravityWelcomeStage(QWidget):
    """Animated Antigravity capsule particle stage + typewriter headline for Windows UI."""

    def __init__(
        self,
        eyebrow: str = "",
        headline: str = "",
        subtitle: str = "",
        compact: bool = False,
        parent: QWidget | None = None,
        *,
        kicker_text: str | None = None,
        headline_text: str | None = None,
        subtitle_text: str | None = None,
    ) -> None:
        super().__init__(parent)
        self._eyebrow = kicker_text if kicker_text is not None else eyebrow
        self._full_headline = headline_text if headline_text is not None else headline
        self._subtitle = subtitle_text if subtitle_text is not None else subtitle
        self._compact = compact
        self._phase = 0.0
        self._typed_chars = 0
        self.setFixedHeight(78 if compact else 148)

        self._anim_timer = QTimer(self)
        self._anim_timer.setInterval(45)
        self._anim_timer.timeout.connect(self._tick)
        self._anim_timer.start()

    def set_copy(self, eyebrow: str, headline: str, subtitle: str = "") -> None:
        if headline != self._full_headline:
            self._typed_chars = 0
        self._eyebrow = eyebrow
        self._full_headline = headline
        self._subtitle = subtitle
        self.update()

    def _tick(self) -> None:
        self._phase += 0.055
        if self._typed_chars < len(self._full_headline):
            self._typed_chars += 1
        self.update()

    def paintEvent(self, _event) -> None:  # noqa: N802
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing, True)

        rect = QRectF(0.5, 0.5, max(1.0, self.width() - 1.0), max(1.0, self.height() - 1.0))
        path = QPainterPath()
        path.addRoundedRect(rect, 20.0, 20.0)

        bg = QLinearGradient(0.0, 0.0, float(self.width()), float(self.height()))
        bg.setColorAt(0.0, QColor(11, 13, 19))
        bg.setColorAt(0.55, QColor(7, 8, 12))
        bg.setColorAt(1.0, QColor(13, 16, 24))
        painter.fillPath(path, QBrush(bg))

        # Calibrated drifting capsule particle field (monochrome silver / white)
        cols = 18 if self._compact else 22
        rows = 4 if self._compact else 6
        palette = [
            QColor(255, 255, 255),
            QColor(220, 225, 235),
            QColor(180, 185, 195),
            QColor(140, 145, 155),
        ]
        painter.save()
        painter.setClipPath(path)
        for r in range(rows):
            for c in range(cols):
                nx = (c + 0.5) / cols
                ny = (r + 0.5) / rows
                # Exclude center text area so typography stays crisp
                dx_c = (nx - 0.35) / 0.38
                dy_c = (ny - 0.5) / 0.45
                if dx_c * dx_c + dy_c * dy_c < 0.72:
                    continue
                wave = math.sin(nx * 5.2 + self._phase + ny * 2.1)
                alpha = int(max(10, min(120, 28 + (wave + 1.0) * 32)))
                col = QColor(palette[(r * cols + c) % len(palette)])
                col.setAlpha(alpha)

                px = nx * self.width() + math.cos(self._phase + r * 0.7) * 5.0
                py = ny * self.height() + wave * 4.5
                angle = math.degrees(math.atan2(wave * 0.4, 1.0))

                painter.save()
                painter.translate(px, py)
                painter.rotate(angle)
                painter.setPen(Qt.PenStyle.NoPen)
                painter.setBrush(QBrush(col))
                painter.drawRoundedRect(QRectF(-4.5, -1.3, 9.0, 2.6), 1.3, 1.3)
                painter.restore()
        painter.restore()

        painter.setPen(QPen(QColor(255, 255, 255, 28), 1.0))
        painter.drawPath(path)

        # Eyebrow pill
        left_pad = 22.0
        top_pad = 14.0 if self._compact else 18.0
        mono_font = QFont("Consolas", 8)
        mono_font.setBold(True)
        painter.setFont(mono_font)
        painter.setPen(QColor(154, 160, 166))
        painter.drawText(
            QRectF(left_pad, top_pad, float(self.width()) - 44.0, 16.0),
            int(Qt.AlignmentFlag.AlignLeft | Qt.AlignmentFlag.AlignVCenter),
            self._eyebrow.upper(),
        )

        # Typewriter Headline + Clean Platinum Cursor
        shown = self._full_headline[: max(1, self._typed_chars)]
        title_font = QFont("Segoe UI", 14 if self._compact else 18)
        title_font.setWeight(QFont.Weight.DemiBold)
        painter.setFont(title_font)
        painter.setPen(QColor(255, 255, 255))
        title_y = 34.0 if self._compact else 44.0
        title_rect = QRectF(left_pad, title_y, float(self.width()) - 44.0, 32.0)
        painter.drawText(
            title_rect,
            int(Qt.AlignmentFlag.AlignLeft | Qt.AlignmentFlag.AlignVCenter),
            shown,
        )

        fm = painter.fontMetrics()
        cursor_x = min(float(self.width()) - 28.0, left_pad + fm.horizontalAdvance(shown) + 5.0)
        blink_on = (self._typed_chars < len(self._full_headline)) or (int(self._phase * 2.2) % 2 == 0)
        if blink_on:
            grad = QLinearGradient(cursor_x, title_y + 4.0, cursor_x, title_y + 26.0)
            grad.setColorAt(0.0, QColor(255, 255, 255, 240))
            grad.setColorAt(0.5, QColor(220, 225, 235, 210))
            grad.setColorAt(1.0, QColor(160, 165, 175, 180))
            painter.setPen(Qt.PenStyle.NoPen)
            painter.setBrush(QBrush(grad))
            painter.drawRoundedRect(QRectF(cursor_x, title_y + 5.0, 3.0, 21.0), 1.5, 1.5)

        if not self._compact and self._subtitle:
            sub_font = QFont("Segoe UI", 10)
            painter.setFont(sub_font)
            painter.setPen(QColor(183, 191, 217))
            painter.drawText(
                QRectF(left_pad, 84.0, float(self.width()) - 44.0, 44.0),
                int(Qt.AlignmentFlag.AlignLeft | Qt.AlignmentFlag.AlignTop | Qt.TextFlag.TextWordWrap),
                self._subtitle,
            )

        painter.end()


class Win11SilkCanvas(QWidget):
    """Windows 11 Setup Silk Ribbon animated backdrop with harmonic Bézier waves."""

    def __init__(self, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self._phase = 0.0
        self.setAttribute(Qt.WidgetAttribute.WA_OpaquePaintEvent, False)
        self._timer = QTimer(self)
        self._timer.setInterval(33)  # ~30 fps
        self._timer.timeout.connect(self._on_tick)
        self._timer.start()

    def _on_tick(self) -> None:
        self._phase += 0.028
        self.update()

    def paintEvent(self, _event) -> None:  # noqa: N802
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing, True)
        w = float(self.width())
        h = float(self.height())
        if w < 10 or h < 10:
            return

        # Deep ambient vignette background
        bg = QLinearGradient(0, 0, w, h)
        bg.setColorAt(0.0, QColor(9, 10, 15))
        bg.setColorAt(0.5, QColor(6, 7, 10))
        bg.setColorAt(1.0, QColor(11, 13, 18))
        painter.fillRect(self.rect(), QBrush(bg))

        # Render 3 layered silky harmonic waves
        for layer in range(3):
            phase_offset = self._phase + layer * 1.35
            y_base = h * (0.35 + layer * 0.18)

            path = QPainterPath()
            path.moveTo(0, h)
            path.lineTo(0, y_base + math.sin(phase_offset) * 22)

            # Cubic Bézier segments
            cp1_x = w * 0.3
            cp1_y = y_base + math.sin(phase_offset + 1.2) * 36 - 25
            cp2_x = w * 0.7
            cp2_y = y_base + math.cos(phase_offset + 2.1) * 32 + 25
            end_x = w
            end_y = y_base + math.sin(phase_offset + 3.1) * 24

            path.cubicTo(cp1_x, cp1_y, cp2_x, cp2_y, end_x, end_y)
            path.lineTo(w, h)
            path.closeSubpath()

            grad = QLinearGradient(0, y_base - 30, w, h)
            if layer == 0:
                grad.setColorAt(0.0, QColor(255, 255, 255, 30))
                grad.setColorAt(0.5, QColor(200, 210, 225, 18))
                grad.setColorAt(1.0, QColor(10, 12, 16, 0))
            elif layer == 1:
                grad.setColorAt(0.0, QColor(255, 255, 255, 22))
                grad.setColorAt(0.6, QColor(180, 190, 210, 14))
                grad.setColorAt(1.0, QColor(10, 12, 16, 0))
            else:
                grad.setColorAt(0.0, QColor(255, 255, 255, 16))
                grad.setColorAt(0.7, QColor(160, 175, 195, 10))
                grad.setColorAt(1.0, QColor(10, 12, 16, 0))

            painter.fillPath(path, QBrush(grad))

            # Crisp crest line
            crest = QPainterPath()
            crest.moveTo(0, y_base + math.sin(phase_offset) * 22)
            crest.cubicTo(cp1_x, cp1_y, cp2_x, cp2_y, end_x, end_y)
            painter.setPen(QPen(QColor(255, 255, 255, int(45 - layer * 10)), 1.2))
            painter.drawPath(crest)

        # Micro glowing particles along the wave flow
        painter.setPen(Qt.PenStyle.NoPen)
        for i in range(12):
            p_phase = self._phase * 0.8 + i * 0.75
            px = ((math.sin(p_phase * 0.6 + i) * 0.5 + 0.5) * w)
            py = h * 0.25 + ((math.cos(p_phase * 0.4 + i * 1.2) * 0.5 + 0.5) * (h * 0.55))
            alpha = int(40 + (math.sin(p_phase + i) + 1.0) * 35)
            painter.setBrush(QBrush(QColor(255, 255, 255, alpha)))
            painter.drawEllipse(QRectF(px - 1.5, py - 1.5, 3.0, 3.0))

        painter.end()

