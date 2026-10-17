"""Per-camera native decoder isolation with one bounded shared frame buffer."""
import multiprocessing as mp
import time
from threading import Lock,Thread


class NativeDiagnostics:
    """Drain native stderr into bounded category counts, never raw text or a file."""
    patterns={
        'authentication_failed':(b'401 unauthorized',b'403 forbidden'),
        'network_timeout':(b'connection timed out',b'operation timed out'),
        'connection_refused':(b'connection refused',),
        'codec_error':(b'error while decoding',b'invalid nal',b'non-existing pps',b'overread',
                       b'could not find ref',b'corrupt decoded frame',b'decode_slice_header error',
                       b'error parsing nal',b'no frame!',b'error sending packet to decoder')}

    def __init__(self):
        self.counts={};self.lock=Lock();self.reader=None

    def classify(self,data):
        # No raw buffer is kept after this call. Count chunks as diagnostic hints,
        # not exact failed-frame totals: FFmpeg may report multiple lines/frame.
        lower=data.lower()
        with self.lock:
            for category,patterns in self.patterns.items():
                if any(pattern in lower for pattern in patterns):self.counts[category]=min(1000000000,self.counts.get(category,0)+1)

    def snapshot(self):
        with self.lock:return dict(self.counts)

    def start(self):
        import os
        read_fd,write_fd=os.pipe();os.dup2(write_fd,2)
        if write_fd!=2:os.close(write_fd)
        def drain():
            try:
                while True:
                    data=os.read(read_fd,4096)
                    if not data:break
                    self.classify(data)
                    data=b''
            finally:os.close(read_fd)
        self.reader=Thread(target=drain,name='decoder-diagnostic-sanitizer',daemon=True);self.reader.start()

    def close(self):
        import os
        null=os.open(os.devnull,os.O_WRONLY);os.dup2(null,2)
        if null!=2:os.close(null)
        if self.reader:self.reader.join(.1)


def _decode(connection,buffer,source,transport,max_pixels,factory,decoder_mode):
    cap=None;diagnostics=NativeDiagnostics()
    try:
        import os
        # Some native codec builds bypass OpenCV's log-level option. Never let
        # a native diagnostic echo a credential-bearing source to stderr.
        diagnostics.start()
        os.environ['OPENCV_FFMPEG_CAPTURE_OPTIONS']='rtsp_transport;'+transport
        if factory is None:
            from .camera import opencv_capture
            cap=opencv_capture(source,decoder_mode=decoder_mode,diagnostics=True)
        else:cap=factory(source)
        connection.send(('open',bool(cap.isOpened()),getattr(cap,'decoder_info',None),diagnostics.snapshot()))
        while connection.recv()=='read':
            ok,frame=cap.read()
            if not ok or frame is None:
                connection.send(('end',diagnostics.snapshot()));break
            if frame.ndim!=3 or frame.shape[2]!=3 or str(frame.dtype)!='uint8' or frame.shape[0]*frame.shape[1]>max_pixels:
                connection.send(('invalid_frame',diagnostics.snapshot()));break
            import numpy as np
            np.frombuffer(buffer,dtype=np.uint8,count=frame.size)[:]=frame.reshape(-1)
            connection.send(('frame',frame.shape,getattr(cap,'decoder_info',None),diagnostics.snapshot()))
    except (EOFError,BrokenPipeError,OSError):pass
    except Exception:
        try:connection.send(('decoder_failed',diagnostics.snapshot()))
        except (OSError,EOFError):pass
    finally:
        # Native release can hang as well; the parent enforces shutdown.
        if cap is not None:cap.release()
        diagnostics.close()
        connection.close()


class IsolatedCapture:
    """Capture-compatible adapter; native hangs cannot hold the UI process.

    Credentials go through multiprocessing's private bootstrap pipe, never argv.
    Only small control messages use the pipe; a child never queues video frames.
    """
    def __init__(self,source,*,transport='tcp',max_pixels=3840*2160,stop_event=None,
                 open_timeout=10.,read_timeout=4.,factory=None,decoder_mode='software'):
        if transport not in ('tcp','udp') or not 1<=max_pixels<=3840*2160:
            raise ValueError('Invalid isolated capture configuration')
        if not 0<open_timeout<=30 or not 0<read_timeout<=30:raise ValueError('Invalid capture timeout')
        if decoder_mode not in ('software','auto'):raise ValueError('Invalid decoder mode')
        self.stop_event=stop_event;self.read_timeout=read_timeout
        self.error=None;self.opened=False;self.closed=False
        from .camera import decoder_report
        self.decoder_info=decoder_report(decoder_mode);self.diagnostic_counts={}
        context=mp.get_context('spawn')
        self.buffer=context.RawArray('B',max_pixels*3)
        self.connection,child=context.Pipe()
        self.process=context.Process(target=_decode,args=(child,self.buffer,source,transport,max_pixels,factory,decoder_mode),daemon=True)
        try:
            self.process.start();child.close()
            message=self._receive(open_timeout)
            self.opened=bool(message and message[0]=='open' and message[1])
            if message and message[0]=='open':
                self._diagnostics(message[2],message[3])
                if not self.opened:self.error=self._error('open_failed')
            elif message:
                self._diagnostics(None,message[1] if len(message)>1 else {})
                self.error=self._error(message[0])
            if not self.opened:self.release()
        except Exception:
            child.close();self.release();raise

    def _receive(self,timeout):
        deadline=time.monotonic()+timeout
        while time.monotonic()<deadline:
            if self.stop_event is not None and self.stop_event.is_set():
                self.error='stopped';return None
            try:
                if self.connection.poll(.05):return self.connection.recv()
            except (EOFError,OSError):
                self.error='decoder_exited';return None
            if not self.process.is_alive():
                self.error='decoder_exited';return None
        self.error='decoder_timeout';return None

    def isOpened(self):return self.opened and not self.closed

    def read(self):
        if not self.isOpened():return False,None
        try:self.connection.send('read')
        except (OSError,EOFError):
            self.error='decoder_exited';self.release();return False,None
        message=self._receive(self.read_timeout)
        if not message or message[0]!='frame':
            if message:
                self._diagnostics(None,message[1] if len(message)>1 else {})
                self.error=self._error(message[0])
            self.release();return False,None
        import numpy as np
        shape=message[1]
        self._diagnostics(message[2],message[3])
        frame=np.frombuffer(self.buffer,dtype=np.uint8,count=shape[0]*shape[1]*3).reshape(shape).copy()
        return True,frame

    def _diagnostics(self,info,counts):
        if isinstance(info,dict):self.decoder_info=dict(info)
        # Child reports only known categories; discard anything else defensively.
        if isinstance(counts,dict):self.diagnostic_counts={key:value for key,value in counts.items()
            if key in NativeDiagnostics.patterns and type(value) is int and 0<=value<=1000000000}

    def _error(self,default):
        return next((key for key in ('authentication_failed','network_timeout','connection_refused','codec_error')
                     if self.diagnostic_counts.get(key)),default)

    def release(self):
        if self.closed:return
        self.closed=True;self.opened=False
        try:self.connection.send('close')
        except (OSError,EOFError):pass
        self.connection.close()
        if self.process.pid is not None:
            self.process.join(.2)
            if self.process.is_alive():self.process.terminate();self.process.join(1)
            if self.process.is_alive():self.process.kill();self.process.join(1)
