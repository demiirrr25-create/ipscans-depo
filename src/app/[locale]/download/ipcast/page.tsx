import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, locales } from "@/i18n/config";
import { ipcastCopy, ipcastRelease } from "@/lib/ipcast-release";

const BASE_URL = "https://ipscans.com";

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
  const copy = ipcastCopy[locale];
  const title = `${copy.downloadTitle} — IPCast`;

  return {
    title,
    description: copy.downloadSubtitle,
    alternates: {
      canonical: `/${locale}/download/ipcast`,
      languages: Object.fromEntries(locales.map((item) => [item, `/${item}/download/ipcast`])),
    },
    openGraph: {
      type: "website",
      siteName: "IPScans",
      title,
      description: copy.downloadSubtitle,
      url: `${BASE_URL}/${locale}/download/ipcast`,
    },
    twitter: { card: "summary", title, description: copy.downloadSubtitle },
  };
}

export default async function IPCastDownloadPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = ipcastCopy[locale];

  return (
    <main className="mx-auto max-w-4xl px-4 py-16 sm:py-24">
      <Link href={`/${locale}/ipcast`} className="text-sm text-neutral-400 underline underline-offset-4 hover:text-white">
        IPCast
      </Link>
      <h1 className="mt-5 font-[family-name:var(--font-display)] text-4xl font-bold text-white">
        {copy.downloadTitle}
      </h1>
      <p className="mt-3 max-w-2xl text-neutral-400">{copy.downloadSubtitle}</p>

      <dl className="mt-10 grid gap-x-8 border-y border-white/10 sm:grid-cols-2">
        {[
          [copy.versionLabel, ipcastRelease.version],
          [copy.platformLabel, ipcastRelease.platform],
          [copy.fileLabel, ipcastRelease.executable],
          [copy.sizeLabel, ipcastRelease.fileSize ?? copy.pending],
          [copy.checksumLabel, ipcastRelease.sha256 ?? copy.pending],
        ].map(([label, value]) => (
          <div key={label} className="border-b border-white/10 py-4 last:border-b-0">
            <dt className="text-xs text-neutral-500">{label}</dt>
            <dd className="mt-1 break-all font-mono text-sm text-white">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-8 border-l-2 border-white/50 pl-4">
        <p className="text-sm leading-6 text-neutral-300">{copy.availability}</p>
      </div>
      <button
        type="button"
        disabled={!ipcastRelease.published}
        className="mt-8 min-h-12 cursor-not-allowed border border-white/15 bg-white/[0.04] px-5 font-semibold text-neutral-500 disabled:opacity-100"
      >
        {copy.download}
      </button>
    </main>
  );
}