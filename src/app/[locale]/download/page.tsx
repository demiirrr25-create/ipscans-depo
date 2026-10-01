import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { PageShell } from "@/components/PageShell";
import { notFound } from "next/navigation";
import { ipcastRelease } from "@/content/applications";
import { IPCastReleaseDetails } from "@/components/IPCastReleaseDetails";

export default async function DownloadPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const t = dict.download;
  const ipcast = dict.ipcast;

  return (
    <PageShell title={t.title} subtitle={t.subtitle}>
      <div className="mx-auto max-w-5xl grid gap-8 md:grid-cols-2">
        {/* IPCast Remote Desktop Card */}
        <div className="rounded-3xl border border-blue-500/30 bg-blue-500/[0.03] p-8 flex flex-col justify-between">
          <div>
            <span className="inline-block rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-300">
              {ipcast.badge}
            </span>

            <h3 className="mt-4 text-xl font-bold text-white">{ipcast.title}</h3>
            <p className="mt-2 text-sm text-neutral-400">{ipcast.subtitle}</p>

            <ul className="mt-6 space-y-3">
              {ipcast.features.map((f) => (
                <li key={f} className="flex items-start gap-3 text-sm text-neutral-200">
                  <svg
                    className="mt-0.5 shrink-0 text-blue-400"
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
          </div>

          <div className="mt-8">
            <a
              href={ipcastRelease.url}
              className="btn-primary flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 font-semibold"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              {ipcast.button}
            </a>

            <IPCastReleaseDetails locale={locale} />

            <p className="mt-4 text-xs text-neutral-500">{ipcast.note}</p>
            <p className="mt-2 text-xs text-neutral-400">{ipcast.safe}</p>
          </div>
        </div>

        {/* Network Scanner Card */}
        <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-8 flex flex-col justify-between">
          <div>
            <span className="inline-block rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-neutral-300">
              {t.badge}
            </span>

            <h3 className="mt-4 text-xl font-bold text-white">{t.title}</h3>

            <ul className="mt-6 space-y-3">
              {t.features.map((f) => (
                <li key={f} className="flex items-start gap-3 text-sm text-neutral-200">
                  <svg
                    className="mt-0.5 shrink-0 text-neutral-400"
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
          </div>

          <div className="mt-8">
            <a
              href="/downloads/ipscans-network-scanner.exe"
              download
              className="btn-ghost flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 font-semibold"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              {t.button}
            </a>

            <p className="mt-4 text-xs text-neutral-500">{t.note}</p>
            <p className="mt-2 text-xs text-neutral-400">{t.safe}</p>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
