"""IPScans v2 Unified Design System Theme Engine for LPR Pro (Light & Dark Mode)."""
from __future__ import annotations

import math
import os
import sys
from typing import Callable

from PySide6.QtCore import QPointF, QRectF, QSettings, Qt
from PySide6.QtGui import QBrush, QColor, QPainter, QPainterPath, QPen
from PySide6.QtWidgets import QApplication, QPushButton, QWidget


LIGHT_TOKENS: dict[str, str] = {
    "bg": "#FFFFFF",
    "bg_subtle": "#F7F8FA",
    "bg-subtle": "#F7F8FA",
    "sidebar": "#F7F8FA",
    "bg_muted": "#F1F3F5",
    "bg-muted": "#F1F3F5",
    "surface": "#FFFFFF",
    "surface1": "#F7F8FA",
    "surface2": "#F1F3F5",
    "surface3": "#E8EBEF",
    "surfaceHover": "#EDF0F3",
    "border": "#E5E7EB",
    "border_rgba": "rgba(11,13,18,0.08)",
    "borderStrong": "#D1D5DB",
    "borderFocus": "#2F6BFF",
    "ink": "#0B0D12",
    "ink_2": "#464A53",
    "ink-2": "#464A53",
    "ink_3": "#616773",
    "ink-3": "#616773",
    "text": "#0B0D12",
    "textSecondary": "#464A53",
    "textTertiary": "#616773",
    "textMuted": "#8A9099",
    "textDisabled": "#B0B5BD",
    "accent": "#0B0D12",
    "accentHover": "#22252E",
    "accentText": "#FFFFFF",
    "signal": "#2F6BFF",
    "signalStrong": "#1F54E0",
    "signalSoft": "#E9F0FF",
    "stage": "#07080B",
    "stageCard": "#11131A",
    "stageBorder": "#1E222D",
    "onStage": "#F5F7FA",
    "onStageSecondary": "#A7B0C0",
    "ok": "#0F9D58",
    "warn": "#D97706",
    "bad": "#DC2626",
    "statusOk": "#0F9D58",
    "statusWarn": "#D97706",
    "statusError": "#DC2626",
    "statusInfo": "#2F6BFF",
    "overlay": "rgba(11, 13, 18, 0.45)",
}

DARK_TOKENS: dict[str, str] = {
    "bg": "#07080B",
    "bg_subtle": "#101218",
    "bg-subtle": "#101218",
    "sidebar": "#101218",
    "bg_muted": "#141821",
    "bg-muted": "#141821",
    "surface": "#07080B",
    "surface1": "#101218",
    "surface2": "#141821",
    "surface3": "#1B1F2A",
    "surfaceHover": "#222735",
    "border": "#1E222D",
    "border_rgba": "rgba(255,255,255,0.09)",
    "borderStrong": "#2C3242",
    "borderFocus": "#4C82FF",
    "ink": "#F5F7FA",
    "ink_2": "#B6BDCC",
    "ink-2": "#B6BDCC",
    "ink_3": "#919BAD",
    "ink-3": "#919BAD",
    "text": "#F5F7FA",
    "textSecondary": "#B6BDCC",
    "textTertiary": "#919BAD",
    "textMuted": "#7E899C",
    "textDisabled": "#383E4C",
    "accent": "#F5F7FA",
    "accentHover": "#E2E6EE",
    "accentText": "#07080B",
    "signal": "#4C82FF",
    "signalStrong": "#2F6BFF",
    "signalSoft": "#132042",
    "stage": "#101218",
    "stageCard": "#13161E",
    "stageBorder": "#222735",
    "onStage": "#F5F7FA",
    "onStageSecondary": "#A7B0C0",
    "ok": "#22C55E",
    "warn": "#F59E0B",
    "bad": "#EF4444",
    "statusOk": "#22C55E",
    "statusWarn": "#F59E0B",
    "statusError": "#EF4444",
    "statusInfo": "#60A5FA",
    "overlay": "rgba(0, 0, 0, 0.72)",
}

TOKENS: dict[str, dict[str, str]] = {
    "light": LIGHT_TOKENS,
    "dark": DARK_TOKENS,
}


