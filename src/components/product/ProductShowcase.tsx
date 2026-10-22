import Image from "next/image";
import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import {
  applications,
  desktopRelease,
  ipcastRelease,
  platformCopy,
} from "@/content/applications";
import { scannerCopy } from "@/content/scanner";
import { ipcastProductCopy } from "@/content/ipcast-product";
import { Icon, type IconName } from "@/components/ds/Icon";
import { Reveal } from "@/components/ds/Reveal";
import { SignalField } from "@/components/ds/SignalField";
import { SplitHeading } from "@/components/ds/SplitHeading";
import {
  DownloadStage,
  FeatureGrid,
  ReleaseDetails,
  ScreenshotFrame,
  SectionHeader,
  type Feature,
} from "@/components/ds/product";
import { ProductGallery } from "./ProductGallery";
import { productPageCopy, type ProductId } from "./product-copy";

const scannerFeatureIcons: IconName[] = [
  "network",
  "map",
  "shield",
  "external",
  "sparkle",
  "book",
];

const ipcastFeatureIcons: IconName[] = [
  "monitor",
  "shield",
  "lock",
  "copy",
  "arrowUpRight",
  "clock",
];

function cleanMarketingCopy(text: string): string {
  return text
    .split(/(?<=[.?!。？！])\s+/)
    .filter((sentence) => !/\b(2\.5|SHA-256|Windows\s*10|64[- ]?bit)\b/i.test(sentence))
    .join(" ")
    .replace(/\s*\b1[.,]8\s*(?:GB|Go|ГБ|جيجابايت)\b/gi, "")
    .trim();
}

