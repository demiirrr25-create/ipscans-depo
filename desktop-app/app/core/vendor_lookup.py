"""MAC address -> vendor (OUI) lookup, offline."""
from __future__ import annotations

from functools import lru_cache

try:
    from mac_vendor_lookup import MacLookup

    _mac_lookup = MacLookup()
except Exception:  # library missing, or its bundled OUI file didn't ship — degrade gracefully
    _mac_lookup = None


@lru_cache(maxsize=4096)
def lookup_vendor(mac: str | None) -> str | None:
    if not mac or _mac_lookup is None:
        return None
    try:
        return _mac_lookup.lookup(mac)
    except Exception:
        return None
