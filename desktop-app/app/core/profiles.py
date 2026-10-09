"""Explicit scan budgets; speed never silently enables invasive probes."""
from dataclasses import dataclass


@dataclass(frozen=True)
class ScanProfile:
    key: str
    name: str
    name_tr: str
    description: str
    description_tr: str
    workers: int
    ping_ms: int
    tcp_seconds: float
    ports: tuple[int, ...]
    resolve_dns: bool = True
    retries: int = 0


STANDARD = (21, 22, 23, 80, 81, 443, 445, 554, 3389, 8000, 8080, 8899, 37777)
PROFILES = {
    'quick': ScanProfile('quick', 'Quick discovery', 'Hızlı keşif',
        'Fast inventory · 5 service ports · no reverse DNS. Slow devices may be missed.',
        'Hızlı envanter · 5 servis portu · ters DNS kapalı. Yavaş cihazlar atlanabilir.',
        96, 250, .2, (22, 80, 443, 445, 554), False),
    'balanced': ScanProfile('balanced', 'Balanced', 'Dengeli',
        'Everyday discovery · 13 service ports · device names and protocol evidence.',
        'Günlük keşif · 13 servis portu · cihaz adları ve protokol kanıtları.',
        64, 500, .35, STANDARD),
    'deep': ScanProfile('deep', 'Detailed inventory', 'Ayrıntılı envanter',
        'Wider service coverage · 30 ports · longer timeouts · one discovery retry.',
        'Geniş servis kapsamı · 30 port · uzun zaman aşımı · bir keşif tekrarı.',
        48, 1000, .8, tuple(sorted(set(STANDARD + (25, 53, 110, 135, 139, 143,
            389, 465, 587, 636, 993, 995, 1433, 3306, 5432, 5900, 8443)))), True, 1),
    'gentle': ScanProfile('gentle', 'Sensitive network', 'Hassas ağ',
        'Low concurrency · 4 workers · 4 service ports · longer response window.',
        'Düşük eşzamanlılık · 4 işçi · 4 servis portu · uzun yanıt süresi.',
        4, 1000, 1.0, (22, 80, 443, 554)),
}


def parse_ports(text: str) -> tuple[int, ...] | None:
    """Empty means profile defaults. Bound expansion before allocating ranges."""
    if not text.strip():
        return None
    ports: set[int] = set()
    if len(text) > 2048:
        raise ValueError('Port list is too long (maximum 256 distinct ports).')
    for token in text.split(','):
        parts = token.strip().split('-')
        if len(parts) not in (1, 2) or any(not p.strip().isascii() or not p.strip().isdigit() for p in parts):
            raise ValueError('Use ports such as 22,80,443,8000-8010.')
        start, end = int(parts[0]), int(parts[-1])
        if not 1 <= start <= end <= 65535 or end - start >= 256:
            raise ValueError('Ports must be 1–65535, with at most 256 distinct ports.')
        ports.update(range(start, end + 1))
        if len(ports) > 256:
            raise ValueError('At most 256 distinct ports per scan.')
    return tuple(sorted(ports))
