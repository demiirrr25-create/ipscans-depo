"""User-triggered Ollama installation with streamed progress and a real vision probe."""
import base64
import io
import json
import threading
import urllib.request
from PIL import Image

MODEL='gemma3:4b'
BASE='http://127.0.0.1:11434'

def request(endpoint, body=None, timeout=10):
    return urllib.request.urlopen(urllib.request.Request(BASE+'/api/'+endpoint, None if body is None else json.dumps(body).encode(), {'Content-Type':'application/json'}),timeout=timeout)

class Installer:
    def __init__(self, on_ready):
        self.lock=threading.Lock(); self.cancelled=threading.Event(); self.on_ready=on_ready
        self.thread=None; self.state={'phase':'idle','message':'Ollama kuruluysa Gemma’yı tek tuşla hazırlayın.','completed':0,'total':0}

    def status(self):
        with self.lock: return dict(self.state)

    def set(self, **values):
        with self.lock: self.state.update(values)

    def start(self):
        with self.lock:
            if self.thread and self.thread.is_alive(): return False
            self.cancelled.clear(); self.state={'phase':'checking','message':'Ollama kontrol ediliyor…','completed':0,'total':0}
            self.thread=threading.Thread(target=self.run,daemon=True); self.thread.start(); return True

    def cancel(self):
        self.cancelled.set()
        if self.thread and self.thread.is_alive(): self.set(message='İptal bekleniyor; mevcut ağ isteği zaman aşımına kadar sürebilir.')

    def check_cancel(self):
        if self.cancelled.is_set(): raise InterruptedError()

    def run(self):
        try:
            with request('tags') as response: installed=json.load(response).get('models',[])
            self.check_cancel()
            if not any(m.get('name')==MODEL or m.get('model')==MODEL for m in installed):
                self.set(phase='pulling',message='Gemma indiriliyor; ilerleme geçerli dosya katmanına aittir.')
                success=False
                with request('pull',{'model':MODEL,'stream':True},timeout=60) as response:
                    while True:
                        self.check_cancel(); line=response.readline(65537)
                        if not line: break
                        if len(line)>65536: raise ValueError()
                        progress=json.loads(line)
                        if 'error' in progress: raise ValueError()
                        self.set(completed=max(0,int(progress.get('completed',0))),total=max(0,int(progress.get('total',0))))
                        if progress.get('status')=='success': success=True
                if not success: raise ValueError()
            self.check_cancel(); self.set(phase='verifying',message='Görsel yetenek ve gerçek model yanıtı doğrulanıyor (ilk açılış birkaç dakika sürebilir)…',completed=0,total=0)
            with request('show',{'model':MODEL}) as response: metadata=json.load(response)
            if 'vision' not in metadata.get('capabilities',[]): raise ValueError()
            buffer=io.BytesIO(); Image.new('RGB',(32,32),'white').save(buffer,format='PNG')
            self.check_cancel()
            with request('chat',{'model':MODEL,'stream':False,'messages':[{'role':'user','content':'Describe this image briefly.','images':[base64.b64encode(buffer.getvalue()).decode()]}],'options':{'num_predict':32,'temperature':0}},timeout=180) as response:
                result=json.load(response)
            if not result.get('done') or not result.get('message',{}).get('content','').strip(): raise ValueError()
            self.check_cancel(); self.on_ready(MODEL)
            self.set(phase='ready',message='Gemma hazır. Görsel deneme yanıtı alındı ve Cortex’e bağlandı.')
        except InterruptedError: self.set(phase='cancelled',message='Kurulum iptal edildi. İndirilen katmanlar Ollama’da kalabilir; tekrar deneyebilirsiniz.')
        except Exception:
            self.set(phase='cancelled' if self.cancelled.is_set() else 'error',message='Kurulum tamamlanamadı. Ollama’nın açık olduğunu, interneti, boş diski ve RAM/GPU kapasitesini kontrol edip tekrar deneyin. Mevcut model ayarı değiştirilmedi.')
