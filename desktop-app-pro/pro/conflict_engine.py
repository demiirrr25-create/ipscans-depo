"""IP Conflict Prevention engine.

This is the module the whole product is named after (spec item 3), so its
job is narrow and specific: decide, for each (ip, mac) pair seen in the
current scan pass, whether to record a plain update, an IP change, a MAC
change, or a "possible IP conflict" — and attach a confidence level so the
UI never states an unreliable detection as fact (spec items 45 and 56).

False-positive reduction (spec item 45): a device's IP changing because of
DHCP is extremely common and must not be reported as a conflict. The
heuristic used here (based on which MAC has *historically* occupied a given
IP, tracked independently of any single device's own identity):

  - A MAC change on some IP where the *new* MAC already occupied that same
    IP earlier in its history (flapping back and forth across polls) ->
    two devices are actively racing for the same address.
    Confidence: HIGH ("Possible IP Conflict Detected").
  - A MAC change where the *old* occupant's MAC has since legitimately
    turned up on a *different* IP (i.e. it didn't vanish, it moved) ->
    most likely a DHCP lease reassignment: the old device renewed onto a
    new address and something else took the one it vacated.
    Confidence: LOW that this is a conflict.
  - Anything in between (MAC changed once, old MAC's fate unknown) ->
    Confidence: MEDIUM, reported as a MAC change, not asserted as a conflict.

None of this claims certainty — see the neutral message wording below.
"""
from __future__ import annotations

from pro.database import Database, now_iso
from pro.models import Confidence, Event, EventType, ScanPassResult, Severity


def identity_key_for(mac: str | None, ip: str) -> str:
    return mac.lower() if mac else f"ip:{ip}"


def process_scan_pass(db: Database, results: list[ScanPassResult]) -> list[Event]:
    """Feeds one full scan pass through the conflict engine, updating the
    database and returning every Event generated (for the UI/notifications).
    """
    events: list[Event] = []
    ts = now_iso()

    for result in results:
        events.extend(_process_one(db, result, ts))

    return events


def _process_one(db: Database, result: ScanPassResult, ts: str) -> list[Event]:
    events: list[Event] = []
    ip, mac = result.ip, result.mac
    key = identity_key_for(mac, ip)

    existing_device = db.get_device(key)
    # The MAC that occupied *this IP* just before this pass — independent of
    # whether `mac`'s own device identity has been seen before. Read before
    # recording this pass's entry below, so it truly reflects "prior".
    prior_row = db.recent_macs_for_ip(ip, limit=1)
    prior_mac = prior_row[0]["mac"] if prior_row else None

    if existing_device is None:
        events.append(
            Event(
                ts=ts,
                severity=Severity.INFO,
                type=EventType.NEW_DEVICE,
                ip=ip,
                mac=mac,
                message=f"New device detected: {ip}" + (f" ({mac})" if mac else ""),
            )
        )
    elif existing_device["ip"] != ip:
        events.append(
            Event(
                ts=ts,
                severity=Severity.INFO,
                type=EventType.IP_CHANGED,
                ip=ip,
                mac=mac,
                message=f"IP address changed from {existing_device['ip']} to {ip}.",
            )
        )
        db.record_ip_change(key, ip, ts)

    # ------------------------------------------------- IP-occupancy check
    # Did the MAC associated with *this IP* change, regardless of whether
    # the new MAC is itself a known device? This is what actually detects
    # two devices contending for one address (spec #3), and must run even
    # when the branch above just recorded a brand-new device.
    if mac and prior_mac and mac.lower() != prior_mac.lower():
        confidence, is_conflict = _classify_mac_change(db, ip, old_mac=prior_mac, new_mac=mac)
        if is_conflict:
            events.append(
                Event(
                    ts=ts,
                    severity=Severity.CRITICAL,
                    type=EventType.IP_CONFLICT,
                    ip=ip,
                    mac=mac,
                    confidence=confidence,
                    message=(
                        f"Possible IP conflict detected on {ip}: multiple MAC addresses "
                        f"({prior_mac}, {mac}) were associated with this IP during monitoring."
                    ),
                )
            )
        else:
            events.append(
                Event(
                    ts=ts,
                    severity=Severity.WARNING,
                    type=EventType.MAC_CHANGED,
                    ip=ip,
                    mac=mac,
                    confidence=confidence,
                    message=f"The MAC address associated with {ip} has changed.",
                )
            )

    if mac:
        db.record_mac_change(ip, mac, ts)

    db.upsert_device(key, ip, mac, result.vendor, result.hostname, result.device_type, ts)
    for event in events:
        db.add_event(event)
    return events


def _classify_mac_change(db: Database, ip: str, old_mac: str, new_mac: str) -> tuple[Confidence, bool]:
    """Returns (confidence, is_conflict). See module docstring for the rules.

    Called before this pass's mac_history row is inserted, so `recent`
    reflects only prior state; `recent[0]` is always `old_mac` itself.
    """
    recent = db.recent_macs_for_ip(ip, limit=5)
    recent_macs = [r["mac"].lower() for r in recent]

    # The *new* MAC having already occupied this IP earlier (before old_mac
    # took over) means the address is flapping between (at least) two
    # devices — a real conflict signal, not a one-way transition.
    if new_mac.lower() in recent_macs:
        return Confidence.HIGH, True

    # The old occupant's MAC now legitimately living on a different IP is
    # the classic signature of a DHCP lease reshuffle: not a conflict.
    if db.last_ip_for_mac(old_mac) not in (None, ip):
        return Confidence.LOW, False

    # Otherwise we genuinely don't know why the MAC changed — report it,
    # but only as a MEDIUM-confidence MAC change, never as a hard conflict.
    return Confidence.MEDIUM, False


def process_ping_result(db: Database, identity_key: str, ip: str, alive: bool, offline_threshold: int) -> Event | None:
    """Offline/back-online transition detection (spec item 12) — only fires
    on the threshold crossing, not on every failed poll.
    """
    ts = now_iso()
    if alive:
        if db.mark_back_online(identity_key):
            return Event(
                ts=ts, severity=Severity.INFO, type=EventType.DEVICE_ONLINE,
                ip=ip, message=f"{ip} is back online.",
            )
        return None

    if db.mark_ping_failure(identity_key, offline_threshold):
        return Event(
            ts=ts, severity=Severity.WARNING, type=EventType.DEVICE_OFFLINE,
            ip=ip, message=f"{ip} is not responding (offline).",
        )
    return None
