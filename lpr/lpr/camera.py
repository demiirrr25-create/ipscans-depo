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
    decoder_mode: str = "software"

    def __post_init__(self):
        if not self.source or not self.camera_id or not 0 < self.reconnect_seconds <= 30:
            raise ValueError("Invalid camera configuration")
        if not 1<=self.max_pixels<=3840*2160:
            raise ValueError("Invalid frame capacity")
        if not isinstance(self.max_retries, int) or not 0 <= self.max_retries <= 100:
            raise ValueError("Invalid retry limit")
        if self.transport not in ("tcp","udp","auto"):raise ValueError("Invalid RTSP transport")
        if self.decoder_mode not in ('software','auto'):raise ValueError('Invalid decoder mode')


@dataclass
class Frame:
    sequence: int
    captured_at: float
    image: object = field(repr=False)


def decoder_report(requested='software'):
    return dict(requested=requested,actual='unknown',hardware_active=False,evidence='not_opened',
                fallback=False,fallback_reason=None,backend='unknown',codec=None)


class _OpenCVCapture:
    """One FFmpeg capture with open-time negotiation and property-based reporting."""
    def __init__(self,cv2,source,decoder_mode):
        self.cv2=cv2;self.capture=None;self.decoder_info=decoder_report(decoder_mode)
        base=[cv2.CAP_PROP_OPEN_TIMEOUT_MSEC,3000,cv2.CAP_PROP_READ_TIMEOUT_MSEC,3000]
        prop=getattr(cv2,'CAP_PROP_HW_ACCELERATION',None)
        any_mode=getattr(cv2,'VIDEO_ACCELERATION_ANY',None)
        none_mode=getattr(cv2,'VIDEO_ACCELERATION_NONE',None)
        can_request=prop is not None and any_mode is not None and none_mode is not None
        modes=['auto','software'] if decoder_mode=='auto' and can_request else ['software']
        if decoder_mode=='auto' and not can_request:
            self.decoder_info.update(fallback=True,fallback_reason='hardware_api_unavailable')
        for mode in modes:
            params=base+([prop,any_mode if mode=='auto' else none_mode] if can_request else [])
            try:
                self.capture=cv2.VideoCapture(source,cv2.CAP_FFMPEG,params)
                opened=self.capture.isOpened()
            except Exception:
                opened=False
            if opened:
                self._report(False)
                if decoder_mode=='auto' and self.decoder_info['actual']=='software' and not self.decoder_info['fallback']:
                    self.decoder_info.update(fallback=True,fallback_reason='backend_selected_software')
                return
            if self.capture is not None:
                self.capture.release();self.capture=None
            if mode=='auto':self.decoder_info.update(fallback=True,fallback_reason='hardware_open_failed')

    def _report(self,decoded):
        cv2=self.cv2;cap=self.capture
        def get(name):
            prop=getattr(cv2,name,None)
            if prop is None:return None
            try:return cap.get(prop)
            except Exception:return None
        backend=get('CAP_PROP_BACKEND')
        actual=get('CAP_PROP_HW_ACCELERATION')
        # ANY is a preference, never evidence that any GPU decoder is active.
        known={getattr(cv2,key,None):value for key,value in (
            ('VIDEO_ACCELERATION_NONE','software'),('VIDEO_ACCELERATION_D3D11','d3d11'),
            ('VIDEO_ACCELERATION_VAAPI','vaapi'),('VIDEO_ACCELERATION_MFX','mfx'),('VIDEO_ACCELERATION_DRM','drm'))}
        known.pop(None,None)
        kind=known.get(actual,'unknown') if backend==cv2.CAP_FFMPEG else 'unknown'
        codec=None
        try:
            fourcc=int(get('CAP_PROP_FOURCC'))
            text=''.join(chr((fourcc>>(8*i))&255) for i in range(4))
            if text.isascii() and text.isalnum():codec=text
        except (TypeError,ValueError,OverflowError):pass
        self.decoder_info.update(actual=kind,backend='ffmpeg' if backend==cv2.CAP_FFMPEG else 'unknown',codec=codec,
            hardware_active=bool(decoded and kind not in ('unknown','software')),
            evidence=('decoded_frame_and_backend_property' if decoded else 'backend_property') if kind!='unknown' else 'unavailable')

    def isOpened(self):return self.capture is not None and self.capture.isOpened()
    def read(self):
        result=self.capture.read() if self.capture is not None else (False,None)
        if result[0] and result[1] is not None:self._report(True)
        return result
    def release(self):
        if self.capture is not None:self.capture.release();self.capture=None


