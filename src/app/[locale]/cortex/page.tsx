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
          url: "/cortex-3-overview.png",
          width: 830,
          height: 916,
          alt: copy.screenshotAlt,
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
    eyebrow: locale === "tr" ? "Cortex 3.0 · Bir ipscans.com projesi" : "Cortex 3.0 · An ipscans.com project",
    name: "IPScans Cortex 3",
    headline: locale === "tr" ? "Sahanın sessiz enstrümanı." : "A quiet instrument for the floor.",
    lead: locale === "tr"
      ? "Kameralar bu bilgisayarda kalır. Canlı izleme, kurallar ve arşiv tek bir sade masada. Yönetim merkezi de aynı dilde."
      : "Cameras stay on this computer. Live view, rules, and archive share one quiet desk. The administration center speaks the same language.",
    screenshotAlt: locale === "tr" ? "Cortex 3.0 giriş ekranı" : "Cortex 3.0 sign-in",
    screenshotCaption: locale === "tr" ? "Cortex 3.0: gece stüdyosu girişi, sıcak kâğıt form, tek fosfor işaret." : "Cortex 3.0: night-studio sign-in, warm paper form, one phosphor mark.",
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
    screenshot: "https://ipscans.com/cortex-3-overview.png",
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
          src: "/cortex-3-overview.png",
          width: 830,
          height: 916,
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
      <section className="border-t border-line bg-surface py-14">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-6 px-6">
          <div><p className="text-xs uppercase tracking-widest text-muted">IPSCANS.COM / CORTEX 2.5</p><h2 className="mt-3 text-3xl font-medium tracking-tight">{locale === "tr" ? "Tarayıcı kapanır. Cortex çalışmaya devam eder." : "Close the browser. Cortex keeps working."}</h2><p className="mt-3 max-w-2xl text-muted">{locale === "tr" ? "Windows açılışında arka planda başlatma, sade canlı izleme ve ortak bir yönetim tasarımı. Bir ipscans.com projesi." : "Background startup at Windows boot, clear live monitoring and a consistent administration experience. A project by ipscans.com."}</p></div>
          <a href={`/${locale}/cortex/admin`} className="rounded-full border border-line px-6 py-3 font-medium">{locale === "tr" ? "Yönetim merkezi ↗" : "Administration ↗"}</a>
        </div>
      </section>
      <section id="plans" className="border-t border-line bg-surface py-20 scroll-mt-24">
        <div className="mx-auto max-w-7xl px-6">
          <p className="text-xs font-semibold tracking-[0.18em] text-muted">CORTEX / {locale === "tr" ? "PAKET KARŞILAŞTIRMASI" : "COMPARE PLANS"}</p>
          <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight sm:text-5xl">{locale === "tr" ? "Sahanız büyüsün. Kontrol sizde kalsın." : "Let your site grow. Stay in control."}</h2>
          <p className="mt-5 max-w-2xl text-muted">{locale === "tr" ? "Üç paket, net kapasite sınırları. Mevcut sürümde tüm paketler Cortex’in çalıştığı bilgisayarın açık olmasını gerektirir." : "Three plans with clear capacity limits. All plans in this release require the computer running Cortex to remain on."}</p>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {[
              {name:"PRO", cameras:4, rules:8, days:7, tr:["Yerel kurallar ve geçiş kontrolü", "Bölge çizim stüdyosu", "Telegram bildirimleri", "Site ve perakende paketleri"], en:["Local rules and crossing detection", "Region drawing studio", "Telegram alerts", "Residential and retail packs"]},
              {name:"PLUS", cameras:12, rules:32, days:15, tr:["PRO özelliklerinin tamamı", "Ollama görsel AI ve akıllı takip", "İki yönlü Telegram ve kanıt ZIP", "9 sektör paketi"], en:["Everything in PRO", "Ollama vision AI and smart tracking", "Two-way Telegram and evidence ZIP", "9 sector packs"]},
              {name:"ULTRA", cameras:32, rules:128, days:30, tr:["PLUS özelliklerinin tamamı", "Copilot arama ve gizlilik maskeleme", "İmzalı webhook ve denetim izi", "NVR filo yönetimi ve 10 sektör"], en:["Everything in PLUS", "Copilot search and privacy masking", "Signed webhooks and audit trail", "NVR fleet management and 10 sectors"]},
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
