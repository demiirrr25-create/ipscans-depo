import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApplicationsSection } from "@/components/ApplicationsSection";
import { PageShell } from "@/components/PageShell";
import apps from "../../../../public/desktop/apps.json";
import { downloadHubCopy } from "@/components/catalog/copy";
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
    itemListElement: apps.map((app, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "SoftwareApplication",
        name: app.name,
        operatingSystem: "Windows x64",
        softwareVersion: app.version,
        ...(app.download ? { downloadUrl: app.download } : {}),
        url: `https://ipscans.com/desktop/${locale === "tr" ? "tr" : "en"}.html#${app.id}`,
      },
    })),
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
        <a className="btn btn-primary mb-8" href={`/desktop/${locale === "tr" ? "tr" : "en"}.html`}>
          {locale === "tr" ? "Rust ön sürümü · 8 Windows uygulaması" : "Rust prerelease · 8 Windows applications"}
        </a>
        <ApplicationsSection locale={locale} dict={dict} primary />
      </PageShell>
    </>
  );
}
