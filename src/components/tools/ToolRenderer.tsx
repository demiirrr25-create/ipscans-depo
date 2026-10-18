import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { toolKeys, toolPath, type ToolKey } from "@/lib/tool-routes";
import { IpLookupForm } from "@/components/IpLookupForm";
import { DnsLookupForm } from "@/components/DnsLookupForm";
import { WhoisForm } from "@/components/WhoisForm";
import { PortCheckForm } from "@/components/PortCheckForm";
import { SpeedTest } from "@/components/SpeedTest";
import { toolCopy } from "@/components/tools/copy";
import { Icon, type IconName } from "@/components/ds/Icon";

const toolIcons: Record<ToolKey, IconName> = {
  ipLookup: "globe",
  dns: "dns",
  whois: "search",
  ports: "plug",
  speedTest: "gauge",
};

export function ToolRenderer({
  toolKey,
  locale,
  dict,
}: {
  toolKey: ToolKey;
  locale: Locale;
  dict: Dictionary;
}) {
  const copy = toolCopy[locale];
  const otherKeys = toolKeys.filter((k) => k !== toolKey);

  const switcher = (
    <nav
      aria-label={copy.switcher}
      className="mb-8 flex justify-start sm:justify-center"
    >
      <div className="ds-rail max-w-full rounded-full border border-line bg-surface-dim p-1.5 shadow-soft">
        {toolKeys.map((key) => {
          const isCurrent = key === toolKey;
          return (
            <Link
              key={key}
              href={toolPath(key, locale)}
              aria-current={isCurrent ? "page" : undefined}
              className={`inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                isCurrent
                  ? "bg-surface text-ink shadow-soft"
                  : "text-ink-2 hover:bg-surface/60 hover:text-ink"
              }`}
            >
              <Icon
                name={toolIcons[key]}
                size={16}
                className={isCurrent ? "text-signal" : "text-ink-3"}
              />
              <span>{dict[key].title}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );

  const moreTools = (
    <section className="mt-20 border-t border-line pt-16 sm:mt-24 sm:pt-20">
      <div className="max-w-[680px]">
        <p className="ds-eyebrow mb-4">{copy.switcher}</p>
        <h2 className="ds-h2 text-ink">{copy.more.title}</h2>
        <p className="ds-lead mt-4">{copy.more.lead}</p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {otherKeys.map((key) => (
          <Link
            key={key}
            href={toolPath(key, locale)}
            className="ds-card ds-card-interactive group flex flex-col justify-between p-6 sm:p-7"
          >
            <div>
              <span className="mb-5 grid size-11 place-items-center rounded-[13px] bg-signal-soft text-signal transition-transform duration-500 ease-out-expo group-hover:scale-105">
                <Icon name={toolIcons[key]} size={20} />
              </span>
              <h3 className="ds-h4 text-ink">{dict[key].title}</h3>
              <p className="ds-caption mt-2 line-clamp-3">
                {dict[key].subtitle}
              </p>
            </div>
            <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-ink">
              <span className="ds-link">{copy.more.open}</span>
              <Icon
                name="arrowRight"
                size={15}
                className="rtl-flip transition-transform duration-300 group-hover:translate-x-1"
              />
            </span>
          </Link>
        ))}
      </div>

      <div className="ds-card-muted mt-6 flex flex-col justify-between gap-6 p-6 sm:flex-row sm:items-center sm:p-8">
        <div className="flex items-start gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-[13px] bg-signal-soft text-signal">
            <Icon name="network" size={20} />
          </span>
          <div>
            <h3 className="ds-h4 text-ink">{copy.more.desktopTitle}</h3>
            <p className="ds-body mt-1.5 max-w-[640px]">
              {copy.more.desktopBody}
            </p>
          </div>
        </div>
        <Link
          href={`/${locale}/applications/scanner`}
          className="btn btn-secondary shrink-0 self-start sm:self-center"
        >
          <span>{copy.more.desktopCta}</span>
          <Icon name="arrowRight" size={16} className="btn-arrow rtl-flip" />
        </Link>
      </div>
    </section>
  );

  if (toolKey === "speedTest") {
    return (
      <div className="pb-24 sm:pb-32">
        <div className="ds-container pt-[calc(var(--header-h)+24px)] sm:pt-[calc(var(--header-h)+36px)]">
          {switcher}
        </div>
        <div className="[&>div]:!pt-2 [&>div]:!pb-0">
          <SpeedTest dict={dict.speedTest} locale={locale} />
        </div>
        <div className="ds-container">{moreTools}</div>
      </div>
    );
  }

  let form: React.ReactNode;
  switch (toolKey) {
    case "ipLookup":
      form = <IpLookupForm dict={dict.ipLookup} locale={locale} />;
      break;
    case "dns":
      form = <DnsLookupForm dict={dict.dns} locale={locale} />;
      break;
    case "whois":
      form = <WhoisForm dict={dict.whois} locale={locale} />;
      break;
    case "ports":
      form = <PortCheckForm dict={dict.ports} locale={locale} />;
      break;
  }

  return (
    <div>
      {switcher}
      {form}
      {moreTools}
    </div>
  );
}

export function toolMeta(toolKey: ToolKey, dict: Dictionary) {
  switch (toolKey) {
    case "ipLookup":
      return { title: dict.ipLookup.title, subtitle: dict.ipLookup.subtitle };
    case "dns":
      return { title: dict.dns.title, subtitle: dict.dns.subtitle };
    case "whois":
      return { title: dict.whois.title, subtitle: dict.whois.subtitle };
    case "ports":
      return { title: dict.ports.title, subtitle: dict.ports.subtitle };
    case "speedTest":
      return { title: dict.speedTest.title, subtitle: dict.speedTest.subtitle };
  }
}
