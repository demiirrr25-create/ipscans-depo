"""Theme-aware vector device glyphs rendered at the OS display scale."""
from __future__ import annotations

from functools import lru_cache

from PyQt6.QtCore import QByteArray, Qt
from PyQt6.QtGui import QIcon, QPainter, QPixmap
from PyQt6.QtSvg import QSvgRenderer

from app.ui.styles import get_current_theme

_SHAPES = {
    "Online": '<circle cx="24" cy="24" r="16"/><path d="m15 24 6 6 13-14"/>',
    "Attention": '<path d="m24 6 20 35H4zM24 17v11m0 6v1"/>',
    "Modem": '<rect x="8" y="18" width="32" height="20" rx="3"/><path d="M14 25h3m5 0h3m5 0h3M14 12v6"/>',
    "Firewall": '<path d="M24 5 40 12v12c0 10-16 19-16 19S8 34 8 24V12zM10 21h28M14 31h20M24 12v9m-7 0v10m14-10v10"/>',
    "Laptop": '<rect x="10" y="10" width="28" height="21" rx="2"/><path d="m8 33-4 6h40l-4-6"/>',
    "Smart TV": '<rect x="5" y="10" width="38" height="25" rx="3"/><path d="m15 41 5-6m8 0 5 6"/>',
    "VoIP Phone": '<rect x="13" y="7" width="22" height="34" rx="4"/><path d="M18 13h12v14H18zM22 33h4"/>',
    "IoT Device": '<rect x="13" y="13" width="22" height="22" rx="4"/><path d="M19 6v7m10-7v7M19 35v7m10-7v7M6 19h7m-7 10h7m22-10h7m-7 10h7"/>',
    "Router": '<rect x="7" y="21" width="34" height="14" rx="3"/><path d="M14 13v8m20-8v8M14 28h4m7 0h4"/>',
    "Gateway": '<rect x="7" y="21" width="34" height="14" rx="3"/><path d="M14 13v8m20-8v8M14 28h4m7 0h4"/>',
    "Switch": '<rect x="5" y="16" width="38" height="18" rx="3"/><path d="M11 23h4m5 0h4m5 0h4M11 28h4m5 0h4m5 0h4"/>',
    "Access Point": '<rect x="18" y="31" width="12" height="6" rx="2"/><path d="M10 21a20 20 0 0 1 28 0M15 26a13 13 0 0 1 18 0M24 31v-3"/>',
    "IP Camera": '<rect x="7" y="16" width="24" height="16" rx="3"/><circle cx="19" cy="24" r="4.5"/><path d="m31 20 10-4v16l-10-4"/>',
    "NVR": '<rect x="7" y="11" width="34" height="26" rx="3"/><path d="M13 18h22M13 25h22M13 32h16"/>',
    "Computer": '<rect x="7" y="10" width="34" height="23" rx="3"/><path d="M24 33v6m-9 0h18"/>',
    "Server": '<rect x="10" y="7" width="28" height="34" rx="3"/><path d="M15 15h18M15 24h18M15 33h18"/>',
    "NAS": '<rect x="10" y="8" width="28" height="32" rx="3"/><path d="M16 16h16M16 24h16M16 32h10"/><circle cx="31" cy="32" r="1.5"/>',
    "Printer": '<rect x="7" y="18" width="34" height="16" rx="3"/><path d="M14 18v-8h20v8M14 29h20v11H14z"/>',
    "Unknown": '<rect x="10" y="10" width="28" height="28" rx="6"/><circle cx="24" cy="20" r="4"/><path d="M16 32c2-4 14-4 16 0"/>',
}


def _resolve_glyph_and_color(device_type: str, is_light: bool) -> tuple[str, str]:
    raw = (device_type or "").strip()
    low = raw.lower()
    primary_col = "#2F6BFF" if is_light else "#4C82FF"
    secondary_col = "#3C4252" if is_light else "#A8B0C2"

    if low == "online":
        return _SHAPES["Online"], ("#0F9D58" if is_light else "#34D399")
    if low in ("attention", "offline", "warning", "conflict"):
        return _SHAPES["Attention"], ("#E37400" if is_light else "#FBBF24")
    if "firewall" in low:
        return _SHAPES["Firewall"], primary_col
    if "router" in low or "gateway" in low:
        return _SHAPES["Router"], primary_col
    if "modem" in low:
        return _SHAPES["Modem"], primary_col
    if "switch" in low:
        return _SHAPES["Switch"], primary_col
    if "access point" in low or "wifi" in low or "wi-fi" in low or "extender" in low or "wireless" in low:
        return _SHAPES["Access Point"], primary_col
    if "camera" in low or "lpr" in low or "onvif" in low or "ip cam" in low:
        return _SHAPES["IP Camera"], primary_col
    if "nvr" in low or "dvr" in low:
        return _SHAPES["NVR"], primary_col
    if "nas" in low or "storage" in low:
        return _SHAPES["NAS"], primary_col
    if "server" in low:
        return _SHAPES["Server"], primary_col
    if "laptop" in low or "notebook" in low:
        return _SHAPES["Laptop"], secondary_col
    if "workstation" in low or "pc" in low or "desktop" in low or "computer" in low:
        return _SHAPES["Computer"], secondary_col
    if "printer" in low or "print" in low:
        return _SHAPES["Printer"], secondary_col
    if "phone" in low or "mobile" in low or "voip" in low:
        return _SHAPES["VoIP Phone"], secondary_col
    if "tv" in low or "media" in low or "display" in low:
        return _SHAPES["Smart TV"], secondary_col
    if "iot" in low or "sensor" in low:
        return _SHAPES["IoT Device"], secondary_col
    if raw in _SHAPES:
        return _SHAPES[raw], secondary_col
    return _SHAPES["Unknown"], secondary_col


@lru_cache(maxsize=128)
def _cached_icon(device_type: str, theme: str) -> QIcon:
    is_light = theme == "light"
    drawing, stroke = _resolve_glyph_and_color(device_type, is_light)
    icon = QIcon()
    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" '
        f'fill="none" stroke="{stroke}" stroke-width="2.6" '
        f'stroke-linecap="round" stroke-linejoin="round">{drawing}</svg>'
    ).encode()
    renderer = QSvgRenderer(QByteArray(svg))
    for size in (24, 48, 96):
        pixmap = QPixmap(size, size)
        pixmap.fill(Qt.GlobalColor.transparent)
        painter = QPainter(pixmap)
        renderer.render(painter)
        painter.end()
        icon.addPixmap(pixmap)
    return icon


def icon_for_type(device_type: str, theme: str | None = None) -> QIcon:
    resolved_theme = (theme or get_current_theme()).lower()
    return _cached_icon(device_type or "Unknown", "light" if resolved_theme == "light" else "dark")


icon_for_type.cache_clear = _cached_icon.cache_clear  # type: ignore[attr-defined]

