"""First-run legal gate: Terms of Use, then Privacy Policy, each its own
dialog with its own checkbox + accept/decline, both required in order
before the main window ever appears. Shown right after the language picker
so the text is already in the user's chosen language. Each acceptance is
remembered separately (QSettings) so returning users only see this once.
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

from app.i18n import DEFAULT_LANGUAGE, get_privacy_body, get_terms_body, t

_ORG, _APP = "ipscans", "NetworkScanner"
_TERMS_KEY = "terms_accepted_v1"
_PRIVACY_KEY = "privacy_accepted_v1"


def has_accepted_terms() -> bool:
    settings = QSettings(_ORG, _APP)
    return bool(settings.value(_TERMS_KEY, False, type=bool))


def has_accepted_privacy() -> bool:
    settings = QSettings(_ORG, _APP)
    return bool(settings.value(_PRIVACY_KEY, False, type=bool))


def has_accepted_privacy_terms() -> bool:
    """Back-compat combined check: both must have been accepted."""
    return has_accepted_terms() and has_accepted_privacy()


def _remember(key: str) -> None:
    settings = QSettings(_ORG, _APP)
    settings.setValue(key, True)


class _AgreementDialog(QDialog):
    """Shared layout for a single "read, check, accept/decline" screen."""

    def __init__(
        self,
        lang: str,
        window_title_key: str,
        heading_key: str,
        checkbox_key: str,
        decline_key: str,
        accept_key: str,
        body_html: str,
        settings_key: str,
        parent=None,
    ) -> None:
        super().__init__(parent)
        self._settings_key = settings_key
        self.setWindowTitle(t(lang, window_title_key))
        self.resize(560, 480)
        self.setModal(True)

        layout = QVBoxLayout(self)
        layout.setContentsMargins(24, 24, 24, 20)
        layout.setSpacing(14)

        heading = QLabel(t(lang, heading_key))
        heading.setObjectName("TitleText")
        layout.addWidget(heading)

        text = QTextEdit()
        text.setReadOnly(True)
        text.setHtml(body_html)
        layout.addWidget(text, stretch=1)

        self.agree_check = QCheckBox(t(lang, checkbox_key))
        layout.addWidget(self.agree_check)

        buttons = QDialogButtonBox()
        self.decline_btn = buttons.addButton(
            t(lang, decline_key), QDialogButtonBox.ButtonRole.RejectRole
        )
        self.accept_btn = buttons.addButton(
            t(lang, accept_key), QDialogButtonBox.ButtonRole.AcceptRole
        )
        self.accept_btn.setObjectName("PrimaryButton")
        self.decline_btn.setObjectName("GhostButton")
        self.accept_btn.setEnabled(False)
        layout.addWidget(buttons)

        self.agree_check.toggled.connect(self.accept_btn.setEnabled)
        self.accept_btn.clicked.connect(self._on_accept)
        self.decline_btn.clicked.connect(self.reject)

    def _on_accept(self) -> None:
        _remember(self._settings_key)
        self.accept()


class TermsOfUseDialog(_AgreementDialog):
    def __init__(self, lang: str = DEFAULT_LANGUAGE, parent=None) -> None:
        super().__init__(
            lang,
            "terms_window_title",
            "terms_heading",
            "terms_checkbox",
            "terms_decline",
            "terms_accept",
            get_terms_body(lang),
            _TERMS_KEY,
            parent,
        )


class PrivacyPolicyDialog(_AgreementDialog):
    def __init__(self, lang: str = DEFAULT_LANGUAGE, parent=None) -> None:
        super().__init__(
            lang,
            "privacy_window_title",
            "privacy_heading",
            "privacy_checkbox",
            "privacy_decline",
            "privacy_accept",
            get_privacy_body(lang),
            _PRIVACY_KEY,
            parent,
        )


# Back-compat alias for any old import of the previous combined dialog name.
PrivacyTermsDialog = PrivacyPolicyDialog