def opencv_capture(source,*,decoder_mode='software',diagnostics=False):
    # FFmpeg can otherwise echo credentials in native errors.
    if decoder_mode not in ('software','auto'):raise ValueError('Invalid decoder mode')
    # Error logs are enabled only inside the isolated child with sanitized stderr.
    os.environ["OPENCV_FFMPEG_LOGLEVEL"] = "16" if diagnostics else "-8"
    os.environ["OPENCV_LOG_LEVEL"] = "ERROR" if diagnostics else "SILENT"
    import cv2
    # OpenCV 5 wheels no longer expose the OpenCV 4 logging setter.
    setter = getattr(cv2, "setLogLevel", None)
    if setter is not None:
        setter(2 if diagnostics else 0)
    return _OpenCVCapture(cv2,source,decoder_mode)


class CameraWorker(Thread):
    def __init__(self, config, factory=None, clock=time.monotonic):
        super().__init__(name=f"capture-{config.camera_id}",daemon=True)
        self.config,self.factory,self.clock = config,factory,clock
        self.frames = Queue(maxsize=1)
        self.stop_event = Event()
        self.status,self.dropped = "idle",0
        self.reconnects = 0
        self.active_transport = 'tcp' if config.transport=='auto' else config.transport
        self.active_decoder_mode=config.decoder_mode
        self._decoder_fallback_reason=None
        self.decoder_info=decoder_report(config.decoder_mode)
        self.decoder_errors={}
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
                                        max_pixels=self.config.max_pixels,stop_event=self.stop_event,
                                        decoder_mode=self.active_decoder_mode)
                else:cap = self.factory(self.config.source)
                self._decoder_state(cap)
                if not cap.isOpened():
                    self.last_error = self._capture_error(cap,'open_failed')
                    if self.active_decoder_mode=='auto':
                        self.active_decoder_mode='software';self._decoder_fallback_reason='open_failure_cpu_retry'
                    raise OSError("capture_unavailable")
                self.status = "awaiting_frame"
                previous = None
                stable_frames = 0
                while not self.stop_event.is_set():
                    ok,image = cap.read()
                    self._decoder_state(cap)
                    if self.stop_event.is_set():break
                    if not ok or image is None or not getattr(image, "size", 0):
                        self.last_error = self._capture_error(cap,"stream_interrupted" if stable_frames else "no_decoded_frame")
                        if self.active_decoder_mode=='auto':
                            self.active_decoder_mode='software';self._decoder_fallback_reason='read_failure_cpu_retry'
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

    def _decoder_state(self,cap):
        info=getattr(cap,'decoder_info',None)
        if isinstance(info,dict):
            self.decoder_info=dict(info)
            if self.config.decoder_mode=='auto' and self.active_decoder_mode=='software':
                self.decoder_info.update(requested='auto',fallback=True,fallback_reason=self._decoder_fallback_reason)
        counts=getattr(cap,'diagnostic_counts',None)
        self.decoder_errors=dict(counts) if isinstance(counts,dict) else {}

    @staticmethod
    def _capture_error(cap,default):
        # A fixed vocabulary prevents injected/native exceptions from leaking URLs.
        error=getattr(cap,'error',None)
        if isinstance(error,str) and error in {'decoder_exited','decoder_timeout','decoder_failed','invalid_frame',
                     'authentication_failed','network_timeout','connection_refused','codec_error'}:return error
        return default
