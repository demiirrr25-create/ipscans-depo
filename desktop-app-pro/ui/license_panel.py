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
from pro.pro_content import t
from pro.update_checker import check_for_update


class LicensePanel(QWidget):
    def __init__(self, provider: LicenseProvider, lang: str = "en", parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self._provider = provider
        self.lang = lang

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
        form.addRow(QLabel(t(lang, "plan")), self.plan_label)
        form.addRow(QLabel(t(lang, "status_label")), self.status_label)
        form.addRow(QLabel(t(lang, "expires")), self.expires_label)
        form.addRow(QLabel(t(lang, "license_key")), self.key_label)

        self.email_edit = QLineEdit()
        self.email_edit.setPlaceholderText(t(lang, "email_placeholder"))
        form.addRow(QLabel(t(lang, "email_label")), self.email_edit)

        outer.addWidget(card)

        self.activate_btn = QPushButton(t(lang, "start_trial"), objectName="PrimaryButton")
        self.activate_btn.clicked.connect(self._on_activate)
        outer.addWidget(self.activate_btn)

        self.check_update_btn = QPushButton(t(lang, "check_updates"), objectName="GhostButton")
        self.check_update_btn.clicked.connect(self._on_check_update)
        outer.addWidget(self.check_update_btn)

        self.note_label = QLabel(t(lang, "license_note"))
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
            self.note_label.setText(t(self.lang, "up_to_date"))
        else:
            self.note_label.setText(
                t(self.lang, "update_available", version=info.version, notes=info.notes, url=info.download_url)
            )

    def _render(self, status) -> None:
        self.plan_label.setText(status.plan)
        self.status_label.setText(status.status)
        self.expires_label.setText(status.expires_at or "—")
        self.key_label.setText(status.license_key or "—")
