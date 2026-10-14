"""Per-camera native decoder isolation with one bounded shared frame buffer."""
import multiprocessing as mp
import time


def _decode(connection,buffer,source,transport,max_pixels,factory):
    cap=None
    try:
        import os
        os.environ['OPENCV_FFMPEG_CAPTURE_OPTIONS']='rtsp_transport;'+transport
        if factory is None:
            from .camera import opencv_capture
            factory=opencv_capture
        cap=factory(source)
        connection.send(('open',bool(cap.isOpened())))
        while connection.recv()=='read':
            ok,frame=cap.read()
            if not ok or frame is None:
                connection.send(('end',));break
            if frame.ndim!=3 or frame.shape[2]!=3 or str(frame.dtype)!='uint8' or frame.shape[0]*frame.shape[1]>max_pixels:
                connection.send(('invalid_frame',));break
            import numpy as np
            np.frombuffer(buffer,dtype=np.uint8,count=frame.size)[:]=frame.reshape(-1)
            connection.send(('frame',frame.shape))
    except (EOFError,BrokenPipeError,OSError):pass
    except Exception:
        try:connection.send(('decoder_failed',))
        except (OSError,EOFError):pass
    finally:
        # Native release can hang as well; the parent enforces shutdown.
        if cap is not None:cap.release()
        connection.close()


class IsolatedCapture:
    """Capture-compatible adapter; native hangs cannot hold the UI process.

    Credentials go through multiprocessing's private bootstrap pipe, never argv.
    Only small control messages use the pipe; a child never queues video frames.
    """
    def __init__(self,source,*,transport='tcp',max_pixels=3840*2160,stop_event=None,
                 open_timeout=10.,read_timeout=4.,factory=None):
        if transport not in ('tcp','udp') or not 1<=max_pixels<=3840*2160:
            raise ValueError('Invalid isolated capture configuration')
        if not 0<open_timeout<=30 or not 0<read_timeout<=30:raise ValueError('Invalid capture timeout')
        self.stop_event=stop_event;self.read_timeout=read_timeout
        self.error=None;self.opened=False;self.closed=False
        context=mp.get_context('spawn')
        self.buffer=context.RawArray('B',max_pixels*3)
        self.connection,child=context.Pipe()
        self.process=context.Process(target=_decode,args=(child,self.buffer,source,transport,max_pixels,factory),daemon=True)
        try:
            self.process.start();child.close()
            message=self._receive(open_timeout)
            self.opened=message==('open',True)
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
            if message:self.error=message[0]
            self.release();return False,None
        import numpy as np
        shape=message[1]
        frame=np.frombuffer(self.buffer,dtype=np.uint8,count=shape[0]*shape[1]*3).reshape(shape).copy()
        return True,frame

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
