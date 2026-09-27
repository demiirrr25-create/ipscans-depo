"""Startup welcome splash: a frameless, translucent card with the app logo,
a live animated spinner and a short greeting — shown for a moment before the
language/privacy screens appear. Built as a real (animated) widget rather
than a static painted pixmap so the loading motion itself feels modern.
"""
from __future__ import annotations

from PyQt6.QtCore import QPropertyAnimation, Qt
from PyQt6.QtGui import QGuiApplication
from PyQt6.QtWidgets import QFrame, QLabel, QVBoxLayout, QWidget

from app.ui.resources import load_logo_pixmap
from app.ui.spinner import Spinner
from app.ui.styles import DARK_QSS

WIDTH, HEIGHT = 420, 300


class WelcomeSplash(QWidget):
    def __init__(self) -> None:
        super().__init__()
        self.setWindowFlags(
            Qt.WindowType.FramelessWindowHint
            | Qt.WindowType.WindowStaysOnTopHint
            | Qt.WindowType.Tool
        )
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)
        self.setStyleSheet(DARK_QSS)
        self.setFixedSize(WIDTH, HEIGHT)
        self._build_ui()
        self._center_on_screen()

        self._fade_in = QPropertyAnimation(self, b"windowOpacity")
        self._fade_in.setDuration(280)
        self._fade_in.setStartValue(0.0)
        self._fade_in.setEndValue(1.0)

    def _build_ui(self) -> None:
        outer = QVBoxLayout(self)
        outer.setContentsMargins(0, 0, 0, 0)

        card = QFrame(objectName="SplashCard")
        outer.addWidget(card)

        layout = QVBoxLayout(card)
        layout.setContentsMargins(24, 36, 24, 30)
        layout.setSpacing(14)
        layout.setAlignment(Qt.AlignmentFlag.AlignHCenter)

        logo = QLabel()
        logo.setPixmap(load_logo_pixmap(56))
        logo.setFixedSize(56, 56)
        layout.addWidget(logo, alignment=Qt.AlignmentFlag.AlignHCenter)

        title = QLabel("ipscans", objectName="TitleText")
        title.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(title)

        subtitle = QLabel("Welcome to ipscans Network Scanner", objectName="SubtitleText")
        subtitle.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(subtitle)

        layout.addSpacing(10)
        self.spinner = Spinner(34)
        layout.addWidget(self.spinner, alignment=Qt.AlignmentFlag.AlignHCenter)

        layout.addStretch(1)
        hint = QLabel("Starting up...", objectName="StatusLabel")
        hint.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(hint)

    def _center_on_screen(self) -> None:
        screen = QGuiApplication.primaryScreen()
        if screen is None:
            return
        geo = screen.availableGeometry()
        self.move(
            geo.center().x() - self.width() // 2,
            geo.center().y() - self.height() // 2,
        )

    def show(self) -> None:  # noqa: D102 (Qt override)
        super().show()
        self.spinner.start()
        self._fade_in.start()

    def close(self) -> bool:  # noqa: D102 (Qt override)
        self.spinner.stop()
        return super().close()

