"""Windows toast notifications (spec item 25), with dedup so a
continuously-monitored, still-unresolved condition (e.g. a device that
stays offline for hours) doesn't spam a notification every tick.
"""
from __future__ import annotations

import platform
import time

_IS_WINDOWS = platform.system().lower() == "windows"

# How long the same (type, ip) pair is suppressed after notifying once.
_DEDUP_WINDOW_SEC = 15 * 60


class Notifier:
    def __init__(self) -> None:
        self._last_notified: dict[tuple[str, str], float] = {}
        self._toaster = None
        if _IS_WINDOWS:
            try:
                from win10toast import ToastNotifier  # type: ignore

                self._toaster = ToastNotifier()
            except Exception:
                self._toaster = None

    def notify(self, event_type: str, ip: str, title: str, message: str) -> None:
        key = (event_type, ip)
        now = time.time()
        last = self._last_notified.get(key)
        if last is not None and now - last < _DEDUP_WINDOW_SEC:
            return
        self._last_notified[key] = now

        if self._toaster is None:
            return
        try:
            self._toaster.show_toast(title, message, duration=6, threaded=True)
        except Exception:
            # Notifications are best-effort — never let a toast failure
            # affect monitoring itself.
            pass
