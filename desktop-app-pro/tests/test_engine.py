"""Unit tests for the pure-Python engine — run with `python -m pytest tests/`
or plain `python tests/test_engine.py`. No Qt/display needed.
"""
from __future__ import annotations

import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from pro.conflict_engine import process_scan_pass, process_ping_result
from pro.database import Database
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
