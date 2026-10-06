import type { Locale } from "@/i18n/config";
import { locales } from "@/i18n/config";

export type ToolKey = "ipLookup" | "dns" | "whois" | "ports" | "speedTest";

export const toolKeys: ToolKey[] = [
  "ipLookup",
  "dns",
  "whois",
  "ports",
  "speedTest",
];

/**
 * Canonical, SEO-friendly slug per locale for each tool. The URL segment
 * that matches the current locale's slug renders the tool; any other
 * slug (an old link, or another locale's slug) redirects to the canonical one.
 */
export const toolSlugs: Record<ToolKey, Record<Locale, string>> = {
  ipLookup: {
    tr: "ip-sorgulama",
    en: "ip-lookup",
    de: "ip-suche",
    fr: "recherche-ip",
    es: "buscar-ip",
    it: "ip-lookup", pt: "ip-lookup", nl: "ip-lookup", pl: "ip-lookup",
    ru: "ip-lookup", ar: "ip-lookup", ja: "ip-lookup", ko: "ip-lookup", zh: "ip-lookup",
  },
  dns: {
    tr: "dns-sorgulama",
    en: "dns-lookup",
    de: "dns-abfrage",
    fr: "recherche-dns",
    es: "buscar-dns",
    it: "dns-lookup", pt: "dns-lookup", nl: "dns-lookup", pl: "dns-lookup",
    ru: "dns-lookup", ar: "dns-lookup", ja: "dns-lookup", ko: "dns-lookup", zh: "dns-lookup",
  },
  whois: {
    tr: "whois-sorgulama",
    en: "whois-lookup",
    de: "whois-abfrage",
    fr: "recherche-whois",
    es: "buscar-whois",
    it: "whois-lookup", pt: "whois-lookup", nl: "whois-lookup", pl: "whois-lookup",
    ru: "whois-lookup", ar: "whois-lookup", ja: "whois-lookup", ko: "whois-lookup", zh: "whois-lookup",
  },
  ports: {
    tr: "port-kontrol",
    en: "port-check",
    de: "port-pruefung",
    fr: "verification-port",
    es: "verificar-puerto",
    it: "port-check", pt: "port-check", nl: "port-check", pl: "port-check",
    ru: "port-check", ar: "port-check", ja: "port-check", ko: "port-check", zh: "port-check",
  },
  speedTest: {
    tr: "hiz-testi",
    en: "speed-test",
    de: "geschwindigkeitstest",
    fr: "test-de-vitesse",
    es: "test-de-velocidad",
    it: "speed-test", pt: "speed-test", nl: "speed-test", pl: "speed-test",
    ru: "speed-test", ar: "speed-test", ja: "speed-test", ko: "speed-test", zh: "speed-test",
  },
};

export function toolPath(key: ToolKey, locale: Locale): string {
  return `/${locale}/${toolSlugs[key][locale]}`;
}

/** Finds which tool a URL slug refers to, regardless of which locale it was written for. */
export function findToolBySlug(slug: string): ToolKey | null {
  for (const key of toolKeys) {
    if (locales.some((l) => toolSlugs[key][l] === slug)) return key;
  }
  return null;
}
