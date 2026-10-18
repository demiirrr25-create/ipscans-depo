import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { toolKeys, toolPath, type ToolKey } from "@/lib/tool-routes";
import { IpLookupForm } from "@/components/IpLookupForm";
import { DnsLookupForm } from "@/components/DnsLookupForm";
import { WhoisForm } from "@/components/WhoisForm";
import { PortCheckForm } from "@/components/PortCheckForm";
import { SpeedTest } from "@/components/SpeedTest";
import { uiText } from "@/i18n/ui";

export function ToolRenderer({
  toolKey,
  locale,
  dict,
}: {
  toolKey: ToolKey;
  locale: Locale;
  dict: Dictionary;
}) {
  const navBar = (
    <nav
      className="mx-auto mb-8 flex max-w-fit flex-wrap items-center justify-center gap-1 rounded-full border border-white/[0.08] bg-black/60 backdrop-blur-md p-1.5 text-xs shadow-2xl"
      aria-label={uiText(locale, "Browser diagnostic tools", "Tarayıcı tanı araçları")}
    >
      {toolKeys.map((key) => {
        const isCurrent = key === toolKey;
        return (
          <Link
            key={key}
            href={toolPath(key, locale)}
            aria-current={isCurrent ? "page" : undefined}
            className={`rounded-full px-4 py-1.5 font-medium transition-all duration-200 ${
              isCurrent
                ? "bg-white text-black shadow-sm"
                : "text-[#A1A1A1] hover:bg-[#1A1A1A] hover:text-white"
            }`}
          >
            <span>{dict[key].title}</span>
          </Link>
        );
      })}
    </nav>
  );

  if (toolKey === "speedTest") {
    return (
      <div className="w-full">
        {navBar}
        <SpeedTest dict={dict.speedTest} locale={locale} />
      </div>
    );
  }

  let form: React.ReactNode;
  switch (toolKey) {
    case "ipLookup":
      form = <IpLookupForm dict={dict.ipLookup} />;
      break;
    case "dns":
      form = <DnsLookupForm dict={dict.dns} />;
      break;
    case "whois":
      form = <WhoisForm dict={dict.whois} />;
      break;
    case "ports":
      form = <PortCheckForm dict={dict.ports} locale={locale} />;
      break;
  }

  return (
    <div className="agy-tool-stage">
      {navBar}
      <section className="agy-tool-card">
        <div className="agy-tool-card__header">
          <div>
            <span className="agy-page-hero__eyebrow">
              <span className="agy-page-hero__dot" aria-hidden="true" />
              <span>IPSCANS · {toolKey.toUpperCase()}</span>
            </span>
            <h2 className="heading-4 mt-2 text-white">{dict[toolKey].title}</h2>
            <p className="body mt-2 text-[#9aa0a6]">{dict[toolKey].subtitle}</p>
          </div>
        </div>
        <div className="agy-tool-card__body">{form}</div>
      </section>
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
