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
