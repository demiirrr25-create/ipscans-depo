import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EnterpriseProductView } from "@/components/catalog/EnterpriseProductView";
import { lprCopy } from "@/components/catalog/copy";
import { lprRelease } from "@/content/lpr-release";
import { isLocale } from "@/i18n/config";
import { localizedAlternates } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const copy = lprCopy[locale];
  return {
    title: copy.metaTitle,
    description: copy.metaDescription,
    alternates: localizedAlternates(locale, "/lpr-pro"),
    openGraph: {
      title: copy.metaTitle,
      description: copy.metaDescription,
      url: `https://ipscans.com/${locale}/lpr-pro`,
      images: [
        {
          url: "/lpr-dev4.png",
          width: 1440,
          height: 900,
          alt: copy.screenshotAlt,
        },
      ],
    },
  };
}

export default async function LprProPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = lprCopy[locale];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "IPScans LPR Pro",
    applicationCategory: "SecurityApplication",
    operatingSystem: "Windows 10/11 x64",
    softwareVersion: lprRelease.version,
    downloadUrl: lprRelease.url,
    fileSize: `${(lprRelease.bytes / 1_000_000).toFixed(1)} MB`,
    screenshot: "https://ipscans.com/lpr-dev4.png",
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
        markSrc="/lpr-mark.svg"
        markAlt="IPScans LPR Pro"
        screenshot={{
          src: "/lpr-dev4.png",
          width: 1440,
          height: 900,
        }}
        downloadHref={lprRelease.url}
        secondaryHref={lprRelease.releaseUrl}
        secondaryExternal
        release={{
          version: lprRelease.version,
          platform: "Windows 10/11 · x64",
          bytes: lprRelease.bytes,
          sha256: lprRelease.sha256,
          releaseNotesHref: lprRelease.releaseUrl,
        }}
      />
    </>
  );
}
