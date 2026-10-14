"""Single-station management with authenticated sessions and transactional audit."""
from dataclasses import dataclass
from datetime import datetime, timezone
import json
import math
from pathlib import Path
import secrets
import sqlite3
import time
from urllib.parse import urlsplit

from .core import normalize_plate,valid_tr_plate
from .security import hash_password,verify_password,protect_secret,unprotect_secret

ROLES={"admin":{"read","manage","review","export","users"},
       "operator":{"read","review"},"auditor":{"read","export"}}


@dataclass(frozen=True)
class Session:
    token:str
    username:str
    role:str


class Operations:
    def __init__(self,path,clock=time.time):
        self.clock=clock
        self.db=sqlite3.connect(path)
        self.db.row_factory=sqlite3.Row
        self.db.execute("PRAGMA foreign_keys=ON")
        self.db.execute("PRAGMA journal_mode=WAL")
        self.db.execute("PRAGMA busy_timeout=3000")
        self.db.executescript('''
        CREATE TABLE IF NOT EXISTS users(name TEXT PRIMARY KEY,hash TEXT NOT NULL,role TEXT NOT NULL,
            failed INTEGER NOT NULL DEFAULT 0,locked_until REAL NOT NULL DEFAULT 0);
        CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY,at REAL NOT NULL,actor TEXT NOT NULL,
            action TEXT NOT NULL,detail TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS cameras(id TEXT PRIMARY KEY,name TEXT NOT NULL,secret TEXT NOT NULL,direction TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS camera_lines(camera_id TEXT NOT NULL REFERENCES cameras(id) ON DELETE CASCADE,
            line_id TEXT NOT NULL,definition TEXT NOT NULL,PRIMARY KEY(camera_id,line_id));
        CREATE TABLE IF NOT EXISTS grants(plate TEXT PRIMARY KEY,category TEXT NOT NULL,blocked INTEGER NOT NULL,
            valid_from REAL NOT NULL,valid_until REAL NOT NULL,direction TEXT NOT NULL,remaining INTEGER);
        CREATE TABLE IF NOT EXISTS observations(id INTEGER PRIMARY KEY,at REAL NOT NULL,camera TEXT NOT NULL,
            plate TEXT NOT NULL,confidence REAL NOT NULL,status TEXT NOT NULL,source TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS corrections(id INTEGER PRIMARY KEY,event INTEGER NOT NULL REFERENCES observations(id) ON DELETE CASCADE,
            at REAL NOT NULL,actor TEXT NOT NULL,old_plate TEXT NOT NULL,new_plate TEXT NOT NULL,reason TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS parking_visits(id INTEGER PRIMARY KEY,plate TEXT NOT NULL,
            entered_at REAL NOT NULL,exited_at REAL,entry_actor TEXT NOT NULL,exit_actor TEXT,
            entry_note TEXT NOT NULL,exit_note TEXT);
        CREATE UNIQUE INDEX IF NOT EXISTS one_open_visit ON parking_visits(plate) WHERE exited_at IS NULL;
        CREATE INDEX IF NOT EXISTS observations_at ON observations(at);
        CREATE INDEX IF NOT EXISTS parking_exit ON parking_visits(exited_at);
        CREATE TABLE IF NOT EXISTS passage_receipts(request_id TEXT PRIMARY KEY,plate TEXT NOT NULL,
            direction TEXT NOT NULL,visit_id INTEGER NOT NULL REFERENCES parking_visits(id));
        ''')
        self.sessions={}

    def _audit(self,actor,action,detail=""):
        self.db.execute("INSERT INTO audit(at,actor,action,detail) VALUES(?,?,?,?)",(self.clock(),actor,action,detail))

    def needs_setup(self):return not self.db.execute("SELECT 1 FROM users LIMIT 1").fetchone()

    def setup(self,username,password):
        if not self.needs_setup():raise PermissionError("Already initialized")
        if not username.strip() or len(username)>64:raise ValueError("Invalid user name")
        hashed=hash_password(password)
        with self.db:
            self.db.execute("INSERT INTO users(name,hash,role) VALUES(?,?,?)",(username,hashed,"admin"))
            self._audit(username,"setup")

    def login(self,username,password):
        row=self.db.execute("SELECT * FROM users WHERE name=?",(username,)).fetchone()
        if row is None or row["locked_until"]>self.clock():raise PermissionError("Sign-in failed or temporarily locked")
        if not verify_password(password,row["hash"]):
            failures=row["failed"]+1
            with self.db:
                self.db.execute("UPDATE users SET failed=?,locked_until=? WHERE name=?",
                    (failures,self.clock()+300 if failures>=5 else 0,username))
                self._audit(username,"login_failed")
            raise PermissionError("Sign-in failed or temporarily locked")
        with self.db:
            self.db.execute("UPDATE users SET failed=0,locked_until=0 WHERE name=?",(username,))
            self._audit(username,"login")
        session=Session(secrets.token_urlsafe(32),username,row["role"])
        self.sessions[session.token]=(session,self.clock()+8*3600)
        return session

    def check(self,session,permission):
        stored=self.sessions.get(session.token)
        if not stored or stored[0]!=session or stored[1]<self.clock():raise PermissionError("Session expired")
        if permission not in ROLES[session.role]:raise PermissionError("Permission denied")

    def logout(self,session):self.sessions.pop(session.token,None)

    def add_user(self,session,username,password,role):
        self.check(session,"users")
        if role not in ROLES or not username.strip() or len(username)>64:raise ValueError("Invalid user")
        hashed=hash_password(password)
        with self.db:
            self.db.execute("INSERT INTO users(name,hash,role) VALUES(?,?,?)",(username,hashed,role))
            self._audit(session.username,"user_created",username+":"+role)

    def list_users(self,session):
        self.check(session,"users")
        return [dict(x) for x in self.db.execute("SELECT name,role FROM users ORDER BY name")]

    def save_camera(self,session,camera_id,name,source,direction):
        self.check(session,"manage")
        parts=urlsplit(source)
        if parts.scheme not in {"rtsp","rtsps"} or not parts.hostname or direction not in {"entry","exit"}:
            raise ValueError("Valid RTSP URL and direction required")
        if not camera_id or len(camera_id)>64 or not name or len(name)>120:raise ValueError("Invalid camera")
        encrypted=protect_secret(source)
        with self.db:
            self.db.execute("INSERT INTO cameras VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,secret=excluded.secret,direction=excluded.direction",
                (camera_id,name,encrypted,direction))
            self._audit(session.username,"camera_saved",camera_id)

    def cameras(self,session):
        self.check(session,"read")
        return [dict(x) for x in self.db.execute("SELECT id,name,direction FROM cameras ORDER BY name")]

    def camera_source(self,session,camera_id):
        self.check(session,"manage")
        row=self.db.execute("SELECT secret FROM cameras WHERE id=?",(camera_id,)).fetchone()
        if row is None:raise ValueError("Unknown camera")
        return unprotect_secret(row[0])

    def camera_lines(self,session,camera_id):
        from .lines import CrossingLine
        self.check(session,"read")
        return [CrossingLine(**json.loads(row[0])) for row in self.db.execute(
            "SELECT definition FROM camera_lines WHERE camera_id=? ORDER BY line_id",(camera_id,))]

    def save_camera_lines(self,session,camera_id,lines):
        from dataclasses import asdict
        from .lines import CrossingLine
        self.check(session,"manage")
        if len(lines)>16 or len({line.id for line in lines})!=len(lines):
            raise ValueError("Use at most 16 unique lines")
        values=[asdict(CrossingLine(**asdict(line))) for line in lines]
        if not self.db.execute("SELECT 1 FROM cameras WHERE id=?",(camera_id,)).fetchone():
            raise ValueError("Unknown camera")
        with self.db:
            self.db.execute("DELETE FROM camera_lines WHERE camera_id=?",(camera_id,))
            self.db.executemany("INSERT INTO camera_lines VALUES(?,?,?)",
                [(camera_id,value["id"],json.dumps(value)) for value in values])
            self._audit(session.username,"camera_lines_saved",camera_id)

    def save_grant(self,session,plate,category,blocked,valid_from,valid_until,direction,remaining=None):
        self.check(session,"manage")
        plate=normalize_plate(plate)
        if not valid_tr_plate(plate) or category not in {"resident","staff","visitor"}:
            raise ValueError("Invalid plate or category")
        if not all(math.isfinite(x) for x in [valid_from,valid_until]) or valid_until<=valid_from:
            raise ValueError("Invalid validity interval")
        if direction not in {"entry","exit","both"} or (remaining is not None and (type(remaining)!=int or remaining<0)):
            raise ValueError("Invalid direction or use count")
        with self.db:
            self.db.execute("INSERT INTO grants VALUES(?,?,?,?,?,?,?) ON CONFLICT(plate) DO UPDATE SET category=excluded.category,blocked=excluded.blocked,valid_from=excluded.valid_from,valid_until=excluded.valid_until,direction=excluded.direction,remaining=excluded.remaining",
                (plate,category,int(bool(blocked)),valid_from,valid_until,direction,remaining))
            self._audit(session.username,"grant_saved",plate)

    def grants(self,session):
        self.check(session,"read")
        return [dict(x) for x in self.db.execute("SELECT * FROM grants ORDER BY plate")]

    def simulate(self,session,plate,confidence,direction,*,physical_presence=False,fresh=False):
        self.check(session,"read")
        plate=normalize_plate(plate)
        row=self.db.execute("SELECT * FROM grants WHERE plate=?",(plate,)).fetchone()
        reason="eligible_simulation_only"
        if row is not None and row["blocked"]:reason="blacklisted"
        elif not valid_tr_plate(plate) or not math.isfinite(confidence) or not .9<=confidence<=1:reason="recognition_unreliable"
        elif not fresh or not physical_presence:reason="independent_evidence_missing"
        elif direction not in {"entry","exit"}:reason="unknown_direction"
        elif row is None:reason="no_permission"
        elif not row["valid_from"]<=self.clock()<row["valid_until"]:reason="permission_expired_or_not_started"
        elif row["direction"] not in {"both",direction}:reason="direction_denied"
        elif row["remaining"] is not None and row["remaining"]<=0:reason="uses_exhausted"
        with self.db:self._audit(session.username,"access_simulated",plate+":"+reason)
        return {"eligible":reason=="eligible_simulation_only","reason":reason,"simulated":True,"barrier_command":False}

    def record(self,session,plate,confidence,status,camera,source):
        self.check(session,"review")
        if source not in {"offline_image","recorded_video","live_rtsp"} or not math.isfinite(confidence) or not 0<=confidence<=1:
            raise ValueError("Invalid observation")
        if status not in {"recognized","review","candidate"}:return None
        with self.db:
            cursor=self.db.execute("INSERT INTO observations(at,camera,plate,confidence,status,source) VALUES(?,?,?,?,?,?)",
                (self.clock(),camera,normalize_plate(plate),confidence,status,source))
            self._audit(session.username,"observation_recorded",str(cursor.lastrowid))
            return cursor.lastrowid

    def history(self,session,plate="",limit=500):
        self.check(session,"read")
        if not 1<=limit<=5000:raise ValueError("Invalid limit")
        return [dict(x) for x in self.db.execute("SELECT * FROM observations WHERE instr(plate,?)>0 ORDER BY id DESC LIMIT ?",(normalize_plate(plate),limit))]

    def correct(self,session,event,new_plate,reason):
        self.check(session,"review")
        plate=normalize_plate(new_plate)
        if not valid_tr_plate(plate) or not reason.strip() or len(reason)>500:raise ValueError("Valid plate and reason required")
        row=self.db.execute("SELECT plate FROM observations WHERE id=?",(event,)).fetchone()
        if row is None:raise ValueError("Unknown event")
        with self.db:
            self.db.execute("INSERT INTO corrections(event,at,actor,old_plate,new_plate,reason) VALUES(?,?,?,?,?,?)",
                (event,self.clock(),session.username,row[0],plate,reason))
            self.db.execute("UPDATE observations SET plate=?,status='review' WHERE id=?",(plate,event))
            self._audit(session.username,"observation_corrected",str(event))

    def export_rows(self,session,plate=""):
        self.check(session,"export")
        rows=self.history(session,plate,5000)
        with self.db:self._audit(session.username,"export",str(len(rows)))
        return rows

    def audit(self,session):
        self.check(session,"read")
        return [dict(x) for x in self.db.execute("SELECT * FROM audit ORDER BY id DESC LIMIT 500")]

    def retain(self,session,days):
        self.check(session,"manage")
        if type(days)!=int or not 1<=days<=3650:raise ValueError("Retention must be 1..3650 days")
        with self.db:
            n=self.db.execute("DELETE FROM observations WHERE at<?",(self.clock()-days*86400,)).rowcount
            self.db.execute("INSERT INTO settings VALUES('retention_days',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",(str(days),))
            self._audit(session.username,"retention",str(n))
        return n

    def close(self):self.sessions.clear();self.db.close()

    def parking(self,session):
        self.check(session,"read")
        row=self.db.execute("SELECT value FROM settings WHERE key='parking_capacity'").fetchone()
        capacity=int(row[0]) if row else 100
        count=self.db.execute("SELECT count(*) FROM parking_visits WHERE exited_at IS NULL").fetchone()[0]
        visits=[dict(r) for r in self.db.execute("SELECT * FROM parking_visits WHERE exited_at IS NULL ORDER BY entered_at LIMIT 1000")]
        return {"capacity":capacity,"occupied":count,"available":max(0,capacity-count),"visits":visits}

    def set_capacity(self,session,capacity):
        self.check(session,"manage")
        if type(capacity) is not int or not 1<=capacity<=100000:raise ValueError("Invalid capacity")
        with self.db:
            self.db.execute("INSERT INTO settings VALUES('parking_capacity',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",(str(capacity),))
            self._audit(session.username,"parking_capacity",str(capacity))

    def confirm_passage(self,session,plate,direction,note,request_id):
        """Operator-confirmed physical passage ledger, never a relay command or grant."""
        self.check(session,"review")
        plate=normalize_plate(plate)
        if not valid_tr_plate(plate) or direction not in {"entry","exit"}:
            raise ValueError("Invalid passage")
        if not note.strip() or len(note)>500 or not request_id or len(request_id)>128:
            raise ValueError("A reason and bounded idempotency key are required")
        self.db.execute("BEGIN IMMEDIATE")
        try:
            previous=self.db.execute("SELECT * FROM passage_receipts WHERE request_id=?",(request_id,)).fetchone()
            if previous:
                if previous["plate"]!=plate or previous["direction"]!=direction:
                    raise ValueError("Idempotency key conflict")
                self.db.commit()
                return {"visit_id":previous["visit_id"],"duplicate":True,"barrier_command":False}
            visit=self.db.execute("SELECT * FROM parking_visits WHERE plate=? AND exited_at IS NULL",(plate,)).fetchone()
            at=self.clock()
            if direction=="entry":
                if visit:raise ValueError("Vehicle already inside (anti-passback)")
                state=self.parking(session)
                if state["occupied"]>=state["capacity"]:raise ValueError("Parking capacity reached")
                visit_id=self.db.execute("INSERT INTO parking_visits(plate,entered_at,entry_actor,entry_note) VALUES(?,?,?,?)",
                    (plate,at,session.username,note)).lastrowid
            else:
                if not visit:raise ValueError("Vehicle has no open visit")
                if at<visit["entered_at"]:raise ValueError("Clock moved backwards")
                visit_id=visit["id"]
                self.db.execute("UPDATE parking_visits SET exited_at=?,exit_actor=?,exit_note=? WHERE id=?",
                    (at,session.username,note,visit_id))
            self.db.execute("INSERT INTO passage_receipts VALUES(?,?,?,?)",(request_id,plate,direction,visit_id))
            self._audit(session.username,"manual_passage",json.dumps({"visit":visit_id,"direction":direction,"note":note},ensure_ascii=False))
            self.db.commit()
            return {"visit_id":visit_id,"duplicate":False,"barrier_command":False}
        except Exception:
            self.db.rollback()
            raise

    def save_camera_region(self,session,camera_id,coordinates):
        self.check(session,"manage")
        from .tracking import Region
        region=Region(*coordinates)
        if not self.db.execute("SELECT 1 FROM cameras WHERE id=?",(camera_id,)).fetchone():
            raise ValueError("Unknown camera")
        with self.db:
            self.db.execute("INSERT INTO settings VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
                ("roi:"+camera_id,json.dumps(list(vars(region).values()))))
            self._audit(session.username,"camera_region",camera_id)

    def camera_region(self,session,camera_id):
        self.check(session,"read")
        row=self.db.execute("SELECT value FROM settings WHERE key=?",("roi:"+camera_id,)).fetchone()
        return json.loads(row[0]) if row else [0,0,1,1]

    def backup(self,session,target):
        self.check(session,"manage")
        target=Path(target)
        # Exclusive creation avoids replacing an existing backup or the live database.
        with target.open("xb"):
            pass
        try:
            destination=sqlite3.connect(target)
            try:
                self.db.backup(destination)
                if destination.execute("PRAGMA integrity_check").fetchone()[0]!="ok":
                    raise ValueError("Backup integrity check failed")
            finally:destination.close()
        except Exception:
            target.unlink(missing_ok=True)
            raise
        with self.db:self._audit(session.username,"backup_created",target.name)
        return target
