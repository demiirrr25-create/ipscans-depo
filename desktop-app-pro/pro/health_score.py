"""Network Health Score — a transparent, explainable 0-100 number (spec #7).

Every point deducted has a stated reason, returned alongside the score so
the UI can show "why" instead of a black-box percentage.
"""
from __future__ import annotations

from pro.models import HealthBreakdown


def compute_health_score(
    total_devices: int,
    ip_conflicts: int,
    offline_devices: int,
    high_latency_devices: int,
    avg_packet_loss_pct: float,
    unknown_devices: int,
) -> HealthBreakdown:
    score = 100.0
    deductions: list[str] = []

    if ip_conflicts:
        penalty = min(40, ip_conflicts * 15)
        score -= penalty
        deductions.append(f"-{penalty:.0f}: {ip_conflicts} IP conflict(s)")

    if total_devices > 0 and offline_devices:
        ratio = offline_devices / total_devices
        penalty = round(ratio * 30, 1)
        score -= penalty
        deductions.append(f"-{penalty:.0f}: {offline_devices}/{total_devices} device(s) offline")

    if high_latency_devices:
        penalty = min(20, high_latency_devices * 5)
        score -= penalty
        deductions.append(f"-{penalty:.0f}: {high_latency_devices} high-latency device(s)")

    if avg_packet_loss_pct > 0:
        penalty = round(min(20, avg_packet_loss_pct * 0.5), 1)
        score -= penalty
        deductions.append(f"-{penalty:.0f}: {avg_packet_loss_pct:.0f}% average packet loss")

    if unknown_devices:
        penalty = min(10, unknown_devices * 2)
        score -= penalty
        deductions.append(f"-{penalty:.0f}: {unknown_devices} unrecognized device(s)")

    score = max(0, min(100, round(score)))
    if not deductions:
        deductions.append("No issues detected.")

    return HealthBreakdown(
        score=score,
        total_devices=total_devices,
        ip_conflicts=ip_conflicts,
        offline_devices=offline_devices,
        high_latency_devices=high_latency_devices,
        avg_packet_loss_pct=avg_packet_loss_pct,
        unknown_devices=unknown_devices,
        deductions=deductions,
    )
