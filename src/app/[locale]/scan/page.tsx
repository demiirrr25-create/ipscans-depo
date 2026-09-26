import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { PageShell } from "@/components/PageShell";
import { notFound } from "next/navigation";
import Link from "next/link";

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
      <div className="mx-auto max-w-3xl">
        <p className="text-neutral-300 leading-relaxed">{dict.scan.body}</p>

        <div className="mt-6 rounded-lg border border-white/25 bg-white/10 px-4 py-3 text-sm text-neutral-100">
          {dict.scan.disclaimer}
        </div>

        <div className="mt-8 flex flex-col items-start justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-white">
              {dict.download.title}
            </h2>
            <p className="mt-1 text-sm text-neutral-400">
              {dict.download.subtitle}
            </p>
          </div>
          <Link
            href={`/${locale}/download`}
            className="btn-primary shrink-0 rounded-xl px-5 py-2.5 text-sm font-semibold"
          >
            {dict.download.button}
          </Link>
        </div>

        <h2 className="mt-10 text-xl font-semibold">
          {locale === "tr" ? "Yaygın Portlar" : "Common Ports"}
        </h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {COMMON_PORTS.map((p) => (
            <div
              key={p.port}
              className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3"
            >
              <div className="font-mono text-lg font-semibold text-white">
                {p.port}
              </div>
              <div className="text-sm text-neutral-400">{p.name}</div>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
