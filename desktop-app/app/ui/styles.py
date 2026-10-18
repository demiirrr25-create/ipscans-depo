"""IPScans v2 Unified Design System (Light & Dark Mode) for IPscans+ and Network Health Pro.

Token values mirror `design/tokens.json`. Provides:
- `LIGHT_TOKENS` and `DARK_TOKENS`
- `build_qss(theme)`, `LIGHT_QSS`, `DARK_QSS`, `MONOCHROME_QSS`
- `ThemeManager`, `detect_os_theme()`, `get_current_theme()`, `set_current_theme(theme)`,
  `toggle_theme()`, `apply_theme(widget_or_app, theme)`, `get_tokens(theme)`
- `ThemeToggleButton` (custom-painted Sun/Moon theme switch button)
"""
from __future__ import annotations

import math
import sys
from typing import Callable

from PyQt6.QtCore import QObject, QPointF, QRectF, QSettings, Qt, QTimer, pyqtSignal
from PyQt6.QtGui import (
    QBrush,
    QColor,
    QFont,
    QLinearGradient,
    QPainter,
    QPainterPath,
    QPen,
)
from PyQt6.QtWidgets import QApplication, QPushButton, QWidget

THEME_SETTINGS_ORG = "IPScans"
THEME_SETTINGS_APP = "IPscansEcosystem"
THEME_SETTINGS_KEY = "ui/theme"

LIGHT_TOKENS: dict[str, str] = {
    "bg": "#FFFFFF",
    "surface": "#FFFFFF",
    "surface1": "#F8F9FA",
    "surface2": "#F1F3F6",
    "surface3": "#E8EAED",
    "surfaceHover": "#EDF0F3",
    "border": "#E5E7EB",
    "borderStrong": "#D1D5DB",
    "borderFocus": "#2F6BFF",
    "text": "#0B0D12",
    "textSecondary": "#3C4252",
    "textTertiary": "#676F82",
    "textMuted": "#8A9099",
    "textDisabled": "#B0B5BD",
    "accent": "#0B0D12",
    "accentHover": "#22252E",
    "accentText": "#FFFFFF",
    "signal": "#2F6BFF",
    "signalStrong": "#1D56E5",
    "signalSoft": "#EBF1FF",
    "stage": "#07080B",
    "stageCard": "#11131A",
    "stageBorder": "#1E222D",
    "onStage": "#F5F7FA",
    "onStageSecondary": "#A7B0C0",
    "chartPrimary": "#2F6BFF",
    "chartSecondary": "#7B61FF",
    "chartGrid": "#E8EAED",
    "statusOk": "#0F9D58",
    "statusWarn": "#E37400",
    "statusError": "#D93025",
    "statusInfo": "#2F6BFF",
    "overlay": "rgba(11, 13, 18, 0.45)",
    "bg_canvas": "#FFFFFF",
    "bg_surface": "#F8F9FA",
    "bg_elevated": "#F1F3F6",
    "bg_hover": "#EDF0F3",
    "border_default": "#E5E7EB",
    "border_subtle": "#ECEEF2",
    "border_strong": "#D1D5DB",
    "text_primary": "#0B0D12",
    "text_secondary": "#3C4252",
    "text_tertiary": "#676F82",
    "text_inverse": "#FFFFFF",
    "accent_primary": "#2F6BFF",
    "accent_hover": "#1D56E5",
    "accent_subtle": "#EBF1FF",
    "online": "#0F9D58",
    "warning": "#E37400",
    "critical": "#D93025",
    "info": "#2F6BFF",
}

DARK_TOKENS: dict[str, str] = {
    "bg": "#07080B",
    "surface": "#07080B",
    "surface1": "#0D0F14",
    "surface2": "#141821",
    "surface3": "#1B1F2A",
    "surfaceHover": "#222735",
    "border": "#1E222D",
    "borderStrong": "#2C3242",
    "borderFocus": "#4C82FF",
    "text": "#F5F7FA",
    "textSecondary": "#A8B0C2",
    "textTertiary": "#6E778C",
    "textMuted": "#4E5666",
    "textDisabled": "#383E4C",
    "accent": "#F5F7FA",
    "accentHover": "#E2E6EE",
    "accentText": "#07080B",
    "signal": "#4C82FF",
    "signalStrong": "#2F6BFF",
    "signalSoft": "#132042",
    "stage": "#0D0F14",
    "stageCard": "#13161E",
    "stageBorder": "#222735",
    "onStage": "#F5F7FA",
    "onStageSecondary": "#A7B0C0",
    "chartPrimary": "#4C82FF",
    "chartSecondary": "#9B84FF",
    "chartGrid": "#1B1F2A",
    "statusOk": "#34D399",
    "statusWarn": "#FBBF24",
    "statusError": "#F87171",
    "statusInfo": "#60A5FA",
    "overlay": "rgba(0, 0, 0, 0.72)",
    "bg_canvas": "#07080B",
    "bg_surface": "#0D0F14",
    "bg_elevated": "#141821",
    "bg_hover": "#222735",
    "border_default": "#1E222D",
    "border_subtle": "#161A23",
    "border_strong": "#2C3242",
    "text_primary": "#F5F7FA",
    "text_secondary": "#A8B0C2",
    "text_tertiary": "#6E778C",
    "text_inverse": "#07080B",
    "accent_primary": "#4C82FF",
    "accent_hover": "#2F6BFF",
    "accent_subtle": "#132042",
    "online": "#34D399",
    "warning": "#FBBF24",
    "critical": "#F87171",
    "info": "#60A5FA",
}

