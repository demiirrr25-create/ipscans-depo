import Image from "next/image";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { isLocale } from "@/i18n/config";
import { localizedAlternates } from "@/lib/seo";
import type { Metadata } from "next";

const release = "https://github.com/demiirrr25-create/ipscans-depo/releases/download/cortex-v1.0.0-rc.1";
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: "IPScans Cortex — Local camera intelligence", description: "RTSP cameras, configurable event rules and local video evidence. Windows V1 release candidate.", alternates: localizedAlternates(locale, "/cortex") };
}
export default async function CortexPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const tr = locale === "tr";
  const features = tr ? [
    ["01 / GÖR", "Kameralarını bağla.", "Tam RTSP adresiyle kamera ekleme, bağlantı testi, TCP/UDP seçimi ve yerel ağda ONVIF keşfi. Düşük kare hızlı canlı önizleme."],
    ["02 / ANLA", "12 yerel kural. Tek kütüphane.", "Aydınlatma, hareket ve bölge, görüntü sağlığı, bağlantı: AI gerektirmeyen 12 kural türü. Bölge, gün/saat, eşik ve doğrulama süresini ayarla. Anlamsal olaylar için isteğe bağlı Gemma."],
    ["03 / BİLDİR", "Olayı kanıtıyla incele.", "Olay anında arşiv kaydı, örnek kare ve 12 saniyelik klip. Kayıt başarısızlığı görünür; webhook için üç denemeli kalıcı gönderim takibi."],
  ] : [
    ["01 / SEE", "Connect your cameras.", "Multiple RTSP cameras, Hikvision and Dahua URL templates, local ONVIF discovery and low-frame-rate live previews."],
    ["02 / UNDERSTAND", "12 local rules. One library.", "Lighting, motion and regions, image health and connectivity: 12 model-free rule types with regions, schedules, thresholds and confirmation durations. Optional Gemma for semantic events."],
    ["03 / NOTIFY", "Review the evidence.", "Sampled pre-event frames, a 12-second post-trigger clip, local event archive and optional HTTPS webhook notifications."],
  ];
  return <PageShell eyebrow="IPSCANS CORTEX / 1.0.0-rc.1 V1 RELEASE CANDIDATE" title={tr ? "Her kameraya bir beyin." : "A brain for every camera."} subtitle={tr ? "Neyi takip edeceğini sen söyle. Cortex gözlemlesin, olayı kaydetsin, sana bildirsin." : "Tell Cortex what to watch. Observe events, preserve evidence and get notified."}>
    <div className="mx-auto max-w-6xl">
      <div className="mb-10 flex flex-wrap items-center gap-5">
        <Image src="/cortex-mark.svg" alt="Cortex" width={64} height={64} />
        <a href={`${release}/IPScans-Cortex-1.0.0-rc.1.exe`} className="rounded-full bg-white px-8 py-4 text-sm font-medium text-black">{tr ? "Windows için indir" : "Download for Windows"} ↓</a>
        <span className="text-xs text-neutral-400">Windows 10/11 · x64 · Portable · 63.3 MB · V1 RC1</span>
      </div>
      <div className="feature-media-card mb-12"><div className="feature-media-card__bar"><span className="feature-media-card__title">IPScans Cortex</span><span className="feature-media-card__tag">12 LOCAL RULES · OPTIONAL GEMMA</span></div><div className="feature-media-card__viewport"><Image src="/cortex-preview.png" alt={tr ? "Cortex yerel paneli; test kamerası ve olay kuralı" : "Cortex local dashboard with a test camera and event rule"} width={1265} height={744} className="feature-image" priority /></div></div>
      <div className="grid gap-5 md:grid-cols-3">{features.map(([n,title,body])=><article key={n} className="agy-surface-card p-7"><span className="text-xs tracking-widest text-neutral-500">{n}</span><h2 className="my-5 text-2xl tracking-tight">{title}</h2><p className="text-sm leading-7 text-neutral-400">{body}</p></article>)}</div>
      <section className="agy-surface-card my-10 p-8 sm:p-12"><p className="text-xs tracking-widest text-neutral-500">{tr ? "BİR KURAL. BİR KAMERA. ANLAMLI BİR BİLDİRİM." : "ONE RULE. ONE CAMERA. A MEANINGFUL ALERT."}</p><blockquote className="my-8 max-w-4xl text-2xl leading-relaxed tracking-tight sm:text-3xl">{tr ? "“Asansörde biri çöp bırakıp ayrıldığında ve nesne yerde kaldığında kaydı oluştur, bana haber ver.”" : "“When someone leaves rubbish in the elevator and walks away, preserve the recording and notify me.”"}</blockquote><p className="text-sm text-neutral-400">{tr ? "Bu bir kural örneğidir. Model sonucu inceleme gerektirir; gerçek kamera koşullarında tespit doğruluğu henüz ölçülmemiştir." : "This is an example rule. Model results require review; detection accuracy has not yet been measured on real camera scenarios."}</p></section>
      <div className="grid gap-8 md:grid-cols-2"><section className="agy-surface-card p-8"><h2 className="mb-6 text-2xl">{tr ? "Üç adımda başla." : "Start in three steps."}</h2><ol className="list-decimal space-y-5 pl-5 text-sm leading-7 text-neutral-300"><li>{tr ? "EXE'yi aç. Yönetim paneli bu bilgisayarda açılır." : "Launch the EXE. The control panel opens on your computer."}</li><li>{tr ? "AI isteğe bağlı: Ollama’yı kurup aç, Cortex Ayarlar bölümünde Gemma’yı kur ve bağla düğmesine bas." : "AI is optional: install and open Ollama, then click Install and connect Gemma in Cortex Settings."}</li><li>{tr ? "Kameranı ekle, kuralını kaydet ve izlemeyi başlat." : "Add a camera, save a rule and start monitoring."}</li></ol><a className="mt-7 inline-block text-sm underline underline-offset-4" href="https://ollama.com/download">{tr ? "Ollama kurulumu" : "Install Ollama"} ↗</a></section><section className="agy-surface-card p-8"><h2 className="mb-6 text-2xl">{tr ? "Bu sürümün sınırları." : "Release candidate scope."}</h2><p className="text-sm leading-7 text-neutral-400">{tr ? "Bu bir yerel Windows uygulamasıdır; web sitesi kameralarınızı izlemez. 12 yerel kural modeli olmadan çalışır. Gemma indirme, ilerleme ve görsel yanıt testi uygulama içindedir. Bu V1 sürüm adayıdır; uzun süreli ve çok kameralı saha kabul testleri henüz tamamlanmadı. 32 kamera yapılandırılabilir, ancak analiz hızı donanıma bağlıdır. Canlı görüntü örnek karelerden oluşur. ONVIF keşfi IP adreslerini bulur; medya profili ve PTZ otomasyonu yoktur. Bulut yönetimi, Telegram/e-posta ve tam FPS video duvarı bu sürümde bulunmaz. EXE henüz kod imzalı değildir." : "This is a local Windows app; this website does not monitor cameras. 12 local rules need no model. Gemma download, progress and vision-response verification run inside the app. This is a V1 release candidate; long-duration, multi-camera field acceptance is still pending. Up to 32 cameras can be configured; analysis speed depends on hardware. Live previews use sampled frames. ONVIF discovers device addresses, without media profile or PTZ automation. Cloud management, Telegram/email and full-FPS video walls are not included. The EXE is not code-signed."}</p></section></div>
      <div className="my-10 flex flex-wrap gap-6 text-sm text-neutral-300"><a className="underline underline-offset-4" href={`${release}/Cortex-Kullanim.md`}>{tr ? "Kullanım kılavuzu" : "User guide"} ↗</a><a className="underline underline-offset-4" href="https://github.com/demiirrr25-create/ipscans-depo/releases/tag/cortex-v1.0.0-rc.1">{tr ? "Sürüm, kaynak kod ve SHA-256" : "Release, source and SHA-256"} ↗</a></div>
    </div>
  </PageShell>;
}
