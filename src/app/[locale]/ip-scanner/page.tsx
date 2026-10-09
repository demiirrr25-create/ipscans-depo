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

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return {
    title: "IPscans+ 4.0 — Network Observatory",
    description: scannerApplication.description[locale],
    alternates: {
      canonical: `/${locale}/ip-scanner`,
      languages: {
        ...Object.fromEntries(locales.map((l) => [l, `/${l}/ip-scanner`])),
        "x-default": `/${defaultLocale}/ip-scanner`,
      },
    },
    openGraph: { title: "IPscans+ | IPScans", description: scannerApplication.description[locale], url: `https://ipscans.com/${locale}/ip-scanner` },
    twitter: { title: "IPscans+ | IPScans", description: scannerApplication.description[locale] },
  };
}

export default async function IpScannerPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "IPScans", item: `https://ipscans.com/${locale}` },
      { "@type": "ListItem", position: 2, name: "IPscans+", item: `https://ipscans.com/${locale}/ip-scanner` },
    ],
  };
  return (
    <PageShell title="IPscans+" subtitle={scannerApplication.description[locale]}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      <div className="mx-auto max-w-7xl px-4"><ScannerV4 locale={locale} /></div>
      <div className="mx-auto max-w-4xl space-y-12 pb-12">
        <div className="flex flex-wrap gap-3">
          <Link href={`/${locale}/applications/scanner`} className="btn-primary inline-flex min-h-12 items-center rounded-xl px-6 font-semibold">{platformCopy[locale].details} ↗</Link>
          <Link href={toolPath("ipLookup", locale)} className="btn-ghost inline-flex min-h-12 items-center rounded-xl px-6 font-semibold">{dict.nav.ipLookup}</Link>
        </div>
        <section className="grid gap-px border border-white/15 bg-white/15 sm:grid-cols-3">
          {["Network Discovery", "Network Map", "Device Control Panel"].map((name, index) =>
            <div key={name} className="bg-black p-7"><span className="font-mono text-xs text-neutral-400">0{index + 1} / IPscans+</span>
              <h2 className="mt-6 text-xl font-bold">{name}</h2></div>)}
        </section>
        <p className="rounded-xl border border-white/15 p-6 leading-relaxed text-neutral-300">{scannerCopy[locale].mapIntro}</p>
        <p className="border-t border-white/15 pt-6 text-sm leading-relaxed text-neutral-400">{scannerCopy[locale].limitations}</p>
      </div>
    </PageShell>
  );
}
