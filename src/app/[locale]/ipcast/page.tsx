import Image from "next/image";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { PageShell } from "@/components/PageShell";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { localizedAlternates } from "@/lib/seo";
import Link from "next/link";
import { IPCastReleaseDetails } from "@/components/IPCastReleaseDetails";
import { ipcastRelease } from "@/content/applications";
import { ipcastProductCopy } from "@/content/ipcast-product";
import { IPCastProductSections } from "@/components/IPCastProductSections";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale).ipcast;
  return {
    title: t.title,
    description: t.subtitle,
    alternates: localizedAlternates(locale, "/ipcast"),
    openGraph: { title: `${t.title} — IPScans`, description: t.subtitle, url: `https://ipscans.com/${locale}/ipcast` },
  };
}


export default async function IpCastPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const t = dict.ipcast;

  return (
    <PageShell title={t.title} subtitle={t.subtitle}>
      <div className="mx-auto max-w-xl">
        <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-5 sm:p-8">
          <Image src="/ipcast-mark.svg" alt="IPCast" width={72} height={72} className="mb-5" />
          <span className="inline-block rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-neutral-300">
            {t.badge}
          </span>

          <ul className="mt-6 space-y-3">
            {t.features.map((f) => (
              <li key={f} className="flex items-start gap-3 text-sm text-neutral-200">
                <svg
                  className="mt-0.5 shrink-0 text-white"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {f}
              </li>
            ))}
          </ul>

          <a
            href={ipcastRelease.url}
            aria-describedby="ipcast-release-notes"
            className="btn-primary mt-8 flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 font-semibold"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {t.button}
          </a>

          <IPCastReleaseDetails locale={locale} />
          <Link href={`/${locale}/download/ipcast`} className="mt-3 inline-block text-sm text-neutral-300 underline underline-offset-4 hover:text-white">
            {ipcastRelease.fileName}
          </Link>

          <div id="ipcast-release-notes" className="mt-5 rounded-xl border border-white/15 bg-white/5 p-4 text-sm leading-relaxed text-neutral-200">
            <p>{ipcastProductCopy[locale]?.connection ?? t.subtitle}</p>
          </div>
          <p className="mt-4 text-xs text-neutral-400">{t.note}</p>
          <p className="mt-2 text-xs text-neutral-400">{t.safe}</p>
        </div>
      </div>
      <IPCastProductSections locale={locale} />
    </PageShell>
  );
}