THEMES: dict[str, dict[str, str]] = {
    "light": LIGHT_TOKENS,
    "dark": DARK_TOKENS,
}


def detect_os_theme() -> str:
    """Detects Windows 11/10 system theme via registry AppsUseLightTheme."""
    if sys.platform == "win32":
        try:
            import winreg

            with winreg.OpenKey(
                winreg.HKEY_CURRENT_USER,
                r"Software\Microsoft\Windows\CurrentVersion\Themes\Personalize",
            ) as key:
                value, _ = winreg.QueryValueEx(key, "AppsUseLightTheme")
                return "light" if int(value) == 1 else "dark"
        except Exception:
            pass
    return "dark"


def get_tokens(theme: str | None = None) -> dict[str, str]:
    resolved = (theme or get_current_theme()).lower()
    return LIGHT_TOKENS if resolved == "light" else DARK_TOKENS


def build_qss(theme: str = "dark") -> str:
    """Builds the complete IPScans v2 QSS stylesheet for either 'light' or 'dark'."""
    t = LIGHT_TOKENS if str(theme).lower() == "light" else DARK_TOKENS
    is_light = str(theme).lower() == "light"
    canvas_bg = t["surface1"] if is_light else t["bg"]

    return f"""
* {{
    font-family: "Segoe UI Variable Text", "Segoe UI", "Inter", Arial, sans-serif;
    color: {t["text"]};
    outline: none;
}}

#AppRoot, QStackedWidget, QMainWindow {{
    background-color: {t["bg"]};
    color: {t["text"]};
}}

QPushButton:focus, QListWidget:focus, QTableView:focus, QTableWidget:focus, QTreeWidget:focus, QCheckBox:focus {{
    border: 1px solid {t["borderFocus"]};
}}

QListWidget {{
    background: {t["surface1"]};
    border: 1px solid {t["border"]};
    border-radius: 16px;
    padding: 6px;
    color: {t["text"]};
}}
QListWidget::item {{
    padding: 12px 10px;
    border-radius: 10px;
}}
QListWidget::item:selected {{
    background: {t["accent"]};
    color: {t["accentText"]};
}}

QGraphicsView {{
    border: 1px solid {t["border"]};
    border-radius: 20px;
    background: {canvas_bg};
}}

#RootCard, #SplashCard, QFrame#ScanCard, QFrame#WelcomeHeroCard {{
    background-color: {t["surface1"]};
    border: 1px solid {t["border"]};
    border-radius: 16px;
}}

#TitleBar {{
    background: {t["surface"]};
    border-bottom: 1px solid {t["border"]};
}}

QLabel {{
    font-size: 12px;
    color: {t["textSecondary"]};
    background: transparent;
}}

QLabel#TitleText {{
    font-family: "Segoe UI Variable Display", "Segoe UI", sans-serif;
    font-size: 20px;
    font-weight: 700;
    letter-spacing: -0.4px;
    color: {t["text"]};
}}

QLabel#SubtitleText {{
    font-size: 12px;
    color: {t["textTertiary"]};
}}

QLabel#VersionBadge {{
    color: {t["textSecondary"]};
    background: {t["surface2"]};
    border: 1px solid {t["borderStrong"]};
    border-radius: 13px;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.08em;
    padding: 5px 11px;
}}

#OptionsCard {{
    background: {t["surface1"]};
    border: 1px solid {t["border"]};
    border-radius: 18px;
}}

#SegmentBar {{
    background: {t["surface2"]};
    border: 1px solid {t["border"]};
    border-radius: 18px;
}}
QPushButton#SegmentButton {{
    background: transparent;
    color: {t["textSecondary"]};
    border: none;
    border-radius: 14px;
    padding: 8px 16px;
    font-size: 12px;
    font-weight: 600;
}}
QPushButton#SegmentButton:hover {{
    background: {t["surfaceHover"]};
    color: {t["text"]};
}}
QPushButton#SegmentButton:checked {{
    background: {t["accent"]};
    color: {t["accentText"]};
}}

QPushButton#LanguageOption {{
    background: {t["surface1"]};
    color: {t["text"]};
    border: 1px solid {t["borderStrong"]};
    border-radius: 16px;
    font-size: 13px;
    font-weight: 500;
    padding: 10px 16px;
}}
QPushButton#LanguageOption:hover {{
    background: {t["surfaceHover"]};
    border: 1px solid {t["borderFocus"]};
    color: {t["text"]};
}}
QPushButton#LanguageOption:checked {{
    background: {t["accent"]};
    color: {t["accentText"]};
    border: 1px solid {t["accent"]};
    font-weight: 600;
}}

QPushButton#WindowButton {{
    background: transparent;
    border: none;
    border-radius: 14px;
    color: {t["textSecondary"]};
    padding: 4px 10px;
}}
QPushButton#WindowButton:hover {{
    background: {t["surfaceHover"]};
    color: {t["text"]};
}}

QRadioButton {{
    font-size: 13px;
    spacing: 6px;
    padding: 2px 0;
    color: {t["text"]};
}}
QRadioButton::indicator {{
    width: 16px;
    height: 16px;
    border-radius: 8px;
    border: 1px solid {t["borderStrong"]};
    background: {t["surface"]};
}}
QRadioButton::indicator:checked {{
    border: 1px solid {t["signal"]};
    background: qradialgradient(cx:0.5, cy:0.5, radius:0.5,
        stop:0 {t["signal"]}, stop:0.5 {t["signal"]}, stop:0.6 transparent, stop:1 transparent);
}}

QCheckBox {{
    font-size: 13px;
    spacing: 8px;
    color: {t["text"]};
}}
QCheckBox::indicator {{
    width: 16px;
    height: 16px;
    border-radius: 5px;
    border: 1px solid {t["borderStrong"]};
    background: {t["surface"]};
}}
QCheckBox::indicator:checked {{
    border: 1px solid {t["signal"]};
    background: {t["signal"]};
}}
QCheckBox::indicator:disabled {{
    border: 1px solid {t["border"]};
    background: {t["surface2"]};
}}

QLineEdit {{
    background: {t["surface"]};
    border: 1px solid {t["borderStrong"]};
    border-radius: 10px;
    padding: 7px 14px;
    font-size: 13px;
    color: {t["text"]};
    selection-background-color: {t["signal"]};
    selection-color: #FFFFFF;
}}
QLineEdit:focus {{
    border: 1.5px solid {t["borderFocus"]};
}}
QLineEdit:disabled {{
    background: {t["surface2"]};
    color: {t["textDisabled"]};
    border-color: {t["border"]};
}}

QComboBox {{
    background: {t["surface"]};
    border: 1px solid {t["borderStrong"]};
    border-radius: 10px;
    padding: 6px 32px 6px 14px;
    font-size: 13px;
    color: {t["text"]};
    min-height: 22px;
    selection-background-color: {t["signal"]};
    selection-color: #FFFFFF;
}}
QComboBox:hover {{
    border-color: {t["borderFocus"]};
}}
QComboBox:focus {{
    border: 1.5px solid {t["borderFocus"]};
}}
QComboBox:disabled {{
    background: {t["surface2"]};
    color: {t["textDisabled"]};
    border-color: {t["border"]};
}}
QComboBox::drop-down {{
    subcontrol-origin: padding;
    subcontrol-position: top right;
    width: 28px;
    border: none;
    background: transparent;
}}

QSpinBox, QDoubleSpinBox, QTimeEdit, QDateTimeEdit {{
    background: {t["surface"]};
    border: 1px solid {t["borderStrong"]};
    border-radius: 10px;
    padding: 6px 12px;
    font-size: 13px;
    color: {t["text"]};
    selection-background-color: {t["signal"]};
    selection-color: #FFFFFF;
}}
QSpinBox:focus, QDoubleSpinBox:focus, QTimeEdit:focus, QDateTimeEdit:focus {{
    border: 1.5px solid {t["borderFocus"]};
}}
QSpinBox:disabled, QDoubleSpinBox:disabled, QTimeEdit:disabled, QDateTimeEdit:disabled {{
    background: {t["surface2"]};
    color: {t["textDisabled"]};
    border-color: {t["border"]};
}}
QSpinBox::up-button, QDoubleSpinBox::up-button, QTimeEdit::up-button, QDateTimeEdit::up-button,
QSpinBox::down-button, QDoubleSpinBox::down-button, QTimeEdit::down-button, QDateTimeEdit::down-button {{
    border: none;
    background: transparent;
    width: 18px;
}}

QComboBox QAbstractItemView {{
    background-color: {t["surface1"]};
    color: {t["text"]};
    border: 1px solid {t["borderStrong"]};
    border-radius: 10px;
    outline: none;
    selection-background-color: {t["signalSoft"]};
    selection-color: {t["text"]};
    padding: 4px;
}}
QComboBox QAbstractItemView::item {{
    padding: 7px 12px;
    min-height: 22px;
}}
QComboBox QAbstractItemView::item:hover {{
    background-color: {t["surfaceHover"]};
}}

QMenu {{
    background-color: {t["surface1"]};
    color: {t["text"]};
    border: 1px solid {t["borderStrong"]};
    border-radius: 12px;
    padding: 6px;
}}
QMenu::item {{
    padding: 7px 20px;
    border-radius: 8px;
}}
QMenu::item:selected {{
    background-color: {t["accent"]};
    color: {t["accentText"]};
}}
QMenu::separator {{
    height: 1px;
    background: {t["border"]};
    margin: 4px 8px;
}}

QPushButton {{
    background: {t["surface2"]};
    color: {t["text"]};
    border: 1px solid {t["borderStrong"]};
    border-radius: 10px;
    padding: 8px 18px;
    font-size: 12px;
    font-weight: 600;
}}
QPushButton:hover {{
    background: {t["surfaceHover"]};
    border-color: {t["borderFocus"]};
    color: {t["text"]};
}}
QPushButton:disabled {{
    color: {t["textDisabled"]};
    background: {t["surface1"]};
    border-color: {t["border"]};
}}

QPushButton#IconButton {{
    background: {t["surface1"]};
    color: {t["text"]};
    border: 1px solid {t["borderStrong"]};
    padding: 0px;
    min-width: 36px;
    max-width: 36px;
    min-height: 36px;
    max-height: 36px;
    border-radius: 10px;
    font-size: 16px;
    font-weight: 700;
}}
QPushButton#IconButton:hover {{
    background: {t["surfaceHover"]};
    border-color: {t["borderFocus"]};
    color: {t["text"]};
}}

QPushButton#PrimaryButton {{
    background: {t["accent"]};
    color: {t["accentText"]};
    border: 1px solid {t["accent"]};
    border-radius: 10px;
    padding: 9px 22px;
    font-weight: 600;
    font-size: 13px;
}}
QPushButton#PrimaryButton:hover {{
    background: {t["accentHover"]};
    border-color: {t["accentHover"]};
    color: {t["accentText"]};
}}
QPushButton#PrimaryButton:pressed {{
    background: {t["signal"]};
    border-color: {t["signal"]};
    color: #FFFFFF;
}}
QPushButton#PrimaryButton:disabled {{
    background: {t["surface3"]};
    color: {t["textDisabled"]};
    border-color: {t["border"]};
}}

QPushButton#GhostButton, QPushButton#TourButton {{
    background: {t["surface1"]};
    color: {t["textSecondary"]};
    border: 1px solid {t["borderStrong"]};
    border-radius: 10px;
    padding: 8px 16px;
    font-size: 12px;
    font-weight: 600;
}}
QPushButton#GhostButton:hover, QPushButton#TourButton:hover {{
    background: {t["surfaceHover"]};
    border: 1px solid {t["borderFocus"]};
    color: {t["text"]};
}}

QPushButton#ThemeToggleButton {{
    background: {t["surface1"]};
    color: {t["text"]};
    border: 1px solid {t["borderStrong"]};
    border-radius: 17px;
    padding: 0px;
    min-width: 72px;
    max-width: 72px;
    min-height: 34px;
    max-height: 34px;
    font-size: 12px;
    font-weight: 600;
}}
QPushButton#ThemeToggleButton:hover {{
    background: {t["surfaceHover"]};
    border-color: {t["borderFocus"]};
}}

QTabWidget::pane {{
    background-color: {t["surface1"]};
    border: 1px solid {t["border"]};
    border-radius: 20px;
    top: 6px;
}}
QTabBar::tab {{
    background: {t["surface1"]};
    color: {t["textSecondary"]};
    padding: 9px 20px;
    border: 1px solid {t["border"]};
    border-radius: 17px;
    margin-left: 4px;
    margin-right: 4px;
    font-size: 12px;
    font-weight: 600;
}}
QTabBar::tab:selected {{
    color: {t["accentText"]};
    background: {t["accent"]};
    border: 1px solid {t["accent"]};
    font-weight: 600;
}}
QTabBar::tab:!selected:hover {{
    background: {t["surfaceHover"]};
    color: {t["text"]};
    border-color: {t["borderStrong"]};
}}

QLabel#ResultsHeading {{
    color: {t["text"]};
    font-size: 13px;
    font-weight: 500;
    padding: 4px 0 6px;
}}

QTableView, QTableWidget {{
    background: {t["surface"]};
    alternate-background-color: {t["surface1"]};
    color: {t["text"]};
    border: 1px solid {t["border"]};
    border-radius: 16px;
    gridline-color: {t["border"]};
    font-size: 13px;
}}
QTableView QAbstractScrollArea, QTreeWidget QAbstractScrollArea {{
    background-color: {t["surface1"]};
}}
QTreeView, QTreeWidget {{
    background-color: {t["surface1"]};
    alternate-background-color: {t["surface2"]};
    color: {t["text"]};
    border: 1px solid {t["border"]};
    border-radius: 18px;
    outline: none;
    font-size: 12px;
    padding: 6px;
}}
QTreeView::item, QTreeWidget::item {{
    padding: 6px 8px;
    min-height: 22px;
    border: none;
}}
QTreeView::item:selected, QTreeWidget::item:selected {{
    background-color: {t["signalSoft"]};
    color: {t["text"]};
    border-radius: 8px;
}}
QTreeView::branch, QTreeWidget::branch {{
    background: transparent;
}}
QTableView::item, QTableWidget::item {{
    padding: 9px 12px;
    border: none;
    color: {t["text"]};
}}
QTableView::item:selected, QTableWidget::item:selected {{
    background: {t["signalSoft"]};
    color: {t["text"]};
}}
QTableView::item:hover, QTableWidget::item:hover {{
    background: {t["surfaceHover"]};
}}
QHeaderView::section {{
    background: {t["surface1"]};
    color: {t["textTertiary"]};
    padding: 12px 10px;
    border: none;
    border-bottom: 1px solid {t["border"]};
    font-size: 11px;
    font-weight: 600;
}}

QScrollArea {{
    background: transparent;
    border: none;
}}
QScrollArea > QWidget > QWidget {{
    background: transparent;
}}

QScrollBar:vertical {{
    background: transparent;
    width: 10px;
}}
QScrollBar::handle:vertical {{
    background: {t["borderStrong"]};
    border-radius: 5px;
    min-height: 24px;
}}
QScrollBar::handle:vertical:hover {{
    background: {t["textTertiary"]};
}}
QScrollBar::add-line, QScrollBar::sub-line {{
    height: 0;
}}
QScrollBar:horizontal {{
    background: transparent;
    height: 10px;
}}
QScrollBar::handle:horizontal {{
    background: {t["borderStrong"]};
    border-radius: 5px;
    min-width: 24px;
}}
QScrollBar::handle:horizontal:hover {{
    background: {t["textTertiary"]};
}}
QScrollBar::add-line:horizontal, QScrollBar::sub-line:horizontal {{
    width: 0;
}}
QScrollBar::add-page:horizontal, QScrollBar::sub-page:horizontal {{
    background: transparent;
}}

QLabel#StatusLabel {{
    color: {t["textSecondary"]};
    font-size: 12px;
    padding-top: 2px;
}}

QLabel#SectionLabel {{
    color: {t["textTertiary"]};
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
}}

#HealthCard {{
    background: {t["surface1"]};
    border: 1px solid {t["border"]};
    border-radius: 22px;
}}
QLabel#HealthScoreValue {{
    color: {t["text"]};
    font-size: 46px;
    font-weight: 700;
    letter-spacing: -0.03em;
}}
QLabel#HealthScoreLabel {{
    color: {t["textTertiary"]};
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.12em;
}}
#StatCard {{
    background: {t["surface1"]};
    border: 1px solid {t["border"]};
    border-radius: 18px;
}}
QLabel#StatValue {{
    color: {t["text"]};
    font-size: 24px;
    font-weight: 600;
    letter-spacing: -0.02em;
}}
QLabel#StatLabel {{
    color: {t["textTertiary"]};
    font-size: 11px;
}}

QLabel#SeverityInfo {{
    color: {t["statusInfo"]};
    font-weight: 600;
}}
QLabel#SeverityWarning {{
    color: {t["statusWarn"]};
    font-weight: 600;
}}
QLabel#SeverityCritical {{
    color: {t["statusError"]};
    font-weight: 600;
}}

QProgressBar {{
    background: {t["surface3"]};
    border: none;
    border-radius: 4px;
    height: 6px;
    text-align: center;
    color: transparent;
}}
QProgressBar::chunk {{
    border-radius: 4px;
    background: {t["signal"]};
}}

QTextEdit {{
    background-color: {t["surface1"]};
    border: 1px solid {t["borderStrong"]};
    border-radius: 16px;
    padding: 12px;
    font-size: 12px;
    color: {t["text"]};
    selection-background-color: {t["signal"]};
    selection-color: #FFFFFF;
}}

QToolTip {{
    background: {t["surface1"]};
    color: {t["text"]};
    border: 1px solid {t["borderStrong"]};
    padding: 5px 10px;
    border-radius: 8px;
}}

QDialog, QMessageBox {{
    background-color: {t["bg"]};
    color: {t["text"]};
}}
QMessageBox QLabel {{
    color: {t["text"]};
    background: transparent;
}}
QDialog QPushButton, QMessageBox QPushButton {{
    background: {t["accent"]};
    color: {t["accentText"]};
    border: 1px solid {t["accent"]};
    border-radius: 16px;
    padding: 8px 18px;
    min-width: 68px;
    font-weight: 600;
}}
QDialog QPushButton:hover, QMessageBox QPushButton:hover {{
    background: {t["accentHover"]};
}}

QDialog#Win11SetupWindow {{
    background-color: {t["bg"]};
    border: 1px solid {t["borderStrong"]};
    border-radius: 20px;
}}

QFrame#Win11Card {{
    background: {t["surface1"]};
    border: 1px solid {t["border"]};
    border-radius: 18px;
}}

QPushButton#Win11Primary {{
    background: {t["accent"]};
    color: {t["accentText"]};
    border: none;
    border-radius: 14px;
    padding: 10px 24px;
    font-size: 13px;
    font-weight: 600;
}}
QPushButton#Win11Primary:hover {{
    background: {t["accentHover"]};
}}
QPushButton#Win11Primary:disabled {{
    background: {t["surface3"]};
    color: {t["textDisabled"]};
}}

QPushButton#Win11Ghost {{
    background: {t["surface1"]};
    color: {t["textSecondary"]};
    border: 1px solid {t["borderStrong"]};
    border-radius: 14px;
    padding: 10px 20px;
    font-size: 13px;
}}
QPushButton#Win11Ghost:hover {{
    background: {t["surfaceHover"]};
    color: {t["text"]};
    border-color: {t["borderFocus"]};
}}

QFrame#Win11FeatureCard {{
    background: {t["surface1"]};
    border: 1px solid {t["border"]};
    border-radius: 14px;
    padding: 14px 16px;
}}
QFrame#Win11FeatureCard:hover {{
    border-color: {t["borderStrong"]};
    background: {t["surfaceHover"]};
}}
"""


