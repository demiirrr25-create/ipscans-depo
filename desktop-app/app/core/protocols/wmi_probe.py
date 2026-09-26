"""Windows-only WMI enrichment.

Remote WMI (querying *other* machines) needs DCOM + admin credentials on the
target and is blocked by most firewalls out of the box, so this reliably
only enriches the machine the scanner itself runs on unless credentials for
a remote host are supplied.
"""
from __future__ import annotations

import platform
from dataclasses import dataclass

_IS_WINDOWS = platform.system().lower() == "windows"

if _IS_WINDOWS:
    try:
        import wmi as _wmi

        _HAS_WMI = True
    except ImportError:
        _HAS_WMI = False
else:
    _HAS_WMI = False


@dataclass
class WmiResult:
    computer_name: str | None
    os_caption: str | None
    bios_serial_number: str | None


def query_local_machine() -> WmiResult | None:
    if not _HAS_WMI:
        return None
    try:
        connection = _wmi.WMI()
        os_info = next(iter(connection.Win32_OperatingSystem()), None)
        bios_info = next(iter(connection.Win32_BIOS()), None)
    except Exception:
        return None
    if os_info is None and bios_info is None:
        return None
    return WmiResult(
        computer_name=getattr(os_info, "CSName", None),
        os_caption=getattr(os_info, "Caption", None),
        bios_serial_number=getattr(bios_info, "SerialNumber", None),
    )


def query_remote(ip: str, username: str, password: str) -> WmiResult | None:
    """Optional, explicit remote query for domain-joined environments."""
    if not _HAS_WMI:
        return None
    try:
        connection = _wmi.WMI(computer=ip, user=username, password=password)
    except Exception:
        return None
    os_info = next(iter(connection.Win32_OperatingSystem()), None)
    bios_info = next(iter(connection.Win32_BIOS()), None)
    if os_info is None and bios_info is None:
        return None
    return WmiResult(
        computer_name=getattr(os_info, "CSName", None),
        os_caption=getattr(os_info, "Caption", None),
        bios_serial_number=getattr(bios_info, "SerialNumber", None),
    )
