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
from pro.device_classifier import build_model_info
from pro.models import Confidence, Event, EventType, ScanPassResult, Severity
from pro.pro_content import DEFAULT_LANGUAGE, t


def identity_key_for(mac: str | None, ip: str) -> str:
    return mac.lower() if mac else f"ip:{ip}"


def resolve_identity_key(db: Database, ip: str, mac: str | None) -> str:
    """Like identity_key_for, but merge-aware: a device first seen without
    a MAC (common right after it appears — ARP resolution can lag a beat
    behind the ping sweep) gets keyed "ip:<ip>"; if it's THEN seen again
    with a MAC on a later pass, naively switching to the MAC-based key
    would make it look like a brand-new device, discarding its name/tags/
    history. This detects that exact situation and migrates the old
    "ip:"-keyed row forward onto the MAC-based key instead.

    This does NOT touch genuine MAC-change/conflict scenarios (a different
    MAC previously recorded for this IP) — that stays the conflict
    engine's job; this only merges when the old row has no MAC at all.
    """
    if mac:
        mac_key = mac.lower()
        if db.get_device(mac_key) is None:
            ip_key = f"ip:{ip}"
            stale = db.get_device(ip_key)
            if stale is not None and stale["mac"] is None:
                db.migrate_identity(ip_key, mac_key)
        return mac_key

    # No MAC resolved this pass — reuse the existing device for this IP
    # (if any) rather than minting a new "ip:" placeholder every time MAC
    # resolution happens to miss a beat.
    existing = db.find_device_by_ip(ip)
    return existing["identity_key"] if existing is not None else f"ip:{ip}"


def _friendly(row, ip: str) -> str:
    """Devices the user has named (spec items 15-16) show that name next to
    the IP in every message/alert, so a problem can be triaged at a glance
    ("A Blok Kamera 1 (192.168.1.50)") instead of just a bare address.
    """
    if row and row["custom_name"]:
        return f"{row['custom_name']} ({ip})"
    return ip


def process_scan_pass(db: Database, results: list[ScanPassResult], lang: str = DEFAULT_LANGUAGE) -> list[Event]:
    """Feeds one full scan pass through the conflict engine, updating the
    database and returning every Event generated (for the UI/notifications).
    """
    events: list[Event] = []
    ts = now_iso()

    for result in results:
        events.extend(_process_one(db, result, ts, lang))

    return events


def _process_one(db: Database, result: ScanPassResult, ts: str, lang: str) -> list[Event]:
    events: list[Event] = []
    ip, mac = result.ip, result.mac
    key = resolve_identity_key(db, ip, mac)

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
                message=t(lang, "msg_new_device", ip=ip) + (f" ({mac})" if mac else ""),
            )
        )
    elif existing_device["ip"] != ip:
        name = existing_device["custom_name"]
        old_display = f"{name} ({existing_device['ip']})" if name else existing_device["ip"]
        new_display = f"{name} ({ip})" if name else ip
        events.append(
            Event(
                ts=ts,
                severity=Severity.INFO,
                type=EventType.IP_CHANGED,
                ip=ip,
                mac=mac,
                message=t(lang, "msg_ip_changed", old_ip=old_display, new_ip=new_display),
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
        display = _friendly(existing_device, ip)
        if is_conflict:
            events.append(
                Event(
                    ts=ts,
                    severity=Severity.CRITICAL,
                    type=EventType.IP_CONFLICT,
                    ip=ip,
                    mac=mac,
                    confidence=confidence,
                    message=t(lang, "msg_ip_conflict", ip=display, old_mac=prior_mac, new_mac=mac),
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
                    message=t(lang, "msg_mac_changed", ip=display),
                )
            )

    if mac:
        db.record_mac_change(ip, mac, ts)

    model_info = build_model_info(
        result.upnp_friendly_name, result.upnp_device_type, result.snmp_sys_descr, result.vendor,
    )
    db.upsert_device(
        key, ip, mac, result.vendor, result.hostname, result.device_type, ts,
        model_info=model_info, serial_number=result.serial_number,
    )
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


def process_ping_result(
    db: Database, identity_key: str, ip: str, alive: bool, offline_threshold: int,
    lang: str = DEFAULT_LANGUAGE,
) -> Event | None:
    """Offline/back-online transition detection (spec item 12) — only fires
    on the threshold crossing, not on every failed poll.
    """
    ts = now_iso()
    display = _friendly(db.get_device(identity_key), ip)
    if alive:
        if db.mark_back_online(identity_key):
            return Event(
                ts=ts, severity=Severity.INFO, type=EventType.DEVICE_ONLINE,
                ip=ip, message=t(lang, "msg_device_online", ip=display),
            )
        return None

    if db.mark_ping_failure(identity_key, offline_threshold):
        return Event(
            ts=ts, severity=Severity.WARNING, type=EventType.DEVICE_OFFLINE,
            ip=ip, message=t(lang, "msg_device_offline", ip=display),
        )
    return None
