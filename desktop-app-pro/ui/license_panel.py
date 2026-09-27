"""License / Account panel (spec items 31, 48). Talks to the real
ipscans.com license API via RemoteLicenseProvider (with an offline cache
fallback) — see pro/license.py. Written against the LicenseProvider
protocol, so it works unchanged with MockLicenseProvider in tests.
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

from pro.license import LicenseProvider
from pro.update_checker import check_for_update


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
        self.key_label = QLabel("—")
        form.addRow(QLabel("Plan"), self.plan_label)
        form.addRow(QLabel("Status"), self.status_label)
        form.addRow(QLabel("Expires"), self.expires_label)
        form.addRow(QLabel("License Key"), self.key_label)

        self.email_edit = QLineEdit()
        self.email_edit.setPlaceholderText("you@company.com")
        form.addRow(QLabel("Email"), self.email_edit)

        outer.addWidget(card)

        self.activate_btn = QPushButton("Start PRO Trial", objectName="PrimaryButton")
        self.activate_btn.clicked.connect(self._on_activate)
        outer.addWidget(self.activate_btn)

        self.check_update_btn = QPushButton("Check for Updates", objectName="GhostButton")
        self.check_update_btn.clicked.connect(self._on_check_update)
        outer.addWidget(self.check_update_btn)

        self.note_label = QLabel(
            "Enter your email and start a 30-day PRO trial (no payment yet — "
            "Stripe billing is coming in a later update). Your license is "
            "validated against ipscans.com and cached locally so the app "
            "keeps working offline."
        )
        self.note_label.setObjectName("StatusLabel")
        self.note_label.setWordWrap(True)
        outer.addWidget(self.note_label)
        outer.addStretch(1)

        self.refresh()

    def refresh(self) -> None:
        status = self._provider.get_status()
        self._render(status)
        if status.email:
            self.email_edit.setText(status.email)

    def _on_activate(self) -> None:
        email = self.email_edit.text().strip()
        if not email:
            return
        status = self._provider.activate(email, "")
        self._render(status)

    def _on_check_update(self) -> None:
        info = check_for_update()
        if info is None:
            self.note_label.setText("You're on the latest version.")
        else:
            self.note_label.setText(
                f"Update available: v{info.version} — {info.notes}\nDownload: {info.download_url}"
            )

    def _render(self, status) -> None:
        self.plan_label.setText(status.plan)
        self.status_label.setText(status.status)
        self.expires_label.setText(status.expires_at or "—")
        self.key_label.setText(status.license_key or "—")