export function ProductShowcase({
  product,
  locale,
  canonicalPath,
}: {
  product: ProductId;
  locale: Locale;
  canonicalPath?: string;
}) {
  const isScanner = product === "scanner";
  const app =
    applications.find((item) => item.id === product) ?? applications[0];
  const sibling =
    applications.find((item) => item.id !== product) ?? applications[0];

  const dict = getDictionary(locale);
  const platform = platformCopy[locale];
  const scanner = scannerCopy[locale];
  const ipcastExtra = ipcastProductCopy[locale] ?? ipcastProductCopy.en!;
  const copy = productPageCopy[locale];
  const common = copy.common;
  const pCopy = isScanner ? copy.scanner : copy.ipcast;

  const pageUrl = `https://ipscans.com/${locale}${
    canonicalPath ?? `/applications/${app.id}`
  }`;

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: app.name,
        description: app.description[locale],
        softwareVersion: app.version,
        operatingSystem: app.platform,
        applicationCategory: "NetworkingApplication",
        downloadUrl: app.downloadUrl,
        url: pageUrl,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "IPScans",
            item: `https://ipscans.com/${locale}`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: platform.applications,
            item: `https://ipscans.com/${locale}/download`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: app.name,
            item: pageUrl,
          },
        ],
      },
    ],
  };

  const featureItems: Feature[] = isScanner
    ? scanner.features.slice(0, 6).map((body, idx) => ({
        title: copy.scanner.featureTitles[idx] ?? app.name,
        body,
        icon: scannerFeatureIcons[idx % scannerFeatureIcons.length],
      }))
    : dict.ipcast.features.slice(0, 6).map((body, idx) => ({
        title: copy.ipcast.featureTitles[idx] ?? app.name,
        body,
        icon: ipcastFeatureIcons[idx % ipcastFeatureIcons.length],
      }));

  const secondaryHighlights: string[] = isScanner
    ? scanner.features.slice(6)
    : ipcastExtra.changes;

  const releaseRows = isScanner
    ? [
        { label: platform.version, value: desktopRelease.scanner.version },
        { label: platform.platform, value: app.platform },
        { label: common.statusLabel, value: platform.preview },
      ]
    : [
        { label: platform.version, value: ipcastRelease.version },
        { label: platform.platform, value: ipcastRelease.platform },
        {
          label: common.releaseDate,
          value: new Date(ipcastRelease.publishedAt).toLocaleDateString(
            locale,
            {
              year: "numeric",
              month: "short",
              day: "numeric",
              timeZone: "UTC",
            }
          ),
        },
        { label: common.statusLabel, value: platform.preview },
      ];

  const releaseFiles = isScanner
    ? [
        {
          label: `${app.name} — ${common.installerPackage}`,
          href: desktopRelease.scanner.installerUrl,
          bytes: desktopRelease.scanner.installerBytes,
          sha256: desktopRelease.scanner.installerSha256,
        },
        {
          label: `${app.name} — ${common.portablePackage}`,
          href: desktopRelease.scanner.portableUrl,
          bytes: desktopRelease.scanner.portableBytes,
          sha256: desktopRelease.scanner.portableSha256,
        },
      ]
    : [
        {
          label: `${app.name} — ${common.installerPackage}`,
          href: ipcastRelease.installerUrl,
          bytes: ipcastRelease.installerBytes,
          sha256: ipcastRelease.installerSha256,
        },
        {
          label: `${app.name} — ${common.portablePackage}`,
          href: ipcastRelease.url,
          bytes: ipcastRelease.bytes,
          sha256: ipcastRelease.sha256,
        },
      ];

  const faqItems = isScanner
    ? copy.scanner.faq
    : ipcastExtra.faq.slice(1).map((item) => ({
        question: item.question,
        answer: cleanMarketingCopy(item.answer),
      }));
  const markSrc = isScanner ? "/scanner-mark.svg" : "/ipcast-mark.svg";
  const heroScreenshot = isScanner
    ? "/scanner-4-8-1.png"
    : "/ipcast-2-9-1.png";

  return (
    <div className="relative">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replaceAll("<", "\\u003c"),
        }}
      />

      {/* 1. Hero */}
      <section className="relative isolate overflow-hidden pt-[calc(var(--header-h)+48px)] pb-16 sm:pt-[calc(var(--header-h)+80px)] sm:pb-24">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 opacity-65 [mask-image:radial-gradient(75%_80%_at_65%_18%,#000_20%,transparent_75%)]"
        >
          <SignalField variant="hero" />
        </div>

        <div className="ds-container">
          <div className="flex flex-wrap items-center gap-4 animate-fade-up">
            <span className="grid size-14 shrink-0 place-items-center rounded-[18px] border border-line bg-surface shadow-soft">
              <Image
                src={markSrc}
                alt={`${app.name} mark`}
                width={32}
                height={32}
                className="size-8"
              />
            </span>
            <p className="ds-eyebrow">{pCopy.eyebrow}</p>
          </div>

          <div className="mt-6 max-w-[920px]">
            <SplitHeading
              text={pCopy.headline}
              as="h1"
              className="ds-display text-ink"
            />
            <p
              className="ds-lead mt-6 max-w-[680px] animate-fade-up"
              style={{ animationDelay: "160ms" }}
            >
              {pCopy.valueProp}
            </p>

            <div
              className="mt-9 flex flex-wrap items-center gap-3 animate-fade-up"
              style={{ animationDelay: "260ms" }}
            >
              <a href={app.downloadUrl} className="btn btn-primary btn-lg">
                <Icon name="windows" size={18} />
                <span>{common.downloadInstaller}</span>
              </a>
              <a href={app.portableUrl} className="btn btn-secondary btn-lg">
                <Icon name="download" size={18} />
                <span>{common.downloadPortable}</span>
              </a>
              <a href="#features" className="btn btn-ghost btn-lg">
                <span>{common.seeFeatures}</span>
                <Icon name="arrowDown" size={16} />
              </a>
            </div>
          </div>

          <Reveal variant="scale" delay={140} className="mt-14 sm:mt-20">
            <ScreenshotFrame
              src={heroScreenshot}
              alt={`${app.name} — ${app.description[locale]}`}
              width={1440}
              height={900}
              priority
              caption={pCopy.heroCaption}
            />
          </Reveal>
        </div>
      </section>

      {/* 2. Real-Screenshot Gallery */}
      <section
        id="gallery"
        className="ds-section border-y border-line bg-surface-dim"
      >
        <div className="ds-container">
          <SectionHeader
            eyebrow={common.galleryEyebrow}
            title={pCopy.galleryTitle}
            lead={pCopy.galleryLead}
          />
          <Reveal delay={100} className="mt-12 sm:mt-16">
            <ProductGallery
              items={pCopy.gallery}
              prevLabel={common.prevSlide}
              nextLabel={common.nextSlide}
              tablistLabel={pCopy.galleryTitle}
            />
          </Reveal>
        </div>
      </section>

      {/* 3. Core Features */}
      <section id="features" className="ds-section">
        <div className="ds-container">
          <SectionHeader
            eyebrow={common.featuresEyebrow}
            title={pCopy.featuresTitle}
            lead={pCopy.featuresLead}
          />
          <div className="mt-12 sm:mt-16">
            <FeatureGrid features={featureItems} columns={3} />
          </div>

          {/* Secondary capability callout */}
          <Reveal delay={120} className="ds-card-muted mt-8 p-7 sm:p-10">
            <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr] lg:items-center">
              <div>
                <h3 className="ds-h3 text-ink">
                  {isScanner
                    ? copy.scanner.queryTitle
                    : ipcastExtra.newTitle || copy.ipcast.highlightsTitle}
                </h3>
                <p className="ds-body mt-3 text-ink-2">
                  {isScanner ? copy.scanner.queryBody : dict.ipcast.subtitle}
                </p>
                {isScanner && (
                  <div className="mt-5 inline-flex max-w-full items-center gap-2.5 overflow-x-auto rounded-full border border-line-2 bg-surface px-4 py-2.5 shadow-soft">
                    <Icon
                      name="search"
                      size={16}
                      className="shrink-0 text-signal"
                    />
                    <code className="ds-mono text-xs sm:text-sm text-ink">
                      ip:192.168.1.0/24 port:443 source:ONVIF -type:Unknown
                    </code>
                  </div>
                )}
              </div>

              <ul className="grid gap-3 sm:grid-cols-2">
                {secondaryHighlights.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 rounded-md border border-line bg-surface p-5"
                  >
                    <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-signal-soft text-signal">
                      <Icon name="check" size={14} />
                    </span>
                    <span className="text-[0.94rem] leading-relaxed text-ink-2">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 4. How It Works */}
      <section
        id="workflow"
        className="ds-section border-y border-line bg-surface-dim"
      >
        <div className="ds-container">
          <SectionHeader
            eyebrow={common.workflowEyebrow}
            title={pCopy.workflowTitle}
            lead={pCopy.workflowLead}
          />

          <div className="mt-12 grid gap-4 sm:mt-16 lg:grid-cols-3">
            {pCopy.steps.map((step, i) => (
              <Reveal
                key={step.title}
                delay={i * 90}
                className="ds-card flex flex-col justify-between p-7 sm:p-8"
              >
                <div>
                  <div className="mb-6 flex items-center justify-between">
                    <span className="grid size-11 place-items-center rounded-[13px] bg-signal-soft text-signal">
                      <Icon name={step.icon} size={20} />
                    </span>
                    <span className="ds-mono text-sm font-medium text-ink-3">
                      0{i + 1}
                    </span>
                  </div>
                  <h3 className="ds-h4 text-ink">{step.title}</h3>
                  <p className="mt-3 text-[0.98rem] leading-relaxed text-ink-2">
                    {step.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={180} className="ds-card mt-6 p-6 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-sm bg-surface-2 text-ink">
                  <Icon name={isScanner ? "map" : "shield"} size={18} />
                </span>
                <p className="ds-body max-w-[780px] text-ink-2">
                  {isScanner ? scanner.mapIntro : ipcastExtra.connection}
                </p>
              </div>
              <a
                href="#release"
                className="btn btn-secondary btn-sm shrink-0 self-start sm:self-center"
              >
                <span>{common.releaseTitle}</span>
                <Icon name="arrowDown" size={14} />
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 5. Security, Privacy & Operational Scope + FAQ */}
      <section id="security" className="ds-section">
        <div className="ds-container">
          <SectionHeader
            eyebrow={common.securityEyebrow}
            title={
              isScanner ? copy.scanner.securityTitle : ipcastExtra.securityTitle
            }
            lead={
              isScanner ? copy.scanner.securityLead : copy.ipcast.securityLead
            }
          />

          <div className="mt-12 grid gap-6 sm:mt-16 lg:grid-cols-2">
            <Reveal className="ds-card p-7 sm:p-9">
              <span className="mb-6 grid size-11 place-items-center rounded-[13px] bg-signal-soft text-signal">
                <Icon name="shield" size={20} />
              </span>
              <h3 className="ds-h3 text-ink">
                {isScanner
                  ? copy.scanner.securityTitle
                  : ipcastExtra.securityTitle}
              </h3>
              <p className="ds-body mt-4 text-ink-2">
                {isScanner
                  ? copy.scanner.securityBody
                  : cleanMarketingCopy(ipcastExtra.security)}
              </p>
              <div className="mt-6 border-t border-line pt-6">
                <p className="text-sm font-medium text-ink">
                  {common.installTitle}
                </p>
                <p className="ds-caption mt-2">{common.installBody}</p>
              </div>
            </Reveal>

            <Reveal delay={90} className="ds-card-muted p-7 sm:p-9">
              <span className="mb-6 grid size-11 place-items-center rounded-[13px] bg-surface text-ink shadow-soft">
                <Icon name="info" size={20} />
              </span>
              <h3 className="ds-h3 text-ink">{common.limitationsTitle}</h3>
              <p className="ds-body mt-4 text-ink-2">
                {isScanner
                  ? scanner.limitations
                  : cleanMarketingCopy(ipcastExtra.limitations)}
              </p>
              <p className="ds-caption mt-6 border-t border-line pt-6">
                {isScanner ? dict.download.safe : dict.ipcast.safe}
              </p>
            </Reveal>
          </div>

          {/* FAQ Accordion */}
          {faqItems.length > 0 && (
            <Reveal delay={140} className="ds-card mt-8 p-7 sm:p-10">
              <div className="grid gap-8 lg:grid-cols-[1fr_1.8fr]">
                <div>
                  <p className="ds-eyebrow mb-4">{common.faqEyebrow}</p>
                  <h3 className="ds-h3 text-ink">
                    {isScanner ? copy.scanner.faqTitle : ipcastExtra.faqTitle}
                  </h3>
                </div>
                <div className="divide-y divide-line">
                  {faqItems.map((item) => (
                    <details key={item.question} className="group py-5 first:pt-0 last:pb-0">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[1.05rem] font-medium text-ink">
                        <span>{item.question}</span>
                        <Icon
                          name="chevronDown"
                          size={18}
                          className="shrink-0 text-ink-3 transition-transform duration-300 ease-out-expo group-open:rotate-180"
                        />
                      </summary>
                      <p className="ds-body mt-3 pe-6 text-ink-2">
                        {item.answer}
                      </p>
                    </details>
                  ))}
                </div>
              </div>
            </Reveal>
          )}
        </div>
      </section>

      {/* 6. Release Details — the ONLY place versions, sizes, platforms and SHA-256 hashes appear */}
      <section
        id="release"
        className="ds-section-sm border-t border-line bg-surface-dim"
      >
        <div className="ds-container">
          <SectionHeader
            eyebrow={common.releaseEyebrow}
            title={common.releaseTitle}
            lead={common.releaseLead}
          />
          <div className="mt-10 sm:mt-12">
            <ReleaseDetails
              title={app.name}
              rows={releaseRows}
              files={releaseFiles}
              copyLabel={common.copyHash}
              copiedLabel={common.copiedHash}
              downloadLabel={platform.downloadApp}
              releaseNotes={{
                href: app.releaseUrl,
                label: scanner.releaseNotes,
              }}
            />
          </div>
        </div>
      </section>

      {/* 7. Closing DownloadStage */}
      <section className="ds-section-sm pb-20 sm:pb-28">
        <div className="ds-container">
          <DownloadStage
            title={pCopy.stageTitle}
            lead={pCopy.stageLead}
            note={
              <div className="flex flex-wrap items-center gap-4">
                <span>{isScanner ? dict.download.safe : dict.ipcast.safe}</span>
                <span aria-hidden="true">·</span>
                <Link
                  href={`/${locale}/download`}
                  className="ds-link font-medium text-on-stage-2"
                >
                  {common.allApps}
                </Link>
              </div>
            }
          >
            <a href={app.downloadUrl} className="btn btn-inverse btn-lg">
              <Icon name="windows" size={18} />
              <span>{common.downloadInstaller}</span>
            </a>
            <a
              href={app.portableUrl}
              className="btn btn-inverse-secondary btn-lg"
            >
              <Icon name="download" size={18} />
              <span>{common.downloadPortable}</span>
            </a>
            <Link
              href={`/${locale}/applications/${sibling.id}`}
              className="btn btn-inverse-secondary btn-lg"
            >
              <span>
                {common.exploreSibling} {sibling.name}
              </span>
              <Icon
                name="arrowRight"
                size={16}
                className="btn-arrow rtl-flip"
              />
            </Link>
          </DownloadStage>
        </div>
      </section>
    </div>
  );
}
