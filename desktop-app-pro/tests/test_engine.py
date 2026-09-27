"""Unit tests for the pure-Python engine — run with `python -m pytest tests/`
or plain `python tests/test_engine.py`. No Qt/display needed.
"""
from __future__ import annotations

import sqlite3
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from pro.conflict_engine import process_scan_pass, process_ping_result, resolve_identity_key
from pro.database import Database
from pro.device_classifier import classify_device_type
from pro.health_score import compute_health_score
from pro.license import MockLicenseProvider, Plan
from pro.models import EventType, ScanPassResult


def make_db() -> Database:
    tmp = Path(tempfile.mkdtemp()) / "test.db"
    return Database(tmp)


def test_new_device_detected():
    db = make_db()
    events = process_scan_pass(db, [ScanPassResult(ip="192.168.1.50", mac="AA:BB:CC:11:22:33")])
    assert len(events) == 1
    assert events[0].type == EventType.NEW_DEVICE
    assert db.get_device("aa:bb:cc:11:22:33") is not None
    print("PASS: new_device_detected")


def test_ip_change_no_conflict():
    db = make_db()
    process_scan_pass(db, [ScanPassResult(ip="192.168.1.50", mac="AA:BB:CC:11:22:33")])
    events = process_scan_pass(db, [ScanPassResult(ip="192.168.1.73", mac="AA:BB:CC:11:22:33")])
    types = [e.type for e in events]
    assert EventType.IP_CHANGED in types
    assert EventType.IP_CONFLICT not in types
    print("PASS: ip_change_no_conflict")


def test_mac_change_dhcp_reshuffle_low_confidence():
    """Classic false positive to avoid (spec #45): IP 50's old MAC moves to
    IP 73 (its own DHCP renewal), and a new device takes IP 50. This must
    NOT be reported as a conflict.
    """
    db = make_db()
    process_scan_pass(db, [ScanPassResult(ip="192.168.1.50", mac="AA:BB:CC:11:22:33")])
    # Old MAC reappears on a new IP (its own renewal) ...
    process_scan_pass(db, [ScanPassResult(ip="192.168.1.73", mac="AA:BB:CC:11:22:33")])
    # ... then IP 50 is claimed by a different MAC.
    events = process_scan_pass(db, [ScanPassResult(ip="192.168.1.50", mac="AA:BB:CC:44:55:66")])
    conflict_events = [e for e in events if e.type == EventType.IP_CONFLICT]
    assert conflict_events == [], f"expected no conflict, got {conflict_events}"
    print("PASS: mac_change_dhcp_reshuffle_low_confidence")


def test_ip_conflict_flapping_high_confidence():
    """Two devices racing for the same IP: it alternates between two MACs
    across consecutive polls with neither MAC ever appearing on another IP.
    This SHOULD be flagged as a high-confidence conflict.
    """
    db = make_db()
    process_scan_pass(db, [ScanPassResult(ip="192.168.1.50", mac="AA:BB:CC:11:22:33")])
    process_scan_pass(db, [ScanPassResult(ip="192.168.1.50", mac="AA:BB:CC:44:55:66")])
    events = process_scan_pass(db, [ScanPassResult(ip="192.168.1.50", mac="AA:BB:CC:11:22:33")])
    conflict_events = [e for e in events if e.type == EventType.IP_CONFLICT]
    assert len(conflict_events) == 1, f"expected 1 conflict, got {conflict_events}"
    assert conflict_events[0].confidence.value == "high"
    print("PASS: ip_conflict_flapping_high_confidence")


def test_offline_threshold_and_recovery():
    db = make_db()
    process_scan_pass(db, [ScanPassResult(ip="192.168.1.50", mac="AA:BB:CC:11:22:33")])
    key = "aa:bb:cc:11:22:33"
    assert process_ping_result(db, key, "192.168.1.50", alive=False, offline_threshold=3) is None
    assert process_ping_result(db, key, "192.168.1.50", alive=False, offline_threshold=3) is None
    offline_event = process_ping_result(db, key, "192.168.1.50", alive=False, offline_threshold=3)
    assert offline_event is not None and offline_event.type == EventType.DEVICE_OFFLINE
    # A single subsequent failure shouldn't re-fire the event (spec #12).
    assert process_ping_result(db, key, "192.168.1.50", alive=False, offline_threshold=3) is None
    online_event = process_ping_result(db, key, "192.168.1.50", alive=True, offline_threshold=3)
    assert online_event is not None and online_event.type == EventType.DEVICE_ONLINE
    print("PASS: offline_threshold_and_recovery")


def test_health_score_perfect():
    breakdown = compute_health_score(10, 0, 0, 0, 0.0, 0)
    assert breakdown.score == 100
    print("PASS: health_score_perfect")