LIGHT_STYLE = """
QMainWindow, QDialog, QWidget {
    background: #FFFFFF;
    color: #0B0D12;
    font-family: "Segoe UI Variable Text", "Segoe UI", "Inter", sans-serif;
    font-size: 13px;
}
QWidget#topBar, QFrame#topBar {
    background: #F7F8FA;
    border: 1px solid rgba(11,13,18,0.08);
    border-radius: 12px;
}
QWidget#sidebar, QFrame#sidebar, QWidget#navRail, QFrame#navRail {
    background: #F7F8FA;
    border: 1px solid rgba(11,13,18,0.08);
    border-radius: 14px;
}
QFrame#card, QWidget#card, QFrame#statCard, QWidget#statCard {
    background: #F7F8FA;
    border: 1px solid rgba(11,13,18,0.08);
    border-radius: 14px;
    padding: 8px;
}
QFrame#eventCard {
    background: #F7F8FA;
    border: 1px solid rgba(11,13,18,0.09);
    border-radius: 14px;
    padding: 6px;
}
QFrame#eventCard:hover {
    border-color: rgba(47,107,255,0.35);
    background: #F4F6F9;
}
QFrame#heroCard, QWidget#heroCard, QFrame#Win11GlassCard {
    background: #F1F3F5;
    border: 1px solid rgba(11,13,18,0.08);
    border-radius: 18px;
    padding: 12px;
}
QLabel {
    background: transparent;
    color: #0B0D12;
}
QLabel#brand {
    font-family: "Segoe UI Variable Display", "Segoe UI", sans-serif;
    font-size: 15px;
    font-weight: 700;
    letter-spacing: 1.2px;
    color: #0B0D12;
}
QLabel#pageTitle {
    font-family: "Segoe UI Variable Display", "Segoe UI", sans-serif;
    font-size: 20px;
    font-weight: 600;
    letter-spacing: -0.3px;
    color: #0B0D12;
}
QLabel#title {
    font-family: "Segoe UI Variable Display", "Segoe UI", sans-serif;
    font-size: 24px;
    font-weight: 600;
    letter-spacing: -0.4px;
    color: #0B0D12;
}
QLabel#secondary {
    color: #464A53;
}
QLabel#muted {
    color: #616773;
}
QLabel#section {
    color: #616773;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 1.4px;
}
QLabel#accountPill, QLabel#metricPill {
    background: #F1F3F5;
    color: #464A53;
    border: 1px solid #E5E7EB;
    border-radius: 10px;
    padding: 4px 12px;
    font-size: 12px;
    font-weight: 600;
}
QLabel#healthPill {
    background: #E9F0FF;
    color: #1F54E0;
    border: 1px solid rgba(47,107,255,0.22);
    border-radius: 10px;
    padding: 4px 12px;
    font-size: 12px;
    font-weight: 600;
}
QLabel#statusBanner {
    background: #F7F8FA;
    color: #616773;
    border: 1px solid rgba(11,13,18,0.08);
    border-radius: 8px;
    padding: 4px 12px;
    font-size: 11.5px;
    font-weight: 500;
}
QLabel#emptyStateCard {
    background: #F7F8FA;
    color: #0B0D12;
    border: 1px dashed #D1D5DB;
    border-radius: 16px;
    padding: 48px 32px;
    qproperty-alignment: AlignCenter;
    font-size: 14px;
    font-weight: 600;
}
QLabel#emptyFeedCard {
    background: #F7F8FA;
    color: #616773;
    border: 1px dashed #D1D5DB;
    border-radius: 12px;
    padding: 28px 16px;
    qproperty-alignment: AlignCenter;
    font-size: 12.5px;
}
QLabel#statusOkBadge {
    background: rgba(15, 157, 88, 0.12);
    color: #0F9D58;
    border: 1px solid rgba(15, 157, 88, 0.28);
    border-radius: 7px;
    padding: 2px 8px;
    font-size: 11px;
    font-weight: 700;
}
QLabel#statusWarnBadge {
    background: rgba(217, 119, 6, 0.12);
    color: #D97706;
    border: 1px solid rgba(217, 119, 6, 0.28);
    border-radius: 7px;
    padding: 2px 8px;
    font-size: 11px;
    font-weight: 700;
}
QLabel#statusBadBadge {
    background: rgba(220, 38, 38, 0.12);
    color: #DC2626;
    border: 1px solid rgba(220, 38, 38, 0.28);
    border-radius: 7px;
    padding: 2px 8px;
    font-size: 11px;
    font-weight: 700;
}
QLabel#statusNeutralBadge {
    background: #EDF0F3;
    color: #464A53;
    border: 1px solid #D1D5DB;
    border-radius: 7px;
    padding: 2px 8px;
    font-size: 11px;
    font-weight: 700;
}
QLabel#preview {
    background: #07080B;
    border: 1px solid #1E222D;
    border-radius: 16px;
    color: #A7B0C0;
}
QPushButton {
    background: #F7F8FA;
    color: #0B0D12;
    border: 1px solid #D1D5DB;
    border-radius: 10px;
    padding: 7px 14px;
    min-height: 18px;
    font-weight: 600;
}
QPushButton:hover {
    background: #EDF0F3;
    border-color: #2F6BFF;
    color: #0B0D12;
}
QPushButton:pressed {
    background: #E8EBEF;
}
QPushButton:focus {
    border: 1px solid #2F6BFF;
}
QPushButton:disabled {
    color: #B0B5BD;
    background: #F7F8FA;
    border-color: rgba(11,13,18,0.06);
}
QPushButton#primary, QPushButton#primaryBtn {
    background: #2F6BFF;
    color: #FFFFFF;
    border: 1px solid #2F6BFF;
    font-weight: 600;
}
QPushButton#primary:hover, QPushButton#primaryBtn:hover {
    background: #1F54E0;
    border-color: #1F54E0;
    color: #FFFFFF;
}
QPushButton#plateBadgeBtn {
    background: #0B0D12;
    color: #FFFFFF;
    border: 1px solid #22252E;
    border-radius: 8px;
    padding: 5px 12px;
    font-family: "Cascadia Code", "JetBrains Mono", "Consolas", monospace;
    font-size: 13.5px;
    font-weight: 700;
    letter-spacing: 1px;
}
QPushButton#plateBadgeBtn:hover {
    background: #2F6BFF;
    border-color: #2F6BFF;
    color: #FFFFFF;
}
QPushButton#secondaryBtn {
    background: #F1F3F5;
    color: #0B0D12;
    border: 1px solid #D1D5DB;
    font-weight: 600;
}
QPushButton#secondaryBtn:hover {
    background: #E8EBEF;
    border-color: #2F6BFF;
}
QPushButton#ghostBtn {
    background: transparent;
    color: #464A53;
    border: 1px solid transparent;
}
QPushButton#ghostBtn:hover {
    background: #EDF0F3;
    color: #0B0D12;
}
QPushButton#dangerBtn {
    background: rgba(220,38,38,0.08);
    color: #DC2626;
    border: 1px solid rgba(220,38,38,0.28);
    font-weight: 600;
}
QPushButton#dangerBtn:hover {
    background: #DC2626;
    color: #FFFFFF;
    border-color: #DC2626;
}
QPushButton#themeToggleBtn {
    background: #F1F3F5;
    color: #0B0D12;
    border: 1px solid rgba(11,13,18,0.12);
    border-radius: 17px;
    padding: 6px 14px;
    font-weight: 600;
}
QPushButton#themeToggleBtn:hover {
    background: #E9F0FF;
    border-color: #2F6BFF;
    color: #2F6BFF;
}
QLineEdit, QComboBox, QSpinBox, QDoubleSpinBox, QDateTimeEdit, QTextEdit {
    background: #FFFFFF;
    color: #0B0D12;
    border: 1px solid #D1D5DB;
    border-radius: 10px;
    padding: 7px 12px;
    min-height: 20px;
    selection-background-color: #2F6BFF;
    selection-color: #FFFFFF;
}
QLineEdit:focus, QComboBox:focus, QSpinBox:focus, QDoubleSpinBox:focus, QDateTimeEdit:focus, QTextEdit:focus {
    border: 1.5px solid #2F6BFF;
}
QLineEdit:disabled, QComboBox:disabled, QSpinBox:disabled, QDoubleSpinBox:disabled, QDateTimeEdit:disabled {
    background: #F1F3F5;
    color: #616773;
    border-color: rgba(11,13,18,0.08);
}
QComboBox::drop-down, QDateTimeEdit::drop-down {
    border: none;
    background: transparent;
    width: 24px;
    subcontrol-origin: padding;
    subcontrol-position: top right;
    border-top-right-radius: 10px;
    border-bottom-right-radius: 10px;
}
QSpinBox::up-button, QSpinBox::down-button,
QDoubleSpinBox::up-button, QDoubleSpinBox::down-button,
QDateTimeEdit::up-button, QDateTimeEdit::down-button {
    border: none;
    background: transparent;
    width: 22px;
    subcontrol-origin: border;
}
QSpinBox::up-button:hover, QSpinBox::down-button:hover,
QDoubleSpinBox::up-button:hover, QDoubleSpinBox::down-button:hover,
QDateTimeEdit::up-button:hover, QDateTimeEdit::down-button:hover,
QComboBox::drop-down:hover, QDateTimeEdit::drop-down:hover {
    background: rgba(47, 107, 255, 0.10);
    border-radius: 5px;
}
QComboBox QAbstractItemView {
    background: #FFFFFF;
    color: #0B0D12;
    border: 1px solid #D1D5DB;
    border-radius: 10px;
    selection-background-color: #E9F0FF;
    selection-color: #0B0D12;
}
QTableWidget, QListWidget {
    background: #FFFFFF;
    alternate-background-color: #F7F8FA;
    color: #0B0D12;
    border: 1px solid rgba(11,13,18,0.09);
    border-radius: 12px;
    gridline-color: rgba(11,13,18,0.06);
    selection-background-color: #E9F0FF;
    selection-color: #0B0D12;
}
QTableWidget::item, QListWidget::item {
    padding: 6px 8px;
    color: #0B0D12;
}
QTableWidget::item:selected, QListWidget::item:selected {
    background: #E9F0FF;
    color: #0B0D12;
}
QHeaderView::section {
    background: #F7F8FA;
    color: #616773;
    border: 0;
    border-bottom: 1px solid rgba(11,13,18,0.08);
    padding: 9px 8px;
    font-weight: 600;
}
QListWidget#navigation {
    border: 1px solid rgba(11,13,18,0.08);
    border-radius: 14px;
    background: #F7F8FA;
    font-size: 13px;
    padding: 6px 4px;
    outline: none;
}
QListWidget#navigation::item {
    padding: 10px 14px;
    margin: 2px 6px;
    border-radius: 10px;
    color: #464A53;
    font-weight: 600;
}
QListWidget#navigation::item:hover {
    background: #EDF0F3;
    color: #0B0D12;
}
QListWidget#navigation::item:selected {
    background: #2F6BFF;
    color: #FFFFFF;
    font-weight: 600;
}
QTabWidget::pane {
    border: 0;
    background: transparent;
}
QTabBar::tab {
    background: #F1F3F5;
    color: #464A53;
    border: 1px solid rgba(11,13,18,0.08);
    border-radius: 10px;
    padding: 7px 16px;
    margin-right: 6px;
    margin-bottom: 6px;
    font-weight: 600;
}
QTabBar::tab:hover {
    background: #EDF0F3;
    color: #0B0D12;
}
QTabBar::tab:selected {
    background: #0B0D12;
    color: #FFFFFF;
    border-color: #0B0D12;
    font-weight: 600;
}
QGroupBox {
    background: #F7F8FA;
    border: 1px solid rgba(11,13,18,0.08);
    border-radius: 14px;
    margin-top: 12px;
    padding-top: 12px;
    font-weight: 600;
    color: #0B0D12;
}
QGroupBox::title {
    subcontrol-origin: margin;
    left: 14px;
    padding: 0 6px;
    color: #464A53;
}
QScrollArea {
    border: 0;
    background: transparent;
}
QSplitter::handle {
    background: rgba(11,13,18,0.08);
    width: 1px;
    height: 1px;
}
QCheckBox {
    color: #0B0D12;
    spacing: 8px;
}
QCheckBox::indicator {
    width: 16px;
    height: 16px;
    border: 1px solid #616773;
    background: #FFFFFF;
    border-radius: 5px;
}
QCheckBox::indicator:hover {
    border-color: #2F6BFF;
}
QCheckBox::indicator:checked {
    background: #2F6BFF;
    border: 1px solid #2F6BFF;
}
QScrollBar:vertical {
    background: transparent;
    width: 10px;
    margin: 2px;
}
QScrollBar::handle:vertical {
    background: #D1D5DB;
    min-height: 24px;
    border-radius: 4px;
}
QScrollBar::handle:vertical:hover {
    background: #8A9099;
}
QScrollBar:horizontal {
    background: transparent;
    height: 10px;
    margin: 2px;
}
QScrollBar::handle:horizontal {
    background: #D1D5DB;
    min-width: 24px;
    border-radius: 4px;
}
QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical,
QScrollBar::add-line:horizontal, QScrollBar::sub-line:horizontal {
    height: 0px;
    width: 0px;
}
QMenu {
    background: #FFFFFF;
    color: #0B0D12;
    border: 1px solid rgba(11,13,18,0.12);
    border-radius: 12px;
    padding: 6px;
}
QMenu::item {
    padding: 8px 16px;
    border-radius: 8px;
}
QMenu::item:selected {
    background: #E9F0FF;
    color: #2F6BFF;
}
QToolTip {
    background: #0B0D12;
    color: #FFFFFF;
    border: 1px solid #22252E;
    border-radius: 8px;
    padding: 6px 10px;
}
"""


