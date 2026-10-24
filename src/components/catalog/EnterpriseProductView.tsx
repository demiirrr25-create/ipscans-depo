import Image from "next/image";
import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { Icon } from "@/components/ds/Icon";
import { Reveal } from "@/components/ds/Reveal";
import { SignalField } from "@/components/ds/SignalField";
import { SplitHeading } from "@/components/ds/SplitHeading";
import {
  DownloadStage,
  FeatureGrid,
  ReleaseDetails,
  ScreenshotFrame,
  SectionHeader,
} from "@/components/ds/product";
import type { EnterpriseProductCopy } from "./lpr-copy";

type EnterpriseProductViewProps = {
  locale: Locale;
  copy: EnterpriseProductCopy;
  markSrc: string;
  markAlt: string;
  screenshot: {
    src: string;
    width: number;
    height: number;
  };
  secondaryScreenshot?: {
    src: string;
    width: number;
    height: number;
    alt: string;
    caption?: string;
  };
  downloadHref: string;
  secondaryHref: string;
  secondaryExternal?: boolean;
  release: {
    version: string;
    platform: string;
    bytes: number;
    sha256: string;
    releaseNotesHref?: string;
  };
};

export function EnterpriseProductView({
  locale,
  copy,
  markSrc,
  markAlt,
  screenshot,
  secondaryScreenshot,
  downloadHref,
  secondaryHref,
  secondaryExternal = true,
  release,
}: EnterpriseProductViewProps) {
  return (
    <div>
      {/* Hero */}
      <section className="relative isolate overflow-hidden border-b border-line pt-[calc(var(--header-h)+48px)] pb-20 sm:pt-[calc(var(--header-h)+76px)] sm:pb-28">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[560px] opacity-60 [mask-image:radial-gradient(75%_80%_at_65%_20%,#000_20%,transparent_75%)]"
        >
          <SignalField variant="ambient" />
        </div>

        <div className="ds-container">
          <Reveal>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <Link
                href={`/${locale}/download`}
                className="inline-flex items-center gap-2 text-sm font-medium text-ink-2 transition-colors hover:text-ink"
              >
                <Icon name="arrowRight" size={15} className="rotate-180 rtl:rotate-0" />
                <span>{copy.backToApps}</span>
              </Link>
            </div>

            <div className="mt-8 flex items-center gap-3.5">
              <span className="grid size-12 place-items-center rounded-[14px] border border-line bg-surface shadow-xs">
                <Image
                  src={markSrc}
                  alt={markAlt}
                  width={28}
                  height={28}
                  className="size-7"
                />
              </span>
              <div>
                <p className="ds-eyebrow">{copy.eyebrow}</p>
                <p className="text-base font-semibold tracking-tight text-ink">
                  {copy.name}
                </p>
              </div>
            </div>
          </Reveal>

          <div className="mt-8 max-w-[880px]">
            <SplitHeading
              as="h1"
              text={copy.headline}
              className="ds-display text-ink"
            />
            <Reveal delay={120}>
              <p className="ds-lead mt-6 max-w-[680px]">{copy.lead}</p>
            </Reveal>

            <Reveal delay={180} className="mt-9 flex flex-wrap items-center gap-3">
              <a href={downloadHref} className="btn btn-primary">
                <Icon name="download" size={16} />
                <span>{copy.primaryCta}</span>
              </a>
              {secondaryExternal ? (
                <a
                  href={secondaryHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary"
                >
                  <span>{copy.secondaryCta}</span>
                  <Icon name="arrowUpRight" size={16} />
                </a>
              ) : (
                <Link href={secondaryHref} className="btn btn-secondary">
                  <span>{copy.secondaryCta}</span>
                  <Icon name="arrowRight" size={16} className="rtl-flip" />
                </Link>
              )}
            </Reveal>
          </div>

          <Reveal delay={220} className="mt-14 sm:mt-16">
            <ScreenshotFrame
              src={screenshot.src}
              alt={copy.screenshotAlt}
              width={screenshot.width}
              height={screenshot.height}
              priority
              caption={copy.screenshotCaption}
            />
          </Reveal>
          {secondaryScreenshot ? (
            <Reveal delay={260} className="mt-8 sm:mt-10">
              <ScreenshotFrame
                src={secondaryScreenshot.src}
                alt={secondaryScreenshot.alt}
                width={secondaryScreenshot.width}
                height={secondaryScreenshot.height}
                caption={secondaryScreenshot.caption}
              />
            </Reveal>
          ) : null}
        </div>
      </section>

      {/* Capabilities FeatureGrid */}
      <section className="ds-section border-b border-line">
        <div className="ds-container">
          <SectionHeader
            eyebrow={copy.capabilities.eyebrow}
            title={copy.capabilities.title}
            lead={copy.capabilities.lead}
          />
          <div className="mt-12 sm:mt-16">
            <FeatureGrid features={copy.capabilities.items} columns={3} />
          </div>
        </div>
      </section>

      {/* Stepped How It Works / Getting Started */}
      <section className="ds-section border-b border-line bg-surface-2/50">
        <div className="ds-container">
          <SectionHeader
            eyebrow={copy.steps.eyebrow}
            title={copy.steps.title}
            lead={copy.steps.lead}
          />

          <ol className="mt-12 grid gap-4 sm:mt-16 lg:grid-cols-3">
            {copy.steps.items.map((step, index) => (
              <Reveal
                key={step.title}
                delay={index * 90}
                className="ds-card flex flex-col justify-between p-7 sm:p-8"
              >
                <div>
                  <span className="ds-mono inline-flex size-9 items-center justify-center rounded-full border border-line-strong bg-surface-2 text-xs font-semibold text-ink">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="ds-h4 mt-6 text-ink">{step.title}</h3>
                  <p className="mt-3 text-[0.98rem] leading-relaxed text-ink-2">
                    {step.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </ol>

          <Reveal delay={240} className="mt-6">
            <div className="ds-card-muted flex flex-col justify-between gap-4 p-6 sm:flex-row sm:items-center sm:p-7">
              <div className="flex items-start gap-3.5">
                <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-[10px] bg-signal-soft text-signal">
                  <Icon name="info" size={18} />
                </span>
                <p className="text-sm leading-relaxed text-ink-2">
                  {copy.steps.helperText}
                </p>
              </div>
              <a
                href={copy.steps.helperLinkHref}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary btn-sm shrink-0 self-start sm:self-center"
              >
                <span>{copy.steps.helperLinkLabel}</span>
                <Icon name="arrowUpRight" size={14} />
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Compatibility & Validation Scope */}
      <section className="ds-section border-b border-line">
        <div className="ds-container">
          <SectionHeader
            eyebrow={copy.compatibility.eyebrow}
            title={copy.compatibility.title}
            lead={copy.compatibility.lead}
          />

          <div className="mt-12 grid gap-4 sm:mt-16 lg:grid-cols-3">
            {copy.compatibility.cards.map((card, index) => (
              <Reveal
                key={card.title}
                delay={index * 90}
                className="ds-card p-7 sm:p-8"
              >
                <h3 className="ds-h4 text-ink">{card.title}</h3>
                <p className="mt-3 text-[0.98rem] leading-relaxed text-ink-2">
                  {card.body}
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ReleaseDetails — ONLY place versions / hashes / sizes appear */}
      <section id="release" className="ds-section-tight">
        <div className="ds-container">
          <ReleaseDetails
            title={copy.release.title}
            rows={[
              { label: copy.release.versionLabel, value: release.version },
              { label: copy.release.platformLabel, value: release.platform },
              { label: copy.release.runtimeLabel, value: copy.release.runtimeValue },
            ]}
            files={[
              {
                label: copy.release.installerLabel,
                href: downloadHref,
                bytes: release.bytes,
                sha256: release.sha256,
              },
            ]}
            copyLabel={copy.release.copyLabel}
            copiedLabel={copy.release.copiedLabel}
            downloadLabel={copy.release.downloadLabel}
            releaseNotes={
              release.releaseNotesHref
                ? {
                    href: release.releaseNotesHref,
                    label: copy.release.releaseNotesLabel,
                  }
                : undefined
            }
          />
        </div>
      </section>

      {/* Closing DownloadStage */}
      <section className="ds-section-tight pb-20 sm:pb-28">
        <div className="ds-container">
          <DownloadStage
            title={copy.closing.title}
            lead={copy.closing.lead}
            note={copy.closing.note}
          >
            <a href={downloadHref} className="btn btn-inverse">
              <Icon name="download" size={16} />
              <span>{copy.closing.primaryCta}</span>
            </a>
            {secondaryExternal ? (
              <a
                href={secondaryHref}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-inverse-secondary"
              >
                <span>{copy.closing.secondaryCta}</span>
                <Icon name="arrowUpRight" size={16} />
              </a>
            ) : (
              <Link href={secondaryHref} className="btn btn-inverse-secondary">
                <span>{copy.closing.secondaryCta}</span>
                <Icon name="arrowRight" size={16} className="rtl-flip" />
              </Link>
            )}
          </DownloadStage>
        </div>
      </section>
    </div>
  );
}
