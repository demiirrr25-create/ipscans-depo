"""Persistent FFmpeg decoder. Latest-frame mailbox prevents video backlog."""
import subprocess
import threading
import time
import os

class JPEGParser:
    def __init__(self): self.buffer=b''
    def feed(self, data):
        self.buffer+=data; frames=[]
        while True:
            start=self.buffer.find(b'\xff\xd8')
            if start<0:
                self.buffer=self.buffer[-1:]; break
            end=self.buffer.find(b'\xff\xd9',start+2)
            if end<0:
                self.buffer=self.buffer[start:]
                if len(self.buffer)>4*1024**2: self.buffer=b''
                break
            frames.append(self.buffer[start:end+2]); self.buffer=self.buffer[end+2:]
        return frames

class Stream:
    def __init__(self, executable, url, transport='tcp', source_args=None):
        args=source_args or ['-rtsp_transport',transport,'-timeout','5000000','-fflags','nobuffer','-i',url]
        self.process=subprocess.Popen([executable,'-hide_banner','-loglevel','error','-nostdin',*args,'-an','-vf','fps=2,scale=640:-2','-f','image2pipe','-vcodec','mjpeg','-q:v','5','pipe:1'],stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,creationflags=0x08000000 if os.name=='nt' else 0)
        self.lock=threading.Lock(); self.latest=None; self.sequence=0; self.received=0; self.closed=threading.Event()
        self.thread=threading.Thread(target=self.read,daemon=True);self.thread.start()
    def read(self):
        parser=JPEGParser()
        try:
            while not self.closed.is_set():
                data=self.process.stdout.read1(65536)
                if not data: break
                for frame in parser.feed(data):
                    with self.lock: self.latest=frame;self.sequence+=1;self.received=time.monotonic()
        except (OSError,ValueError): pass
    def get(self):
        with self.lock:return self.latest,self.sequence,self.received
    def close(self):
        self.closed.set()
        if self.process.poll() is None:
            self.process.terminate()
            try:self.process.wait(timeout=2)
            except subprocess.TimeoutExpired:self.process.kill();self.process.wait(timeout=2)
        self.thread.join(2)
        if self.process.stdout:self.process.stdout.close()