def test_health_score_degraded():
    breakdown = compute_health_score(
        total_devices=100, ip_conflicts=1, offline_devices=5,
        high_latency_devices=2, avg_packet_loss_pct=10.0, unknown_devices=3,
    )
    assert 0 <= breakdown.score < 100
    assert len(breakdown.deductions) == 5
    print(f"PASS: health_score_degraded (score={breakdown.score})")


def test_mock_license_activation():
    db = make_db()
    provider = MockLicenseProvider(db)
    assert provider.get_status().plan == Plan.FREE
    status = provider.activate("user@example.com", "TEST-KEY-1234")
    assert status.plan == Plan.PRO
    assert status.is_active
    assert status.has_feature("continuous_monitoring")
    assert not status.has_feature("multi_site")
    print("PASS: mock_license_activation")


def test_device_classifier():
    assert classify_device_type([554], "Hikvision", None) == "IP Camera"
    assert classify_device_type([37777], None, None) == "NVR"
    assert classify_device_type([9100], None, None) == "Printer"
    assert classify_device_type([3389, 445], None, None) == "Computer"
    assert classify_device_type([], None, None) == "Unknown"
    assert classify_device_type([80], None, "lobby-cam-01") == "IP Camera"
    print("PASS: device_classifier")


def test_device_classifier_prioritizes_self_description_over_ports():
    # A camera that also happens to have port 80 open (its web UI) must not
    # be misclassified as a router just because 80/443 are open.
    assert classify_device_type(
        [80, 443], "TP-Link", None, upnp_device_type="urn:schemas-upnp-org:device:Camera:1"
    ) == "IP Camera"
    # A known camera-vendor MAC should win even with zero recognized ports
    # (e.g. right after power-on, before RTSP/ONVIF has started listening).
    assert classify_device_type([], "Hikvision Digital Technology", None) == "IP Camera"
    print("PASS: device_classifier_prioritizes_self_description_over_ports")


def test_identity_merges_when_mac_resolves_on_a_later_pass():
    """Regression test for the exact bug reported: a device first seen
    without a MAC (common — ARP resolution can lag the ping sweep by a
    beat) must NOT show up as a second "new device" once its MAC is
    resolved on a later pass. It should merge into one continuous record.
    """
    db = make_db()
    events_pass1 = process_scan_pass(db, [ScanPassResult(ip="192.168.1.100", mac=None, vendor="Hikvision")])
    assert len(events_pass1) == 1 and events_pass1[0].type == EventType.NEW_DEVICE
    db.set_custom_name("ip:192.168.1.100", "Front Gate Camera")

    events_pass2 = process_scan_pass(
        db, [ScanPassResult(ip="192.168.1.100", mac="AA:BB:CC:DD:EE:FF", vendor="Hikvision")]
    )
    assert not any(e.type == EventType.NEW_DEVICE for e in events_pass2), (
        "should not be treated as a new device once its MAC resolves"
    )

    all_rows = db.all_devices()
    assert len(all_rows) == 1, f"expected exactly one device row, got {len(all_rows)}"
    assert all_rows[0]["custom_name"] == "Front Gate Camera"  # history/name preserved
    assert all_rows[0]["identity_key"] == "aa:bb:cc:dd:ee:ff"
    print("PASS: identity_merges_when_mac_resolves_on_a_later_pass")


def test_resolve_identity_key_reuses_known_device_without_mac():
    db = make_db()
    process_scan_pass(db, [ScanPassResult(ip="192.168.1.50", mac="AA:BB:CC:11:22:33")])
    # A later pass that fails to resolve a MAC for the same IP (transient
    # ARP hiccup) should resolve back to the SAME existing device, not spin
    # up a fresh "ip:" placeholder for it.
    key = resolve_identity_key(db, "192.168.1.50", None)
    assert key == "aa:bb:cc:11:22:33"
    print("PASS: resolve_identity_key_reuses_known_device_without_mac")


