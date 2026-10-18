import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApplicationsSection } from "@/components/ApplicationsSection";
import { PageShell } from "@/components/PageShell";
import { cortexRelease, downloadHubCopy } from "@/components/catalog/copy";
import { desktopRelease, ipcastRelease } from "@/content/applications";
import { lprRelease } from "@/content/lpr-release";
import { isLocale } from "@/i18n/config";
import { getPublicDictionary } from "@/i18n/dictionaries";
import { localizedAlternates } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const copy = downloadHubCopy[locale];
  return {
    title: `${copy.eyebrow} — IPScans`,
    description: copy.subtitle,
    alternates: localizedAlternates(locale, "/download"),
    openGraph: {
      title: `${copy.eyebrow} — IPScans`,
      description: copy.subtitle,
      url: `https://ipscans.com/${locale}/download`,
    },
  };
}

export default async function DownloadPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = downloadHubCopy[locale];
  const dict = getPublicDictionary(locale);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: copy.title,
    description: copy.subtitle,
    itemListElement: [
      {
        "@type": "SoftwareApplication",
        position: 1,
        name: "IPscans+",
        operatingSystem: "Windows 10/11 x64",
        applicationCategory: "UtilitiesApplication",
        softwareVersion: desktopRelease.scanner.version,
        downloadUrl: desktopRelease.scanner.installerUrl,
        url: `https://ipscans.com/${locale}/applications/scanner`,
      },
      {
        "@type": "SoftwareApplication",
        position: 2,
        name: "IPCast",
        operatingSystem: "Windows 10/11 x64",
        applicationCategory: "CommunicationApplication",
        softwareVersion: ipcastRelease.version,
        downloadUrl: ipcastRelease.installerUrl,
        url: `https://ipscans.com/${locale}/applications/ipcast`,
      },
      {
        "@type": "SoftwareApplication",
        position: 3,
        name: "IPScans LPR Pro",
        operatingSystem: "Windows 10/11 x64",
        applicationCategory: "SecurityApplication",
        softwareVersion: lprRelease.version,
        downloadUrl: lprRelease.url,
        url: `https://ipscans.com/${locale}/lpr-pro`,
      },
      {
        "@type": "SoftwareApplication",
        position: 4,
        name: "IPScans Cortex",
        operatingSystem: "Windows 10/11 x64",
        applicationCategory: "SecurityApplication",
        softwareVersion: cortexRelease.version,
        downloadUrl: cortexRelease.url,
        url: `https://ipscans.com/${locale}/cortex`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PageShell
        eyebrow={copy.eyebrow}
        title={copy.title}
        subtitle={copy.subtitle}
      >
        <ApplicationsSection locale={locale} dict={dict} primary />
      </PageShell>
    </>
  );
}
