"""User-triggered Ollama installation with streamed progress and a real vision probe."""
import base64
import io
import json
import threading
import time
import urllib.request
from PIL import Image

MODEL='gemma3:4b'
BASE='http://127.0.0.1:11434'

VISION_TEMPLATES = [
    {'id':'cat','name':'Kedi görüldü','category':'Hayvanlar','prompt':'Son karede açıkça görülen canlı bir kedi varsa bildir. Oyuncak, resim ve belirsiz şekilleri kedi sayma.'},
    {'id':'dog','name':'Köpek görüldü','category':'Hayvanlar','prompt':'Son karede açıkça görülen canlı bir köpek varsa bildir. Oyuncak ve belirsiz şekillerde eşleşme verme.'},
    {'id':'bird','name':'Kuş görüldü','category':'Hayvanlar','prompt':'Son karede açıkça görülen bir kuş varsa bildir.'},
    {'id':'leaves','name':'Yaprak hareketi','category':'Doğa ve hava','prompt':'Kareler arasında bitki veya ağaç yapraklarının hareketi açıkça görülüyor ve son karelerde sürüyorsa bildir. Tüm görüntünün kaymasını yaprak hareketi sayma.'},
    {'id':'rain','name':'Görünür yağmur','category':'Doğa ve hava','prompt':'Son karelerde düşen yağmur damlaları veya yağışın doğrudan görsel kanıtı açıkça varsa bildir. Sadece ıslak zemin, bulut veya karanlık yağmur kanıtı değildir.'},
    {'id':'snow','name':'Görünür kar yağışı','category':'Doğa ve hava','prompt':'Son karelerde havada düşen kar taneleri açıkça görülüyorsa bildir. Yerdeki kar tek başına devam eden yağış kanıtı değildir.'},
    {'id':'lens_water','name':'Lens üzerinde damla','category':'Kamera müdahalesi','prompt':'Son karede kamera lensi/camı üzerindeki su damlaları görüntüyü belirgin bozuyorsa bildir. Uzaktaki nesneleri damla sayma.'},
    {'id':'tamper','name':'Kameraya fiziksel müdahale','category':'Kamera müdahalesi','prompt':'Son karelerde bir el veya nesne doğrudan kameraya yaklaşıp lensi kapatıyor ya da görüşü fiziksel olarak engelliyorsa bildir. Normal geçişi müdahale sayma; niyet çıkarımı yapma.'},
    {'id':'person','name':'Bölgede insan','category':'Alan ve nesne','prompt':'Seçili görüntü bölgesinin son karesinde açıkça bir insan varsa bildir. Fotoğraf, ekran görüntüsü veya belirsiz gölgeyi insan sayma.'},
    {'id':'vehicle','name':'Bölgede araç','category':'Alan ve nesne','prompt':'Seçili bölgenin son karesinde açıkça bir motorlu araç varsa bildir.'},
    {'id':'blocked_exit','name':'Geçiş alanında engel','category':'Alan ve nesne','prompt':'Seçili geçiş/kapı bölgesinin son karesinde yolu belirgin şekilde kapatan fiziksel bir nesne varsa bildir. Bölge seçiminin gerçekten geçiş yolunu kapsaması gerekir.'},
    {'id':'litter','name':'Asansörde çöp bırakılması','category':'Alan ve nesne','prompt':'Karelerde bir kişinin asansör zeminine çöp veya poşet bırakıp ayrıldığı ve son karede nesnenin yerde kaldığı açıkça görülüyorsa bildir. Sadece önceden duran nesne yeterli değildir.'},
]