DARK_STYLE = """
QMainWindow, QDialog, QWidget {
    background: #07080B;
    color: #F5F7FA;
    font-family: "Segoe UI Variable Text", "Segoe UI", "Inter", sans-serif;
    font-size: 13px;
}
QWidget#topBar, QFrame#topBar {
    background: #101218;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 12px;
}
QWidget#sidebar, QFrame#sidebar, QWidget#navRail, QFrame#navRail {
    background: #101218;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 14px;
}
QFrame#card, QWidget#card, QFrame#statCard, QWidget#statCard {
    background: #101218;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 14px;
    padding: 8px;
}
QFrame#eventCard {
    background: #101218;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 14px;
    padding: 6px;
}
QFrame#eventCard:hover {
    border-color: rgba(76,130,255,0.40);
    background: #12151E;
}
QFrame#heroCard, QWidget#heroCard, QFrame#Win11GlassCard {
    background: #141821;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 18px;
    padding: 12px;
}
QLabel {
    background: transparent;
    color: #F5F7FA;
}
QLabel#brand {
    font-family: "Segoe UI Variable Display", "Segoe UI", sans-serif;
    font-size: 15px;
    font-weight: 700;
    letter-spacing: 1.2px;
    color: #F5F7FA;
}
QLabel#pageTitle {
    font-family: "Segoe UI Variable Display", "Segoe UI", sans-serif;
    font-size: 20px;
    font-weight: 600;
    letter-spacing: -0.3px;
    color: #F5F7FA;
}
QLabel#title {
    font-family: "Segoe UI Variable Display", "Segoe UI", sans-serif;
    font-size: 24px;
    font-weight: 600;
    letter-spacing: -0.4px;
    color: #F5F7FA;
}
QLabel#secondary {
    color: #B6BDCC;
}
QLabel#muted {
    color: #919BAD;
}
QLabel#section {
    color: #919BAD;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 1.4px;
}
QLabel#accountPill, QLabel#metricPill {
    background: #141821;
    color: #B6BDCC;
    border: 1px solid #1E222D;
    border-radius: 10px;
    padding: 4px 12px;
    font-size: 12px;
    font-weight: 600;
}
QLabel#healthPill {
    background: #132042;
    color: #60A5FA;
    border: 1px solid rgba(76,130,255,0.28);
    border-radius: 10px;
    padding: 4px 12px;
    font-size: 12px;
    font-weight: 600;
}
QLabel#statusBanner {
    background: #101218;
    color: #919BAD;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 8px;
    padding: 4px 12px;
    font-size: 11.5px;
    font-weight: 500;
}
QLabel#emptyStateCard {
    background: #101218;
    color: #F5F7FA;
    border: 1px dashed #2C3242;
    border-radius: 16px;
    padding: 48px 32px;
    qproperty-alignment: AlignCenter;
    font-size: 14px;
    font-weight: 600;
}
QLabel#emptyFeedCard {
    background: #101218;
    color: #919BAD;
    border: 1px dashed #2C3242;
    border-radius: 12px;
    padding: 28px 16px;
    qproperty-alignment: AlignCenter;
    font-size: 12.5px;
}
QLabel#statusOkBadge {
    background: rgba(34, 197, 94, 0.14);
    color: #22C55E;
    border: 1px solid rgba(34, 197, 94, 0.32);
    border-radius: 7px;
    padding: 2px 8px;
    font-size: 11px;
    font-weight: 700;
}
QLabel#statusWarnBadge {
    background: rgba(245, 158, 11, 0.14);
    color: #F59E0B;
    border: 1px solid rgba(245, 158, 11, 0.32);
    border-radius: 7px;
    padding: 2px 8px;
    font-size: 11px;
    font-weight: 700;
}
QLabel#statusBadBadge {
    background: rgba(239, 68, 68, 0.14);
    color: #EF4444;
    border: 1px solid rgba(239, 68, 68, 0.32);
    border-radius: 7px;
    padding: 2px 8px;
    font-size: 11px;
    font-weight: 700;
}
QLabel#statusNeutralBadge {
    background: #141821;
    color: #B6BDCC;
    border: 1px solid #2C3242;
    border-radius: 7px;
    padding: 2px 8px;
    font-size: 11px;
    font-weight: 700;
}
QLabel#preview {
    background: #101218;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 16px;
    color: #B6BDCC;
}
QPushButton {
    background: #141821;
    color: #F5F7FA;
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 10px;
    padding: 7px 14px;
    min-height: 18px;
    font-weight: 600;
}
QPushButton:hover {
    background: #222735;
    border-color: #4C82FF;
    color: #F5F7FA;
}
QPushButton:pressed {
    background: #1B1F2A;
}
QPushButton:focus {
    border: 1px solid #4C82FF;
}
QPushButton:disabled {
    color: #919BAD;
    background: #101218;
    border-color: rgba(255,255,255,0.05);
}
QPushButton#primary, QPushButton#primaryBtn {
    background: #4C82FF;
    color: #FFFFFF;
    border: 1px solid #4C82FF;
    font-weight: 600;
}
QPushButton#primary:hover, QPushButton#primaryBtn:hover {
    background: #2F6BFF;
    border-color: #2F6BFF;
    color: #FFFFFF;
}
QPushButton#plateBadgeBtn {
    background: #141821;
    color: #F5F7FA;
    border: 1px solid #2C3242;
    border-radius: 8px;
    padding: 5px 12px;
    font-family: "Cascadia Code", "JetBrains Mono", "Consolas", monospace;
    font-size: 13.5px;
    font-weight: 700;
    letter-spacing: 1px;
}
QPushButton#plateBadgeBtn:hover {
    background: #4C82FF;
    border-color: #4C82FF;
    color: #FFFFFF;
}
QPushButton#secondaryBtn {
    background: #141821;
    color: #F5F7FA;
    border: 1px solid #2C3242;
    font-weight: 600;
}
QPushButton#secondaryBtn:hover {
    background: #222735;
    border-color: #4C82FF;
}
QPushButton#ghostBtn {
    background: transparent;
    color: #B6BDCC;
    border: 1px solid transparent;
}
QPushButton#ghostBtn:hover {
    background: #222735;
    color: #F5F7FA;
}
QPushButton#dangerBtn {
    background: rgba(239,68,68,0.12);
    color: #EF4444;
    border: 1px solid rgba(239,68,68,0.32);
    font-weight: 600;
}
QPushButton#dangerBtn:hover {
    background: #EF4444;
    color: #FFFFFF;
    border-color: #EF4444;
}
QPushButton#themeToggleBtn {
    background: #141821;
    color: #F5F7FA;
    border: 1px solid rgba(255,255,255,0.14);
    border-radius: 17px;
    padding: 6px 14px;
    font-weight: 600;
}
QPushButton#themeToggleBtn:hover {
    background: #132042;
    border-color: #4C82FF;
    color: #4C82FF;
}
QLineEdit, QComboBox, QSpinBox, QDoubleSpinBox, QDateTimeEdit, QTextEdit {
    background: #101218;
    color: #F5F7FA;
    border: 1px solid #2C3242;
    border-radius: 10px;
    padding: 7px 12px;
    min-height: 20px;
    selection-background-color: #4C82FF;
    selection-color: #FFFFFF;
}
QLineEdit:focus, QComboBox:focus, QSpinBox:focus, QDoubleSpinBox:focus, QDateTimeEdit:focus, QTextEdit:focus {
    border: 1.5px solid #4C82FF;
}
QLineEdit:disabled, QComboBox:disabled, QSpinBox:disabled, QDoubleSpinBox:disabled, QDateTimeEdit:disabled {
    background: #07080B;
    color: #919BAD;
    border-color: rgba(255,255,255,0.06);
}
QComboBox::drop-down, QDateTimeEdit::drop-down {
    border: none;
    background: transparent;
    width: 24px;
    subcontrol-origin: padding;
    subcontrol-position: top right;
    border-top-right-radius: 10px;
    border-bottom-right-radius: 10px;
}
QSpinBox::up-button, QSpinBox::down-button,
QDoubleSpinBox::up-button, QDoubleSpinBox::down-button,
QDateTimeEdit::up-button, QDateTimeEdit::down-button {
    border: none;
    background: transparent;
    width: 22px;
    subcontrol-origin: border;
}
QSpinBox::up-button:hover, QSpinBox::down-button:hover,
QDoubleSpinBox::up-button:hover, QDoubleSpinBox::down-button:hover,
QDateTimeEdit::up-button:hover, QDateTimeEdit::down-button:hover,
QComboBox::drop-down:hover, QDateTimeEdit::drop-down:hover {
    background: rgba(76, 130, 255, 0.16);
    border-radius: 5px;
}
QComboBox QAbstractItemView {
    background: #101218;
    color: #F5F7FA;
    border: 1px solid #2C3242;
    border-radius: 10px;
    selection-background-color: #132042;
    selection-color: #F5F7FA;
}
QTableWidget, QListWidget {
    background: #101218;
    alternate-background-color: #141821;
    color: #F5F7FA;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 12px;
    gridline-color: rgba(255,255,255,0.06);
    selection-background-color: #132042;
    selection-color: #F5F7FA;
}
QTableWidget::item, QListWidget::item {
    padding: 6px 8px;
    color: #F5F7FA;
}
QTableWidget::item:selected, QListWidget::item:selected {
    background: #132042;
    color: #F5F7FA;
}
QHeaderView::section {
    background: #07080B;
    color: #919BAD;
    border: 0;
    border-bottom: 1px solid rgba(255,255,255,0.09);
    padding: 9px 8px;
    font-weight: 600;
}
QListWidget#navigation {
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 14px;
    background: #101218;
    font-size: 13px;
    padding: 6px 4px;
    outline: none;
}
QListWidget#navigation::item {
    padding: 10px 14px;
    margin: 2px 6px;
    border-radius: 10px;
    color: #B6BDCC;
    font-weight: 600;
}
QListWidget#navigation::item:hover {
    background: #222735;
    color: #F5F7FA;
}
QListWidget#navigation::item:selected {
    background: #4C82FF;
    color: #FFFFFF;
    font-weight: 600;
}
QTabWidget::pane {
    border: 0;
    background: transparent;
}
QTabBar::tab {
    background: #101218;
    color: #B6BDCC;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 10px;
    padding: 7px 16px;
    margin-right: 6px;
    margin-bottom: 6px;
    font-weight: 600;
}
QTabBar::tab:hover {
    background: #222735;
    color: #F5F7FA;
}
QTabBar::tab:selected {
    background: #F5F7FA;
    color: #07080B;
    border-color: #F5F7FA;
    font-weight: 600;
}
QGroupBox {
    background: #101218;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 14px;
    margin-top: 12px;
    padding-top: 12px;
    font-weight: 600;
    color: #F5F7FA;
}
QGroupBox::title {
    subcontrol-origin: margin;
    left: 14px;
    padding: 0 6px;
    color: #B6BDCC;
}
QScrollArea {
    border: 0;
    background: transparent;
}
QSplitter::handle {
    background: rgba(255,255,255,0.09);
    width: 1px;
    height: 1px;
}
QCheckBox {
    color: #F5F7FA;
    spacing: 8px;
}
QCheckBox::indicator {
    width: 16px;
    height: 16px;
    border: 1px solid #919BAD;
    background: #101218;
    border-radius: 5px;
}
QCheckBox::indicator:hover {
    border-color: #4C82FF;
}
QCheckBox::indicator:checked {
    background: #4C82FF;
    border: 1px solid #4C82FF;
}
QScrollBar:vertical {
    background: transparent;
    width: 10px;
    margin: 2px;
}
QScrollBar::handle:vertical {
    background: #2C3242;
    min-height: 24px;
    border-radius: 4px;
}
QScrollBar::handle:vertical:hover {
    background: #7E899C;
}
QScrollBar:horizontal {
    background: transparent;
    height: 10px;
    margin: 2px;
}
QScrollBar::handle:horizontal {
    background: #2C3242;
    min-width: 24px;
    border-radius: 4px;
}
QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical,
QScrollBar::add-line:horizontal, QScrollBar::sub-line:horizontal {
    height: 0px;
    width: 0px;
}
QMenu {
    background: #101218;
    color: #F5F7FA;
    border: 1px solid rgba(255,255,255,0.14);
    border-radius: 12px;
    padding: 6px;
}
QMenu::item {
    padding: 8px 16px;
    border-radius: 8px;
}
QMenu::item:selected {
    background: #132042;
    color: #4C82FF;
}
QToolTip {
    background: #141821;
    color: #F5F7FA;
    border: 1px solid #2C3242;
    border-radius: 8px;
    padding: 6px 10px;
}
"""

