import Image from "next/image";
import Link from "next/link";
import { downloadHubCopy } from "@/components/catalog/copy";
import { Icon, type IconName } from "@/components/ds/Icon";
import { Reveal } from "@/components/ds/Reveal";
import { SectionHeader } from "@/components/ds/product";
import type { Locale } from "@/i18n/config";
import type { Dictionary, PublicDictionary } from "@/i18n/dictionaries";
import { toolKeys, toolPath, type ToolKey } from "@/lib/tool-routes";

const toolIcons: Record<ToolKey, IconName> = {
  ipLookup: "globe",
  dns: "dns",
  whois: "search",
  ports: "plug",
  speedTest: "gauge",
};

export function ComingSoon({
  dict,
  locale = "en",
  toolsDict,
}: {
  dict: Dictionary["shop"];
  locale?: Locale;
  toolsDict?: PublicDictionary;
}) {
  const copy = downloadHubCopy[locale];

  const desktopLinks = [
    {
      id: "scanner",
      name: "IPscans+",
      mark: "/scanner-mark.svg",
      category: copy.apps.scanner.category,
      summary: copy.apps.scanner.valueProp,
      href: `/${locale}/applications/scanner`,
    },
    {
      id: "ipcast",
      name: "IPCast",
      mark: "/ipcast-mark.svg",
      category: copy.apps.ipcast.category,
      summary: copy.apps.ipcast.valueProp,
      href: `/${locale}/applications/ipcast`,
    },
    {
      id: "lpr-pro",
      name: "IPScans LPR Pro",
      mark: "/lpr-mark.svg",
      category: copy.apps.lprPro.category,
      summary: copy.apps.lprPro.valueProp,
      href: `/${locale}/lpr-pro`,
    },
    {
      id: "cortex",
      name: "IPScans Cortex",
      mark: "/cortex-mark.svg",
      category: copy.apps.cortex.category,
      summary: copy.apps.cortex.valueProp,
      href: `/${locale}/cortex`,
    },
  ];

  return (
    <div className="space-y-20 sm:space-y-28">
      {/* Main Coming Soon Announcement Card */}
      <Reveal className="ds-card-muted relative overflow-hidden p-8 sm:p-14 lg:p-16">
        <div className="max-w-[680px]">
          <span className="mb-6 grid size-12 place-items-center rounded-[14px] bg-signal-soft text-signal">
            <Icon name="camera" size={22} />
          </span>
          <p className="ds-eyebrow">{copy.shop.eyebrow}</p>
          <h2 className="ds-h2 mt-3 text-ink">{dict.comingSoonTitle}</h2>
          <p className="ds-lead mt-4 max-w-[600px]">{dict.comingSoonBody}</p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href={`/${locale}/download`} className="btn btn-primary">
              <span>{copy.shop.downloadHubCta}</span>
              <Icon name="arrowRight" size={16} className="rtl-flip" />
            </Link>
          </div>
        </div>
      </Reveal>

      {/* Explore Desktop Applications */}
      <section className="border-t border-line pt-16 sm:pt-20">
        <SectionHeader
          eyebrow={copy.eyebrow}
          title={copy.shop.exploreAppsTitle}
          lead={copy.shop.exploreAppsLead}
        />

        <div className="mt-10 grid gap-4 sm:mt-12 sm:grid-cols-2">
          {desktopLinks.map((app, index) => (
            <Reveal key={app.id} delay={(index % 2) * 80}>
              <Link
                href={app.href}
                className="ds-card ds-card-interactive group flex h-full flex-col justify-between p-7 sm:p-8"
              >
                <div>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <span className="grid size-11 shrink-0 place-items-center rounded-[13px] border border-line bg-surface-2">
                        <Image
                          src={app.mark}
                          alt={app.name}
                          width={24}
                          height={24}
                          className="size-6"
                        />
                      </span>
                      <div>
                        <p className="ds-eyebrow">{app.category}</p>
                        <h3 className="text-lg font-semibold tracking-tight text-ink">
                          {app.name}
                        </h3>
                      </div>
                    </div>
                    <Icon
                      name="arrowRight"
                      size={16}
                      className="rtl-flip shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5 group-hover:text-ink"
                    />
                  </div>
                  <p className="mt-5 text-[0.96rem] leading-relaxed text-ink-2">
                    {app.summary}
                  </p>
                </div>

                <div className="mt-6 border-t border-line pt-4">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink">
                    <span>{copy.learnMore}</span>
                    <Icon name="arrowRight" size={13} className="rtl-flip" />
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Explore Browser Diagnostic Tools */}
      {toolsDict && (
        <section className="border-t border-line pt-16 sm:pt-20">
          <SectionHeader
            eyebrow={copy.webTools.eyebrow}
            title={copy.shop.exploreToolsTitle}
            lead={copy.shop.exploreToolsLead}
          />

          <div className="mt-10 grid gap-4 sm:mt-12 sm:grid-cols-2 lg:grid-cols-3">
            {toolKeys.map((key, idx) => {
              const tool = toolsDict[key];
              return (
                <Reveal key={key} delay={(idx % 3) * 80}>
                  <Link
                    href={toolPath(key, locale)}
                    className="ds-card ds-card-interactive group flex h-full flex-col justify-between p-6 sm:p-7"
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
                      <h3 className="ds-h4 mt-5 text-ink">{tool.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-ink-2">
                        {tool.subtitle}
                      </p>
                    </div>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
