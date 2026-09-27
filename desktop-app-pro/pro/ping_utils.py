"""Latency + packet-loss measurement (spec items 13-14).

Shells out to the OS `ping` command (same approach as the free app's
network_utils, so no admin/raw-socket privileges are required) and parses
its own reported round-trip time instead of timing the subprocess call,
which would also include process-spawn overhead.
"""
from __future__ import annotations

import platform
import re
import subprocess

from pro.models import PingResult

_IS_WINDOWS = platform.system().lower() == "windows"
_NO_WINDOW_KWARGS = {"creationflags": subprocess.CREATE_NO_WINDOW} if _IS_WINDOWS else {}

_TIME_RE = re.compile(r"time[=<]([\d.]+)\s*ms", re.IGNORECASE)

# Configurable thresholds (spec item 13) — exposed as module-level defaults
# so the UI can read/override them via Database settings.
LATENCY_NORMAL_MS = 20
LATENCY_HIGH_MS = 100
LATENCY_CRITICAL_MS = 200


def latency_label(ms: float | None) -> str:
    if ms is None:
        return "unknown"
    if ms <= LATENCY_NORMAL_MS:
        return "excellent"
    if ms <= LATENCY_HIGH_MS:
        return "normal"
    if ms <= LATENCY_CRITICAL_MS:
        return "high"
    return "critical"


def _run_ping(ip: str, timeout_ms: int = 1000) -> str:
    cmd = (
        ["ping", "-n", "1", "-w", str(timeout_ms), ip]
        if _IS_WINDOWS
        else ["ping", "-c", "1", "-W", str(max(1, timeout_ms // 1000)), ip]
    )
    try:
        result = subprocess.run(
            cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
            timeout=timeout_ms / 1000 + 1, text=True, **_NO_WINDOW_KWARGS,
        )
        return result.stdout if result.returncode == 0 else ""
    except (subprocess.TimeoutExpired, OSError):
        return ""


def ping_with_latency(ip: str, samples: int = 4) -> PingResult:
    """Sends `samples` sequential pings, returns whether the host is
    reachable, its last measured latency, and packet loss over the batch.
    """
    successes = 0
    last_latency: float | None = None

    for _ in range(samples):
        output = _run_ping(ip)
        if output:
            successes += 1
            match = _TIME_RE.search(output)
            if match:
                last_latency = float(match.group(1))

    packet_loss_pct = round((1 - successes / samples) * 100, 1) if samples else 0.0
    return PingResult(
        ip=ip,
        alive=successes > 0,
        latency_ms=last_latency if successes > 0 else None,
        packet_loss_pct=packet_loss_pct,
    )
