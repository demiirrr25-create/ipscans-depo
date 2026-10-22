import Image from "next/image";
import Link from "next/link";
import { cortexRelease, downloadHubCopy } from "@/components/catalog/copy";
import { Icon, type IconName } from "@/components/ds/Icon";
import { Reveal } from "@/components/ds/Reveal";
import {
  DownloadStage,
  ScreenshotFrame,
  SectionHeader,
} from "@/components/ds/product";
import { desktopRelease, ipcastRelease } from "@/content/applications";
import { lprRelease } from "@/content/lpr-release";
import type { Locale } from "@/i18n/config";
import type { PublicDictionary } from "@/i18n/dictionaries";
import { toolKeys, toolPath, type ToolKey } from "@/lib/tool-routes";

interface ApplicationsSectionProps {
  locale: Locale;
  dict: PublicDictionary;
  primary?: boolean;
}

const toolIcons: Record<ToolKey, IconName> = {
  ipLookup: "globe",
  dns: "dns",
  whois: "search",
  ports: "plug",
  speedTest: "gauge",
};

export function ApplicationsSection({
  locale,
  dict,
}: ApplicationsSectionProps) {
  const copy = downloadHubCopy[locale];

  const products = [
    {
      id: "health-pro", version: "1.4.1", name: "Network Health Pro", mark: "/brand/health.svg",
      category: locale === "tr" ? "Ağ sağlığı" : "Network health",
      valueProp: locale === "tr" ? "Ağının sağlığını takip et." : "Track your network health.",
      summary: locale === "tr" ? "Yeni simge ve ortak açık/koyu tema. Tarayıcı, sağlık paneli, olay günlüğü ve envanter tek uygulamada." : "A new icon and shared light/dark theme. Scanner, health dashboard, event log and inventory in one application.",
      screenshot: { src: "/health-pro-1-4-1.png", alt: "Network Health Pro", width: 1440, height: 900 },
      downloadUrl: "https://github.com/demiirrr25-create/ipscans-depo/releases/download/ipscans-plus-v4.8.1/Network-Health-Pro-Setup.exe",
      detailHref: "https://github.com/demiirrr25-create/ipscans-depo/releases/tag/ipscans-plus-v4.8.1",
    },
    {
      id: "scanner", version: "4.8.1",
      name: "IPscans+",
      mark: "/scanner-mark.svg",
      category: copy.apps.scanner.category,
      valueProp: copy.apps.scanner.valueProp,
      summary: copy.apps.scanner.summary,
      screenshot: {
        src: "/scanner-4-8-1.png",
        alt: copy.apps.scanner.screenshotAlt,
        width: 1440,
        height: 900,
      },
      downloadUrl: desktopRelease.scanner.installerUrl,
      detailHref: `/${locale}/applications/scanner`,
    },
    {
      id: "ipcast", version: "2.9.1",
      name: "IPCast",
      mark: "/ipcast-mark.svg",
      category: copy.apps.ipcast.category,
      valueProp: copy.apps.ipcast.valueProp,
      summary: copy.apps.ipcast.summary,
      screenshot: {
        src: "/ipcast-2-9-1.png",
        alt: copy.apps.ipcast.screenshotAlt,
        width: 1180,
        height: 780,
      },
      downloadUrl: ipcastRelease.installerUrl,
      detailHref: `/${locale}/applications/ipcast`,
    },
    {
      id: "lpr-pro", version: "1.0.0.dev4",
      name: "IPScans LPR Pro",
      mark: "/lpr-mark.svg",
      category: copy.apps.lprPro.category,
      valueProp: copy.apps.lprPro.valueProp,
      summary: copy.apps.lprPro.summary,
      screenshot: {
        src: "/lpr-1-1-light.png",
        alt: copy.apps.lprPro.screenshotAlt,
        width: 1440,
        height: 900,
      },
      downloadUrl: lprRelease.url,
      detailHref: `/${locale}/lpr-pro`,
    },
    {
      id: "cortex", version: "1.2.0-rc.2",
      name: "IPScans Cortex",
      mark: "/cortex-mark.svg",
      category: copy.apps.cortex.category,
      valueProp: copy.apps.cortex.valueProp,
      summary: copy.apps.cortex.summary,
      screenshot: {
        src: "/cortex-1-2-rc2.png",
        alt: copy.apps.cortex.screenshotAlt,
        width: 1271,
        height: 715,
      },
      downloadUrl: cortexRelease.url,
      detailHref: `/${locale}/cortex`,
    },
  ];

  return (
    <div className="space-y-24 sm:space-y-32">
      {/* Five Flagship Desktop Product Cards */}
      <section aria-label={copy.eyebrow}>
        <div className="grid gap-8 lg:gap-10">
          {products.map((product, index) => (
            <Reveal
              key={product.id}
              delay={(index % 2) * 80}
              className="ds-card overflow-hidden p-6 sm:p-10 lg:p-12"
            >
              <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.18fr] lg:gap-12">
                <div className="flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3.5">
                      <span className="grid size-12 shrink-0 place-items-center rounded-[14px] border border-line bg-surface-2 shadow-xs">
                        <Image
                          src={product.mark}
                          alt={product.name}
                          width={28}
                          height={28}
                          className="size-7"
                        />
                      </span>
                      <div>
                        <p className="ds-eyebrow">{product.category}</p>
                        <h2 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
                          {product.name}
                        </h2>
                      </div>
                    </div>

                    <p className="ds-h3 mt-7 text-ink">{product.valueProp}</p>
                    <p className="mt-4 text-[1rem] leading-relaxed text-ink-2">
                      {product.summary}
                    </p>
                  </div>

                  <div className="mt-8 flex flex-wrap items-center gap-3 pt-2">
                    <a href={product.downloadUrl} className="btn btn-primary">
                      <Icon name="download" size={16} />
                      <span>{copy.downloadInstaller}</span>
                    </a>
                    <Link href={product.detailHref} className="btn btn-secondary">
                      <span>{copy.learnMore}</span>
                      <Icon name="arrowRight" size={16} className="rtl-flip" />
                    </Link>
                  </div>
                </div>

                <div>
                  <Link
                    href={product.screenshot.src}
                    target="_blank"
                    aria-label={`${product.name} — ${locale === "tr" ? "Ekran görüntüsünü büyüt" : "View full screenshot"}`}
                    className="block transition-transform duration-300 hover:scale-[1.01]"
                  >
                    <ScreenshotFrame
                      src={product.screenshot.src}
                      alt={product.screenshot.alt}
                      width={product.screenshot.width}
                      height={product.screenshot.height}
                      priority={index === 0}
                      sizes="(min-width: 1024px) 640px, 92vw"
                    />
                  </Link>
                  <p className="mt-3 text-xs leading-relaxed text-ink-3">
                    {product.name} · {product.version} · {locale === "tr" ? "Güncel uygulama ekranı — büyütmek için tıklayın." : "Current application screen — click to enlarge."}
                    {(product.id === "scanner" || product.id === "lpr-pro") && (locale === "tr" ? " Örnek veriler gösterilir." : " Sample data shown.")}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Quiet platform note */}
        <Reveal className="mt-8">
          <p className="text-center text-sm text-ink-3">{copy.platformNote}</p>
        </Reveal>
      </section>

      {/* Installation & Verification FAQ */}
      <section className="border-t border-line pt-20 sm:pt-24">
        <SectionHeader
          eyebrow={copy.faq.eyebrow}
          title={copy.faq.title}
          lead={copy.faq.lead}
        />

        <div className="mt-12 grid gap-4 sm:mt-16 lg:grid-cols-2">
          {copy.faq.items.map((item, idx) => (
            <Reveal
              key={item.q}
              delay={(idx % 2) * 90}
              className="ds-card flex flex-col justify-between p-7 sm:p-8"
            >
              <div>
                <div className="flex items-center gap-2.5 text-signal">
                  <Icon name="shield" size={18} />
                  <span className="ds-mono text-xs font-medium text-ink-3">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="ds-h4 mt-4 text-ink">{item.q}</h3>
                <p className="mt-3 text-[0.96rem] leading-relaxed text-ink-2">
                  {item.a}
                </p>
              </div>
              {item.code && (
                <div className="mt-5 rounded-md border border-line bg-surface-2 px-4 py-3">
                  <code className="ds-mono block overflow-x-auto text-xs text-ink">
                    {item.code}
                  </code>
                </div>
              )}
            </Reveal>
          ))}
        </div>
      </section>

      {/* Browser Diagnostic Tools */}
      <section className="border-t border-line pt-20 sm:pt-24">
        <SectionHeader
          eyebrow={copy.webTools.eyebrow}
          title={copy.webTools.title}
          lead={copy.webTools.lead}
        />

        <div className="mt-12 grid gap-4 sm:mt-16 sm:grid-cols-2 lg:grid-cols-3">
          {toolKeys.map((key, idx) => {
            const tool = dict[key];
            return (
              <Reveal key={key} delay={(idx % 3) * 80}>
                <Link
                  href={toolPath(key, locale)}
                  className="ds-card ds-card-interactive group flex h-full flex-col justify-between p-7"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="grid size-10 place-items-center rounded-[12px] bg-signal-soft text-signal">
                        <Icon name={toolIcons[key]} size={18} />
                      </span>
                      <Icon
                        name="arrowRight"
                        size={16}
                        className="rtl-flip text-ink-3 transition-transform group-hover:translate-x-0.5 group-hover:text-ink"
                      />
                    </div>
                    <h3 className="ds-h4 mt-6 text-ink">{tool.title}</h3>
                    <p className="mt-2.5 text-sm leading-relaxed text-ink-2">
                      {tool.subtitle}
                    </p>
                  </div>

                  <div className="mt-6 border-t border-line pt-4">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink">
                      <span>{copy.webTools.openTool}</span>
                      <Icon name="arrowUpRight" size={13} />
                    </span>
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* Closing DownloadStage */}
      <section>
        <DownloadStage title={copy.closing.title} lead={copy.closing.lead}>
          <a href={desktopRelease.scanner.installerUrl} className="btn btn-inverse">
            <Icon name="download" size={16} />
            <span>{copy.closing.primaryCta}</span>
          </a>
          <Link
            href={`/${locale}/applications/scanner`}
            className="btn btn-inverse-secondary"
          >
            <span>{copy.closing.secondaryCta}</span>
            <Icon name="arrowRight" size={16} className="rtl-flip" />
          </Link>
        </DownloadStage>
      </section>
    </div>
  );
}
