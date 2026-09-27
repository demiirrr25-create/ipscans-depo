"""Device History dialog (innovative idea #4): a lightweight line chart of
a device's latency/packet-loss history, drawn with plain QPainter so this
doesn't need a charting dependency (matters for a --onefile PyInstaller
build's size and for avoiding another package that could break across
Qt/Python versions).
"""
from __future__ import annotations

from PyQt6.QtCore import QPointF, QRectF, Qt
from PyQt6.QtGui import QColor, QPainter, QPen
from PyQt6.QtWidgets import QDialog, QLabel, QVBoxLayout, QWidget

from pro.pro_content import t


class _LineChart(QWidget):
    def __init__(self, values: list[float | None], color: str, max_value: float, parent=None) -> None:
        super().__init__(parent)
        self._values = values
        self._color = QColor(color)
        self._max_value = max(max_value, 1.0)
        self.setMinimumHeight(140)

    def paintEvent(self, event) -> None:  # noqa: N802 (Qt override)
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        rect = QRectF(8, 8, self.width() - 16, self.height() - 16)

        painter.setPen(QPen(QColor(255, 255, 255, 30), 1))
        for i in range(1, 4):
            y = rect.top() + rect.height() * i / 4
            painter.drawLine(QPointF(rect.left(), y), QPointF(rect.right(), y))

        points = [v for v in self._values if v is not None]
        if len(points) < 2:
            painter.end()
            return

        step = rect.width() / max(1, len(self._values) - 1)
        path_points = []
        for i, value in enumerate(self._values):
            if value is None:
                continue
            x = rect.left() + step * i
            y = rect.bottom() - (value / self._max_value) * rect.height()
            path_points.append(QPointF(x, y))

        painter.setPen(QPen(self._color, 2))
        for a, b in zip(path_points, path_points[1:]):
            painter.drawLine(a, b)
        painter.end()


class DeviceHistoryDialog(QDialog):
    def __init__(self, device_label: str, metrics_rows, lang: str = "en", parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self.setWindowTitle(f"{t(lang, 'device_history_title')} — {device_label}")
        self.resize(560, 340)

        layout = QVBoxLayout(self)

        if not metrics_rows:
            layout.addWidget(QLabel(t(lang, "device_history_empty")))
            return

        latencies = [row["latency_ms"] for row in metrics_rows]
        losses = [row["packet_loss_pct"] for row in metrics_rows]

        layout.addWidget(QLabel(t(lang, "device_history_latency")))
        max_latency = max([v for v in latencies if v is not None], default=100.0)
        layout.addWidget(_LineChart(latencies, "#9fd3ff", max_latency))

        layout.addWidget(QLabel(t(lang, "device_history_packet_loss")))
        layout.addWidget(_LineChart(losses, "#ff7a7a", 100.0))
