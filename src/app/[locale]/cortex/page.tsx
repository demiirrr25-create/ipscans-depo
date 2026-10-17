import Image from "next/image";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { isLocale } from "@/i18n/config";
import { localizedAlternates } from "@/lib/seo";
import type { Metadata } from "next";

const release = "https://github.com/demiirrr25-create/ipscans-depo/releases/download/cortex-v0.1.0";
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: "IPScans Cortex — Local camera intelligence", description: "RTSP cameras, configurable event rules and local video evidence. Windows alpha.", alternates: localizedAlternates(locale, "/cortex") };
}
export default async function CortexPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const tr = locale === "tr";
  const features = tr ? [
    ["01 / GÖR", "Kameralarını bağla.", "RTSP ile çoklu kamera bağlantısı, Hikvision ve Dahua adres şablonları, yerel ağda ONVIF cihaz keşfi. Düşük kare hızlı canlı önizleme."],
    ["02 / ANLA", "Kurallarını kendi dilinde yaz.", "Her kamera için gözlenebilir bir olay tarif et. Yerel görsel model ardışık kareleri değerlendirir; eşik ve tekrar bildirim aralığını sen belirlersin."],
    ["03 / BİLDİR", "Olayı kanıtıyla incele.", "Olay öncesi örnek kareler, tetikleme sonrası 12 saniyelik klip, yerel arşiv ve isteğe bağlı HTTPS webhook bildirimi."],
  ] : [
    ["01 / SEE", "Connect your cameras.", "Multiple RTSP cameras, Hikvision and Dahua URL templates, local ONVIF discovery and low-frame-rate live previews."],
    ["02 / UNDERSTAND", "Describe what matters.", "Configure an observable event per camera. A local vision model evaluates sequential frames with configurable score thresholds and notification cooldowns."],
    ["03 / NOTIFY", "Review the evidence.", "Sampled pre-event frames, a 12-second post-trigger clip, local event archive and optional HTTPS webhook notifications."],
  ];
  return <PageShell eyebrow="IPSCANS CORTEX / 0.1.0 ALPHA" title={tr ? "Her kameraya bir beyin." : "A brain for every camera."} subtitle={tr ? "Neyi takip edeceğini sen söyle. Cortex gözlemlesin, olayı kaydetsin, sana bildirsin." : "Tell Cortex what to watch. Observe events, preserve evidence and get notified."}>
    <div className="mx-auto max-w-6xl">
      <div className="mb-10 flex flex-wrap items-center gap-5">
        <Image src="/cortex-mark.svg" alt="Cortex" width={64} height={64} />
        <a href={`${release}/IPScans-Cortex-0.1.0.exe`} className="rounded-full bg-white px-8 py-4 text-sm font-medium text-black">{tr ? "Windows için indir" : "Download for Windows"} ↓</a>
        <span className="text-xs text-neutral-400">Windows 10/11 · x64 · Portable · 45.2 MB · Alpha</span>
      </div>
      <div className="feature-media-card mb-12"><div className="feature-media-card__bar"><span className="feature-media-card__title">IPScans Cortex</span><span className="feature-media-card__tag">LOCAL FIRST · RTSP · VISION AI</span></div><div className="feature-media-card__viewport"><Image src="/cortex-preview.png" alt={tr ? "Cortex yerel paneli; test kamerası ve olay kuralı" : "Cortex local dashboard with a test camera and event rule"} width={1265} height={744} className="feature-image" priority /></div></div>
      <div className="grid gap-5 md:grid-cols-3">{features.map(([n,title,body])=><article key={n} className="agy-surface-card p-7"><span className="text-xs tracking-widest text-neutral-500">{n}</span><h2 className="my-5 text-2xl tracking-tight">{title}</h2><p className="text-sm leading-7 text-neutral-400">{body}</p></article>)}</div>
      <section className="agy-surface-card my-10 p-8 sm:p-12"><p className="text-xs tracking-widest text-neutral-500">{tr ? "BİR KURAL. BİR KAMERA. ANLAMLI BİR BİLDİRİM." : "ONE RULE. ONE CAMERA. A MEANINGFUL ALERT."}</p><blockquote className="my-8 max-w-4xl text-2xl leading-relaxed tracking-tight sm:text-3xl">{tr ? "“Asansörde biri çöp bırakıp ayrıldığında ve nesne yerde kaldığında kaydı oluştur, bana haber ver.”" : "“When someone leaves rubbish in the elevator and walks away, preserve the recording and notify me.”"}</blockquote><p className="text-sm text-neutral-400">{tr ? "Bu bir kural örneğidir. Model sonucu inceleme gerektirir; gerçek kamera koşullarında tespit doğruluğu henüz ölçülmemiştir." : "This is an example rule. Model results require review; detection accuracy has not yet been measured on real camera scenarios."}</p></section>
      <div className="grid gap-8 md:grid-cols-2"><section className="agy-surface-card p-8"><h2 className="mb-6 text-2xl">{tr ? "Üç adımda başla." : "Start in three steps."}</h2><ol className="list-decimal space-y-5 pl-5 text-sm leading-7 text-neutral-300"><li>{tr ? "EXE'yi aç. Yönetim paneli bu bilgisayarda açılır." : "Launch the EXE. The control panel opens on your computer."}</li><li>{tr ? "Ollama'yı kur ve görsel modeli indir:" : "Install Ollama and download a vision model:"}<code className="mt-2 block rounded-xl bg-black p-3 text-xs">ollama pull gemma3:4b</code></li><li>{tr ? "Kameranı ekle, kuralını kaydet ve izlemeyi başlat." : "Add a camera, save a rule and start monitoring."}</li></ol><a className="mt-7 inline-block text-sm underline underline-offset-4" href="https://ollama.com/download">{tr ? "Ollama kurulumu" : "Install Ollama"} ↗</a></section><section className="agy-surface-card p-8"><h2 className="mb-6 text-2xl">{tr ? "Bu sürümün sınırları." : "Alpha release scope."}</h2><p className="text-sm leading-7 text-neutral-400">{tr ? "Bu bir yerel Windows uygulamasıdır; web sitesi kameralarınızı izlemez. Görsel AI modeli ayrıca kurulur. 32 kamera yapılandırılabilir, ancak analiz hızı donanıma bağlıdır. Canlı görüntü örnek karelerden oluşur. ONVIF keşfi IP adreslerini bulur; medya profili ve PTZ otomasyonu yoktur. Bulut yönetimi, Telegram/e-posta ve tam FPS video duvarı bu sürümde bulunmaz. EXE henüz kod imzalı değildir." : "This is a local Windows app; this website does not monitor cameras. Install the vision model separately. Up to 32 cameras can be configured; analysis speed depends on hardware. Live previews use sampled frames. ONVIF discovers device addresses, without media profile or PTZ automation. Cloud management, Telegram/email and full-FPS video walls are not included. The EXE is not code-signed."}</p></section></div>
      <div className="my-10 flex flex-wrap gap-6 text-sm text-neutral-300"><a className="underline underline-offset-4" href={`${release}/Cortex-Kullanim.md`}>{tr ? "Kullanım kılavuzu" : "User guide"} ↗</a><a className="underline underline-offset-4" href="https://github.com/demiirrr25-create/ipscans-depo/releases/tag/cortex-v0.1.0">{tr ? "Sürüm, kaynak kod ve SHA-256" : "Release, source and SHA-256"} ↗</a></div>
    </div>
  </PageShell>;
}
