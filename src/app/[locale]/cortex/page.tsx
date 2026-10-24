import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EnterpriseProductView } from "@/components/catalog/EnterpriseProductView";
import { cortexCopy, cortexRelease } from "@/components/catalog/copy";
import { isLocale } from "@/i18n/config";
import { localizedAlternates } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const copy = cortexCopy[locale];
  return {
    title: copy.metaTitle,
    description: copy.metaDescription,
    alternates: localizedAlternates(locale, "/cortex"),
    openGraph: {
      title: copy.metaTitle,
      description: copy.metaDescription,
      url: `https://ipscans.com/${locale}/cortex`,
      images: [
        {
          url: "/cortex-2-1-plans.png",
          width: 1271,
          height: 1437,
          alt: copy.screenshotAlt,
        },
        {
          url: "/cortex-studio-preview.png",
          width: 1440,
          height: 1260,
          alt: "IPScans Cortex 2.0 Pro ROI & Tripwire Calibration Studio",
        },
      ],
    },
  };
}

export default async function CortexPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = {...cortexCopy[locale],
    closing: {...cortexCopy[locale].closing, secondaryCta: locale === "tr" ? "Paketleri karşılaştır" : "Compare plans"},
    secondaryCta: locale === "tr" ? "Paketleri karşılaştır" : "Compare plans",
    screenshotAlt: locale === "tr" ? "Cortex 2.3 PRO, PLUS ve ULTRA paket karşılaştırması" : "Cortex 2.3 PRO, PLUS and ULTRA plan comparison",
    screenshotCaption: locale === "tr" ? "Paket kapasitesi, kullanım göstergeleri ve Ultra ayrıcalıkları tek ekranda. Bulut çalışma henüz sunulmuyor." : "Plan capacity, usage and Ultra benefits in one view. Cloud processing is not available yet.",
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "IPScans Cortex",
    applicationCategory: "SecurityApplication",
    operatingSystem: "Windows 10/11 x64",
    softwareVersion: cortexRelease.version,
    downloadUrl: cortexRelease.url,
    fileSize: `${(cortexRelease.bytes / 1_000_000).toFixed(1)} MB`,
    screenshot: "https://ipscans.com/cortex-2-1-plans.png",
    description: copy.metaDescription,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <EnterpriseProductView
        locale={locale}
        copy={copy}
        markSrc="/cortex-mark.svg"
        markAlt="IPScans Cortex"
        screenshot={{
          src: "/cortex-2-1-plans.png",
          width: 1271,
          height: 1437,
        }}
        secondaryScreenshot={{
          src: "/cortex-studio-preview.png",
          width: 1440,
          height: 1260,
          alt:
            locale === "tr"
              ? "IPScans Cortex 2.0 Pro Profesyonel 8-Tutamaçlı Bölge (ROI) ve Geçiş Hattı (Tripwire) Çizim Stüdyosu"
              : "IPScans Cortex 2.0 Pro Professional 8-Handle ROI & Tripwire Calibration Studio",
          caption:
            locale === "tr"
              ? "Profesyonel 8-Tutamaçlı Bölge (ROI) ve Geçiş Hattı (Tripwire) Çizim Stüdyosu: Canlı kamera akışı üzerinde sürükle-taşı, 8 noktalı hassas boyutlandırma, ±% doğrulama bandı ve hazır bölge/zaman şablonları."
              : "Professional 8-Handle ROI & Tripwire Calibration Studio: drag-to-pan, 8-point resize handles, ±% verification band, and one-click spatial/schedule presets over live RTSP streams.",
        }}
        downloadHref={cortexRelease.url}
        secondaryHref="#plans"
        release={{
          version: cortexRelease.version,
          platform: cortexRelease.platform,
          bytes: cortexRelease.bytes,
          sha256: cortexRelease.sha256,
          releaseNotesHref: cortexRelease.guideUrl,
        }}
      />
      <section id="plans" className="border-t border-line bg-surface py-20 scroll-mt-24">
        <div className="mx-auto max-w-7xl px-6">
          <p className="text-xs font-semibold tracking-[0.18em] text-muted">CORTEX / {locale === "tr" ? "PAKET KARŞILAŞTIRMASI" : "COMPARE PLANS"}</p>
          <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight sm:text-5xl">{locale === "tr" ? "Sahanız büyüsün. Kontrol sizde kalsın." : "Let your site grow. Stay in control."}</h2>
          <p className="mt-5 max-w-2xl text-muted">{locale === "tr" ? "Üç paket, net kapasite sınırları. Mevcut sürümde tüm paketler Cortex’in çalıştığı bilgisayarın açık olmasını gerektirir." : "Three plans with clear capacity limits. All plans in this release require the computer running Cortex to remain on."}</p>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {[
              {name:"PRO", cameras:4, rules:8, days:7, tr:["Yerel kurallar ve geçiş kontrolü", "Bölge çizim stüdyosu", "Telegram bildirimleri", "Site ve perakende paketleri"], en:["Local rules and crossing detection", "Region drawing studio", "Telegram alerts", "Residential and retail packs"]},
              {name:"PLUS", cameras:12, rules:32, days:15, tr:["PRO özelliklerinin tamamı", "Ollama görsel AI ve akıllı takip", "İki yönlü Telegram ve kanıt ZIP", "7 sektör paketi"], en:["Everything in PRO", "Ollama vision AI and smart tracking", "Two-way Telegram and evidence ZIP", "7 sector packs"]},
              {name:"ULTRA", cameras:32, rules:128, days:30, tr:["PLUS özelliklerinin tamamı", "Copilot arama ve gizlilik maskeleme", "İmzalı webhook ve denetim izi", "NVR filo yönetimi ve 8 sektör"], en:["Everything in PLUS", "Copilot search and privacy masking", "Signed webhooks and audit trail", "NVR fleet management and 8 sectors"]},
            ].map(plan => <article key={plan.name} className={`flex flex-col rounded-3xl border p-7 ${plan.name === "ULTRA" ? "border-blue-500 bg-blue-500/5" : "border-line"}`}>
              <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-sm font-semibold tracking-widest">CORTEX {plan.name}</h3>{plan.name === "ULTRA" && <span className="rounded-full border border-blue-500 px-3 py-1 text-xs">{locale === "tr" ? "En kapsamlı" : "Most complete"}</span>}</div>
              <p className="mt-8 text-6xl font-semibold tracking-tight">{plan.cameras}<span className="ml-2 text-base font-normal text-muted">{locale === "tr" ? "kamera" : "cameras"}</span></p>
              <p className="mt-5 border-y border-line py-4 text-sm">{plan.rules} {locale === "tr" ? "kural" : "rules"} · {plan.days} {locale === "tr" ? "gün olay arşivi" : "days of event history"}</p>
              <ul className="my-6 flex-1 space-y-4 text-sm">{(locale === "tr" ? plan.tr : plan.en).map(item=><li key={item} className="flex gap-3"><span aria-hidden="true" className="text-blue-500">✓</span>{item}</li>)}</ul>
              <a href={`/${locale}/contact`} className="rounded-xl border border-line px-5 py-3 text-center text-sm font-medium transition-colors hover:bg-blue-500/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-500">{locale === "tr" ? "Paket hakkında bilgi alın" : "Ask about this plan"} ↗</a>
            </article>)}
          </div>
          <div className="mt-7 rounded-2xl border border-dashed border-line p-7">
            <p className="text-xs font-semibold tracking-widest">ULTRA / {locale === "tr" ? "PLANLANAN · HENÜZ SUNULMUYOR" : "PLANNED · NOT AVAILABLE YET"}</p>
            <h3 className="mt-3 text-2xl font-semibold">{locale === "tr" ? "Bilgisayar kapalıyken bulutta çalışma" : "Cloud processing while your PC is off"}</h3>
            <p className="mt-3 max-w-4xl text-sm leading-7 text-muted">{locale === "tr" ? "Bu özellik mevcut Ultra lisansıyla aktif hale gelmez. Ayrı bulut sunucusu ve kameralara bilgisayardan bağımsız erişim gerektirir; bu sürümde henüz sunulmuyor. Google Drive veya Google One depolama aboneliği, analiz sunucusunun yerine geçmez." : "This feature is not activated by a current Ultra license. It needs a separate cloud server and camera access independent of your PC; it is not available in this release. Google Drive or Google One storage does not replace an analysis server."}</p>
          </div>
          <p className="mt-5 text-xs leading-6 text-muted">{locale === "tr" ? "Arşiv süreleri olay kanıtları içindir; kesintisiz NVR kaydı değildir. Gerçek analiz kapasitesi donanımınıza, modelinize ve kamera akışına bağlıdır. Paket fiyatı ve lisans koşulları için iletişime geçin." : "Retention applies to event evidence, not continuous NVR recording. Analysis capacity depends on hardware, model and camera streams. Contact us for pricing and license terms."}</p>
        </div>
      </section>
    </>
  );
}