LIGHT_QSS = build_qss("light")
DARK_QSS = build_qss("dark")
MONOCHROME_QSS = DARK_QSS
_ACTIVE_THEME: str = "dark"


class ThemeManager(QObject):
    """Central theme controller for IPscans+ and Network Health Pro."""

    theme_changed = pyqtSignal(str)
    _instance: ThemeManager | None = None

    def __init__(self) -> None:
        super().__init__()
        self._callbacks: list[Callable[[str], None]] = []
        self._theme: str | None = None
        self._emitting: bool = False

    @classmethod
    def instance(cls) -> ThemeManager:
        if cls._instance is not None:
            try:
                cls._instance.objectName()
            except RuntimeError:
                cls._instance = None
        if cls._instance is None:
            cls._instance = ThemeManager()
        return cls._instance

    def current_theme(self) -> str:
        global _ACTIVE_THEME
        if self._theme in ("light", "dark"):
            _ACTIVE_THEME = self._theme
            return self._theme
        settings = QSettings(THEME_SETTINGS_ORG, THEME_SETTINGS_APP)
        saved = settings.value(THEME_SETTINGS_KEY, None)
        if isinstance(saved, str) and saved.lower() in ("light", "dark"):
            self._theme = saved.lower()
            _ACTIVE_THEME = self._theme
            return self._theme
        self._theme = detect_os_theme()
        _ACTIVE_THEME = self._theme
        return self._theme

    def set_theme(self, theme: str, persist: bool = True) -> str:
        global _ACTIVE_THEME, MONOCHROME_QSS
        normalized = "light" if str(theme).lower() == "light" else "dark"
        self._theme = normalized
        _ACTIVE_THEME = normalized
        if persist:
            settings = QSettings(THEME_SETTINGS_ORG, THEME_SETTINGS_APP)
            settings.setValue(THEME_SETTINGS_KEY, normalized)
            settings.sync()

        MONOCHROME_QSS = LIGHT_QSS if normalized == "light" else DARK_QSS

        app = QApplication.instance()
        if isinstance(app, QApplication):
            app.setStyleSheet(build_qss(normalized))

        if not self._emitting:
            self._emitting = True
            try:
                self.theme_changed.emit(normalized)
            except RuntimeError:
                pass
            finally:
                self._emitting = False

        alive_callbacks: list[Callable[[str], None]] = []
        for cb in list(self._callbacks):
            try:
                cb(normalized)
                alive_callbacks.append(cb)
            except RuntimeError:
                pass
        self._callbacks = alive_callbacks

        if isinstance(app, QApplication):
            for widget in app.allWidgets():
                if isinstance(widget, ThemeToggleButton):
                    try:
                        widget.sync_theme(normalized)
                    except RuntimeError:
                        pass

        return normalized

    def toggle(self) -> str:
        next_theme = "light" if self.current_theme() == "dark" else "dark"
        return self.set_theme(next_theme, persist=True)

    def subscribe(self, callback: Callable[[str], None]) -> None:
        if callback not in self._callbacks:
            self._callbacks.append(callback)

    def unsubscribe(self, callback: Callable[[str], None]) -> None:
        if callback in self._callbacks:
            self._callbacks.remove(callback)


