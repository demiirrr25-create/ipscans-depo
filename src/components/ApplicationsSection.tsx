import Image from "next/image";
import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { applications, platformCopy } from "@/content/applications";

export function ApplicationsSection({ locale }: { locale: Locale }) {
  const copy = platformCopy[locale];

  return (
    <section id="applications" aria-labelledby="applications-title" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-20">
      <div className="mb-9">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">IPScans</p>
        <h2 id="applications-title" className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold sm:text-4xl">{copy.applications}</h2>
        <p className="mt-3 text-neutral-400">{copy.applicationsIntro}</p>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        {applications.map((app) => (
          <article key={app.id} className="flex h-full flex-col rounded-2xl border border-white/15 bg-neutral-900/70 p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <Image src={app.icon} alt="" width={56} height={56} className="rounded-xl" />
              <div>
                <h3 className="text-xl font-semibold text-white">{app.name}</h3>
                <p className="mt-1 text-sm text-neutral-300">{app.description[locale]}</p>
              </div>
            </div>
            <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-white/10 pt-5 text-sm">
              <div><dt className="text-neutral-400">{copy.version}</dt><dd className="mt-1 break-words text-white">{app.version}</dd></div>
              <div><dt className="text-neutral-400">{copy.platform}</dt><dd className="mt-1 text-white">{app.platform}</dd></div>
            </dl>
            <div className="mt-auto flex flex-wrap gap-3 pt-7">
              <Link href={`/${locale}${app.detailPath}`} className="btn-ghost inline-flex min-h-11 items-center justify-center rounded-xl px-5 font-semibold">{copy.details}</Link>
              <a href={app.downloadUrl} aria-label={`${app.name} — ${copy.downloadApp}`} className="btn-primary inline-flex min-h-11 items-center justify-center rounded-xl px-5 font-semibold">{copy.downloadApp}</a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
