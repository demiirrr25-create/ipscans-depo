import os
import time
from threading import Event
import numpy as np
import pytest
from lpr.isolated_capture import IsolatedCapture


class FakeCapture:
    def __init__(self,source):
        self.source=source
        if source=='open_hang':time.sleep(60)
    def isOpened(self):return True
    def read(self):
        if self.source=='read_hang':time.sleep(60)
        if self.source=='crash':os._exit(7)
        value=1 if os.environ['OPENCV_FFMPEG_CAPTURE_OPTIONS']=='rtsp_transport;tcp' else 2
        return True,np.full((8,12,3),value,dtype=np.uint8)
    def release(self):
        if self.source=='release_hang':time.sleep(60)


def test_transport_is_process_local_and_frames_are_detached():
    old=os.environ.get('OPENCV_FFMPEG_CAPTURE_OPTIONS')
    tcp=IsolatedCapture('ok',transport='tcp',max_pixels=96,factory=FakeCapture)
    udp=IsolatedCapture('release_hang',transport='udp',max_pixels=96,factory=FakeCapture)
    try:
        assert tcp.isOpened() and udp.isOpened()
        assert np.all(tcp.read()[1]==1)
        frame=udp.read()[1];assert np.all(frame==2)
        frame[:]=9
        assert np.all(udp.read()[1]==2)
        assert os.environ.get('OPENCV_FFMPEG_CAPTURE_OPTIONS')==old
    finally:tcp.release();udp.release()
    assert not tcp.process.is_alive() and not udp.process.is_alive()


@pytest.mark.parametrize('source',['open_hang','read_hang','crash'])
def test_native_hang_or_crash_has_bounded_shutdown(source):
    started=time.monotonic()
    cap=IsolatedCapture(source,max_pixels=96,open_timeout=2,read_timeout=.2,factory=FakeCapture)
    try:
        if cap.isOpened():assert cap.read()==(False,None)
    finally:cap.release()
    assert time.monotonic()-started<6
    assert not cap.process.is_alive()
    assert cap.error in ('decoder_timeout','decoder_exited')


def test_cancellation_interrupts_pending_read():
    stop=Event()
    cap=IsolatedCapture('read_hang',max_pixels=96,stop_event=stop,factory=FakeCapture)
    stop.set();started=time.monotonic()
    try:assert cap.read()==(False,None)
    finally:cap.release()
    assert time.monotonic()-started<2 and not cap.process.is_alive()
