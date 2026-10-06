import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isLocale, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { applications, ipcastRelease, platformCopy } from "@/content/applications";
import { localizedAlternates } from "@/lib/seo";

type Params = { params: Promise<{ locale: string; id: string }> };

export function generateStaticParams() {
  return locales.flatMap((locale) => applications.map((app) => ({ locale, id: app.id })));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale, id } = await params;
  if (!isLocale(locale)) return {};
  const app = applications.find((item) => item.id === id);
  if (!app) return {};
  return {
    title: app.name,
    description: app.description[locale],
    alternates: localizedAlternates(locale, `/applications/${app.id}`),
  };
}

export default async function ApplicationDetail({ params }: Params) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  const app = applications.find((item) => item.id === id);
  if (!app) notFound();

  const dict = getDictionary(locale);
  const copy = platformCopy[locale];
  const features = app.id === "ipcast" ? dict.ipcast.features
    : app.id === "scanner" ? dict.download.features
    : dict.pro.plans[0].features;
  const intro = app.id === "ipcast" ? dict.ipcast.subtitle
    : app.id === "scanner" ? dict.experience.scanner.intro
    : dict.pro.subtitle;
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:py-20">
      <Link href={`/${locale}/download`} className="text-sm text-neutral-300 underline underline-offset-4 hover:text-white">← {copy.applications}</Link>
      <div className="mt-10 grid gap-10 border-y border-white/15 py-12 lg:grid-cols-[1.3fr_1fr] lg:gap-20 lg:py-20">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-neutral-400">IPScans / {app.id} / Windows</p>
          <Image src={app.icon} alt="" width={96} height={96} className="mt-8 rounded-2xl" />
          <h1 className="mt-8 font-[family-name:var(--font-display)] text-[clamp(3.5rem,8vw,7rem)] leading-none font-semibold tracking-[-0.07em]">{app.name}<span className="text-neutral-500">.</span></h1>
          <p className="mt-7 max-w-xl text-xl leading-relaxed text-neutral-300">{app.description[locale]}</p>
          <p className="mt-5 max-w-xl leading-relaxed text-neutral-400">{intro}</p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <a href={app.downloadUrl} className="btn-primary inline-flex min-h-12 items-center rounded-lg px-6 text-sm font-semibold">{copy.downloadApp} ↓</a>
            {app.id !== "scanner" && <Link href={`/${locale}${app.detailPath}`} className="btn-ghost inline-flex min-h-12 items-center rounded-lg px-6 text-sm">{copy.details} ↗</Link>}
          </div>
        </div>
        <aside className="border-t border-white/15 pt-8 lg:border-s lg:border-t-0 lg:ps-10 lg:pt-0">
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">{app.name} / {copy.details}</h2>
          <ul className="mt-7 space-y-4">
            {features.map((feature) => <li key={feature} className="flex gap-4 border-b border-white/10 pb-4 text-sm leading-relaxed text-neutral-300"><span aria-hidden="true" className="text-white">↗</span>{feature}</li>)}
          </ul>
          <dl className="mt-8 grid grid-cols-2 gap-5 font-mono text-xs">
            <div><dt className="text-neutral-400">{copy.platform}</dt><dd className="mt-2">{app.platform}</dd></div>
            <div><dt className="text-neutral-400">{copy.version}</dt><dd className="mt-2">{app.version}</dd></div>
            {app.id === "ipcast" && <div><dt className="text-neutral-400">{copy.size}</dt><dd className="mt-2">{(ipcastRelease.bytes / 1024 / 1024).toFixed(1)} MB</dd></div>}
          </dl>
          <p className="mt-8 text-sm leading-relaxed text-neutral-400">{app.id === "scanner" ? dict.download.note : app.id === "ipcast" ? dict.ipcast.note : dict.pro.note}</p>
        </aside>
      </div>
    </div>
  );
}
