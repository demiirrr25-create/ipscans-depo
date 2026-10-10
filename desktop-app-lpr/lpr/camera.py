"""Bounded latest-frame capture; no source URL is placed in logs or status."""
from dataclasses import dataclass, field
from queue import Queue, Empty, Full
from threading import Event, Thread
import time
import os


@dataclass(frozen=True)
class CameraConfig:
    source: str = field(repr=False)
    camera_id: str = "camera-1"
    reconnect_seconds: float = 1.0
    max_pixels: int = 3840*2160

    def __post_init__(self):
        if not self.source or not self.camera_id or not 0 < self.reconnect_seconds <= 30:
            raise ValueError("Invalid camera configuration")
        if self.max_pixels < 1:
            raise ValueError("Invalid frame capacity")


@dataclass
class Frame:
    sequence: int
    captured_at: float
    image: object = field(repr=False)


def opencv_capture(source):
    # FFmpeg can otherwise echo credentials in native errors.
    os.environ.setdefault("OPENCV_FFMPEG_LOGLEVEL", "-8")
    import cv2
    cv2.setLogLevel(0)
    return cv2.VideoCapture(source, cv2.CAP_FFMPEG,
        [cv2.CAP_PROP_OPEN_TIMEOUT_MSEC,3000,cv2.CAP_PROP_READ_TIMEOUT_MSEC,3000])


class CameraWorker(Thread):
    def __init__(self, config, factory=opencv_capture, clock=time.monotonic):
        super().__init__(name=f"capture-{config.camera_id}",daemon=True)
        self.config,self.factory,self.clock = config,factory,clock
        self.frames = Queue(maxsize=1)
        self.stop_event = Event()
        self.status,self.dropped = "idle",0
        self.reconnects = 0

    def stop(self):
        self.stop_event.set()

    def run(self):
        seq = 0
        while not self.stop_event.is_set():
            cap = None
            try:
                self.status = "connecting"
                cap = self.factory(self.config.source)
                if not cap.isOpened():
                    raise OSError("capture_unavailable")
                self.status = "connected"
                while not self.stop_event.is_set():
                    ok,image = cap.read()
                    if not ok:
                        break
                    if image.shape[0]*image.shape[1] > self.config.max_pixels:
                        self.status = "frame_too_large"
                        break
                    seq += 1
                    item = Frame(seq,self.clock(),image)
                    try:
                        self.frames.put_nowait(item)
                    except Full:
                        try:
                            self.frames.get_nowait()
                            self.dropped += 1
                        except Empty:
                            pass
                        self.frames.put_nowait(item)
            except Exception:
                self.status = "capture_failed"
            finally:
                if cap is not None:
                    try:
                        cap.release()
                    except Exception:
                        pass
            # Purge pre-disconnect frames: do not recognize buffered stale evidence.
            try:
                self.frames.get_nowait()
            except Empty:
                pass
            if not self.stop_event.is_set():
                self.status = "reconnecting"
                self.reconnects += 1
                self.stop_event.wait(self.config.reconnect_seconds)
        self.status = "stopped"
