"""Windows startup registration ("run continuously" — spec item 8's intent
extended to survive reboots): adds/removes a per-user Run key entry so the
app can relaunch and resume monitoring automatically. No-op (returns False)
on non-Windows platforms — this app only ships as a Windows build, but the
guard keeps this module importable/testable on any OS.
"""
from __future__ import annotations

import platform
import sys

_IS_WINDOWS = platform.system().lower() == "windows"
_RUN_KEY_PATH = r"Software\Microsoft\Windows\CurrentVersion\Run"
_VALUE_NAME = "ipscansNetworkHealthPro"


def _executable_command() -> str:
    # Frozen (PyInstaller) build: sys.executable IS the .exe itself.
    # Running from source (dev/test): fall back to `pythonw main.py`.
    if getattr(sys, "frozen", False):
        return f'"{sys.executable}"'
    return f'"{sys.executable}" "{sys.argv[0]}"'


def is_enabled() -> bool:
    if not _IS_WINDOWS:
        return False
    import winreg

    try:
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, _RUN_KEY_PATH) as key:
            winreg.QueryValueEx(key, _VALUE_NAME)
            return True
    except FileNotFoundError:
        return False
    except OSError:
        return False


def set_enabled(enabled: bool) -> bool:
    """Returns True on success. Best-effort — registry access can fail for
    reasons outside the app's control (policy restrictions, etc.); callers
    should treat a False return as "couldn't change it", not a crash.
    """
    if not _IS_WINDOWS:
        return False
    import winreg

    try:
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, _RUN_KEY_PATH, 0, winreg.KEY_SET_VALUE) as key:
            if enabled:
                winreg.SetValueEx(key, _VALUE_NAME, 0, winreg.REG_SZ, _executable_command())
            else:
                try:
                    winreg.DeleteValue(key, _VALUE_NAME)
                except FileNotFoundError:
                    pass
        return True
    except OSError:
        return False
