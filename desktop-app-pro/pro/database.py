"""Local SQLite persistence — the only place this app stores data (no cloud
sync in Phase 1). One file per machine, created on first run.

Schema (spec item 27): devices, ip_history, mac_history, events, scans,
settings, license.
"""
from __future__ import annotations

import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def default_db_path() -> Path:
    """%LOCALAPPDATA%\\ipscans-pro on Windows, ~/.ipscans-pro elsewhere (dev/test)."""
    base = os.environ.get("LOCALAPPDATA")
    root = Path(base) / "ipscans-pro" if base else Path.home() / ".ipscans-pro"
    root.mkdir(parents=True, exist_ok=True)
    return root / "network-health.db"


SCHEMA = """
CREATE TABLE IF NOT EXISTS devices (
    identity_key        TEXT PRIMARY KEY, -- mac if known, else "ip:<ip>"
    ip                  TEXT NOT NULL,
    mac                 TEXT,
    vendor              TEXT,
    hostname            TEXT,
    device_type         TEXT DEFAULT 'Unknown',
    custom_name         TEXT,
    notes               TEXT,
    tags                TEXT, -- comma-separated free-form labels, e.g. "Camera,Block A"
    is_critical         INTEGER NOT NULL DEFAULT 0, -- lower offline threshold + priority alert
    first_seen          TEXT NOT NULL,
    last_seen           TEXT NOT NULL,
    status              TEXT NOT NULL DEFAULT 'online', -- online|offline|unknown
    consecutive_failures INTEGER NOT NULL DEFAULT 0,
    last_latency_ms     REAL,
    last_packet_loss_pct REAL
);

CREATE TABLE IF NOT EXISTS metrics_history (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    identity_key TEXT NOT NULL,
    ts           TEXT NOT NULL,
    latency_ms   REAL,
    packet_loss_pct REAL
);

CREATE TABLE IF NOT EXISTS ip_history (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    identity_key TEXT NOT NULL,
    ip          TEXT NOT NULL,
    seen_at     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS mac_history (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    ip      TEXT NOT NULL,
    mac     TEXT NOT NULL,
    seen_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    ts         TEXT NOT NULL,
    severity   TEXT NOT NULL,
    type       TEXT NOT NULL,
    ip         TEXT,
    mac        TEXT,
    message    TEXT NOT NULL,
    confidence TEXT
);

CREATE TABLE IF NOT EXISTS scans (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at     TEXT NOT NULL,
    finished_at    TEXT,
    duration_sec   REAL,
    devices_found  INTEGER DEFAULT 0,
    offline        INTEGER DEFAULT 0,
    conflicts      INTEGER DEFAULT 0,
    warnings       INTEGER DEFAULT 0,
    mode           TEXT DEFAULT 'quick'
);

CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT
);

CREATE TABLE IF NOT EXISTS license (
    id           INTEGER PRIMARY KEY CHECK (id = 1),
    plan         TEXT NOT NULL DEFAULT 'FREE',
    status       TEXT NOT NULL DEFAULT 'INACTIVE',
    email        TEXT,
    license_key  TEXT,
    activated_at TEXT,
    expires_at   TEXT
);
"""


