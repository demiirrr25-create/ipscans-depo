"""Compare v3 subprocess ICMP with v4 native ICMP on Windows loopback only.

This measures local process overhead, NOT subnet scanning speed or accuracy.
"""
import argparse
import json
from pathlib import Path
import platform
import statistics
import subprocess
import sys
import time

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.core.native_ping import ping_ipv4


def run(iterations=30):
    if sys.platform != 'win32':
        return {'mode': 'not-applicable', 'reason': 'Windows native ICMP only'}
    native, process = [], []
    ping_ipv4('127.0.0.1')  # load DLL outside measurement
    for _ in range(iterations):
        start = time.perf_counter()
        if not ping_ipv4('127.0.0.1'):
            raise RuntimeError('Native loopback ping failed')
        native.append((time.perf_counter() - start) * 1000)
        start = time.perf_counter()
        result = subprocess.run(['ping', '-n', '1', '-w', '500', '127.0.0.1'],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
            creationflags=subprocess.CREATE_NO_WINDOW, timeout=2)
        if result.returncode:
            raise RuntimeError('System loopback ping failed')
        process.append((time.perf_counter() - start) * 1000)
    return {'mode': 'windows-loopback-only', 'platform': platform.platform(),
        'python': platform.python_version(), 'iterations': iterations,
        'v3_process_median_ms': round(statistics.median(process), 4),
        'v4_native_median_ms': round(statistics.median(native), 4),
        'local_overhead_ratio': round(statistics.median(process) / statistics.median(native), 2),
        'scope': 'Local ICMP call overhead only; no real LAN or competitor comparison.'}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    report = json.dumps(run(), indent=2)
    print(report)
    if args.output:
        args.output.write_text(report + '\n', encoding='utf-8')
