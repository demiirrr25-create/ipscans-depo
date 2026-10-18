"""Modern, minimal, Light & Dark theme-aware welcome & first-run dialog for IPscans+.

Shown strictly on the FIRST run after installation. Once the user clicks
'Get Started' (or dismisses it), `is_first_run_completed` is persisted to local
settings (QSettings / AppData) and the welcome dialog is never shown again,
allowing the main application window to launch instantly with zero latency.
"""
from __future__ import annotations

from PyQt6.QtCore import QEasingCurve, QPropertyAnimation, QSettings, Qt
from PyQt6.QtGui import QColor
from PyQt6.QtWidgets import (
    QButtonGroup,
    QCheckBox,
    QDialog,
    QFrame,
    QGraphicsDropShadowEffect,
    QGraphicsOpacityEffect,
    QHBoxLayout,
    QLabel,
    QPushButton,
    QVBoxLayout,
    QWidget,
)

from app.i18n import (
    DEFAULT_LANGUAGE,
    available_languages,
    save_language,
)
from app.ui.privacy_dialog import accept_privacy, accept_terms
from app.ui.resources import load_logo_pixmap
from app.ui.styles import (
    ThemeManager,
    ThemeToggleButton,
    get_current_theme,
    get_tokens,
)

_SETTINGS_ORG = "ipscans"
_SETTINGS_APP = "NetworkScanner"
_KEY_FIRST_RUN_DONE = "is_first_run_completed"


def is_first_run() -> bool:
    """Checks whether the application is running for the very first time on this machine."""
    settings = QSettings(_SETTINGS_ORG, _SETTINGS_APP)
    first_run_done = settings.value(_KEY_FIRST_RUN_DONE, False, type=bool)
    return not bool(first_run_done)


def mark_first_run_completed() -> None:
    """Marks the first run as completed in local configuration so welcome never pops up again."""
    settings = QSettings(_SETTINGS_ORG, _SETTINGS_APP)
    settings.setValue(_KEY_FIRST_RUN_DONE, True)


def reset_first_run() -> None:
    """Resets the first-run flag (useful for testing and --reset-welcome CLI)."""
    settings = QSettings(_SETTINGS_ORG, _SETTINGS_APP)
    settings.remove(_KEY_FIRST_RUN_DONE)