class Database:
    def __init__(self, path: Path | str | None = None) -> None:
        self.path = Path(path) if path else default_db_path()
        self._conn = sqlite3.connect(str(self.path), check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._conn.execute("PRAGMA journal_mode=WAL")
        self._conn.executescript(SCHEMA)
        self._conn.commit()
        self._migrate()

    def _migrate(self) -> None:
        """`CREATE TABLE IF NOT EXISTS` only helps brand-new installs — an
        existing user's on-disk DB keeps whatever columns it had when it was
        first created. Every column added to an EXISTING table after that
        must be migrated in explicitly here, or upgrading breaks with
        "no such column" the moment that field is read (this bit a real
        install already: `license_key` was added to `license` in Phase 2
        without a migration, then `tags`/`is_critical` on `devices` in
        Phase 5 actually surfaced the crash via a query naming the column).
        """
        migrations = {
            "devices": [
                ("tags", "TEXT"),
                ("is_critical", "INTEGER NOT NULL DEFAULT 0"),
            ],
            "license": [
                ("license_key", "TEXT"),
            ],
        }
        with self.cursor() as cur:
            for table, columns in migrations.items():
                cur.execute(f"PRAGMA table_info({table})")
                existing = {row["name"] for row in cur.fetchall()}
                for column, decl in columns:
                    if column not in existing:
                        cur.execute(f"ALTER TABLE {table} ADD COLUMN {column} {decl}")

    def close(self) -> None:
        self._conn.close()

    @contextmanager
    def cursor(self):
        cur = self._conn.cursor()
        try:
            yield cur
            self._conn.commit()
        finally:
            cur.close()

    # --------------------------------------------------------------- devices
    def get_device(self, identity_key: str) -> sqlite3.Row | None:
        with self.cursor() as cur:
            cur.execute("SELECT * FROM devices WHERE identity_key = ?", (identity_key,))
            return cur.fetchone()

    def all_devices(self) -> list[sqlite3.Row]:
        with self.cursor() as cur:
            cur.execute("SELECT * FROM devices ORDER BY ip")
            return cur.fetchall()

    def upsert_device(
        self,
        identity_key: str,
        ip: str,
        mac: str | None,
        vendor: str | None,
        hostname: str | None,
        device_type: str,
        seen_at: str,
    ) -> None:
        existing = self.get_device(identity_key)
        with self.cursor() as cur:
            if existing is None:
                cur.execute(
                    """INSERT INTO devices
                       (identity_key, ip, mac, vendor, hostname, device_type,
                        first_seen, last_seen, status, consecutive_failures)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'online', 0)""",
                    (identity_key, ip, mac, vendor, hostname, device_type, seen_at, seen_at),
                )
            else:
                cur.execute(
                    """UPDATE devices SET ip=?, mac=?, vendor=?, hostname=?,
                       device_type=?, last_seen=?, status='online', consecutive_failures=0
                       WHERE identity_key=?""",
                    (ip, mac, vendor, hostname, device_type, seen_at, identity_key),
                )

    def set_custom_name(self, identity_key: str, name: str) -> None:
        with self.cursor() as cur:
            cur.execute("UPDATE devices SET custom_name=? WHERE identity_key=?", (name, identity_key))

    def set_tags(self, identity_key: str, tags: str) -> None:
        with self.cursor() as cur:
            cur.execute("UPDATE devices SET tags=? WHERE identity_key=?", (tags, identity_key))

    def distinct_tags(self) -> list[str]:
        """Every individual tag currently in use, across all devices —
        powers the Inventory group filter (spec item 5's grouping idea).
        """
        tags: set[str] = set()
        with self.cursor() as cur:
            cur.execute("SELECT tags FROM devices WHERE tags IS NOT NULL AND tags != ''")
            for row in cur.fetchall():
                tags.update(t.strip() for t in row["tags"].split(",") if t.strip())
        return sorted(tags)

    def set_critical(self, identity_key: str, critical: bool) -> None:
        with self.cursor() as cur:
            cur.execute("UPDATE devices SET is_critical=? WHERE identity_key=?", (1 if critical else 0, identity_key))

    def record_metric(self, identity_key: str, ts: str, latency_ms: float | None, packet_loss_pct: float) -> None:
        with self.cursor() as cur:
            cur.execute(
                "INSERT INTO metrics_history (identity_key, ts, latency_ms, packet_loss_pct) VALUES (?, ?, ?, ?)",
                (identity_key, ts, latency_ms, packet_loss_pct),
            )

    def metrics_for_device(self, identity_key: str, limit: int = 500) -> list[sqlite3.Row]:
        with self.cursor() as cur:
            cur.execute(
                "SELECT * FROM metrics_history WHERE identity_key=? ORDER BY id DESC LIMIT ?",
                (identity_key, limit),
            )
            return list(reversed(cur.fetchall()))

    def set_notes(self, identity_key: str, notes: str) -> None:
        with self.cursor() as cur:
            cur.execute("UPDATE devices SET notes=? WHERE identity_key=?", (notes, identity_key))

    def set_ping_stats(self, identity_key: str, latency_ms: float | None, packet_loss_pct: float) -> None:
        with self.cursor() as cur:
            cur.execute(
                "UPDATE devices SET last_latency_ms=?, last_packet_loss_pct=? WHERE identity_key=?",
                (latency_ms, packet_loss_pct, identity_key),
            )

    def mark_ping_failure(self, identity_key: str, offline_threshold: int) -> bool:
        """Increments the consecutive-failure counter; returns True the
        moment it crosses the threshold (so the caller emits exactly one
        "went offline" event, not one per subsequent failed poll).
        """
        with self.cursor() as cur:
            cur.execute(
                "UPDATE devices SET consecutive_failures = consecutive_failures + 1 WHERE identity_key=?",
                (identity_key,),
            )
            cur.execute("SELECT consecutive_failures, status FROM devices WHERE identity_key=?", (identity_key,))
            row = cur.fetchone()
            if row is None:
                return False
            crossed = row["consecutive_failures"] == offline_threshold and row["status"] != "offline"
            if crossed:
                cur.execute("UPDATE devices SET status='offline' WHERE identity_key=?", (identity_key,))
            return crossed

    def mark_back_online(self, identity_key: str) -> bool:
        """Returns True if the device was previously offline (so a
        "back online" event is only emitted on the transition).
        """
        with self.cursor() as cur:
            cur.execute("SELECT status FROM devices WHERE identity_key=?", (identity_key,))
            row = cur.fetchone()
            was_offline = bool(row and row["status"] == "offline")
            cur.execute(
                "UPDATE devices SET status='online', consecutive_failures=0 WHERE identity_key=?",
                (identity_key,),
            )
            return was_offline

    # ------------------------------------------------------------ ip/mac history
    def record_ip_change(self, identity_key: str, ip: str, seen_at: str) -> None:
        with self.cursor() as cur:
            cur.execute(
                "INSERT INTO ip_history (identity_key, ip, seen_at) VALUES (?, ?, ?)",
                (identity_key, ip, seen_at),
            )

    def record_mac_change(self, ip: str, mac: str, seen_at: str) -> None:
        with self.cursor() as cur:
            cur.execute(
                "INSERT INTO mac_history (ip, mac, seen_at) VALUES (?, ?, ?)",
                (ip, mac, seen_at),
            )

    def recent_macs_for_ip(self, ip: str, limit: int = 5) -> list[sqlite3.Row]:
        with self.cursor() as cur:
            cur.execute(
                "SELECT * FROM mac_history WHERE ip=? ORDER BY id DESC LIMIT ?",
                (ip, limit),
            )
            return cur.fetchall()

    def last_ip_for_mac(self, mac: str) -> str | None:
        with self.cursor() as cur:
            cur.execute("SELECT ip FROM devices WHERE mac=?", (mac,))
            row = cur.fetchone()
            return row["ip"] if row else None

    # ------------------------------------------------------------------ events
    def add_event(self, event) -> int:
        with self.cursor() as cur:
            cur.execute(
                """INSERT INTO events (ts, severity, type, ip, mac, message, confidence)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (
                    event.ts,
                    event.severity.value if hasattr(event.severity, "value") else event.severity,
                    event.type.value if hasattr(event.type, "value") else event.type,
                    event.ip,
                    event.mac,
                    event.message,
                    event.confidence.value if hasattr(event.confidence, "value") else event.confidence,
                ),
            )
            return cur.lastrowid

    def recent_events(self, limit: int = 200, severity: str | None = None) -> list[sqlite3.Row]:
        with self.cursor() as cur:
            if severity and severity != "all":
                cur.execute(
                    "SELECT * FROM events WHERE severity=? ORDER BY id DESC LIMIT ?",
                    (severity, limit),
                )
            else:
                cur.execute("SELECT * FROM events ORDER BY id DESC LIMIT ?", (limit,))
            return cur.fetchall()

    # -------------------------------------------------------------------- scans
    def start_scan(self, mode: str) -> int:
        with self.cursor() as cur:
            cur.execute(
                "INSERT INTO scans (started_at, mode) VALUES (?, ?)", (now_iso(), mode)
            )
            return cur.lastrowid

    def finish_scan(
        self, scan_id: int, duration_sec: float, devices_found: int,
        offline: int, conflicts: int, warnings: int,
    ) -> None:
        with self.cursor() as cur:
            cur.execute(
                """UPDATE scans SET finished_at=?, duration_sec=?, devices_found=?,
                   offline=?, conflicts=?, warnings=? WHERE id=?""",
                (now_iso(), duration_sec, devices_found, offline, conflicts, warnings, scan_id),
            )

    def last_scan(self) -> sqlite3.Row | None:
        with self.cursor() as cur:
            cur.execute("SELECT * FROM scans WHERE finished_at IS NOT NULL ORDER BY id DESC LIMIT 1")
            return cur.fetchone()

    # ---------------------------------------------------------------- settings
    def get_setting(self, key: str, default: str | None = None) -> str | None:
        with self.cursor() as cur:
            cur.execute("SELECT value FROM settings WHERE key=?", (key,))
            row = cur.fetchone()
            return row["value"] if row else default

    def set_setting(self, key: str, value: str) -> None:
        with self.cursor() as cur:
            cur.execute(
                "INSERT INTO settings (key, value) VALUES (?, ?) "
                "ON CONFLICT(key) DO UPDATE SET value=excluded.value",
                (key, value),
            )

    # ----------------------------------------------------------------- license
    def get_license(self) -> sqlite3.Row | None:
        with self.cursor() as cur:
            cur.execute("SELECT * FROM license WHERE id=1")
            return cur.fetchone()

    def save_license(self, plan: str, status: str, email: str | None, expires_at: str | None, license_key: str | None = None) -> None:
        with self.cursor() as cur:
            cur.execute(
                """INSERT INTO license (id, plan, status, email, license_key, activated_at, expires_at)
                   VALUES (1, ?, ?, ?, ?, ?, ?)
                   ON CONFLICT(id) DO UPDATE SET
                     plan=excluded.plan, status=excluded.status, email=excluded.email,
                     license_key=excluded.license_key, activated_at=excluded.activated_at,
                     expires_at=excluded.expires_at""",
                (plan, status, email, license_key, now_iso(), expires_at),
            )