def get_current_theme() -> str:
    return ThemeManager.instance().current_theme()


def set_current_theme(theme: str, persist: bool = True) -> str:
    return ThemeManager.instance().set_theme(theme, persist=persist)


def toggle_theme() -> str:
    return ThemeManager.instance().toggle()


def register_theme_listener(callback: Callable[[str], None]) -> None:
    ThemeManager.instance().subscribe(callback)


def apply_theme(widget_or_app=None, theme: str | None = None) -> str:
    """Applies the IPScans v2 theme to a QApplication or QWidget and syncs ThemeManager."""
    global _ACTIVE_THEME, MONOCHROME_QSS
    mgr = ThemeManager.instance()
    if theme is not None and str(theme).lower() in ("light", "dark"):
        active = str(theme).lower()
        mgr._theme = active
        _ACTIVE_THEME = active
        MONOCHROME_QSS = LIGHT_QSS if active == "light" else DARK_QSS
        try:
            settings = QSettings(THEME_SETTINGS_ORG, THEME_SETTINGS_APP)
            settings.setValue(THEME_SETTINGS_KEY, active)
            settings.sync()
        except Exception:
            pass
    else:
        active = get_current_theme().lower()
        if active not in ("light", "dark"):
            active = "dark"
        _ACTIVE_THEME = active

    qss = build_qss(active)
    app = QApplication.instance()
    if widget_or_app is None or isinstance(widget_or_app, QApplication):
        target_app = widget_or_app if isinstance(widget_or_app, QApplication) else app
        if isinstance(target_app, QApplication):
            target_app.setStyleSheet(qss)
    elif isinstance(widget_or_app, QWidget):
        widget_or_app.setStyleSheet(qss)
        widget_or_app.update()

    if theme is not None and not mgr._emitting:
        mgr._emitting = True
        try:
            mgr.theme_changed.emit(active)
        except RuntimeError:
            pass
        finally:
            mgr._emitting = False

    if isinstance(app, QApplication):
        for widget in app.allWidgets():
            if isinstance(widget, ThemeToggleButton):
                try:
                    widget.sync_theme(active)
                except RuntimeError:
                    pass

    return active


