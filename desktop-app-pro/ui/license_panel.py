"""License / Account panel (spec items 31, 48). Phase 1: talks only to
MockLicenseProvider — no network calls. The UI is written against the
LicenseProvider protocol so swapping in a real backend later (Phase 2)
requires no changes here.
"""
from __future__ import annotations

from PyQt6.QtWidgets import (
    QFormLayout,
    QFrame,
    QLabel,
    QLineEdit,
    QPushButton,
    QVBoxLayout,
    QWidget,
)

from pro.license import LicenseProvider, LicenseStatus


class LicensePanel(QWidget):
    def __init__(self, provider: LicenseProvider, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self._provider = provider

        outer = QVBoxLayout(self)
        outer.setContentsMargins(4, 4, 4, 4)
        outer.setSpacing(14)

        card = QFrame(objectName="OptionsCard")
        form = QFormLayout(card)
        form.setContentsMargins(18, 16, 18, 16)
        form.setSpacing(10)

        self.plan_label = QLabel("—")
        self.status_label = QLabel("—")
        self.expires_label = QLabel("—")
        form.addRow(QLabel("Plan"), self.plan_label)
        form.addRow(QLabel("Status"), self.status_label)
        form.addRow(QLabel("Expires"), self.expires_label)

        self.email_edit = QLineEdit()
        self.email_edit.setPlaceholderText("Email")
        self.key_edit = QLineEdit()
        self.key_edit.setPlaceholderText("License key")
        form.addRow(QLabel("Email"), self.email_edit)
        form.addRow(QLabel("License Key"), self.key_edit)

        outer.addWidget(card)

        self.activate_btn = QPushButton("Activate License", objectName="PrimaryButton")
        self.activate_btn.clicked.connect(self._on_activate)
        outer.addWidget(self.activate_btn)

        self.note_label = QLabel(
            "Phase 1 build: license activation is local-only (no server call yet). "
            "Any key starts a 30-day PRO trial for testing the Pro features."
        )
        self.note_label.setObjectName("StatusLabel")
        self.note_label.setWordWrap(True)
        outer.addWidget(self.note_label)
        outer.addStretch(1)

        self.refresh()

    def refresh(self) -> None:
        status = self._provider.get_status()
        self._render(status)

    def _on_activate(self) -> None:
        status = self._provider.activate(self.email_edit.text().strip(), self.key_edit.text().strip())
        self._render(status)

    def _render(self, status: LicenseStatus) -> None:
        self.plan_label.setText(status.plan)
        self.status_label.setText(status.status)
        self.expires_label.setText(status.expires_at or "—")
