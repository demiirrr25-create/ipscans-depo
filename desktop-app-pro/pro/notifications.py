"""Notification de-duplication (spec item 25): a continuously-monitored,
still-unresolved condition (e.g. a device that stays offline for hours)
must not spam a new popup every single tick — only on each state change.

The actual popup is shown via QSystemTrayIcon.showMessage() (see
ui/pro_main_window.py), which natively renders a corner/tray toast on
Windows without any extra dependency (no win10toast — that package talks
to Win32 APIs directly and is easy to break across Windows versions;
QSystemTrayIcon is part of Qt itself and already required for the tray
icon that keeps monitoring alive after the window is closed).
"""
from __future__ import annotations

import time

# How long the same (type, ip) pair is suppressed after notifying once.
_DEDUP_WINDOW_SEC = 15 * 60


class NotificationDeduper:
    def __init__(self) -> None:
        self._last_notified: dict[tuple[str, str], float] = {}

    def should_notify(self, event_type: str, ip: str) -> bool:
        key = (event_type, ip)
        now = time.time()
        last = self._last_notified.get(key)
        if last is not None and now - last < _DEDUP_WINDOW_SEC:
            return False
        self._last_notified[key] = now
        return True
