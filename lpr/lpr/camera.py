"""Bounded latest-frame capture; no source URL is placed in logs or status."""
from dataclasses import dataclass, field
from queue import Queue, Empty, Full
from threading import Event, Thread, Lock
import time
import os


@dataclass(frozen=True)
class CameraConfig:
    source: str = field(repr=False)
    camera_id: str = "camera-1"
    reconnect_seconds: float = 1.0
    max_pixels: int = 3840*2160
    max_retries: int = 5
    transport: str = "tcp"

    def __post_init__(self):
        if not self.source or not self.camera_id or not 0 < self.reconnect_seconds <= 30:
            raise ValueError("Invalid camera configuration")
        if not 1<=self.max_pixels<=3840*2160:
            raise ValueError("Invalid frame capacity")
        if not isinstance(self.max_retries, int) or not 0 <= self.max_retries <= 100:
            raise ValueError("Invalid retry limit")
        if self.transport not in ("tcp","udp","auto"):raise ValueError("Invalid RTSP transport")


@dataclass
class Frame:
    sequence: int
    captured_at: float
    image: object = field(repr=False)


def opencv_capture(source):
    # FFmpeg can otherwise echo credentials in native errors.
    os.environ["OPENCV_FFMPEG_LOGLEVEL"] = "-8"
    os.environ["OPENCV_LOG_LEVEL"] = "SILENT"
    import cv2
    # OpenCV 5 wheels no longer expose the OpenCV 4 logging setter.
    setter = getattr(cv2, "setLogLevel", None)
    if setter is not None:
        setter(0)
    return cv2.VideoCapture(source, cv2.CAP_FFMPEG,
        [cv2.CAP_PROP_OPEN_TIMEOUT_MSEC,3000,cv2.CAP_PROP_READ_TIMEOUT_MSEC,3000])


class CameraWorker(Thread):
    def __init__(self, config, factory=None, clock=time.monotonic):
        super().__init__(name=f"capture-{config.camera_id}",daemon=True)
        self.config,self.factory,self.clock = config,factory,clock
        self.frames = Queue(maxsize=1)
        self.stop_event = Event()
        self.status,self.dropped = "idle",0
        self.reconnects = 0
        self.active_transport = 'tcp' if config.transport=='auto' else config.transport
        self.last_error = None
        self.resolution = None
        self.fps = 0.0
        self._frame_lock = Lock()
        self._latest = None
        self._generation = 0

    def snapshot(self):
        """Non-consuming view shared by preview and inference; image is read-only."""
        with self._frame_lock:
            return self._latest, self._generation

    def stop(self):
        self.stop_event.set()

    def run(self):
        seq = 0
        failures = 0
        while not self.stop_event.is_set():
            cap = None
            try:
                self.status = "connecting"
                if self.factory is None:
                    from .isolated_capture import IsolatedCapture
                    cap=IsolatedCapture(self.config.source,transport=self.active_transport,
                                        max_pixels=self.config.max_pixels,stop_event=self.stop_event)
                else:cap = self.factory(self.config.source)
                if not cap.isOpened():
                    self.last_error = "open_failed"
                    raise OSError("capture_unavailable")
                self.status = "awaiting_frame"
                previous = None
                stable_frames = 0
                while not self.stop_event.is_set():
                    ok,image = cap.read()
                    if self.stop_event.is_set():break
                    if not ok or image is None or not getattr(image, "size", 0):
                        self.last_error = "stream_interrupted" if stable_frames else "no_decoded_frame"
                        break
                    if image.shape[0]*image.shape[1] > self.config.max_pixels:
                        self.status = "frame_too_large"
                        self.last_error = "frame_too_large"
                        break
                    seq += 1
                    item = Frame(seq,self.clock(),image)
                    image.flags.writeable = False
                    with self._frame_lock:
                        self._latest = item
                    self.status = "connected"
                    self.last_error = None
                    self.resolution = (image.shape[1], image.shape[0])
                    if previous is not None and item.captured_at > previous:
                        instant = 1 / (item.captured_at - previous)
                        self.fps = instant if not self.fps else .9*self.fps + .1*instant
                    previous = item.captured_at
                    stable_frames += 1
                    # A single intermittent frame must not reset the retry budget.
                    if stable_frames >= 30:
                        failures = 0
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
                if self.last_error is None:
                    self.last_error = "capture_failed"
            finally:
                with self._frame_lock:
                    self._latest = None
                    self._generation += 1
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
                failures += 1
                if failures > self.config.max_retries:
                    self.status = "retry_exhausted"
                    return
                self.status = "reconnecting"
                if self.config.transport=='auto':
                    self.active_transport='udp' if self.active_transport=='tcp' else 'tcp'
                self.reconnects += 1
                self.stop_event.wait(min(30, self.config.reconnect_seconds * 2**(failures-1)))
        self.status = "stopped"