class ThemeToggleButton(QPushButton):
    """Sleek segmented Sun / Moon theme toggle pill button (72x34) for top headers."""

    def __init__(self, parent: QWidget | None = None, lang: str = "en") -> None:
        super().__init__(parent)
        self._lang = lang
        self._hovered = False
        self._theme = get_current_theme()
        self.setObjectName("ThemeToggleButton")
        self.setCursor(Qt.CursorShape.PointingHandCursor)
        self.setFixedSize(72, 34)
        self.sync_theme(self._theme)
        self.clicked.connect(self._on_clicked)
        ThemeManager.instance().theme_changed.connect(self._on_theme_changed)

    def _on_clicked(self) -> None:
        toggle_theme()

    def _on_theme_changed(self, theme: str) -> None:
        try:
            self.sync_theme(theme)
        except RuntimeError:
            pass

    def set_language(self, lang: str) -> None:
        self._lang = lang
        self.sync_theme(get_current_theme())

    def sync_theme(self, theme: str | None = None) -> None:
        active = (theme or get_current_theme()).lower()
        self._theme = "light" if active == "light" else "dark"
        is_tr = str(self._lang).lower().startswith("tr")
        if self._theme == "dark":
            tip = "Açık temaya geç (Light Mode)" if is_tr else "Switch to Light Mode"
        else:
            tip = "Koyu temaya geç (Dark Mode)" if is_tr else "Switch to Dark Mode"
        self.setToolTip(tip)
        self.setAccessibleName(tip)
        self.update()

    def enterEvent(self, event) -> None:  # noqa: N802
        self._hovered = True
        self.update()
        super().enterEvent(event)

    def leaveEvent(self, event) -> None:  # noqa: N802
        self._hovered = False
        self.update()
        super().leaveEvent(event)

    def paintEvent(self, _event) -> None:  # noqa: N802
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing, True)

        theme = get_current_theme()
        self._theme = theme
        is_light = theme == "light"
        tokens = LIGHT_TOKENS if is_light else DARK_TOKENS

        w = float(self.width())
        h = float(self.height())
        rect = QRectF(1.0, 1.0, w - 2.0, h - 2.0)

        # Outer pill track
        track_fill = QColor(tokens["surfaceHover"] if self._hovered else tokens["surface2"])
        border_col = QColor(tokens["borderFocus"] if self._hovered else tokens["borderStrong"])
        painter.setPen(QPen(border_col, 1.2))
        painter.setBrush(QBrush(track_fill))
        painter.drawRoundedRect(rect, (h - 2.0) / 2.0, (h - 2.0) / 2.0)

        # Active thumb circle (left = Sun / Light, right = Moon / Dark)
        thumb_d = h - 8.0
        thumb_x = 4.0 if is_light else (w - thumb_d - 4.0)
        thumb_rect = QRectF(thumb_x, 4.0, thumb_d, thumb_d)
        painter.setPen(Qt.PenStyle.NoPen)
        painter.setBrush(QBrush(QColor(tokens["signal"])))
        painter.drawEllipse(thumb_rect)

        # Draw Sun icon on left slot
        sun_cx = 4.0 + thumb_d / 2.0
        sun_cy = h / 2.0
        sun_col = QColor("#FFFFFF" if is_light else tokens["textSecondary"])
        painter.setPen(QPen(sun_col, 1.5, Qt.PenStyle.SolidLine, Qt.PenCapStyle.RoundCap))
        painter.setBrush(Qt.BrushStyle.NoBrush)
        painter.drawEllipse(QPointF(sun_cx, sun_cy), 3.6, 3.6)
        for i in range(8):
            ang = math.radians(i * 45.0)
            r1, r2 = 5.6, 7.4
            painter.drawLine(
                QPointF(sun_cx + math.cos(ang) * r1, sun_cy + math.sin(ang) * r1),
                QPointF(sun_cx + math.cos(ang) * r2, sun_cy + math.sin(ang) * r2),
            )

        # Draw Moon crescent on right slot
        moon_cx = w - 4.0 - thumb_d / 2.0
        moon_cy = h / 2.0
        moon_col = QColor(tokens["textSecondary"] if is_light else "#FFFFFF")
        moon_path = QPainterPath()
        moon_path.addEllipse(QPointF(moon_cx, moon_cy), 5.6, 5.6)
        cut_path = QPainterPath()
        cut_path.addEllipse(QPointF(moon_cx + 2.6, moon_cy - 1.8), 4.8, 4.8)
        crescent = moon_path.subtracted(cut_path)
        painter.setPen(Qt.PenStyle.NoPen)
        painter.setBrush(QBrush(moon_col))
        painter.drawPath(crescent)

        painter.end()


