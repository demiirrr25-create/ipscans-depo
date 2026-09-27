"""Maps an Event to a human-readable toast (spec item 25) — kept separate
from pro/notifications.py's Notifier class so that module stays UI-agnostic.
"""
from __future__ import annotations

from pro.notifications import Notifier

_notifier = Notifier()

_TITLES = {
    "ip_conflict": "IP Conflict Detected",
    "new_device": "New Device Detected",
    "device_offline": "Device Offline",
    "device_online": "Device Back Online",
    "ip_changed": "IP Address Changed",
    "mac_changed": "MAC Address Changed",
}


def notify_for_event(event) -> None:
    event_type = event.type.value if hasattr(event.type, "value") else event.type
    title = _TITLES.get(event_type, "Network Health")
    _notifier.notify(event_type, event.ip or "", title, event.message)
