"""Local-time display helper.

Every timestamp is stored as an ISO-8601 UTC string (see database.now_iso)
— deliberate, since this app's multi-site sync sends data to a shared
server that may aggregate sites in different timezones, so a single,
unambiguous storage format matters more than readability on disk. But
showing that raw UTC string in the UI just reads as "wrong time" to a user
sitting in a different timezone than UTC — every place a timestamp reaches
the screen must convert it to the *viewer's own machine's* local timezone
first. For a purely local desktop app, the OS's own timezone setting is the
correct source of truth for "the user's local time" — no network call, no
IP-geolocation guesswork, always right even offline, and it's already
exactly what the user configured in Windows.
"""
from __future__ import annotations

from datetime import datetime


def to_local_display(iso_utc: str | None) -> str:
    """Formats a stored UTC ISO timestamp for display in the user's local
    timezone, e.g. "2026-09-27 14:32". Falls back to the raw value if it
    can't be parsed (defensive — should never happen for our own data).
    """
    if not iso_utc:
        return "—"
    try:
        dt = datetime.fromisoformat(iso_utc)
    except ValueError:
        return iso_utc
    return dt.astimezone().strftime("%Y-%m-%d %H:%M")
