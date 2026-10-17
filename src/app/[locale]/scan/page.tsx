import { uiText } from "@/i18n/ui";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { PageShell } from "@/components/PageShell";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { localizedAlternates } from "@/lib/seo";
import { scannerApplication, platformCopy } from "@/content/applications";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale).scan;
  return {
    title: t.title,
    description: t.subtitle,
    alternates: localizedAlternates(locale, "/scan"),
  };
}

const COMMON_PORTS = [
  { port: 20, name: "FTP (data)" },
  { port: 21, name: "FTP" },
  { port: 22, name: "SSH" },
  { port: 25, name: "SMTP" },
  { port: 53, name: "DNS" },
  { port: 80, name: "HTTP" },
  { port: 110, name: "POP3" },
  { port: 143, name: "IMAP" },
  { port: 443, name: "HTTPS" },
  { port: 3306, name: "MySQL" },
  { port: 3389, name: "RDP" },
  { port: 8080, name: "HTTP-alt" },
];

export default async function ScanPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  return (
    <PageShell title={dict.scan.title} subtitle={dict.scan.subtitle}>
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="agy-surface-card p-7 sm:p-10">
          <p className="body leading-relaxed text-neutral-200">
            {dict.scan.body}
          </p>

          <div className="mt-6 rounded-2xl border border-white/15 bg-[#18191e] p-5 text-sm text-neutral-200">
            {dict.scan.disclaimer}
          </div>

          <div className="mt-8 flex flex-col items-start justify-between gap-4 rounded-2xl border border-white/10 bg-[#18191e] p-6 sm:flex-row sm:items-center">
            <div>
              <h2 className="heading-6 text-white">IPscans+</h2>
              <p className="mt-1 text-sm text-neutral-400">
                {scannerApplication.description[locale]}
              </p>
            </div>
            <Link
              href={`/${locale}/download`}
              className="button button-primary shrink-0"
            >
              <span>{platformCopy[locale].downloadApp} IPscans+</span>
            </Link>
          </div>
        </div>

        <section className="agy-surface-card p-7 sm:p-10">
          <h2 className="heading-5">
            {uiText(locale, "Common Ports", "Yaygın Portlar")}
          </h2>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {COMMON_PORTS.map((p) => (
              <div key={p.port} className="agy-port-pill">
                <div className="font-mono text-lg font-semibold text-white">
                  {p.port}
                </div>
                <div className="mt-1 text-sm text-neutral-400">{p.name}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </PageShell>
  );
}
