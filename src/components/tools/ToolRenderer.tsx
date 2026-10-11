import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import type { ToolKey } from "@/lib/tool-routes";
import { IpLookupForm } from "@/components/IpLookupForm";
import { DnsLookupForm } from "@/components/DnsLookupForm";
import { WhoisForm } from "@/components/WhoisForm";
import { PortCheckForm } from "@/components/PortCheckForm";
import { SpeedTest } from "@/components/SpeedTest";
import { uiText } from '@/i18n/ui';

export function ToolRenderer({
  toolKey,
  locale,
  dict,
}: {
  toolKey: ToolKey;
  locale: Locale;
  dict: Dictionary;
}) {
  let form: React.ReactNode;
  switch (toolKey) {
    case "ipLookup":
      form = <IpLookupForm dict={dict.ipLookup} />; break;
    case "dns":
      form = <DnsLookupForm dict={dict.dns} />; break;
    case "whois":
      form = <WhoisForm dict={dict.whois} />; break;
    case "ports":
      form = <PortCheckForm dict={dict.ports} locale={locale} />; break;
    case "speedTest":
      return <SpeedTest dict={dict.speedTest} locale={locale} />;
  }
  return <section className="tool-workspace"><div className="tool-workspace-rail"><span>IPSCANS / {toolKey.toUpperCase()}</span><span>{uiText(locale,'REQUEST → RESULT','SORGU → SONUÇ')}</span></div><div className="tool-workspace-body"><aside><p className="infinity-eyebrow">01 / {uiText(locale,'INPUT','GİRDİ')}</p><h2>{dict[toolKey].title}</h2><p>{dict[toolKey].subtitle}</p><div className="tool-signal" aria-hidden="true"><i/><i/><i/><i/><i/><i/><i/><i/></div></aside><div>{form}</div></div></section>;
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
