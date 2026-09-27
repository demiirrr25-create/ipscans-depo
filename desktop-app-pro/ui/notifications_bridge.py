"""Maps an Event to a localized (title, message) pair for a tray popup —
see pro/notifications.py for the de-duplication rules this respects.
"""
from __future__ import annotations

from pro.notifications import NotificationDeduper
from pro.pro_content import t

_deduper = NotificationDeduper()

_TITLE_KEYS = {
    "ip_conflict": "notif_ip_conflict",
    "new_device": "notif_new_device",
    "device_offline": "notif_device_offline",
    "device_online": "notif_device_online",
    "ip_changed": "notif_ip_changed",
    "mac_changed": "notif_mac_changed",
}


def notification_for_event(event, lang: str = "en") -> tuple[str, str] | None:
    """Returns (title, message) if this event should pop up a notification
    right now, or None if it's a duplicate within the dedup window.
    """
    event_type = event.type.value if hasattr(event.type, "value") else event.type
    if not _deduper.should_notify(event_type, event.ip or ""):
        return None
    title_key = _TITLE_KEYS.get(event_type)
    if not title_key:
        return None
    return t(lang, title_key), event.message
