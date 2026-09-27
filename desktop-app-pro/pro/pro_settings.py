"""Onboarding acceptance/preference state for ipscans Network Health Pro —
its OWN QSettings namespace, deliberately separate from the free
IP Scanner's ("ipscans", "NetworkScanner"). Sharing that namespace would
mean a machine that already ran the free app skips Pro's onboarding
entirely (wrong language, and legal text the user never actually saw,
since Pro's terms cover things the free app's don't: license/email
collection, remote license validation, optional multi-site data sync).
"""
from __future__ import annotations

from PyQt6.QtCore import QSettings

_ORG, _APP = "ipscans", "NetworkHealthPro"
_LANGUAGE_KEY = "ui_language_v1"
_TERMS_KEY = "terms_accepted_v1"
_PRIVACY_KEY = "privacy_accepted_v1"
_WELCOME_KEY = "welcome_seen_v1"


def get_saved_language() -> str | None:
    settings = QSettings(_ORG, _APP)
    value = settings.value(_LANGUAGE_KEY, None)
    return str(value) if value else None


def save_language(code: str) -> None:
    QSettings(_ORG, _APP).setValue(_LANGUAGE_KEY, code)


def has_accepted_terms() -> bool:
    return bool(QSettings(_ORG, _APP).value(_TERMS_KEY, False, type=bool))


def accept_terms() -> None:
    QSettings(_ORG, _APP).setValue(_TERMS_KEY, True)


def has_accepted_privacy() -> bool:
    return bool(QSettings(_ORG, _APP).value(_PRIVACY_KEY, False, type=bool))


def accept_privacy() -> None:
    QSettings(_ORG, _APP).setValue(_PRIVACY_KEY, True)


def has_seen_welcome() -> bool:
    return bool(QSettings(_ORG, _APP).value(_WELCOME_KEY, False, type=bool))


def mark_welcome_seen() -> None:
    QSettings(_ORG, _APP).setValue(_WELCOME_KEY, True)


def reset_onboarding() -> None:
    """Mirrors the free app's `--reset-onboarding` — clears only this app's
    namespace, never touches the free scanner's settings.
    """
    QSettings(_ORG, _APP).clear()
