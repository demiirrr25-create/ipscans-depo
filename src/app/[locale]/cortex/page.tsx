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
          url: "/cortex-1-2-rc2.png",
          width: 1265,
          height: 712,
          alt: copy.screenshotAlt,
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
    screenshot: "https://ipscans.com/cortex-1-2-rc2.png",
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
          src: "/cortex-1-2-rc2.png",
          width: 1265,
          height: 712,
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
