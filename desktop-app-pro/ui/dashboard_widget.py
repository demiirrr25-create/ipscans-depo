"""Dashboard tab: the Network Health Score + at-a-glance stat cards
(spec items 7 and 44) — the first thing a non-technical site manager sees.
"""
from __future__ import annotations

from PyQt6.QtCore import Qt
from PyQt6.QtWidgets import QFrame, QGridLayout, QLabel, QPushButton, QVBoxLayout, QWidget

from pro.models import HealthBreakdown
from pro.pro_content import t


def _stat_card(value: str, label: str) -> QFrame:
    card = QFrame(objectName="StatCard")
    layout = QVBoxLayout(card)
    layout.setContentsMargins(14, 12, 14, 12)
    layout.setSpacing(2)
    value_label = QLabel(value, objectName="StatValue")
    text_label = QLabel(label, objectName="StatLabel")
    layout.addWidget(value_label)
    layout.addWidget(text_label)
    card.value_label = value_label  # type: ignore[attr-defined]
    return card


class DashboardWidget(QWidget):
    def __init__(self, lang: str = "en", parent: QWidget | None = None) -> None:
        super().__init__(parent)
        outer = QVBoxLayout(self)
        outer.setContentsMargins(4, 4, 4, 4)
        outer.setSpacing(14)

        health_card = QFrame(objectName="HealthCard")
        health_layout = QVBoxLayout(health_card)
        health_layout.setContentsMargins(24, 20, 24, 20)
        health_layout.setAlignment(Qt.AlignmentFlag.AlignCenter)

        self.health_label = QLabel(t(lang, "health_title"), objectName="HealthScoreLabel")
        self.health_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.health_value = QLabel("—", objectName="HealthScoreValue")
        self.health_value.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.breakdown_label = QLabel("", objectName="StatLabel")
        self.breakdown_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.breakdown_label.setWordWrap(True)

        health_layout.addWidget(self.health_label)
        health_layout.addWidget(self.health_value)
        health_layout.addWidget(self.breakdown_label)
        outer.addWidget(health_card)

        grid = QGridLayout()
        grid.setSpacing(10)
        self.cards: dict[str, QFrame] = {}
        specs = [
            ("devices", t(lang, "stat_devices")),
            ("online", t(lang, "stat_online")),
            ("offline", t(lang, "stat_offline")),
            ("conflicts", t(lang, "stat_conflicts")),
            ("high_latency", t(lang, "stat_high_latency")),
            ("packet_loss", t(lang, "stat_packet_loss")),
            ("unknown", t(lang, "stat_unknown")),
        ]
        for i, (key, label) in enumerate(specs):
            card = _stat_card("—", label)
            self.cards[key] = card
            grid.addWidget(card, i // 4, i % 4)
        outer.addLayout(grid)

        self.start_monitoring_btn = QPushButton(f"▶  {t(lang, 'start_monitoring')}", objectName="PrimaryButton")
        self.stop_monitoring_btn = QPushButton(f"■  {t(lang, 'stop_monitoring')}", objectName="GhostButton")
        self.stop_monitoring_btn.setEnabled(False)
        outer.addWidget(self.start_monitoring_btn)
        outer.addWidget(self.stop_monitoring_btn)
        outer.addStretch(1)

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
