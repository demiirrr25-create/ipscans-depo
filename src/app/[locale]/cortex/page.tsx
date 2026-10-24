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
          url: "/cortex-preview.png",
          width: 1440,
          height: 1260,
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
  const copy = cortexCopy[locale];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "IPScans Cortex",
    applicationCategory: "SecurityApplication",
    operatingSystem: "Windows 10/11 x64",
    softwareVersion: cortexRelease.version,
    downloadUrl: cortexRelease.url,
    fileSize: `${(cortexRelease.bytes / 1_000_000).toFixed(1)} MB`,
    screenshot: "https://ipscans.com/cortex-preview.png",
    description: copy.metaDescription,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
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
          src: "/cortex-preview.png",
          width: 1440,
          height: 1260,
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
        secondaryHref={cortexRelease.guideUrl}
        secondaryExternal
        release={{
          version: cortexRelease.version,
          platform: cortexRelease.platform,
          bytes: cortexRelease.bytes,
          sha256: cortexRelease.sha256,
          releaseNotesHref: cortexRelease.guideUrl,
        }}
      />
    </>
  );
}