VISION_TEMPLATES += [{'id': 'door_open',
  'name': 'Kapı açık',
  'category': 'Giriş ve geçiş',
  'prompt': 'Seçili kapının kanadı son karede açıkça açık konumdaysa bildir. Karanlık boşluğu tek başına açık kapı sayma.'},
 {'id': 'gate_open',
  'name': 'Bariyer açık',
  'category': 'Giriş ve geçiş',
  'prompt': 'Seçili bariyer kolu son karede açık/yukarı konumda açıkça görülüyorsa bildir.'},
 {'id': 'queue',
  'name': 'Sırada en az beş kişi',
  'category': 'Giriş ve geçiş',
  'prompt': 'Seçili bekleme bölgesinde en az beş ayrı insan aynı anda açıkça görünüyorsa bildir. Örtüşen belirsiz şekilleri sayma.'},
 {'id': 'pool_person',
  'name': 'Havuz bölgesinde insan',
  'category': 'Havuz ve tesis',
  'prompt': 'Seçili havuz çevresi bölgesinde son karede insan varsa bildir. Üyelik, izin veya ödeme durumu çıkarma.'},
 {'id': 'pool_object',
  'name': 'Havuz çevresinde eşya',
  'category': 'Havuz ve tesis',
  'prompt': 'Seçili yürüme yolunda bırakılmış çanta, sandalye veya büyük fiziksel eşya son karede açıkça görünüyorsa bildir.'},
 {'id': 'pool_gate',
  'name': 'Havuz giriş kapısı açık',
  'category': 'Havuz ve tesis',
  'prompt': 'Seçili havuz giriş kapısının kanadı açıkça açık konumdaysa bildir. Görünmüyorsa eşleşme verme.'},
 {'id': 'helmet',
  'name': 'Görünür koruyucu baret',
  'category': 'İş alanı',
  'prompt': 'Son karede açıkça baret takan insan varsa bildir. Saç, şapka veya belirsiz baş görüntüsünü baret sayma.'},
 {'id': 'vest',
  'name': 'Görünür reflektif yelek',
  'category': 'İş alanı',
  'prompt': 'Son karede reflektif bantlı güvenlik yeleği takan insan açıkça görünüyorsa bildir.'},
 {'id': 'forklift',
  'name': 'Bölgede forklift',
  'category': 'İş alanı',
  'prompt': 'Seçili bölgede çatalları veya kaldırma mekanizması açıkça görünen forklift varsa bildir.'},
 {'id': 'pallet',
  'name': 'Geçişte palet',
  'category': 'İş alanı',
  'prompt': 'Seçili geçiş alanında palet veya kasalar yolu belirgin biçimde kapatıyorsa bildir.'},
 {'id': 'delivery',
  'name': 'Kapı önünde paket',
  'category': 'Alan ve nesne',
  'prompt': 'Seçili kapı önü bölgesinin son karesinde belirgin kutu veya kargo paketi varsa bildir. Yeni bırakıldığı sonucunu çıkarma.'},
 {'id': 'bin_full',
  'name': 'Çöp kutusu taşıyor',
  'category': 'Alan ve nesne',
  'prompt': 'Seçili çöp kutusunda atıklar ağzın üzerinde taşıyor veya çevresine dökülmüşse bildir.'},
 {'id': 'bicycle', 'name': 'Bölgede bisiklet', 'category': 'Araçlar', 'prompt': 'Son karede açıkça bisiklet varsa bildir.'},
 {'id': 'motorcycle', 'name': 'Bölgede motosiklet', 'category': 'Araçlar', 'prompt': 'Son karede açıkça motosiklet varsa bildir.'},
 {'id': 'truck',
  'name': 'Bölgede kamyon',
  'category': 'Araçlar',
  'prompt': 'Son karede belirgin ağır yük kamyonu varsa bildir. Otomobilleri kamyon sayma.'},
 {'id': 'parking',
  'name': 'Seçili park yeri dolu',
  'category': 'Araçlar',
  'prompt': 'Seçili tek park yeri bölgesi son karede bir motorlu araç tarafından belirgin biçimde kaplanıyorsa bildir.'},
 {'id': 'animal_large',
  'name': 'Bölgede büyük hayvan',
  'category': 'Hayvanlar',
  'prompt': 'Son karede at, inek veya koyun açıkça görünüyorsa bildir. Tür belirsizse eşleşme verme.'},
 {'id': 'fallen_branch',
  'name': 'Yolda dal veya ağaç',
  'category': 'Doğa ve hava',
  'prompt': 'Seçili yol üzerinde yatık dal veya devrilmiş ağaç açıkça görünüyorsa bildir.'},
 {'id': 'standing_water',
  'name': 'Zeminde su birikintisi',
  'category': 'Doğa ve hava',
  'prompt': 'Seçili zeminde belirgin sınırı olan su birikintisi görünüyorsa bildir. Parlama veya gölge tek başına yeterli değildir.'},
 {'id': 'lens_dirt',
  'name': 'Lens kirlenmesi şüphesi',
  'category': 'Kamera müdahalesi',
  'prompt': 'Kareler boyunca aynı görüntü konumunda duran belirgin leke görüşü engelliyorsa bildir. Sahnedeki nesneyi leke sayma.'}]

class Health:
    """Probe asynchronously so unavailable Ollama never blocks panel/local rules."""
    def __init__(self):
        self.lock=threading.Lock();self.thread=None;self.checked=0
        self.state={'phase':'checking','model':'','message':'Ollama kontrol ediliyor…'}
    def status(self,model,force=False):
        with self.lock:
            if (force or model!=self.state['model'] or time.monotonic()-self.checked>10) and not (self.thread and self.thread.is_alive()):
                if model!=self.state['model']:
                    self.state={'phase':'checking','model':model,'message':'Ollama kontrol ediliyor…'}
                self.thread=threading.Thread(target=self.probe,args=(model,),daemon=True);self.thread.start()
            return dict(self.state)
    def probe(self,model):
        phase='offline';message='Ollama bağlantısı yok. Ollama’yı açın.'
        try:
            with request('tags',timeout=3) as response: installed=json.load(response).get('models',[])
            names={m.get('name',m.get('model','')) for m in installed}
            if model not in names and model+':latest' not in names:
                phase='missing';message='Ollama bağlı; seçili model kurulu değil.'
            else:
                with request('show',{'model':model},timeout=3) as response: info=json.load(response)
                if 'vision' in info.get('capabilities',[]):phase='connected';message='Ollama bağlı · '+model+' · Görsel model kullanılabilir'
                else:phase='unsupported';message='Ollama bağlı; seçili model görüntü desteklemiyor.'
        except Exception:pass
        with self.lock:self.state={'phase':phase,'model':model,'message':message};self.checked=time.monotonic()

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
            try:
                with request('tags') as response: installed=json.load(response).get('models',[])
            except Exception:
                from runtime_setup import ensure_runtime
                ensure_runtime(self.set,self.check_cancel)
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
