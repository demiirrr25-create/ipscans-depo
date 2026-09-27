"""Event Log tab (spec item 26): a filterable, append-only feed of every
conflict/offline/new-device/etc. event the engine has produced.
"""
from __future__ import annotations

from PyQt6.QtWidgets import (
    QComboBox,
    QHBoxLayout,
    QHeaderView,
    QTableWidget,
    QTableWidgetItem,
    QVBoxLayout,
    QWidget,
)

from pro.models import Event

_SEVERITY_OBJECT_NAME = {
    "info": "SeverityInfo",
    "warning": "SeverityWarning",
    "critical": "SeverityCritical",
}

COLUMNS = ["Time", "Severity", "Type", "IP", "MAC", "Message", "Confidence"]


class EventLogWidget(QWidget):
    def __init__(self, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        outer = QVBoxLayout(self)
        outer.setContentsMargins(4, 4, 4, 4)
        outer.setSpacing(10)

        filter_row = QHBoxLayout()
        self.filter_combo = QComboBox()
        self.filter_combo.addItems(["All", "Critical", "Warning", "Info"])
        self.filter_combo.currentTextChanged.connect(self._apply_filter)
        filter_row.addWidget(self.filter_combo)
        filter_row.addStretch(1)
        outer.addLayout(filter_row)

        self.table = QTableWidget(0, len(COLUMNS))
        self.table.setHorizontalHeaderLabels(COLUMNS)
        self.table.horizontalHeader().setStretchLastSection(True)
        self.table.horizontalHeader().setSectionResizeMode(
            0, QHeaderView.ResizeMode.ResizeToContents
        )
        self.table.verticalHeader().setVisible(False)
        self.table.setEditTriggers(QTableWidget.EditTrigger.NoEditTriggers)
        outer.addWidget(self.table)

        self._events: list[Event] = []

    def add_event(self, event: Event) -> None:
        self._events.insert(0, event)
        if self._passes_filter(event):
            self._insert_row(0, event)

    def _passes_filter(self, event: Event) -> bool:
        current = self.filter_combo.currentText()
        severity = event.severity.value if hasattr(event.severity, "value") else event.severity
        return current == "All" or current.lower() == severity

    def _apply_filter(self) -> None:
        self.table.setRowCount(0)
        for event in self._events:
            if self._passes_filter(event):
                self._insert_row(self.table.rowCount(), event)

    def _insert_row(self, row: int, event: Event) -> None:
        self.table.insertRow(row)
        severity = event.severity.value if hasattr(event.severity, "value") else event.severity
        event_type = event.type.value if hasattr(event.type, "value") else event.type
        confidence = event.confidence.value if event.confidence and hasattr(event.confidence, "value") else (event.confidence or "—")

        values = [
            event.ts, severity.upper(), event_type, event.ip or "—",
            event.mac or "—", event.message, confidence,
        ]
        for col, value in enumerate(values):
            self.table.setItem(row, col, QTableWidgetItem(str(value)))
