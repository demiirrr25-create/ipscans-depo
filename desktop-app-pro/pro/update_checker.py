"""Auto-update check (spec item 34) — compares this build's version against
/api/pro/version. Network failures are silent (no popups on every launch
just because the user is offline); the caller decides how to surface it.
"""
from __future__ import annotations

from dataclasses import dataclass

from pro.remote_api import RemoteAPIError, get_json

CURRENT_VERSION = "1.1.0"


@dataclass
class UpdateInfo:
    version: str
    download_url: str
    notes: str


def check_for_update() -> UpdateInfo | None:
    """Returns UpdateInfo if a newer version is published, else None
    (including on any network error — this is best-effort, not critical path).
    """
    try:
        data = get_json("/pro/version")
    except RemoteAPIError:
        return None

    latest = data.get("version")
    if not latest or latest == CURRENT_VERSION:
        return None
    return UpdateInfo(
        version=latest,
        download_url=data.get("downloadUrl", ""),
        notes=data.get("notes", ""),
    )
