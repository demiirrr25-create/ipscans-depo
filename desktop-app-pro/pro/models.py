"""Data shapes shared across the pro engine modules."""
from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum


class Severity(str, Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class Confidence(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class EventType(str, Enum):
    NEW_DEVICE = "new_device"
    IP_CHANGED = "ip_changed"
    MAC_CHANGED = "mac_changed"
    IP_CONFLICT = "ip_conflict"
    DEVICE_OFFLINE = "device_offline"
    DEVICE_ONLINE = "device_online"
    HIGH_LATENCY = "high_latency"
    PACKET_LOSS = "packet_loss"


@dataclass
class Event:
    """A single row in the Event Log. `ts` is an ISO-8601 UTC string so it
    sorts and serializes without extra conversion.
    """

    ts: str
    severity: Severity
    type: EventType
    message: str
    ip: str | None = None
    mac: str | None = None
    confidence: Confidence | None = None


@dataclass
class PingResult:
    ip: str
    alive: bool
    latency_ms: float | None = None
    packet_loss_pct: float = 0.0


@dataclass
class ScanPassResult:
    """One tick of continuous monitoring / one manual scan — the raw input
    the conflict engine and health score reason about.
    """

    ip: str
    mac: str | None
    vendor: str | None = None
    hostname: str | None = None
    device_type: str = "Unknown"
    open_ports: list[int] = field(default_factory=list)
    # Best-effort device identification (spec item 15's "vendor and model"
    # ask) — populated from the free app's SNMP/UPnP enrichment, which was
    # already being fetched but previously discarded here.
    upnp_friendly_name: str | None = None
    upnp_device_type: str | None = None
    snmp_sys_descr: str | None = None
    serial_number: str | None = None
    # Pro-only enrichment (see pro/device_fingerprint.py) — the free
    # scanner doesn't fetch these; most consumer IP cameras/NVRs run
    # neither UPnP nor SNMP, so this is often the only identifying text
    # such a device ever offers.
    http_banner: str | None = None
    rtsp_banner: str | None = None
    ping: PingResult | None = None


@dataclass
class HealthBreakdown:
    score: int
    total_devices: int
    ip_conflicts: int
    offline_devices: int
    high_latency_devices: int
    avg_packet_loss_pct: float
    unknown_devices: int
    # Human-readable explanation of each deduction, in score-impact order —
    # shown in the UI so the number is never a black box (product spec #7).
    deductions: list[str] = field(default_factory=list)
