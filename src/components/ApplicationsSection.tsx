import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { applicationSectionCopy, applications } from "@/lib/applications";

export function ApplicationsSection({ locale }: { locale: Locale }) {
  const copy = applicationSectionCopy[locale];

  return (
    <section
      id="applications"
      aria-labelledby="applications-title"
      className="border-y border-white/10 bg-[#080808]"
    >
      <div className="mx-auto max-w-6xl px-4 py-20">
        <header className="max-w-2xl">
          <p className="text-xs font-semibold uppercase text-neutral-400">IPScans Platform</p>
          <h2
            id="applications-title"
            className="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold text-white sm:text-4xl"
          >
            {copy.title}
          </h2>
          <p className="mt-3 text-neutral-400">{copy.subtitle}</p>
        </header>

        <ul className="mt-10 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {applications.map((application) => {
            const item = application.copy[locale];
            const href = application.downloadAvailable
              ? application.downloadPath!
              : `/${locale}${application.detailPath}`;

            return (
              <li key={application.id}>
                <article className="flex h-full flex-col rounded-lg border border-white/10 bg-black p-5 transition-colors hover:border-white/25">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        aria-hidden="true"
                        className="grid size-11 shrink-0 place-items-center border border-white/20 bg-white/[0.04] font-mono text-sm font-semibold text-white"
                      >
                        {application.monogram}
                      </span>
                      <div>
                        <h3 className="font-semibold text-white">{application.name}</h3>
                        <p className="mt-1 text-xs text-neutral-500">{item.status}</p>
                      </div>
                    </div>
                    <span className="shrink-0 font-mono text-xs text-neutral-500">v{application.version}</span>
                  </div>

                  <p className="mt-5 min-h-12 text-sm leading-6 text-neutral-300">{item.description}</p>

                  <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
                    <span className="text-xs text-neutral-500">{application.platform}</span>
                    <Link
                      href={href}
                      aria-label={`${item.action}: ${application.name}`}
                      className="text-sm font-semibold text-white underline decoration-white/30 underline-offset-4 transition hover:decoration-white focus-visible:decoration-white"
                    >
                      {item.action}
                    </Link>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}