_active_theme: str | None = None
_listeners: list[Callable[[str], None]] = []


def detect_os_theme() -> str:
    """Detect Windows OS theme via AppsUseLightTheme registry key, defaulting to dark."""
    if os.name == "nt" or sys.platform == "win32":
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


def persist_theme(mode: str | None = None) -> str:
    """Persist the chosen theme ('light' or 'dark') in QSettings('IPScans', 'LPRPro')."""
    target = (mode or get_theme()).strip().lower()
    normalized = "light" if target == "light" else "dark"
    try:
        settings = QSettings("IPScans", "LPRPro")
        settings.setValue("ui/theme", normalized)
        settings.sync()
    except Exception:
        pass
    return normalized


def get_theme() -> str:
    """Return active theme ('light' or 'dark'), initializing from QSettings or OS theme."""
    global _active_theme
    if _active_theme in ("light", "dark"):
        return _active_theme
    try:
        settings = QSettings("IPScans", "LPRPro")
        saved = settings.value("ui/theme")
        if isinstance(saved, str) and saved.strip().lower() in ("light", "dark"):
            _active_theme = saved.strip().lower()
            return _active_theme
    except Exception:
        pass
    _active_theme = detect_os_theme()
    return _active_theme


def get_tokens(mode: str | None = None) -> dict[str, str]:
    """Return the token dictionary for the active or requested theme mode."""
    target = (mode or get_theme()).strip().lower()
    return LIGHT_TOKENS if target == "light" else DARK_TOKENS