class IPScansWelcomeStage(QWidget):
    """Animated IPScans capsule particle stage + typewriter headline for Windows UI."""

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
        self._typed_chars = len(self._full_headline)
        self.setFixedHeight(78 if compact else 148)

        self._anim_timer = QTimer(self)
        self._anim_timer.setInterval(45)
        self._anim_timer.timeout.connect(self._tick)
        self._anim_timer.start()
        ThemeManager.instance().theme_changed.connect(lambda _: self.update())

    def set_copy(self, eyebrow: str, headline: str, subtitle: str = "") -> None:
        self._eyebrow = eyebrow
        self._full_headline = headline
        self._typed_chars = len(self._full_headline)
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

        is_light = get_current_theme() == "light"
        tokens = LIGHT_TOKENS if is_light else DARK_TOKENS

        rect = QRectF(0.5, 0.5, max(1.0, self.width() - 1.0), max(1.0, self.height() - 1.0))
        path = QPainterPath()
        path.addRoundedRect(rect, 16.0, 16.0)

        bg = QLinearGradient(0.0, 0.0, float(self.width()), float(self.height()))
        if is_light:
            bg.setColorAt(0.0, QColor("#EEF2FF"))
            bg.setColorAt(0.55, QColor("#F1F5F9"))
            bg.setColorAt(1.0, QColor("#E0E7FF"))
        else:
            bg.setColorAt(0.0, QColor(11, 13, 19))
            bg.setColorAt(0.55, QColor(7, 8, 12))
            bg.setColorAt(1.0, QColor(13, 16, 24))
        painter.fillPath(path, QBrush(bg))

        cols = 18 if self._compact else 22
        rows = 4 if self._compact else 6
        palette = (
            [
                QColor("#2F6BFF"),
                QColor("#3B82F6"),
                QColor("#64748B"),
                QColor("#94A3B8"),
            ]
            if is_light
            else [
                QColor(255, 255, 255),
                QColor(220, 225, 235),
                QColor(76, 130, 255),
                QColor(140, 145, 155),
            ]
        )
        painter.save()
        painter.setClipPath(path)
        for r in range(rows):
            for c in range(cols):
                nx = (c + 0.5) / cols
                ny = (r + 0.5) / rows
                dx_c = (nx - 0.35) / 0.38
                dy_c = (ny - 0.5) / 0.45
                if dx_c * dx_c + dy_c * dy_c < 0.72:
                    continue
                wave = math.sin(nx * 5.2 + self._phase + ny * 2.1)
                alpha = int(max(20, min(135, 38 + (wave + 1.0) * 35)))
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

        painter.setPen(QPen(QColor("#CBD5E1" if is_light else tokens["borderStrong"]), 1.0))
        painter.drawPath(path)

        if self._eyebrow or self._full_headline:
            left_pad = 22.0
            top_pad = 14.0 if self._compact else 18.0
            mono_font = QFont("Consolas", 8)
            mono_font.setBold(True)
            painter.setFont(mono_font)
            painter.setPen(QColor(tokens["signal"]))
            painter.drawText(
                QRectF(left_pad, top_pad, float(self.width()) - 44.0, 16.0),
                int(Qt.AlignmentFlag.AlignLeft | Qt.AlignmentFlag.AlignVCenter),
                self._eyebrow.upper(),
            )

            shown = self._full_headline[: max(1, self._typed_chars)]
            title_font = QFont("Segoe UI", 13 if self._compact else 16)
            title_font.setWeight(QFont.Weight.DemiBold)
            painter.setFont(title_font)
            painter.setPen(QColor(tokens["text"]))
            title_y = 34.0 if self._compact else 42.0
            title_rect = QRectF(left_pad, title_y, float(self.width()) - 44.0, 32.0)
            painter.drawText(
                title_rect,
                int(Qt.AlignmentFlag.AlignLeft | Qt.AlignmentFlag.AlignVCenter),
                shown,
            )

            if not self._compact and self._subtitle:
                sub_font = QFont("Segoe UI", 10)
                painter.setFont(sub_font)
                painter.setPen(QColor(tokens["textSecondary"]))
                painter.drawText(
                    QRectF(left_pad, 82.0, float(self.width()) - 44.0, 44.0),
                    int(Qt.AlignmentFlag.AlignLeft | Qt.AlignmentFlag.AlignTop | Qt.TextFlag.TextWordWrap),
                    self._subtitle,
                )

        painter.end()


