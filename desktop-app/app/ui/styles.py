"""Monochrome (black/white/gray) dark theme — matches ipscans.com's palette.
Applied globally (including QMessageBox/QToolTip popups) so no native,
unstyled white-background/black-text widget ever appears.
"""

DARK_QSS = """
* {
    font-family: "Segoe UI", "Inter", Arial, sans-serif;
    color: #ffffff;
    outline: none;
}

#AppRoot {
    background-color: #000000;
}

#RootCard {
    background-color: #0a0a0a;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 16px;
}

#TitleBar {
    background: transparent;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

#TitleBar QLabel#TitleText {
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.3px;
}

QPushButton#WindowButton {
    background: transparent;
    border: none;
    border-radius: 6px;
    color: rgba(255, 255, 255, 0.7);
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
    border: 1px solid rgba(255, 255, 255, 0.4);
    background: rgba(255, 255, 255, 0.04);
}
QRadioButton::indicator:checked {
    border: 1px solid #ffffff;
    background: qradialgradient(cx:0.5, cy:0.5, radius:0.5,
        stop:0 #ffffff, stop:0.5 #ffffff, stop:0.6 transparent, stop:1 transparent);
}

QLineEdit, QComboBox {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 10px;
    padding: 8px 12px;
    font-size: 13px;
    selection-background-color: #ffffff;
    selection-color: #000000;
}
QLineEdit:focus, QComboBox:focus {
    border: 1px solid rgba(255, 255, 255, 0.55);
}

QPushButton#PrimaryButton {
    background: #ffffff;
    color: #000000;
    border: none;
    border-radius: 10px;
    padding: 9px 20px;
    font-weight: 600;
    font-size: 13px;
}
QPushButton#PrimaryButton:hover {
    background: #e6e6e6;
}
QPushButton#PrimaryButton:disabled {
    background: rgba(255, 255, 255, 0.25);
    color: rgba(0, 0, 0, 0.5);
}

QPushButton#GhostButton {
    background: transparent;
    color: #ffffff;
    border: 1px solid rgba(255, 255, 255, 0.25);
    border-radius: 10px;
    padding: 9px 18px;
    font-size: 13px;
}
QPushButton#GhostButton:hover {
    background: rgba(255, 255, 255, 0.08);
}

QTableView {
    background: rgba(255, 255, 255, 0.02);
    alternate-background-color: rgba(255, 255, 255, 0.035);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    gridline-color: rgba(255, 255, 255, 0.06);
    font-size: 12px;
}
QTableView::item {
    padding: 6px 8px;
    border: none;
}
QTableView::item:selected {
    background: rgba(255, 255, 255, 0.14);
    color: #ffffff;
}
QHeaderView::section {
    background-color: #141414;
    color: rgba(255, 255, 255, 0.65);
    border: none;
    border-bottom: 1px solid rgba(255, 255, 255, 0.14);
    padding: 8px;
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
    background: rgba(255, 255, 255, 0.3);
}
QScrollBar::add-line, QScrollBar::sub-line {
    height: 0;
}

QLabel#StatusLabel {
    color: rgba(255, 255, 255, 0.55);
    font-size: 12px;
}

QLabel#SectionLabel {
    color: rgba(255, 255, 255, 0.5);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
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
    background: #ffffff;
    border-radius: 4px;
}

QToolTip {
    background: #1a1a1a;
    color: #ffffff;
    border: 1px solid rgba(255, 255, 255, 0.2);
    padding: 4px 8px;
    border-radius: 6px;
}

/* QMessageBox/QDialog popups are separate top-level windows — Fusion still
   paints their own light background unless explicitly overridden here,
   which is what made warning/error dialogs unreadable. */
QDialog, QMessageBox {
    background-color: #0a0a0a;
}
QMessageBox QLabel {
    color: #ffffff;
    background: transparent;
}
QDialog QPushButton, QMessageBox QPushButton {
    background: #ffffff;
    color: #000000;
    border: none;
    border-radius: 8px;
    padding: 6px 16px;
    min-width: 64px;
}
QDialog QPushButton:hover, QMessageBox QPushButton:hover {
    background: #e6e6e6;
}
"""