def get_stylesheet(mode: str | None = None) -> str:
    """Return the QSS stylesheet for the active or requested theme mode."""
    target = (mode or get_theme()).strip().lower()
    return LIGHT_STYLE if target == "light" else DARK_STYLE


class LPRThemeToggleButton(QPushButton):
    """Segmented Sun / Moon theme toggle pill button matching IPscans+ and Network Health Pro."""

    def __init__(self, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self._hovered = False
        self.setObjectName("themeToggleBtn")
        self.setCursor(Qt.CursorShape.PointingHandCursor)
        self.setFixedSize(68, 34)
        self.setAccessibleName("Tema değiştir / Toggle theme")
        update_theme_toggle_button(self)
        self.clicked.connect(lambda _checked=False: toggle_theme())

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

        is_light = get_theme() == "light"
        tokens = LIGHT_TOKENS if is_light else DARK_TOKENS

        w = float(self.width())
        h = float(self.height())
        rect = QRectF(1.0, 1.0, w - 2.0, h - 2.0)

        track_fill = QColor(tokens["surfaceHover"] if self._hovered else tokens["surface2"])
        border_col = QColor(tokens["borderFocus"] if self._hovered else tokens["borderStrong"])
        painter.setPen(QPen(border_col, 1.2))
        painter.setBrush(QBrush(track_fill))
        painter.drawRoundedRect(rect, (h - 2.0) / 2.0, (h - 2.0) / 2.0)

        thumb_d = h - 8.0
        thumb_x = 4.0 if is_light else (w - thumb_d - 4.0)
        thumb_rect = QRectF(thumb_x, 4.0, thumb_d, thumb_d)
        painter.setPen(Qt.PenStyle.NoPen)
        painter.setBrush(QBrush(QColor(tokens["signal"])))
        painter.drawEllipse(thumb_rect)

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


def update_theme_toggle_button(button: QPushButton, mode: str | None = None) -> None:
    """Synchronize a Sun/Moon theme toggle button's tooltip and repaint."""
    current = (mode or get_theme()).strip().lower()
    if current == "light":
        button.setToolTip("Koyu temaya geç / Switch to Dark Mode")
    else:
        button.setToolTip("Açık temaya geç / Switch to Light Mode")
    button.update()


def create_theme_toggle_button(parent: QWidget | None = None) -> QPushButton:
    """Create a standard Sun/Moon theme toggle pill button wired to toggle_theme()."""
    return LPRThemeToggleButton(parent)


def _sync_widget_tree(widget: QWidget, qss: str, resolved_mode: str) -> None:
    """Apply theme stylesheet to a root widget and clear stale child stylesheets."""
    if widget.parentWidget() is None:
        widget.setStyleSheet(qss)
    else:
        widget.setStyleSheet("")
    if widget.objectName() == "themeToggleBtn" and isinstance(widget, QPushButton):
        update_theme_toggle_button(widget, resolved_mode)
    if hasattr(widget, "on_theme_changed"):
        try:
            widget.on_theme_changed(resolved_mode)
        except Exception:
            pass
    for child in widget.findChildren(QWidget):
        try:
            child_qss = child.styleSheet()
            if child_qss and (
                "QMainWindow" in child_qss
                or "QWidget" in child_qss
                or "QTableWidget" in child_qss
                or "#07080B" in child_qss
                or "#101218" in child_qss
                or "#FFFFFF" in child_qss
                or "#F7F8FA" in child_qss
            ):
                child.setStyleSheet("")
            if child.objectName() == "themeToggleBtn" and isinstance(child, QPushButton):
                update_theme_toggle_button(child, resolved_mode)
            if hasattr(child, "on_theme_changed"):
                child.on_theme_changed(resolved_mode)
            st = child.style()
            if st is not None:
                st.unpolish(child)
                st.polish(child)
            child.update()
        except RuntimeError:
            pass
    st = widget.style()
    if st is not None:
        st.unpolish(widget)
        st.polish(widget)
    widget.update()


def apply_theme(widget: QWidget | None = None, mode: str | None = None) -> str:
    """Apply the active or specified theme QSS to a widget and/or running QApplication."""
    global _active_theme, STYLE
    if mode is not None:
        normalized = "light" if str(mode).strip().lower() == "light" else "dark"
        _active_theme = normalized
        STYLE = get_stylesheet(normalized)
    else:
        normalized = "light" if get_theme() == "light" else "dark"
    qss = get_stylesheet(normalized)
    app = QApplication.instance()
    if app is not None:
        app.setStyleSheet(qss)
    if widget is not None:
        _sync_widget_tree(widget, qss, normalized)
    return normalized


def set_theme(
    mode: str,
    target: QWidget | QApplication | None = None,
    *,
    app: QApplication | QWidget | None = None,
    persist: bool = True,
) -> str:
    """Set the active theme ('light' or 'dark'), persist it, and refresh all live widgets."""
    global _active_theme, STYLE
    normalized = "light" if str(mode).strip().lower() == "light" else "dark"
    _active_theme = normalized
    STYLE = get_stylesheet(normalized)
    if persist:
        persist_theme(normalized)

    qss = STYLE
    qapp = app if isinstance(app, QApplication) else QApplication.instance()
    if qapp is not None:
        qapp.setStyleSheet(qss)
        for top in qapp.topLevelWidgets():
            try:
                _sync_widget_tree(top, qss, normalized)
            except RuntimeError:
                pass
    for widget in (target, app):
        if isinstance(widget, QWidget):
            try:
                _sync_widget_tree(widget, qss, normalized)
            except RuntimeError:
                pass

    for callback in list(_listeners):
        try:
            callback(normalized)
        except Exception:
            pass
    return normalized


def toggle_theme(
    target: QWidget | QApplication | None = None,
    *,
    app: QApplication | QWidget | None = None,
    persist: bool = True,
) -> str:
    """Toggle between Light Mode and Dark Mode and return the new mode."""
    next_mode = "light" if get_theme() == "dark" else "dark"
    return set_theme(next_mode, target=target, app=app, persist=persist)


def register_theme_listener(callback: Callable[[str], None]) -> None:
    """Register a callback invoked whenever the theme changes."""
    if callback not in _listeners:
        _listeners.append(callback)


STYLE = get_stylesheet()