# Backward compatibility alias
AntigravityWelcomeStage = IPScansWelcomeStage


class Win11SilkCanvas(QWidget):
    """Windows 11 Setup Silk Ribbon animated backdrop with harmonic Bézier waves."""

    def __init__(self, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self._phase = 0.0
        self.setAttribute(Qt.WidgetAttribute.WA_OpaquePaintEvent, False)
        self._timer = QTimer(self)
        self._timer.setInterval(33)
        self._timer.timeout.connect(self._on_tick)
        self._timer.start()
        ThemeManager.instance().theme_changed.connect(lambda _: self.update())

    def _on_tick(self) -> None:
        self._phase += 0.028
        self.update()

    def paintEvent(self, _event) -> None:  # noqa: N802
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing, True)
        w = float(self.width())
        h = float(self.height())
        if w < 10 or h < 10:
            painter.end()
            return

        is_light = get_current_theme() == "light"
        rect = QRectF(0.5, 0.5, w - 1.0, h - 1.0)
        clip = QPainterPath()
        clip.addRoundedRect(rect, 14.0, 14.0)

        bg = QLinearGradient(0, 0, w, h)
        if is_light:
            bg.setColorAt(0.0, QColor("#EEF2FF"))
            bg.setColorAt(0.5, QColor("#F1F5F9"))
            bg.setColorAt(1.0, QColor("#E0E7FF"))
        else:
            bg.setColorAt(0.0, QColor(13, 16, 24))
            bg.setColorAt(0.5, QColor(9, 11, 17))
            bg.setColorAt(1.0, QColor(17, 21, 32))
        painter.fillPath(clip, QBrush(bg))

        painter.save()
        painter.setClipPath(clip)
        wave_rgb = (47, 107, 255) if is_light else (76, 130, 255)
        for layer in range(3):
            phase_offset = self._phase + layer * 1.35
            y_base = h * (0.35 + layer * 0.18)

            path = QPainterPath()
            path.moveTo(0, h)
            path.lineTo(0, y_base + math.sin(phase_offset) * 18)

            cp1_x = w * 0.3
            cp1_y = y_base + math.sin(phase_offset + 1.2) * 28 - 18
            cp2_x = w * 0.7
            cp2_y = y_base + math.cos(phase_offset + 2.1) * 24 + 18
            end_x = w
            end_y = y_base + math.sin(phase_offset + 3.1) * 18

            path.cubicTo(cp1_x, cp1_y, cp2_x, cp2_y, end_x, end_y)
            path.lineTo(w, h)
            path.closeSubpath()

            grad = QLinearGradient(0, y_base - 24, w, h)
            grad.setColorAt(0.0, QColor(wave_rgb[0], wave_rgb[1], wave_rgb[2], 52 - layer * 10))
            grad.setColorAt(0.6, QColor(wave_rgb[0], wave_rgb[1], wave_rgb[2], 24 - layer * 5))
            grad.setColorAt(1.0, QColor(wave_rgb[0], wave_rgb[1], wave_rgb[2], 4))
            painter.fillPath(path, QBrush(grad))

            crest = QPainterPath()
            crest.moveTo(0, y_base + math.sin(phase_offset) * 18)
            crest.cubicTo(cp1_x, cp1_y, cp2_x, cp2_y, end_x, end_y)
            painter.setPen(QPen(QColor(wave_rgb[0], wave_rgb[1], wave_rgb[2], int(140 - layer * 30)), 1.5))
            painter.drawPath(crest)
        painter.restore()

        border_col = QColor("#CBD5E1" if is_light else "#222735")
        painter.setPen(QPen(border_col, 1.0))
        painter.setBrush(Qt.BrushStyle.NoBrush)
        painter.drawPath(clip)

        painter.end()

