"""First-run privacy/terms gate: the user must read and accept before the
main window appears. Shown right after the language picker so its text is
already in the user's chosen language. Acceptance is remembered (QSettings)
so it's only asked once per install, not on every launch.
"""
from __future__ import annotations

from PyQt6.QtCore import QSettings
from PyQt6.QtWidgets import (
    QCheckBox,
    QDialog,
    QDialogButtonBox,
    QLabel,
    QTextEdit,
    QVBoxLayout,
)

from app.i18n import DEFAULT_LANGUAGE, get_privacy_body, t

_ORG, _APP = "ipscans", "NetworkScanner"
_SETTINGS_KEY = "privacy_terms_accepted_v1"


def has_accepted_privacy_terms() -> bool:
    settings = QSettings(_ORG, _APP)
    return bool(settings.value(_SETTINGS_KEY, False, type=bool))


def _remember_acceptance() -> None:
    settings = QSettings(_ORG, _APP)
    settings.setValue(_SETTINGS_KEY, True)


class PrivacyTermsDialog(QDialog):
    def __init__(self, lang: str = DEFAULT_LANGUAGE, parent=None) -> None:
        super().__init__(parent)
        self.setWindowTitle(t(lang, "privacy_window_title"))
        self.resize(560, 480)
        self.setModal(True)

        layout = QVBoxLayout(self)
        layout.setContentsMargins(24, 24, 24, 20)
        layout.setSpacing(14)

        heading = QLabel(t(lang, "privacy_heading"))
        heading.setObjectName("TitleText")
        layout.addWidget(heading)

        text = QTextEdit()
        text.setReadOnly(True)
        text.setHtml(get_privacy_body(lang))
        layout.addWidget(text, stretch=1)

        self.agree_check = QCheckBox(t(lang, "privacy_checkbox"))
        layout.addWidget(self.agree_check)

        buttons = QDialogButtonBox()
        self.decline_btn = buttons.addButton(
            t(lang, "privacy_decline"), QDialogButtonBox.ButtonRole.RejectRole
        )
        self.accept_btn = buttons.addButton(
            t(lang, "privacy_accept"), QDialogButtonBox.ButtonRole.AcceptRole
        )
        self.accept_btn.setObjectName("PrimaryButton")
        self.decline_btn.setObjectName("GhostButton")
        self.accept_btn.setEnabled(False)
        layout.addWidget(buttons)

        self.agree_check.toggled.connect(self.accept_btn.setEnabled)
        self.accept_btn.clicked.connect(self._on_accept)
        self.decline_btn.clicked.connect(self.reject)

    def _on_accept(self) -> None:
        _remember_acceptance()
        self.accept()
