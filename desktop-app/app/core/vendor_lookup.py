"""Offline IEEE OUI lookup; network updates require explicit user action."""
from __future__ import annotations

import logging
import re
import os
import time
import uuid
from functools import lru_cache
from pathlib import Path

from mac_vendor_lookup import MacLookup
import requests

_LOG = logging.getLogger(__name__)
_STARTER_PREFIXES = {
    b"0C75D2": b"Hangzhou Hikvision Digital Technology Co.,Ltd.",
    b"74C929": b"Zhejiang Dahua Technology Co., Ltd.",
    b"68DDB7": b"TP-LINK TECHNOLOGIES CO.,LTD.",
    b"F09FC2": b"Ubiquiti Inc",
    b"E80AB9": b"Cisco Systems, Inc",
    b"0C1C31": b"MERCUSYS TECHNOLOGIES CO., LTD.",
    b"E00630": b"HUAWEI TECHNOLOGIES CO.,LTD",
    b"F80DA9": b"Zyxel Communications Corporation",
    b"405D82": b"NETGEAR",
    b"B8A44F": b"Axis Communications AB",
    b"CCEB5E": b"Xiaomi Communications Co Ltd",
    b"F0EE7A": b"Apple, Inc.",
    b"641B2F": b"Samsung Electronics Co.,Ltd",
    b"E4C767": b"Intel Corporate",
}


def _read_prefixes() -> dict[bytes, bytes]:
    lookup = MacLookup()
    if not lookup.find_vendors_list():
        _LOG.warning("No local IEEE OUI database; using verified starter prefixes. Update from the UI to expand coverage.")
        return _STARTER_PREFIXES
    lookup.load_vendors()
    return lookup.async_lookup.prefixes or _STARTER_PREFIXES


_prefixes = _read_prefixes()


@lru_cache(maxsize=4096)
def lookup_vendor(mac: str | None) -> str | None:
    if not mac:
        return None
    digits = re.sub(r"[^0-9a-fA-F]", "", mac).upper()
    if len(digits) != 12:
        return None
    value = _prefixes.get(digits[:6].encode("ascii"))
    return value.decode("utf-8", errors="replace") if value else None


def update_database() -> None:
    prefixes: dict[bytes, bytes] = {}
    with requests.Session() as session:
        session.trust_env = False
        with session.get("https://standards-oui.ieee.org/oui/oui.txt",
                         timeout=(3, 3), stream=True) as response:
            response.raise_for_status()
            deadline, size = time.monotonic() + 20, 0
            for line in response.iter_lines(chunk_size=1024):
                size += len(line)
                if time.monotonic() > deadline or size > 16 * 1024 * 1024:
                    raise TimeoutError("IEEE OUI update exceeded its time/size limit")
                if b"(base 16)" not in line:
                    continue
                prefix, vendor = (value.strip() for value in line.split(b"(base 16)", 1))
                if re.fullmatch(b"[0-9A-F]{6}", prefix) and vendor:
                    prefixes[prefix] = vendor
    if not prefixes:
        raise RuntimeError("IEEE OUI update returned an empty database")
    path = Path(MacLookup.cache_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f"{path.name}.{uuid.uuid4().hex}.tmp")
    try:
        with temporary.open("wb") as file:
            for prefix, vendor in prefixes.items():
                file.write(prefix + b":" + vendor + b"\n")
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)
    global _prefixes
    _prefixes = prefixes
    lookup_vendor.cache_clear()
    _LOG.info("IEEE vendor database refreshed")
