"""Real-time IP-conflict re-verification.

Everything the conflict engine normally has to go on is the OS's ARP
cache, read once per scan pass — and an ARP cache, by definition, can only
ever hold ONE MAC per IP (whichever reply it decided to keep), so a single
snapshot can never prove two devices are simultaneously claiming an
address. That is exactly why the naive "did the MAC on this IP change"
check can only ever notice a conflict *after the fact*, from history, and
why it also has no way to tell a genuine live conflict apart from the
common, harmless case of the ORIGINAL device simply reappearing after
being briefly displaced (see conflict_engine.py's revert handling).

This module closes that gap where it can: it fires a short burst of
independent probes at the same IP a few hundred milliseconds apart and
collects every distinct MAC observed. If two different devices are
genuinely both live on the network right now, there is a real chance
different probes in the burst each catch a different one of them
answering — the only way (short of raw packet capture, which needs admin/
root) to catch a conflict at the moment it is happening instead of
inferring it later from a history table.

Best-effort by design: `network_utils.clear_arp_entry` needs elevated
privileges to actually succeed on most systems; when it silently fails,
this simply degrades to "probably won't catch it live" rather than
raising — the caller always has the history-based classification as a
fallback (see conflict_engine._classify_mac_change).
"""
from __future__ import annotations

import sys
import time
from pathlib import Path

_FREE_APP_ROOT = Path(__file__).resolve().parent.parent.parent / "desktop-app"
if str(_FREE_APP_ROOT) not in sys.path:
    sys.path.insert(0, str(_FREE_APP_ROOT))

from app.core import network_utils  # noqa: E402

BURST_ATTEMPTS = 3
BURST_DELAY_SEC = 0.4


def burst_check_macs(ip: str, attempts: int = BURST_ATTEMPTS, delay_sec: float = BURST_DELAY_SEC) -> set[str]:
    """Returns every distinct MAC seen for `ip` across a short burst of
    independent probes. Two or more distinct MACs is a definitive,
    real-time "both are answering right now" signal.
    """
    seen: set[str] = set()
    for i in range(attempts):
        try:
            network_utils.clear_arp_entry(ip)
            network_utils.ping_once(ip)
            mac = network_utils.read_arp_entry(ip)
        except Exception:
            mac = None
        if mac:
            seen.add(mac.lower())
        if i < attempts - 1:
            time.sleep(delay_sec)
    return seen
