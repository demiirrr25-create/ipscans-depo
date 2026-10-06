import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, locales, defaultLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { PageShell } from "@/components/PageShell";
import { toolPath } from "@/lib/tool-routes";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale).experience.scanner;
  return {
    title: "IP Scanner",
    description: t.intro,
    alternates: {
      canonical: `/${locale}/ip-scanner`,
      languages: {
        ...Object.fromEntries(locales.map((l) => [l, `/${l}/ip-scanner`])),
        "x-default": `/${defaultLocale}/ip-scanner`,
      },
    },
    openGraph: { title: "IP Scanner | IPScans", description: t.intro, url: `https://ipscans.com/${locale}/ip-scanner` },
    twitter: { title: "IP Scanner | IPScans", description: t.intro },
  };
}

export default async function IpScannerPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const t = dict.experience.scanner;
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "IPScans", item: `https://ipscans.com/${locale}` },
      { "@type": "ListItem", position: 2, name: "IP Scanner", item: `https://ipscans.com/${locale}/ip-scanner` },
    ],
  };
  return (
    <PageShell title="IP Scanner" subtitle={t.intro}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      <div className="mx-auto max-w-3xl space-y-12 pb-12">
        <div className="flex flex-wrap gap-3">
          <Link href={`/${locale}/download`} className="btn-primary inline-flex min-h-12 items-center rounded-xl px-6 font-semibold">{dict.download.button}</Link>
          <Link href={toolPath("ipLookup", locale)} className="btn-ghost inline-flex min-h-12 items-center rounded-xl px-6 font-semibold">{dict.nav.ipLookup}</Link>
        </div>
        <section><h2 className="text-2xl font-bold">{t.whatTitle}</h2><p className="mt-4 leading-relaxed text-neutral-300">{t.whatBody}</p></section>
        <section><h2 className="text-2xl font-bold">{t.howTitle}</h2><p className="mt-4 leading-relaxed text-neutral-300">{t.howBody}</p></section>
        <section><h2 className="text-2xl font-bold">{t.stepsTitle}</h2>
          <ol className="mt-5 grid gap-4">
            {t.steps.map((step, index) => <li key={step} className="flex gap-4 rounded-xl border border-white/15 bg-white/[0.03] p-5"><span className="font-mono text-neutral-400">0{index + 1}</span><span>{step}</span></li>)}
          </ol>
        </section>
        <section><h2 className="text-2xl font-bold">{t.downloadTitle}</h2><p className="mt-4 leading-relaxed text-neutral-300">{t.downloadBody}</p>
          <Link href={`/${locale}/download`} className="mt-5 inline-block underline underline-offset-4">{dict.download.button} ↗</Link>
        </section>
        <section className="rounded-xl border border-white/20 p-6"><h2 className="text-xl font-bold">{t.safetyTitle}</h2><p className="mt-3 text-sm leading-relaxed text-neutral-300">{t.safetyBody}</p></section>
      </div>
    </PageShell>
  );
}
