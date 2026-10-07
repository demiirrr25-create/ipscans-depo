"""Terms of Use / Privacy Policy acceptance state, backed by QSettings.
The actual UI for these lives in app.ui.onboarding_wizard — this module
just tracks whether each has been accepted, independently, so a returning
user only replays whichever one they haven't accepted yet.
"""
from __future__ import annotations

from PyQt6.QtCore import QSettings

_ORG, _APP = "ipscans", "NetworkScanner"
_TERMS_KEY = "terms_accepted_v1"
_PRIVACY_KEY = "privacy_accepted_v2"


def has_accepted_terms() -> bool:
    settings = QSettings(_ORG, _APP)
    return bool(settings.value(_TERMS_KEY, False, type=bool))


def has_accepted_privacy() -> bool:
    settings = QSettings(_ORG, _APP)
    return bool(settings.value(_PRIVACY_KEY, False, type=bool))


def accept_terms() -> None:
    _remember(_TERMS_KEY)


def accept_privacy() -> None:
    _remember(_PRIVACY_KEY)


def _remember(key: str) -> None:
    settings = QSettings(_ORG, _APP)
    settings.setValue(key, True)