class ModernWelcomeDialog(QDialog):
    """Sleek, Light & Dark theme-aware welcome dialog with smooth animations and first-run logic."""

    def __init__(self, initial_lang: str = DEFAULT_LANGUAGE, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self.lang = initial_lang
        self.setObjectName("ModernWelcomeDialog")
        self.setWindowTitle("IPscans+ · Welcome")
        self.setModal(True)
        self.setFixedSize(620, 640)
        self.setWindowFlags(Qt.WindowType.Dialog | Qt.WindowType.FramelessWindowHint)
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground, True)

        self._build_ui()
        self._refresh_texts()
        self.apply_theme(get_current_theme())
        ThemeManager.instance().theme_changed.connect(self.apply_theme)

    def _build_ui(self) -> None:
        outer = QVBoxLayout(self)
        outer.setContentsMargins(18, 18, 18, 18)

        self.card = QFrame()
        self.card.setObjectName("WelcomeCard")

        self._shadow = QGraphicsDropShadowEffect(self)
        self._shadow.setBlurRadius(42)
        self._shadow.setColor(QColor(0, 0, 0, 140))
        self._shadow.setOffset(0, 10)
        self.card.setGraphicsEffect(self._shadow)

        card_layout = QVBoxLayout(self.card)
        card_layout.setContentsMargins(36, 32, 36, 32)
        card_layout.setSpacing(18)

        # 1. Header with Logo, Title, Theme Toggle & Close Button
        header_row = QHBoxLayout()
        header_row.setSpacing(14)

        self.logo_lbl = QLabel()
        self.logo_lbl.setPixmap(load_logo_pixmap(54))
        self.logo_lbl.setFixedSize(54, 54)
        header_row.addWidget(self.logo_lbl)

        title_col = QVBoxLayout()
        title_col.setSpacing(2)

        self.title_lbl = QLabel("IPscans+")
        title_col.addWidget(self.title_lbl)

        self.badge_lbl = QLabel("NETWORK INTELLIGENCE & DISCOVERY")
        title_col.addWidget(self.badge_lbl)

        header_row.addLayout(title_col, stretch=1)

        self.theme_toggle_btn = ThemeToggleButton(self, self.lang)
        header_row.addWidget(self.theme_toggle_btn)

        self.close_btn = QPushButton("✕")
        self.close_btn.setFixedSize(28, 28)
        self.close_btn.setCursor(Qt.CursorShape.PointingHandCursor)
        self.close_btn.clicked.connect(self._on_dismiss)
        header_row.addWidget(self.close_btn)

        card_layout.addLayout(header_row)

        # Separator line
        self._sep = QFrame()
        self._sep.setFrameShape(QFrame.Shape.HLine)
        card_layout.addWidget(self._sep)

        # 2. Greeting / Tagline
        self.tagline_lbl = QLabel()
        self.tagline_lbl.setWordWrap(True)
        card_layout.addWidget(self.tagline_lbl)

        # 3. Highlighted Feature Cards (3 cards)
        features_layout = QVBoxLayout()
        features_layout.setSpacing(10)

        self.feature_cards: list[tuple[QLabel, QLabel]] = []
        self._feature_frames: list[tuple[QFrame, str]] = []
        feature_data = [
            ("⚡", "speed_title", "speed_desc", "accent_primary"),
            ("🗺️", "map_title", "map_desc", "online"),
            ("🛡️", "privacy_title", "privacy_desc", "info"),
        ]

        for icon, title_key, desc_key, accent_key in feature_data:
            f_frame = QFrame()
            f_row = QHBoxLayout(f_frame)
            f_row.setContentsMargins(10, 8, 10, 8)
            f_row.setSpacing(12)

            f_icon = QLabel(icon)
            f_icon.setStyleSheet("font-size: 20px; background: transparent;")
            f_row.addWidget(f_icon)

            f_text_col = QVBoxLayout()
            f_text_col.setSpacing(2)

            f_title = QLabel()
            f_title.setProperty("key", title_key)
            f_text_col.addWidget(f_title)

            f_desc = QLabel()
            f_desc.setWordWrap(True)
            f_desc.setProperty("key", desc_key)
            f_text_col.addWidget(f_desc)

            f_row.addLayout(f_text_col, stretch=1)
            features_layout.addWidget(f_frame)
            self.feature_cards.append((f_title, f_desc))
            self._feature_frames.append((f_frame, accent_key))

        card_layout.addLayout(features_layout)

        # 4. Language Selection Switcher
        lang_box = QHBoxLayout()
        lang_box.setSpacing(10)
        self.lang_label = QLabel()
        lang_box.addWidget(self.lang_label)

        self.lang_group = QButtonGroup(self)
        self.lang_group.setExclusive(True)

        for code, name in available_languages():
            btn = QPushButton(name)
            btn.setCheckable(True)
            btn.setCursor(Qt.CursorShape.PointingHandCursor)
            btn.setProperty("code", code)
            if code == self.lang:
                btn.setChecked(True)
            self.lang_group.addButton(btn)
            lang_box.addWidget(btn)

        self.lang_group.buttonClicked.connect(self._on_lang_switched)
        lang_box.addStretch(1)
        card_layout.addLayout(lang_box)

        # 5. Terms & Policy Consent Checkbox
        self.terms_checkbox = QCheckBox()
        self.terms_checkbox.setChecked(True)
        self.terms_checkbox.setCursor(Qt.CursorShape.PointingHandCursor)
        self.terms_checkbox.toggled.connect(self._on_terms_toggled)
        card_layout.addWidget(self.terms_checkbox)

        # 6. Action Button (Get Started)
        action_row = QHBoxLayout()
        self.start_btn = QPushButton()
        self.start_btn.setMinimumHeight(44)
        self.start_btn.setCursor(Qt.CursorShape.PointingHandCursor)
        self.start_btn.clicked.connect(self._on_start_clicked)
        action_row.addWidget(self.start_btn)

        card_layout.addLayout(action_row)
        outer.addWidget(self.card)

    def apply_theme(self, theme: str | None = None) -> None:
        tk = get_tokens(theme)
        self.card.setStyleSheet(f"""
            QFrame#WelcomeCard {{
                background-color: {tk['bg_surface']};
                border: 1px solid {tk['border_strong']};
                border-radius: 20px;
            }}
        """)
        self.title_lbl.setStyleSheet(
            f"font-size: 26px; font-weight: 700; color: {tk['text_primary']}; letter-spacing: -0.5px; background: transparent;"
        )
        self.badge_lbl.setStyleSheet(
            f"font-size: 10px; font-weight: 600; color: {tk['accent_primary']}; letter-spacing: 1.5px; background: transparent;"
        )
        self.close_btn.setStyleSheet(f"""
            QPushButton {{
                background: {tk['bg_elevated']};
                border: 1px solid {tk['border_default']};
                border-radius: 14px;
                color: {tk['text_secondary']};
                font-size: 12px;
                font-weight: bold;
            }}
            QPushButton:hover {{
                background: {tk['bg_hover']};
                color: {tk['text_primary']};
            }}
        """)
        self._sep.setStyleSheet(f"background-color: {tk['border_default']}; max-height: 1px; border: none;")
        self.tagline_lbl.setStyleSheet(
            f"font-size: 13.5px; line-height: 1.5; color: {tk['text_secondary']}; background: transparent;"
        )

        for (f_frame, accent_key), (f_title, f_desc) in zip(self._feature_frames, self.feature_cards):
            accent = tk.get(accent_key, tk["accent_primary"])
            f_frame.setStyleSheet(f"""
                QFrame {{
                    background-color: {tk['bg_elevated']};
                    border: 1px solid {tk['border_subtle']};
                    border-left: 3px solid {accent};
                    border-radius: 10px;
                    padding: 8px 12px;
                }}
            """)
            f_title.setStyleSheet(
                f"font-size: 12.5px; font-weight: 600; color: {tk['text_primary']}; background: transparent; border: none;"
            )
            f_desc.setStyleSheet(
                f"font-size: 11px; color: {tk['text_secondary']}; background: transparent; border: none;"
            )

        self.lang_label.setStyleSheet(
            f"font-size: 12px; color: {tk['text_secondary']}; font-weight: 500; background: transparent;"
        )
        lang_btn_qss = f"""
            QPushButton {{
                background: {tk['bg_elevated']};
                border: 1px solid {tk['border_default']};
                border-radius: 8px;
                color: {tk['text_secondary']};
                padding: 4px 12px;
                font-size: 11.5px;
                font-weight: 500;
            }}
            QPushButton:hover {{
                background: {tk['bg_hover']};
                color: {tk['text_primary']};
            }}
            QPushButton:checked {{
                background: {tk['accent_subtle']};
                border: 1px solid {tk['accent_primary']};
                color: {tk['accent_primary']};
                font-weight: 600;
            }}
        """
        for btn in self.lang_group.buttons():
            btn.setStyleSheet(lang_btn_qss)

        self.terms_checkbox.setStyleSheet(f"""
            QCheckBox {{
                color: {tk['text_secondary']};
                font-size: 11.5px;
                spacing: 8px;
                background: transparent;
            }}
            QCheckBox::indicator {{
                width: 16px;
                height: 16px;
                border-radius: 4px;
                border: 1px solid {tk['border_strong']};
                background: {tk['bg_elevated']};
            }}
            QCheckBox::indicator:checked {{
                background: {tk['accent_primary']};
                border: 1px solid {tk['accent_primary']};
                image: none;
            }}
        """)

        self.start_btn.setStyleSheet(f"""
            QPushButton {{
                background: {tk['accent_primary']};
                border: none;
                border-radius: 12px;
                color: {tk['text_inverse']};
                font-size: 13.5px;
                font-weight: 700;
                letter-spacing: 0.3px;
                padding: 0 24px;
            }}
            QPushButton:hover {{
                background: {tk['accent_hover']};
            }}
            QPushButton:disabled {{
                background: {tk['bg_elevated']};
                color: {tk['text_tertiary']};
            }}
        """)
        if hasattr(self, "theme_toggle_btn"):
            self.theme_toggle_btn.set_language(self.lang)
            self.theme_toggle_btn.update()

    def _on_lang_switched(self, button: QPushButton) -> None:
        self.lang = button.property("code")
        save_language(self.lang)
        self._refresh_texts()
        if hasattr(self, "theme_toggle_btn"):
            self.theme_toggle_btn.set_language(self.lang)

    def _on_terms_toggled(self, checked: bool) -> None:
        self.start_btn.setEnabled(checked)

    def _refresh_texts(self) -> None:
        tr = self.lang == "tr"
        self.setWindowTitle("IPscans+ · Karşılama" if tr else "IPscans+ · Welcome")
        self.tagline_lbl.setText(
            "Yüksek performanslı yerel ağ tarayıcısına hoş geldiniz. IPscans+, "
            "cihazlarınızı anında keşfeder, topoloji haritasını çıkarır ve %100 yerel gizlilik sağlar."
            if tr else
            "Welcome to the high-performance local network scanner. IPscans+ discovers "
            "devices in milliseconds, maps physical & logical topology, and operates with 100% local privacy."
        )

        texts = {
            "speed_title": "Uyarlanabilir Hızlı Keşif" if tr else "Adaptive High-Speed Discovery",
            "speed_desc": "Akıllı ARP ve soket motoruyla alt ağları saniyeler içinde tarar." if tr else "Probes subnets in seconds via low-overhead ARP and TCP socket engine.",
            "map_title": "İnteraktif Topoloji & Harita" if tr else "Interactive Network Topology",
            "map_desc": "Ağ geçitleri, anahtarlar ve uç cihazlar arasındaki bağlantıları görselleştirir." if tr else "Visualizes gateway adjacencies, switches, and client relationships.",
            "privacy_title": "Sıfır Telemetri & %100 Yerel" if tr else "Zero Telemetry & 100% Local",
            "privacy_desc": "Ağ verileriniz bilgisayarınızda kalır, hiçbir bulut sunucusuna aktarılmaz." if tr else "Network data stays exclusively on your machine and is never sent to the cloud.",
        }

        for title_lbl, desc_lbl in self.feature_cards:
            title_lbl.setText(texts.get(title_lbl.property("key"), ""))
            desc_lbl.setText(texts.get(desc_lbl.property("key"), ""))

        self.lang_label.setText("Arayüz Dili:" if tr else "Interface Language:")
        self.terms_checkbox.setText(
            "Kullanım Koşullarını ve Yerel Gizlilik Politikasını kabul ediyorum."
            if tr else
            "I accept the Terms of Use and Local Privacy Policy."
        )
        self.start_btn.setText("Hemen Başla  →" if tr else "Get Started  →")

    def _on_start_clicked(self) -> None:
        save_language(self.lang)
        accept_terms()
        accept_privacy()
        mark_first_run_completed()
        self.accept()

    def _on_dismiss(self) -> None:
        save_language(self.lang)
        accept_terms()
        accept_privacy()
        mark_first_run_completed()
        self.reject()

    def showEvent(self, event) -> None:  # noqa: N802
        super().showEvent(event)
        if getattr(self, "_animated", False):
            return
        self._animated = True

        effect = QGraphicsOpacityEffect(self.card)
        self.card.setGraphicsEffect(effect)

        fade = QPropertyAnimation(effect, b"opacity", self)
        fade.setDuration(240)
        fade.setStartValue(0.0)
        fade.setEndValue(1.0)
        fade.setEasingCurve(QEasingCurve.Type.OutCubic)
        fade.start()
        self._fade = fade
