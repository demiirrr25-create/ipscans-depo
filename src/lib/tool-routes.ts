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
  },
  dns: {
    tr: "dns-sorgulama",
    en: "dns-lookup",
    de: "dns-abfrage",
    fr: "recherche-dns",
    es: "buscar-dns",
  },
  whois: {
    tr: "whois-sorgulama",
    en: "whois-lookup",
    de: "whois-abfrage",
    fr: "recherche-whois",
    es: "buscar-whois",
  },
  ports: {
    tr: "port-kontrol",
    en: "port-check",
    de: "port-pruefung",
    fr: "verification-port",
    es: "verificar-puerto",
  },
  speedTest: {
    tr: "hiz-testi",
    en: "speed-test",
    de: "geschwindigkeitstest",
    fr: "test-de-vitesse",
    es: "test-de-velocidad",
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
