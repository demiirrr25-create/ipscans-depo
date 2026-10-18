import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { platformCopy, scannerApplication } from "@/content/applications";
import { toolPath } from "@/lib/tool-routes";
import { LiveIp } from "@/components/LiveIp";
import { Icon } from "@/components/ds/Icon";
import { SignalField } from "@/components/ds/SignalField";
import { SplitHeading } from "@/components/ds/SplitHeading";
import { homeCopy } from "./copy";

export function HeroSection({
  locale,
  dict,
}: {
  locale: Locale;
  dict: Dictionary;
}) {
  const copy = homeCopy[locale];
  const platform = platformCopy[locale];

  const suiteLinks = [
    { name: "IPscans+", href: `/${locale}/applications/scanner` },
    { name: "IPCast", href: `/${locale}/applications/ipcast` },
    { name: "LPR Pro", href: `/${locale}/lpr-pro` },
    { name: "Cortex", href: `/${locale}/cortex` },
  ];

  return (
    <section className="relative isolate flex min-h-[100svh] flex-col justify-between overflow-hidden pt-[calc(var(--header-h)+36px)] pb-10 sm:pt-[calc(var(--header-h)+56px)] sm:pb-12">
      {/* Animated concentric signal field backdrop */}
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <SignalField variant="hero" />
        <div className="pointer-events-none absolute inset-0 bg-[image:var(--hero-scrim)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-surface to-transparent" />
      </div>

      {/* Main Hero Centerpiece */}
      <div className="ds-container my-auto py-12 sm:py-16">
        <div className="mx-auto max-w-[1040px] text-center">
          <div className="flex justify-center animate-fade-up">
            <p className="ds-eyebrow">{platform.eyebrow}</p>
          </div>

          <SplitHeading
            as="h1"
            text={copy.heroHeadline}
            className="ds-display mx-auto mt-6 max-w-[15.5ch] text-ink"
            delay={40}
          />

          <p
            className="ds-lead mx-auto mt-6 max-w-[700px] animate-fade-up sm:mt-8"
            style={{ animationDelay: "180ms" }}
          >
            {copy.heroLead}
          </p>

          <div
            className="mt-9 flex flex-wrap items-center justify-center gap-3 animate-fade-up sm:mt-11"
            style={{ animationDelay: "280ms" }}
          >
            <a
              href={scannerApplication.downloadUrl}
              className="btn btn-primary btn-lg"
            >
              <Icon name="windows" size={18} />
              <span>{copy.downloadScannerCta}</span>
              <Icon name="download" size={18} />
            </a>

            <Link
              href={toolPath("speedTest", locale)}
              className="btn btn-secondary btn-lg"
            >
              <Icon name="gauge" size={18} />
              <span>{copy.runSpeedTestCta}</span>
              <Icon name="arrowRight" size={18} className="btn-arrow rtl-flip" />
            </Link>

            <Link
              href={`/${locale}/download`}
              className="btn btn-ghost btn-lg"
            >
              <span>{platform.explore}</span>
              <Icon name="arrowRight" size={18} className="btn-arrow rtl-flip" />
            </Link>
          </div>

          <div
            className="mt-8 flex justify-center animate-fade-up"
            style={{ animationDelay: "360ms" }}
          >
            <LiveIp
              label={dict.hero.yourIp}
              href={toolPath("ipLookup", locale)}
            />
          </div>
        </div>
      </div>

      {/* Architectural bottom bar: suite quick-links & scroll cue */}
      <div
        className="ds-container animate-fade-up"
        style={{ animationDelay: "440ms" }}
      >
        <div className="flex flex-col items-center justify-between gap-4 border-t border-line pt-6 sm:flex-row">
          <nav
            aria-label={platform.applications}
            className="flex flex-wrap items-center justify-center gap-1.5 sm:justify-start"
          >
            {suiteLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[0.8125rem] font-medium text-ink-2 transition-colors duration-200 hover:bg-surface-2 hover:text-ink"
              >
                <span>{item.name}</span>
              </Link>
            ))}
            <span className="mx-1 hidden h-3.5 w-px bg-line-2 sm:inline-block" aria-hidden="true" />
            <Link
              href="#tools"
              className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[0.8125rem] font-medium text-ink-3 transition-colors duration-200 hover:bg-surface-2 hover:text-ink"
            >
              <span>{dict.experience.networkTools}</span>
            </Link>
          </nav>

          <a
            href="#lineup"
            className="group inline-flex items-center gap-2 text-[0.85rem] font-medium text-ink-3 transition-colors duration-200 hover:text-ink"
          >
            <span>{copy.scrollCue}</span>
            <span className="grid size-7 place-items-center rounded-full border border-line bg-surface transition-transform duration-300 ease-out-expo group-hover:translate-y-0.5 group-hover:border-line-2">
              <Icon name="arrowDown" size={14} />
            </span>
          </a>
        </div>
      </div>
    </section>
  );
}
