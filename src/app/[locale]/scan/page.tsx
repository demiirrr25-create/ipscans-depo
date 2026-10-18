import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { PageShell } from "@/components/PageShell";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { localizedAlternates } from "@/lib/seo";
import { scannerApplication, platformCopy } from "@/content/applications";
import { toolCopy } from "@/components/tools/copy";
import { toolPath } from "@/lib/tool-routes";
import { Icon, type IconName } from "@/components/ds/Icon";
import { Reveal } from "@/components/ds/Reveal";
import { SectionHeader, DownloadStage } from "@/components/ds/product";

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
  { port: 20, name: "FTP (data)", proto: "TCP" },
  { port: 21, name: "FTP", proto: "TCP" },
  { port: 22, name: "SSH", proto: "TCP" },
  { port: 25, name: "SMTP", proto: "TCP" },
  { port: 53, name: "DNS", proto: "TCP / UDP" },
  { port: 80, name: "HTTP", proto: "TCP" },
  { port: 110, name: "POP3", proto: "TCP" },
  { port: 143, name: "IMAP", proto: "TCP" },
  { port: 443, name: "HTTPS", proto: "TCP" },
  { port: 3306, name: "MySQL", proto: "TCP" },
  { port: 3389, name: "RDP", proto: "TCP" },
  { port: 8080, name: "HTTP-alt", proto: "TCP" },
] as const;

const CONCEPT_ICONS: IconName[] = ["network", "plug", "server", "lock"];

export default async function ScanPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const copy = toolCopy[locale];
  const platform = platformCopy[locale];

  return (
    <PageShell
      eyebrow={copy.scan.eyebrow}
      title={dict.scan.title}
      subtitle={dict.scan.subtitle}
      actions={
        <>
          <Link href={`/${locale}/applications/scanner`} className="btn btn-primary">
            <span>{copy.more.desktopCta}</span>
            <Icon name="arrowRight" size={16} className="btn-arrow rtl-flip" />
          </Link>
          <Link href={toolPath("ports", locale)} className="btn btn-secondary">
            <Icon name="plug" size={16} />
            <span>{dict.ports.title}</span>
          </Link>
        </>
      }
    >
      <div className="space-y-20 sm:space-y-28">
        {/* Intro & Responsible Scanning Callout */}
        <Reveal className="ds-card p-7 sm:p-10">
          <p className="ds-lead max-w-[820px] text-ink">{dict.scan.body}</p>

          <div className="mt-8 rounded-lg border border-warn/30 bg-warn-soft/65 p-6 sm:p-7">
            <div className="flex items-start gap-3.5">
              <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-warn/15 text-warn">
                <Icon name="shield" size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="ds-h4 text-ink">{copy.scan.safetyTitle}</h2>
                <p className="ds-body mt-2 text-ink">{dict.scan.disclaimer}</p>
                <ul className="mt-4 grid gap-2.5 sm:grid-cols-3">
                  {copy.scan.principles.map((principle, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2.5 rounded-md border border-line bg-surface/90 p-3.5 text-sm text-ink-2"
                    >
                      <Icon
                        name="check"
                        size={16}
                        className="mt-0.5 shrink-0 text-ok"
                      />
                      <span>{principle}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </Reveal>

        {/* Core Concepts */}
        <section>
          <SectionHeader
            eyebrow={copy.scan.eyebrow}
            title={copy.scan.conceptsTitle}
          />
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {copy.scan.concepts.map((concept, i) => {
              const iconName = CONCEPT_ICONS[i % CONCEPT_ICONS.length];
              return (
                <Reveal
                  key={concept.title}
                  delay={(i % 2) * 80}
                  className="ds-card ds-card-interactive p-7 sm:p-8"
                >
                  <span className="mb-6 grid size-11 place-items-center rounded-[13px] bg-signal-soft text-signal">
                    <Icon name={iconName} size={20} />
                  </span>
                  <h3 className="ds-h4 text-ink">{concept.title}</h3>
                  <p className="ds-body mt-3">{concept.body}</p>
                </Reveal>
              );
            })}
          </div>
        </section>

        {/* How a Scan Works (3 Steps) */}
        <section>
          <SectionHeader title={copy.scan.stepsTitle} />
          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {copy.scan.steps.map((step, i) => (
              <Reveal
                key={step.title}
                delay={i * 90}
                className="ds-card p-7 sm:p-8"
              >
                <div className="mb-6 flex items-center justify-between">
                  <span className="ds-mono inline-flex h-8 items-center rounded-full bg-signal-soft px-3 text-xs font-semibold text-signal">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="ds-h4 text-ink">{step.title}</h3>
                <p className="ds-body mt-3">{step.body}</p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Common Ports Reference */}
        <section>
          <SectionHeader
            title={copy.scan.portsTitle}
            lead={copy.scan.portsLead}
          />
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {COMMON_PORTS.map((p, i) => (
              <Reveal
                key={p.port}
                delay={(i % 4) * 50}
                className="ds-card flex flex-col justify-between p-5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="ds-mono ds-tabular text-xl font-semibold text-ink">
                    {p.port}
                  </span>
                  <span className="ds-chip ds-mono text-[11px]">{p.proto}</span>
                </div>
                <p className="mt-3 text-sm font-medium text-ink-2">{p.name}</p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Closing CTA Stage for IPscans+ */}
        <DownloadStage
          title={copy.scan.ctaTitle}
          lead={scannerApplication.description[locale]}
        >
          <Link
            href={`/${locale}/applications/scanner`}
            className="btn btn-inverse btn-lg"
          >
            <span>{copy.more.desktopCta}</span>
            <Icon name="arrowRight" size={18} className="btn-arrow rtl-flip" />
          </Link>
          <Link
            href={`/${locale}/download`}
            className="btn btn-inverse-secondary btn-lg"
          >
            <Icon name="download" size={18} />
            <span>{platform.downloadApp} IPscans+</span>
          </Link>
        </DownloadStage>
      </div>
    </PageShell>
  );
}
