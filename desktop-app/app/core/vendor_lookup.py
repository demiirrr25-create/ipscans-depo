"""MAC address -> vendor (OUI) lookup, offline."""
from __future__ import annotations

from functools import lru_cache

try:
    from mac_vendor_lookup import MacLookup

    _mac_lookup = MacLookup()
except ImportError:  # library not installed yet — degrade gracefully
    _mac_lookup = None


@lru_cache(maxsize=4096)
def lookup_vendor(mac: str | None) -> str | None:
    if not mac or _mac_lookup is None:
        return None
    try:
        return _mac_lookup.lookup(mac)
    except (KeyError, ValueError):
        return None
