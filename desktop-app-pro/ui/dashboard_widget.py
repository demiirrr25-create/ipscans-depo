"""Dashboard tab: the Network Health Score + at-a-glance stat cards
(spec items 7 and 44) — the first thing a non-technical site manager sees.
"""
from __future__ import annotations

from PyQt6.QtCore import Qt
from PyQt6.QtWidgets import QFrame, QGridLayout, QHBoxLayout, QLabel, QPushButton, QVBoxLayout, QWidget

from app.ui.spinner import Spinner

from pro.models import HealthBreakdown
from pro.pro_content import t


def _stat_card(value: str, label: str, accent_color: str = "#2F6BFF") -> QFrame:
    card = QFrame(objectName="StatCard")
    card.setMinimumHeight(96)
    layout = QVBoxLayout(card)
    layout.setContentsMargins(18, 16, 18, 16)
    layout.setSpacing(6)

    top_row = QHBoxLayout()
    top_row.setContentsMargins(0, 0, 0, 0)
    top_row.setSpacing(8)
    dot = QLabel("●")
    dot.setStyleSheet(f"color: {accent_color}; font-size: 10px; background: transparent;")
    text_label = QLabel(label, objectName="StatLabel")
    top_row.addWidget(dot)
    top_row.addWidget(text_label)
    top_row.addStretch(1)

    value_label = QLabel(value, objectName="StatValue")
    layout.addLayout(top_row)
    layout.addWidget(value_label)
    layout.addStretch(1)
    card.value_label = value_label  # type: ignore[attr-defined]
    return card


class DashboardWidget(QWidget):
    def __init__(self, lang: str = "en", parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self.lang = lang
        is_tr = str(lang).lower().startswith("tr")
        outer = QVBoxLayout(self)
        outer.setContentsMargins(16, 16, 16, 16)
        outer.setSpacing(18)

        # Executive Hero Banner Card
        health_card = QFrame(objectName="HealthHeroCard")
        hero_row = QHBoxLayout(health_card)
        hero_row.setContentsMargins(28, 24, 28, 24)
        hero_row.setSpacing(24)

        left_col = QVBoxLayout()
        left_col.setSpacing(6)
        self.health_label = QLabel(t(lang, "health_title").upper(), objectName="HealthScoreLabel")
        self.health_value = QLabel("—", objectName="HealthScoreValue")
        self.score_label = self.health_value

        subtitle_text = (
            "Kesintisiz yerel L2/L3 telemetri, IP çakışma tespiti ve gecikme analizi"
            if is_tr
            else "Continuous local L2/L3 telemetry, conflict detection, and latency diagnostics"
        )
        self.subtitle_label = QLabel(subtitle_text, objectName="HealthSubtitle")
        self.subtitle_label.setWordWrap(True)

        self.breakdown_label = QLabel("", objectName="StatLabel")
        self.breakdown_label.setWordWrap(True)

        left_col.addWidget(self.health_label)
        left_col.addWidget(self.health_value)
        left_col.addWidget(self.subtitle_label)
        left_col.addWidget(self.breakdown_label)
        hero_row.addLayout(left_col, stretch=1)

        # Right side: status spinner + action buttons side-by-side
        right_col = QVBoxLayout()
        right_col.setAlignment(Qt.AlignmentFlag.AlignRight | Qt.AlignmentFlag.AlignVCenter)
        right_col.setSpacing(10)

        action_row = QHBoxLayout()
        action_row.setSpacing(10)
        self.starting_spinner = Spinner(size=16)
        self.starting_spinner.hide()
        self.starting_label = QLabel(t(lang, "monitoring_starting"), objectName="StatusLabel")
        self.starting_label.hide()

        self.start_monitoring_btn = QPushButton(f"▶  {t(lang, 'start_monitoring')}", objectName="PrimaryButton")
        self.start_monitoring_btn.setMinimumWidth(170)
        self.start_monitoring_btn.setMaximumWidth(220)
        self.start_monitoring_btn.setMinimumHeight(38)

        self.stop_monitoring_btn = QPushButton(f"■  {t(lang, 'stop_monitoring')}", objectName="GhostButton")
        self.stop_monitoring_btn.setMinimumWidth(110)
        self.stop_monitoring_btn.setMaximumWidth(150)
        self.stop_monitoring_btn.setMinimumHeight(38)
        self.stop_monitoring_btn.setEnabled(False)

        action_row.addWidget(self.starting_spinner)
        action_row.addWidget(self.starting_label)
        action_row.addWidget(self.start_monitoring_btn)
        action_row.addWidget(self.stop_monitoring_btn)
        right_col.addLayout(action_row)
        hero_row.addLayout(right_col)

        outer.addWidget(health_card)

        # Metric Cards Bento Grid
        grid = QGridLayout()
        grid.setSpacing(14)
        self.cards: dict[str, QFrame] = {}
        specs = [
            ("devices", t(lang, "stat_devices"), "#2F6BFF"),
            ("online", t(lang, "stat_online"), "#12B76A"),
            ("offline", t(lang, "stat_offline"), "#6E7687"),
            ("conflicts", t(lang, "stat_conflicts"), "#F04438"),
            ("high_latency", t(lang, "stat_high_latency"), "#F79009"),
            ("packet_loss", t(lang, "stat_packet_loss"), "#F79009"),
            ("unknown", t(lang, "stat_unknown"), "#0BA5EC"),
        ]
        for i, (key, label, accent) in enumerate(specs):
            card = _stat_card("—", label, accent)
            self.cards[key] = card
            grid.addWidget(card, i // 4, i % 4)
        for col in range(4):
            grid.setColumnStretch(col, 1)
        outer.addLayout(grid)
        outer.addStretch(1)

    def show_starting(self) -> None:
        self.starting_spinner.start()
        self.starting_label.show()

    def hide_starting(self) -> None:
        self.starting_spinner.stop()
        self.starting_label.hide()

    def update_health(self, breakdown: HealthBreakdown) -> None:
        self.health_value.setText(f"{breakdown.score}%")
        self.breakdown_label.setText(" · ".join(breakdown.deductions))
        self.cards["devices"].value_label.setText(str(breakdown.total_devices))
        self.cards["online"].value_label.setText(str(breakdown.total_devices - breakdown.offline_devices))
        self.cards["offline"].value_label.setText(str(breakdown.offline_devices))
        self.cards["conflicts"].value_label.setText(str(breakdown.ip_conflicts))
        self.cards["high_latency"].value_label.setText(str(breakdown.high_latency_devices))
        self.cards["packet_loss"].value_label.setText(f"{breakdown.avg_packet_loss_pct:.0f}%")
        self.cards["unknown"].value_label.setText(str(breakdown.unknown_devices))
