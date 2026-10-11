"""Local development event store. Production RBAC/encryption is a later phase."""
from dataclasses import asdict
import json
import sqlite3
from datetime import datetime, timezone


class EventStore:
    def __init__(self, path):
        self.db = sqlite3.connect(path)
        self.db.execute("PRAGMA journal_mode=WAL")
        self.db.execute("""CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY, timestamp REAL NOT NULL, camera TEXT NOT NULL,
            plate TEXT NOT NULL, status TEXT NOT NULL, payload TEXT NOT NULL)""")
        self.db.execute("CREATE INDEX IF NOT EXISTS events_time ON events(timestamp)")
        self.db.commit()

    def append(self, decision, timestamp=None):
        if decision.status not in {"recognized", "review"}:
            return
        timestamp = timestamp if timestamp is not None else datetime.now(timezone.utc).timestamp()
        with self.db:
            self.db.execute("INSERT INTO events(timestamp,camera,plate,status,payload) VALUES(?,?,?,?,?)",
                (timestamp, decision.camera, decision.plate, decision.status,
                 json.dumps(asdict(decision), ensure_ascii=False)))

    def search(self, plate="", camera="", since=0, until=253402300799, limit=100):
        if not 1 <= limit <= 1000:
            raise ValueError("Limit must be 1..1000")
        return self.db.execute("""SELECT id,timestamp,camera,plate,status,payload FROM events
            WHERE instr(plate,?) > 0 AND (?='' OR camera=?) AND timestamp BETWEEN ? AND ?
            ORDER BY timestamp DESC,id DESC LIMIT ?""", (plate, camera, camera, since, until, limit)).fetchall()

    def purge(self, before):
        # Logical deletion only; backups/WAL/media need a separate production policy.
        with self.db:
            return self.db.execute("DELETE FROM events WHERE timestamp < ?", (before,)).rowcount

    def close(self):
        self.db.close()
