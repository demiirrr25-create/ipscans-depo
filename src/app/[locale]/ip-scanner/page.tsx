import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, locales, defaultLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { PageShell } from "@/components/PageShell";
import { toolPath } from "@/lib/tool-routes";
import { scannerApplication, platformCopy } from "@/content/applications";
import { scannerCopy } from "@/content/scanner";
import { ScannerV4 } from "@/components/ScannerV4";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return {
    title: "IPscans+ 4.3 — Network Intelligence",
    description: scannerApplication.description[locale],
    alternates: {
      canonical: `/${locale}/ip-scanner`,
      languages: {
        ...Object.fromEntries(locales.map((l) => [l, `/${l}/ip-scanner`])),
        "x-default": `/${defaultLocale}/ip-scanner`,
      },
    },
    openGraph: {
      title: "IPscans+ | IPScans",
      description: scannerApplication.description[locale],
      url: `https://ipscans.com/${locale}/ip-scanner`,
    },
    twitter: {
      title: "IPscans+ | IPScans",
      description: scannerApplication.description[locale],
    },
  };
}

export default async function IpScannerPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "IPScans",
        item: `https://ipscans.com/${locale}`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "IPscans+",
        item: `https://ipscans.com/${locale}/ip-scanner`,
      },
    ],
  };
  return (
    <PageShell
      title="IPscans+"
      subtitle={scannerApplication.description[locale]}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <ScannerV4 locale={locale} />
      <div className="mt-12 space-y-10 pb-8">
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/${locale}/applications/scanner`}
            className="button button-primary"
          >
            <span>{platformCopy[locale].details} ↗</span>
          </Link>
          <Link
            href={toolPath("ipLookup", locale)}
            className="button button-secondary"
          >
            <span>{dict.nav.ipLookup}</span>
          </Link>
        </div>
        <section className="grid gap-5 sm:grid-cols-3">
          {["Network Discovery", "Network Map", "Device Control Panel"].map(
            (name, index) => (
              <div key={name} className="agy-surface-card p-7">
                <span className="agy-eyebrow">0{index + 1} / IPscans+</span>
                <h2 className="heading-5 mt-5">{name}</h2>
              </div>
            )
          )}
        </section>
        <div className="agy-surface-card p-7">
          <p className="body text-neutral-200">{scannerCopy[locale].mapIntro}</p>
          <p className="mt-5 border-t border-white/10 pt-5 text-sm leading-relaxed text-neutral-400">
            {scannerCopy[locale].limitations}
          </p>
        </div>
      </div>
    </PageShell>
  );
}
