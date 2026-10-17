"""Additive QSS for the Pro app's new screens — appended to (never replacing)
the free app's DARK_QSS, so the tab strip and new cards match the existing
monochrome dark theme (product rule #1: no redesign) instead of falling
back to Qt's native tab styling.
"""

PRO_EXTRA_QSS = """
QTabWidget::pane {
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 22px;
    background: #0d0e12;
    top: 8px;
}
QTabBar::tab {
    background: rgba(255, 255, 255, 0.04);
    color: rgba(255, 255, 255, 0.62);
    border: 1px solid rgba(255, 255, 255, 0.08);
    padding: 8px 20px;
    margin-right: 8px;
    font-size: 12px;
    font-weight: 600;
    border-radius: 17px;
}
QTabBar::tab:hover {
    color: #ffffff;
    background: rgba(255, 255, 255, 0.09);
    border-color: rgba(255, 255, 255, 0.18);
}
QTabBar::tab:selected {
    color: #000000;
    background: #ffffff;
    border-color: #ffffff;
}

#HealthCard {
    background: #0d0e12;
    border: 1px solid rgba(255, 255, 255, 0.10);
    border-radius: 22px;
}
QLabel#HealthScoreValue {
    font-size: 46px;
    font-weight: 600;
    letter-spacing: -0.03em;
}
QLabel#HealthScoreLabel {
    color: rgba(255, 255, 255, 0.52);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.12em;
}
#StatCard {
    background: #0d0e12;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 18px;
}
QLabel#StatValue {
    font-size: 24px;
    font-weight: 600;
    letter-spacing: -0.02em;
}
QLabel#StatLabel {
    color: rgba(255, 255, 255, 0.52);
    font-size: 11px;
}

QLabel#SeverityInfo {
    color: #93c5fd;
    font-weight: 600;
}
QLabel#SeverityWarning {
    color: #fbbf24;
    font-weight: 600;
}
QLabel#SeverityCritical {
    color: #f87171;
    font-weight: 600;
}

/* QTreeWidget (Topology tab) isn't covered by the free app's QTableView
   rules, so without this it falls back to Qt's native white background. */
QTreeView, QTreeWidget {
    background: #0d0e12;
    alternate-background-color: rgba(255, 255, 255, 0.025);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 18px;
    outline: none;
    font-size: 12px;
    padding: 8px;
}
QTreeView::item, QTreeWidget::item {
    padding: 6px 8px;
    border: none;
}
QTreeView::item:selected, QTreeWidget::item:selected {
    background: rgba(255, 255, 255, 0.12);
    color: #ffffff;
}
QTreeView::branch, QTreeWidget::branch {
    background: transparent;
}

/* QScrollArea (Settings tab) defaults to a native white viewport unless
   both the frame AND its inner viewport widget are explicitly made
   transparent — otherwise it shows through as a washed-out white veil
   over the dark-styled child widgets. */
QScrollArea {
    background: transparent;
    border: none;
}
QScrollArea > QWidget > QWidget {
    background: transparent;
}

QScrollBar:horizontal {
    background: transparent;
    height: 10px;
}
QScrollBar::handle:horizontal {
    background: rgba(255, 255, 255, 0.18);
    border-radius: 5px;
    min-width: 24px;
}
QScrollBar::handle:horizontal:hover {
    background: rgba(255, 255, 255, 0.3);
}
QScrollBar::add-line:horizontal, QScrollBar::sub-line:horizontal {
    width: 0;
}

QTimeEdit {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 15px;
    padding: 6px 12px;
    font-size: 12px;
}
"""
