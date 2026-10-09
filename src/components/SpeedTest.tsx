"use client";
import { useEffect, useRef, useState } from 'react';
import type { Dictionary } from '@/i18n/dictionaries';
import type { Locale } from '@/i18n/config';
import type { SpeedResult, SpeedUpdate, Trace } from '@/lib/speed-engine';

export function SpeedTest({dict, locale}: {dict: Dictionary['speedTest']; locale: Locale}) {
  const tr = locale === 'tr';
  const [update, setUpdate] = useState<SpeedUpdate | null>(null);
  const [result, setResult] = useState<SpeedResult | null>(null);
  const [trace, setTrace] = useState<Trace[]>([]);
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState('');
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function run() {
    if (controller.current) return;
    const session = new AbortController(); controller.current = session;
    setRunning(true); setResult(null); setTrace([]); setNotice(''); setUpdate(null);
    try {
      const {runSpeedTest} = await import('@/lib/speed-engine');
      const measured = await runSpeedTest(session.signal, value => {
        if (session.signal.aborted) return;
        setUpdate(value);
        if (value.trace) setTrace(points => [...points.slice(-79), value.trace!]);
      });
      setResult(measured);
    } catch {
      setNotice(session.signal.aborted ? (tr ? 'Test durduruldu. Eksik sonuç yayımlanmadı.' : 'Test stopped. Incomplete results were not published.')
        : (tr ? 'Yeterli ölçüm alınamadı. Bağlantıyı kontrol edip yeniden deneyin.' : 'Insufficient measurements. Check your connection and try again.'));
    } finally { if (controller.current === session) { controller.current = null; setRunning(false); } }
  }
  const label = update?.phase === 'upload' ? dict.upload : update?.phase === 'latency' ? dict.ping : dict.download;
  const value = running ? update?.mbps : result?.download;
  const max = Math.max(100, ...trace.map(p => p.mbps));
  const fmt = (n: number | null | undefined, unit='ms') => n == null ? '—' : `${n.toFixed(1)} ${unit}`;
  const summary = result ? `IPScans / ${new Date(result.timestamp).toLocaleString()}\nDownload ${fmt(result.download,'Mbps')} · Upload ${fmt(result.upload,'Mbps')}\nHTTP latency ${fmt(result.idle)} · Jitter ${fmt(result.jitter)}\nLoaded latency ↓ ${fmt(result.loadedDownload)} ↑ ${fmt(result.loadedUpload)}\nCloudflare edge · ${result.seconds.toFixed(1)} s · ${(result.bytes/1e6).toFixed(1)} MB\nhttps://ipscans.com/${locale}` : '';
  async function share() {
    try { await navigator.clipboard.writeText(summary); setNotice(tr ? 'Sonuç panoya kopyalandı.' : 'Result copied to clipboard.'); }
    catch { setNotice(tr ? 'Kopyalama kullanılamıyor; JSON dosyasını indirebilirsiniz.' : 'Copy unavailable; download the JSON result.'); }
  }
  function exportResult() {
    if (!result) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify({method:'HTTPS transfers to Cloudflare edge; HTTP latency; no packet-loss measurement',...result},null,2)],{type:'application/json'}));
    const link = document.createElement('a'); link.href=url; link.download='ipscans-speed-result.json'; link.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  return <section className="speed-console overflow-hidden rounded-3xl border border-white/20 bg-black" aria-label={dict.title}>
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/15 px-6 py-5 font-mono text-xs text-neutral-300">
      <span>IPSCANS / CONNECTION LAB</span><span>{tr ? 'Cloudflare uç ağı · HTTPS ölçümü' : 'Cloudflare edge · HTTPS measurement'}</span>
    </div>
    <div className="grid lg:grid-cols-[1.1fr_1fr]">
      <div className="relative grid place-items-center border-b border-white/15 p-6 sm:p-10 lg:border-e lg:border-b-0">
        <div className="relative aspect-square w-full max-w-80">
          <svg viewBox="0 0 320 320" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden="true">
            <circle cx="160" cy="160" r="142" fill="none" stroke="#262626" strokeWidth="1" strokeDasharray="2 6" />
            <circle cx="160" cy="160" r="127" fill="none" stroke="#171717" strokeWidth="8" />
            <circle cx="160" cy="160" r="127" fill="none" stroke="white" strokeWidth="8" strokeLinecap="round" strokeDasharray="798" strokeDashoffset={798*(1-Math.min(1,Math.log10(1+(value??0))/4))} className="transition-[stroke-dashoffset] duration-300" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="mb-4 font-mono text-xs uppercase tracking-widest text-neutral-400">{running ? label : result ? dict.download : 'READY / HAZIR'}</span>
            <span className="text-6xl font-semibold tracking-tighter tabular-nums sm:text-7xl">{value && update?.phase !== 'latency' ? value.toFixed(1) : '—'}</span>
            <span className="mt-3 font-mono text-xs text-neutral-400">{running && update?.phase==='latency'?'HTTP / ms':'Mbps'}</span>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button onClick={run} disabled={running} className="btn-primary min-h-12 rounded-full px-8 font-semibold disabled:opacity-40">{result ? dict.restart : dict.start} ↗</button>
          {running && <button onClick={()=>controller.current?.abort()} className="btn-ghost min-h-12 rounded-full px-6">{tr?'Durdur':'Stop'}</button>}
        </div>
        <p role="status" className="mt-5 text-center text-sm text-neutral-300">{notice || (running ? `${label} · ${(update?.seconds??0).toFixed(0)} s` : result ? (tr?'Ölçüm tamamlandı':'Measurement complete') : '')}</p>
      </div>
      <div className="p-6 sm:p-10">
        <p className="font-mono text-xs tracking-widest text-neutral-400">{tr?'01 / AKTARIM ÖLÇÜMLERİ':'01 / TRANSFER MEASUREMENTS'}</p>
        <div className="mt-5 grid grid-cols-2 gap-5">
          {[[dict.download,fmt(result?.download,'Mbps')],[dict.upload,fmt(result?.upload,'Mbps')],
            [tr?'Boşta gecikme':'Idle latency',fmt(result?.idle)],['Jitter',fmt(result?.jitter)],
            [tr?'Yük altında ↓':'Loaded latency ↓',fmt(result?.loadedDownload)],[tr?'Yük altında ↑':'Loaded latency ↑',fmt(result?.loadedUpload)]].map(([name,value])=><div key={name} className="border-b border-white/15 pb-5"><p className="text-xs text-neutral-400">{name}</p><p className="mt-2 text-xl font-medium tabular-nums">{value}</p></div>)}
        </div>
        <div className="mt-8 flex justify-between font-mono text-xs text-neutral-400"><span>↓ {dict.download} / ↑ {dict.upload}</span><span>{max.toFixed(0)} Mbps</span></div>
        <svg viewBox="0 0 400 130" role="img" aria-label={tr?'Ölçülen aktarım hızları zaman grafiği':'Measured transfer speed over time'} className="mt-3 w-full border-b border-white/20">
          {[32,64,96].map(y=><path key={y} d={`M0 ${y} H400`} stroke="#262626" />)}
          {(['download','upload'] as const).map(direction=><polyline key={direction} points={trace.map((p,i)=>p.direction===direction?`${i/Math.max(1,trace.length-1)*400},${125-p.mbps/max*115}`:'').filter(Boolean).join(' ')} fill="none" stroke={direction==='download'?'#ffffff':'#a3a3a3'} strokeWidth="2" strokeDasharray={direction==='upload'?'4 4':undefined}/>) }
        </svg>
        <p className="mt-3 text-xs text-neutral-400">{tr?'Grafik: anlık tarayıcı aktarımı. Upload sonucu: tamamlanan istekler.':'Chart: instantaneous browser transfer. Upload result: completed requests.'}</p>
      </div>
    </div>
    {result && <div className="border-t border-white/15 p-6 sm:p-10">
      <h3 className="text-xl font-semibold">{tr?'Bağlantı özeti':'Connection summary'}</h3>
      <p className="mt-3 text-neutral-300">{Math.max(result.loadedDownload??0,result.loadedUpload??0)-result.idle>100
        ? (tr?'Aktarım sırasında gecikme belirgin arttı. Yoğun aktarım, görüntülü görüşmeleri etkileyebilir.':'Latency rose substantially during transfer. Heavy transfers may affect calls.')
        : (tr?'Hız ve gecikme değerlerini birlikte değerlendirin; tek test bağlantının her zaman aynı davranacağını göstermez.':'Read speed and latency together; one test does not describe every network condition.')}</p>
      <p className="mt-4 font-mono text-xs text-neutral-400">{result.seconds.toFixed(1)} s · {(result.bytes/1e6).toFixed(1)} MB · {result.latencySamples} {tr?'gecikme örneği':'latency samples'} · {result.requestsFailed} {tr?'başarısız HTTP isteği':'failed HTTP requests'} · {tr?'Hız değişkenliği':'Speed variation'}: {fmt(result.stability,'%')}</p>
      {result.capped && <p className="mt-3 text-sm">{tr?'Veri sınırına ulaşıldı; ölçüm süresi kısaldı.':'Data limit reached; the measurement window was shortened.'}</p>}
      <div className="mt-6 flex flex-wrap gap-3"><button onClick={share} className="btn-primary min-h-11 rounded-full px-5">{tr?'Sonucu kopyala':'Copy result'}</button><button onClick={exportResult} className="btn-ghost min-h-11 rounded-full px-5">JSON ↓</button></div>
    </div>}
    <details className="border-t border-white/15 p-6 text-sm text-neutral-300 sm:px-10" open>
      <summary className="cursor-pointer font-semibold text-white">{tr?'Nasıl ölçülüyor?':'How is this measured?'}</summary>
      <p className="mt-4 leading-relaxed">{tr?'Gerçek HTTPS trafiği; dört paralel bağlantı, her aktarımda 1 saniye ısınma ve en çok 8 saniye ölçüm. Her yönde 256 MB veri sınırı. Gecikme HTTP gidiş-dönüş süresidir; jitter ardışık örnek farklarının ortalamasıdır. Cloudflare anycast yönlendirmesi uç noktayı seçer; belirli şehir seçimi yoktur.':'Real HTTPS traffic; four parallel connections, 1 second warmup and up to 8 seconds measurement per direction. 256 MB data cap per direction. Latency is HTTP round-trip time; jitter is the mean successive sample difference. Cloudflare anycast routing selects the edge; there is no manual city selection.'}</p>
      <p className="mt-3 leading-relaxed">{tr?'Paket kaybı: kullanılamıyor. HTTP hataları paket kaybı değildir; bu testte UDP/TURN ölçüm sunucusu bağlı değil. VPN, Wi-Fi, tarayıcı ve sunucu koşulları sonucu etkiler. Başlatmak Cloudflare’a test trafiği gönderir ve veri kotanızı kullanır.':'Packet loss: unavailable. HTTP failures are not packet loss; no UDP/TURN measurement server is connected. VPN, Wi-Fi, browser and server conditions affect results. Starting sends test traffic to Cloudflare and uses your data allowance.'}</p>
    </details>
  </section>;
}
