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

from pro import live_probe
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
            # HIGH confidence (live burst catch, or genuine repeated
            # flapping) can assert this as confirmed; MEDIUM confidence (a
            # brand-new MAC with no supporting history either way — e.g. a
            # phone manually set to a camera's static IP) is still reported
            # as a conflict, just with softer, non-"CONFIRMED" wording, so
            # the single most common real-world case is never silently
            # downgraded to an easy-to-miss "MAC changed" notice.
            message_key = "msg_ip_conflict" if confidence == Confidence.HIGH else "msg_ip_conflict_possible"
            events.append(
                Event(
                    ts=ts,
                    severity=Severity.CRITICAL,
                    type=EventType.IP_CONFLICT,
                    ip=ip,
                    mac=mac,
                    confidence=confidence,
                    message=t(lang, message_key, ip=display, old_mac=prior_mac, new_mac=mac),
                )
            )
        else:
            # Only remaining case is LOW confidence: a benign explanation
            # was found (this is the previous occupant peacefully
            # returning, or the old MAC legitimately moved to a new
            # address itself, e.g. via DHCP) — reassure instead of
            # alarming; repeatedly crying "conflict!" for ordinary address
            # handovers is exactly what erodes trust.
            events.append(
                Event(
                    ts=ts,
                    severity=Severity.INFO,
                    type=EventType.MAC_CHANGED,
                    ip=ip,
                    mac=mac,
                    confidence=confidence,
                    message=t(lang, "msg_mac_changed_normal", ip=display, old_mac=prior_mac, new_mac=mac),
                )
            )

    if mac:
        db.record_mac_change(ip, mac, ts)

    model_info = build_model_info(
        result.upnp_friendly_name, result.upnp_device_type, result.snmp_sys_descr, result.vendor,
        http_banner=result.http_banner, rtsp_banner=result.rtsp_banner,
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

    Correctness note (this exact bug was reported by a real user): a MAC
    change must be judged by what is happening *right now*, not by "has
    this MAC ever been seen at this IP before". A device that briefly gets
    displaced (someone else takes its address for a few minutes) and then
    comes straight back the moment the intruder leaves is NOT a fresh
    conflict — it is the *end* of one (if anything). The previous version
    of this function got that backwards: it treated "the new MAC already
    occupied this IP earlier" as the strongest possible conflict signal,
    which made the REVERT step (old device peacefully reclaiming its own
    address) the one that screamed "HIGH CONFIDENCE CONFLICT", while the
    actual intrusion moments earlier was waved through as a bland
    MEDIUM "MAC changed". That is exactly backwards.
    """
    # Layer 1 — try to catch it live. A single ARP-cache read can only ever
    # show one MAC per IP; a short burst of independent re-checks has a
    # real chance of catching both devices if they are genuinely both
    # answering right now. This is the only way to warn "at the moment it
    # happens" instead of inferring it later from history.
    burst_macs = live_probe.burst_check_macs(ip)
    if len(burst_macs) >= 2:
        return Confidence.HIGH, True

    recent = db.recent_macs_for_ip(ip, limit=5)
    recent_macs = [r["mac"].lower() for r in recent]  # recent[0] == old_mac

    # A -> B -> A: whatever briefly displaced this IP's usual occupant is
    # gone again. This is a REVERT, not a new conflict — if the earlier
    # A -> B change deserved an alert, it already got one when it happened.
    if len(recent_macs) >= 2 and new_mac.lower() == recent_macs[1]:
        # ...unless this is actually A -> B -> A -> B (a THIRD alternation
        # visible in history): that is genuine repeated flapping — two
        # devices actively racing for the address over time — not a
        # one-off revert, and deserves the strongest signal.
        if len(recent_macs) >= 3 and recent_macs[2] == old_mac.lower():
            return Confidence.HIGH, True
        return Confidence.LOW, False

    # The old occupant's MAC now legitimately living on a different IP is
    # the classic signature of a DHCP lease reshuffle: not a conflict.
    if db.last_ip_for_mac(old_mac) not in (None, ip):
        return Confidence.LOW, False

    # A brand-new MAC neither ever seen at this IP nor accounted for
    # elsewhere. We can't be certain both devices are live at this exact
    # instant (the burst check above found nothing), but this is exactly
    # the scenario a real user hit and expected to be warned about (e.g. a
    # phone manually given a camera's static IP): with no benign
    # explanation found anywhere in history, this must be surfaced as an
    # actual IP conflict (medium confidence, softer wording), not filed as
    # an easy-to-dismiss plain "MAC changed" event.
    return Confidence.MEDIUM, True


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