def test_database_migrates_old_schema_without_data_loss():
    """Regression test: adding a column to SCHEMA does nothing for a DB file
    that already exists on disk (CREATE TABLE IF NOT EXISTS is a no-op) —
    Database._migrate() must ALTER TABLE the existing installs, preserving
    their data, or every upgrade crashes with "no such column".
    """
    old_schema = """
        CREATE TABLE devices (
            identity_key TEXT PRIMARY KEY, ip TEXT NOT NULL, mac TEXT, vendor TEXT,
            hostname TEXT, device_type TEXT DEFAULT 'Unknown', custom_name TEXT, notes TEXT,
            first_seen TEXT NOT NULL, last_seen TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'online',
            consecutive_failures INTEGER NOT NULL DEFAULT 0, last_latency_ms REAL, last_packet_loss_pct REAL
        );
        CREATE TABLE license (
            id INTEGER PRIMARY KEY CHECK (id = 1), plan TEXT NOT NULL DEFAULT 'FREE',
            status TEXT NOT NULL DEFAULT 'INACTIVE', email TEXT, activated_at TEXT, expires_at TEXT
        );
    """
    tmp = Path(tempfile.mkdtemp()) / "old.db"
    conn = sqlite3.connect(str(tmp))
    conn.executescript(old_schema)
    conn.execute(
        "INSERT INTO devices (identity_key, ip, first_seen, last_seen) VALUES (?, ?, 't', 't')",
        ("ip:1.2.3.4", "1.2.3.4"),
    )
    conn.execute("INSERT INTO license (id, plan, status, email) VALUES (1, 'PRO', 'TRIAL', 'old@example.com')")
    conn.commit()
    conn.close()

    db = Database(tmp)
    device = db.get_device("ip:1.2.3.4")
    assert device["ip"] == "1.2.3.4"  # pre-existing data survived
    assert device["tags"] is None and device["is_critical"] == 0  # new columns default cleanly
    license_row = db.get_license()
    assert license_row["email"] == "old@example.com" and license_row["license_key"] is None

    db.set_tags("ip:1.2.3.4", "Camera,Block A")
    db.set_critical("ip:1.2.3.4", True)
    updated = db.get_device("ip:1.2.3.4")
    assert updated["tags"] == "Camera,Block A" and updated["is_critical"] == 1
    print("PASS: database_migrates_old_schema_without_data_loss")


def test_critical_device_lower_offline_threshold():
    db = make_db()
    process_scan_pass(db, [ScanPassResult(ip="192.168.1.60", mac="AA:BB:CC:77:88:99")])
    key = "aa:bb:cc:77:88:99"
    db.set_critical(key, True)
    # A critical device should fire DEVICE_OFFLINE after just 1 miss, not 3.
    event = process_ping_result(db, key, "192.168.1.60", alive=False, offline_threshold=1)
    assert event is not None and event.type == EventType.DEVICE_OFFLINE
    print("PASS: critical_device_lower_offline_threshold")


def test_monitor_detects_device_that_goes_fully_dark():
    """Regression test for the exact bug reported: unplugging a device
    means it no longer answers the ping SWEEP at all, so it never appears
    in scan_results — MonitorWorker must still explicitly re-check every
    previously-known device that's missing from the current pass, or its
    offline counter never increments and no alert/notification ever fires.
    """
    import pro.monitor as monitor_module
    from pro.models import PingResult

    db = make_db()
    call_count = {"n": 0}

    class _FakeDevice:
        ip = "192.168.1.77"
        mac = "AA:BB:CC:00:11:22"
        vendor = "TestVendor"
        hostname = None
        open_ports: list[int] = []
        upnp_friendly_name = None
        upnp_device_type = None
        snmp_sys_descr = None
        serial_number = None

    def fake_run_scan(targets, options, on_device_found=None, should_stop=None):
        call_count["n"] += 1
        if call_count["n"] == 1:
            on_device_found(_FakeDevice())
        # Ticks 2+: the sweep finds nothing (device unplugged).

    def fake_ping_with_latency(ip, samples=2):
        if call_count["n"] == 1:
            return PingResult(ip=ip, alive=True, latency_ms=5.0, packet_loss_pct=0.0)
        return PingResult(ip=ip, alive=False, latency_ms=None, packet_loss_pct=100.0)

    original_run_scan = monitor_module.run_scan
    original_ping = monitor_module.ping_with_latency
    monitor_module.run_scan = fake_run_scan
    monitor_module.ping_with_latency = fake_ping_with_latency
    try:
        worker = monitor_module.MonitorWorker(db, ["192.168.1.77"], interval_sec=9999)
        worker._offline_threshold = 2  # keep the test fast

        worker._run_one_tick()  # tick 1: found by the sweep, online
        assert db.get_device("aa:bb:cc:00:11:22")["status"] == "online"

        worker._run_one_tick()  # tick 2: missing from the sweep (miss 1 of 2)
        assert db.get_device("aa:bb:cc:00:11:22")["consecutive_failures"] == 1
        assert db.get_device("aa:bb:cc:00:11:22")["status"] == "online"  # not yet crossed

        worker._run_one_tick()  # tick 3: still missing (miss 2 -> crosses threshold)
        row = db.get_device("aa:bb:cc:00:11:22")
        assert row["status"] == "offline", "device that vanished from the sweep must still be marked offline"
    finally:
        monitor_module.run_scan = original_run_scan
        monitor_module.ping_with_latency = original_ping
    print("PASS: monitor_detects_device_that_goes_fully_dark")


if __name__ == "__main__":
    tests = [v for k, v in list(globals().items()) if k.startswith("test_")]
    failures = 0
    for test in tests:
        try:
            test()
        except AssertionError as e:
            failures += 1
            print(f"FAIL: {test.__name__}: {e}")
    print(f"\n{len(tests) - failures}/{len(tests)} passed")
    sys.exit(1 if failures else 0)
