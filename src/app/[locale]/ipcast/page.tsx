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
  const title = "IPCast — Remote Desktop & Support";

  return {
    title,
    description: copy.subtitle,
    alternates: {
      canonical: `/${locale}/ipcast`,
      languages: Object.fromEntries(locales.map((item) => [item, `/${item}/ipcast`])),
    },
    openGraph: {
      type: "website",
      siteName: "IPScans",
      title,
      description: copy.subtitle,
      url: `${BASE_URL}/${locale}/ipcast`,
    },
    twitter: { card: "summary", title, description: copy.subtitle },
  };
}

export default async function IPCastPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = ipcastCopy[locale];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "IPCast",
    description: copy.subtitle,
    url: `${BASE_URL}/${locale}/ipcast`,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Windows 10, Windows 11",
    softwareVersion: ipcastRelease.version,
  };

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className="relative overflow-hidden border-b border-white/10">
        <div aria-hidden="true" className="grid-bg absolute inset-0 -z-10 opacity-60" />
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:py-28 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-3xl">
            <p className="font-mono text-sm text-neutral-400">IPScans / Remote access</p>
            <h1 className="mt-5 font-[family-name:var(--font-display)] text-5xl font-bold text-white sm:text-7xl">
              {copy.title}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-neutral-300">{copy.subtitle}</p>
            <span className="mt-6 inline-flex border border-white/15 bg-white/[0.04] px-3 py-1.5 font-mono text-xs text-neutral-300">
              {copy.badge}
            </span>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/${locale}/download/ipcast`}
              className="btn-primary inline-flex min-h-12 items-center justify-center px-5 font-semibold"
            >
              {copy.download}
            </Link>
            <Link
              href={`/${locale}#applications`}
              className="btn-ghost inline-flex min-h-12 items-center justify-center px-5 font-semibold"
            >
              {copy.explore}
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-12 px-4 py-16 lg:grid-cols-[1fr_0.7fr]">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-white">
            {copy.featuresTitle}
          </h2>
          <ul className="mt-7 space-y-4">
            {copy.features.map((feature) => (
              <li key={feature} className="flex gap-3 text-sm leading-6 text-neutral-300">
                <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 bg-white" />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <aside className="border-l border-white/15 pl-6" aria-label="IPCast release information">
          <dl className="space-y-5">
            <div>
              <dt className="text-xs text-neutral-500">{copy.versionLabel}</dt>
              <dd className="mt-1 font-mono text-sm text-white">{ipcastRelease.version}</dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-500">{copy.platformLabel}</dt>
              <dd className="mt-1 text-sm text-white">{ipcastRelease.platform}</dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-500">Availability</dt>
              <dd className="mt-1 text-sm text-neutral-300">{copy.pending}</dd>
            </div>
          </dl>
          <p className="mt-7 border-t border-white/10 pt-5 text-xs leading-5 text-neutral-500">
            {copy.securityNote}
          </p>
        </aside>
      </section>
    </div>
  );
}