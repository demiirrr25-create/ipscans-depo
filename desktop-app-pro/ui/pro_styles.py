"""Additive QSS for IPScans Network Health Pro — supports both Light Mode
and Dark Mode using the IPScans v2 Design System tokens.
"""
from __future__ import annotations

from app.ui.styles import DARK_TOKENS, LIGHT_TOKENS


def build_pro_qss(theme: str = "light") -> str:
    """Build additive QSS for Pro screens matching the active theme."""
    tk = LIGHT_TOKENS if theme == "light" else DARK_TOKENS
    return f"""
QTabWidget::pane {{
    border: 1px solid {tk['border_default']};
    border-radius: 16px;
    background: {tk['bg_surface']};
    top: 8px;
}}
QTabBar::tab {{
    background: {tk['bg_elevated']};
    color: {tk['text_secondary']};
    border: 1px solid {tk['border_default']};
    padding: 8px 20px;
    margin-right: 8px;
    font-size: 12px;
    font-weight: 600;
    border-radius: 12px;
}}
QTabBar::tab:hover {{
    color: {tk['text_primary']};
    background: {tk['bg_hover']};
    border-color: {tk['border_strong']};
}}
QTabBar::tab:selected {{
    color: {tk['text_inverse']};
    background: {tk['accent_primary']};
    border-color: {tk['accent_primary']};
}}

#HealthCard, #HealthHeroCard {{
    background: {tk['bg_surface']};
    border: 1px solid {tk['border_default']};
    border-radius: 16px;
}}
QLabel#HealthScoreValue {{
    color: {tk['text_primary']};
    font-size: 48px;
    font-weight: 700;
    letter-spacing: -0.03em;
}}
QLabel#HealthScoreLabel {{
    color: {tk['text_secondary']};
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.12em;
}}
QLabel#HealthSubtitle {{
    color: {tk['text_secondary']};
    font-size: 13px;
}}
#StatCard {{
    background: {tk['bg_surface']};
    border: 1px solid {tk['border_default']};
    border-radius: 14px;
}}
QLabel#StatValue {{
    color: {tk['text_primary']};
    font-size: 26px;
    font-weight: 700;
    letter-spacing: -0.02em;
}}
QLabel#StatLabel {{
    color: {tk['text_secondary']};
    font-size: 12px;
    font-weight: 500;
}}

QLabel#SeverityInfo {{
    color: {tk['info']};
    font-weight: 600;
}}
QLabel#SeverityWarning {{
    color: {tk['warning']};
    font-weight: 600;
}}
QLabel#SeverityCritical {{
    color: {tk['critical']};
    font-weight: 600;
}}

QTreeView, QTreeWidget {{
    background: {tk['bg_surface']};
    alternate-background-color: {tk['bg_elevated']};
    border: 1px solid {tk['border_default']};
    border-radius: 14px;
    outline: none;
    font-size: 12px;
    padding: 8px;
    color: {tk['text_primary']};
}}
QTreeView::item, QTreeWidget::item {{
    padding: 6px 8px;
    border: none;
}}
QTreeView::item:selected, QTreeWidget::item:selected {{
    background: {tk['accent_subtle']};
    color: {tk['text_primary']};
}}
QTreeView::branch, QTreeWidget::branch {{
    background: transparent;
}}

QScrollArea {{
    background: transparent;
    border: none;
}}
QScrollArea > QWidget > QWidget {{
    background: transparent;
}}

QScrollBar:horizontal {{
    background: transparent;
    height: 10px;
}}
QScrollBar::handle:horizontal {{
    background: {tk['border_strong']};
    border-radius: 5px;
    min-width: 24px;
}}
QScrollBar::handle:horizontal:hover {{
    background: {tk['text_tertiary']};
}}
QScrollBar::add-line:horizontal, QScrollBar::sub-line:horizontal {{
    width: 0;
}}

QComboBox {{
    border-radius: 10px;
    padding: 6px 32px 6px 14px;
}}
QComboBox::drop-down {{
    subcontrol-origin: padding;
    subcontrol-position: top right;
    width: 28px;
    border: none;
    background: transparent;
}}

QTimeEdit {{
    background: {tk['bg_surface']};
    color: {tk['text_primary']};
    border: 1px solid {tk['border_default']};
    border-radius: 10px;
    padding: 6px 12px;
    font-size: 12px;
}}
QTimeEdit::up-button, QTimeEdit::down-button {{
    border: none;
    background: transparent;
    width: 18px;
}}
"""


PRO_LIGHT_QSS = build_pro_qss("light")
PRO_DARK_QSS = build_pro_qss("dark")
PRO_EXTRA_QSS = PRO_DARK_QSS
