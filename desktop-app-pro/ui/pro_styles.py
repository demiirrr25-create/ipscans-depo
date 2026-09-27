"""Additive QSS for the Pro app's new screens — appended to (never replacing)
the free app's DARK_QSS, so the tab strip and new cards match the existing
monochrome dark theme (product rule #1: no redesign) instead of falling
back to Qt's native tab styling.
"""

PRO_EXTRA_QSS = """
QTabWidget::pane {
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.02);
    top: -1px;
}
QTabBar::tab {
    background: transparent;
    color: rgba(255, 255, 255, 0.55);
    border: none;
    padding: 9px 18px;
    margin-right: 4px;
    font-size: 12px;
    font-weight: 600;
    border-top-left-radius: 10px;
    border-top-right-radius: 10px;
}
QTabBar::tab:hover {
    color: #ffffff;
    background: rgba(255, 255, 255, 0.05);
}
QTabBar::tab:selected {
    color: #000000;
    background: #ffffff;
}

#HealthCard {
    background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
        stop:0 rgba(255, 255, 255, 0.06), stop:1 rgba(255, 255, 255, 0.02));
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 18px;
}
QLabel#HealthScoreValue {
    font-size: 44px;
    font-weight: 700;
}
QLabel#HealthScoreLabel {
    color: rgba(255, 255, 255, 0.5);
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.08em;
}
#StatCard {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 14px;
}
QLabel#StatValue {
    font-size: 22px;
    font-weight: 700;
}
QLabel#StatLabel {
    color: rgba(255, 255, 255, 0.5);
    font-size: 11px;
}

QLabel#SeverityInfo {
    color: #9fd3ff;
    font-weight: 600;
}
QLabel#SeverityWarning {
    color: #ffd479;
    font-weight: 600;
}
QLabel#SeverityCritical {
    color: #ff7a7a;
    font-weight: 600;
}
"""
