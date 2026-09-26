import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import type { ToolKey } from "@/lib/tool-routes";
import { IpLookupForm } from "@/components/IpLookupForm";
import { DnsLookupForm } from "@/components/DnsLookupForm";
import { WhoisForm } from "@/components/WhoisForm";
import { PortCheckForm } from "@/components/PortCheckForm";
import { SpeedTest } from "@/components/SpeedTest";

export function ToolRenderer({
  toolKey,
  locale,
  dict,
}: {
  toolKey: ToolKey;
  locale: Locale;
  dict: Dictionary;
}) {
  switch (toolKey) {
    case "ipLookup":
      return <IpLookupForm dict={dict.ipLookup} />;
    case "dns":
      return <DnsLookupForm dict={dict.dns} />;
    case "whois":
      return <WhoisForm dict={dict.whois} />;
    case "ports":
      return <PortCheckForm dict={dict.ports} locale={locale} />;
    case "speedTest":
      return <SpeedTest dict={dict.speedTest} locale={locale} />;
  }
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
