"""Reproducible synthetic /24, /22, /20 and 10,000-row UI benchmarks.

No real subnet is contacted. Timings describe scheduling/GUI overhead, not
real-device discovery speed or real-world identification accuracy.
"""
import argparse
import json
import os
import sys
import time
from contextlib import ExitStack
from pathlib import Path
from unittest.mock import patch

os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import psutil
from PyQt6.QtCore import QTimer, Qt
from PyQt6.QtWidgets import QApplication, QTableView

from app.core import network_utils
from app.core.scanner import ScanOptions, run_scan
from app.core.models import Device
from app.ui.widgets import DeviceTableModel, DeviceFilterProxyModel
from app.ui.network_map import NetworkMap


def benchmark_scan(prefix, adaptive=False):
    targets = network_utils.parse_targets(f"10.0.0.0/{prefix}")
    expected = set(targets[::10])
    latest = {}
    process = psutil.Process()
    started, cpu = time.monotonic(), process.cpu_times()
    peak = process.memory_info().rss
    first_result = None

    def found(device):
        nonlocal peak, first_result
        latest[device.ip] = device
        first_result = first_result or time.monotonic() - started
        peak = max(peak, process.memory_info().rss)

    with ExitStack() as stack:
        stack.enter_context(patch("app.core.network_utils._ping_once", side_effect=lambda ip, *_args: ip in expected))
        stack.enter_context(patch("app.core.network_utils._tcp_alive", return_value=False))
        stack.enter_context(patch("app.core.scanner.network_utils.resolve_macs", return_value={}))
        stack.enter_context(patch("app.core.scanner.network_utils.resolve_hostname", return_value=None))
        stack.enter_context(patch("app.core.scanner.network_utils.scan_ports", return_value=[]))
        run_scan(targets, ScanOptions(providers=[], enable_wmi=False, adaptive=adaptive), found)
    elapsed = time.monotonic() - started
    actual_cpu = process.cpu_times()
    return {"cidr": f"/{prefix}", "adaptive": adaptive, "targets": len(targets), "devices": len(latest),
            "discovery_seconds": round(elapsed, 4), "first_result_seconds": round(first_result or 0, 4),
            "cpu_seconds": round(actual_cpu.user + actual_cpu.system - cpu.user - cpu.system, 4),
            "peak_rss_mib": round(peak / 1024 / 1024, 2),
            "false_positive_rate": len(latest.keys() - expected) / max(1, len(targets) - len(expected)),
            "false_negative_rate": len(expected - latest.keys()) / max(1, len(expected)),
            "unsubstantiated_classifications": sum(d.device_type != "Unknown" for d in latest.values()),
            "real_device_identification_accuracy": None}


def benchmark_ui(app):
    model, proxy, table = DeviceTableModel(), DeviceFilterProxyModel(), QTableView()
    proxy.setSourceModel(model)
    proxy.setDynamicSortFilter(False)
    table.setModel(proxy)
    table.resize(1000, 600)
    table.show()
    devices = [Device(f"10.0.{i // 250}.{i % 250 + 1}") for i in range(10000)]
    gaps = []
    last = time.monotonic()
    def tick():
        nonlocal last
        now = time.monotonic()
        gaps.append(now - last)
        last = now
    heartbeat = QTimer()
    heartbeat.setInterval(0)
    heartbeat.timeout.connect(tick)
    heartbeat.start()
    started = time.monotonic()
    for offset in range(0, len(devices), 256):
        model.add_devices(devices[offset:offset + 256])
        app.processEvents()
    populated = time.monotonic() - started
    started = time.monotonic()
    proxy.sort(0, Qt.SortOrder.AscendingOrder)
    sorted_seconds = time.monotonic() - started
    app.processEvents()
    heartbeat.stop()
    graph = NetworkMap()
    started = time.monotonic()
    graph.refresh(devices[:1000])
    graph_seconds = time.monotonic() - started
    grouped_nodes = len(graph.nodes)
    started = time.monotonic()
    graph.expand_all()
    expanded_seconds = time.monotonic() - started
    graph.close()
    table.close()
    return {"table_rows": model.rowCount(), "table_population_seconds": round(populated, 4),
            "table_sort_seconds": round(sorted_seconds, 4),
            "max_event_loop_gap_ms": round(max(gaps, default=0) * 1000, 2),
            "graph_nodes": len(graph.nodes), "grouped_nodes": grouped_nodes,
            "graph_expansion_seconds": round(expanded_seconds, 4),
            "graph_construction_seconds": round(graph_seconds, 4)}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    app = QApplication.instance() or QApplication([])
    report = {"mode": "synthetic-no-network", "scan": [benchmark_scan(prefix, adaptive)
              for adaptive in (False, True) for prefix in (24, 22, 20)],
              "ui": benchmark_ui(app)}
    encoded = json.dumps(report, indent=2)
    print(encoded)
    if args.output:
        args.output.write_text(encoded + "\n", encoding="utf-8")
    if (any(row["false_positive_rate"] or row["false_negative_rate"] or row["unsubstantiated_classifications"]
            for row in report["scan"]) or report["ui"]["table_rows"] != 10000
            or report["ui"]["max_event_loop_gap_ms"] > 200
            or report["ui"]["graph_nodes"] != 1000
            or report["ui"]["graph_expansion_seconds"] > 1
            or report["ui"]["graph_construction_seconds"] > 1):
        raise SystemExit("Benchmark correctness or responsiveness threshold failed")


if __name__ == "__main__":
    main()
