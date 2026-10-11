"""Recognition evidence only. This module cannot issue barrier commands."""
from collections import Counter, deque
from dataclasses import dataclass
import math
import re


def normalize_plate(text: str) -> str:
    # Do not silently repair O/0, I/1 or remove arbitrary punctuation.
    return re.sub(r"[ \t\r\n-]", "", text.upper())


def valid_tr_plate(text: str) -> bool:
    value = normalize_plate(text)
    match = re.fullmatch(r"([0-9]{2})([A-Z]{1,3})([0-9]{2,5})", value)
    if not match or not 1 <= int(match[1]) <= 81:
        return False
    letters, digits = len(match[2]), len(match[3])
    # Conservative ordinary civilian subset; diplomatic/special plates need plugins.
    return digits in {1: {4, 5}, 2: {3, 4}, 3: {2, 3}}.get(letters, set())


@dataclass(frozen=True)
class Reading:
    camera: str
    frame_id: int
    at: float  # monotonic capture time, not processing completion time
    text: str
    confidence: float
    track: str = "single-lane"

    def __post_init__(self):
        if not self.camera or not self.track or self.frame_id < 0:
            raise ValueError("Invalid camera, track or frame identity")
        if not math.isfinite(self.at) or not math.isfinite(self.confidence):
            raise ValueError("Non-finite evidence")
        if not 0 <= self.confidence <= 1:
            raise ValueError("Confidence must be between 0 and 1")


@dataclass(frozen=True)
class Decision:
    plate: str
    confidence: float
    status: str
    reason: str
    camera: str
    frame_id: int
    barrier_result: str = "not_requested"


class Consensus:
    def __init__(self, min_frames=3, threshold=.90, window=2.0,
                 cooldown=10.0, max_age=2.0, max_tracks=64):
        if min_frames < 1 or min_frames > 64 or max_tracks < 1:
            raise ValueError("Invalid consensus capacity")
        if not all(math.isfinite(x) for x in (threshold, window, cooldown, max_age)):
            raise ValueError("Non-finite policy")
        if not 0 <= threshold <= 1 or min(window, cooldown, max_age) <= 0:
            raise ValueError("Invalid consensus policy")
        self.min_frames, self.threshold = min_frames, threshold
        self.window, self.cooldown, self.max_age = window, cooldown, max_age
        self.max_tracks = max_tracks
        self.history, self.last_frame, self.emitted = {}, {}, {}

    def observe(self, r: Reading, now: float) -> Decision:
        plate = normalize_plate(r.text)
        def result(status, reason, score=r.confidence):
            return Decision(plate, score, status, reason, r.camera, r.frame_id)
        if not math.isfinite(now) or not 0 <= now-r.at <= self.max_age:
            return result("rejected", "stale_or_future_frame")
        # TTL and capacity bound every state map.
        for key in list(self.history):
            if now-self.history[key][-1].at > self.window:
                self.history.pop(key)
                self.last_frame.pop(key, None)
        self.emitted = {k: t for k, t in self.emitted.items() if now-t < self.cooldown}
        key = (r.camera, r.track)
        if key in self.last_frame and r.frame_id <= self.last_frame[key]:
            return result("rejected", "duplicate_or_reordered_frame")
        if key not in self.history and len(self.history) >= self.max_tracks:
            return result("rejected", "track_capacity")
        frames = self.history.setdefault(key, deque(maxlen=64))
        self.last_frame[key] = r.frame_id
        frames.append(r)
        while frames and r.at-frames[0].at > self.window:
            frames.popleft()
        if not valid_tr_plate(plate):
            return result("review", "unsupported_or_invalid_format")
        if r.confidence < self.threshold:
            return result("review", "low_confidence")
        eligible = [x for x in frames if x.confidence >= self.threshold
                    and valid_tr_plate(x.text)]
        counts = Counter(normalize_plate(x.text) for x in eligible)
        matches = [x for x in eligible if normalize_plate(x.text) == plate]
        if len(matches) < self.min_frames or counts[plate] / max(len(frames), 1) < .75:
            return result("pending", "insufficient_consensus")
        dedup_key = (r.camera, plate)
        if dedup_key in self.emitted:
            return result("suppressed", "passage_cooldown")
        if len(self.emitted) >= self.max_tracks * 64:
            return result("rejected", "event_capacity")
        self.emitted[dedup_key] = now
        # Arithmetic mean is NOT a calibrated probability or proof of identity.
        return result("recognized", "recognition_only", sum(x.confidence for x in matches)/len(matches))
