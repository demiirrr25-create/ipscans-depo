"""Bounded feedback scheduling; no packet loss is inferred from silent addresses."""
from concurrent.futures import ThreadPoolExecutor, wait, FIRST_COMPLETED
from dataclasses import dataclass
import time


@dataclass
class Budget:
    ceiling: int = 32
    concurrency: int = 8
    timeout_ms: int = 600
    smoothed_ms: float | None = None

    def observe(self, responses: list[float]) -> None:
        if not responses:
            # Empty address space is not evidence of congestion.
            self.concurrency = min(self.ceiling, self.concurrency + 2)
            return
        sample = sorted(responses)[int((len(responses) - 1) * .9)]
        previous = self.smoothed_ms
        self.smoothed_ms = sample if previous is None else .75 * previous + .25 * sample
        self.timeout_ms = round(max(400, min(1200, self.smoothed_ms * 3 + 150)))
        if previous is not None and sample > max(100, previous * 2):
            self.concurrency = max(min(4, self.ceiling), self.concurrency // 2)
        else:
            self.concurrency = min(self.ceiling, self.concurrency + 2)


def sweep(targets, max_workers, stopped, progress, found, ping, tcp, on_budget=None):
    stopped = stopped or (lambda: False)
    budget = Budget(ceiling=max(1, max_workers), concurrency=min(8, max_workers))
    iterator = iter(targets)
    alive, samples = [], []
    completed = 0

    def probe(ip, timeout):
        started = time.monotonic()
        if stopped():
            return None, 0
        if ping(ip, timeout):
            return 'ICMP', (time.monotonic() - started) * 1000
        if not stopped() and tcp(ip, min(.8, timeout / 1000), stopped):
            return 'TCP', (time.monotonic() - started) * 1000
        # One relaxed echo retry for a missed/slow response. Never loop indefinitely.
        if not stopped() and ping(ip, min(1500, max(800, timeout * 2))):
            return 'ICMP retry', (time.monotonic() - started) * 1000
        return None, 0

    with ThreadPoolExecutor(max_workers=max_workers) as pool:
        pending = {}
        exhausted = False
        while (not exhausted or pending) and not stopped():
            while not exhausted and len(pending) < budget.concurrency and not stopped():
                ip = next(iterator, None)
                if ip is None:
                    exhausted = True
                    break
                pending[pool.submit(probe, ip, budget.timeout_ms)] = ip
            if not pending:
                break
            ready, _ = wait(pending, timeout=.05, return_when=FIRST_COMPLETED)
            for future in ready:
                ip = pending.pop(future)
                completed += 1
                try:
                    source, elapsed = future.result()
                except (OSError, TimeoutError):
                    source, elapsed = None, 0
                if source and not stopped():
                    alive.append(ip)
                    samples.append(elapsed)
                    if found:
                        found(ip, source)
                if completed % 16 == 0:
                    budget.observe(samples)
                    samples.clear()
                    if on_budget:
                        on_budget(budget)
                if progress:
                    progress(completed, len(targets))
            if stopped():
                for future in pending:
                    future.cancel()
    return alive
