import type { Locale } from "@/i18n/config";

export type ToolKey = "ipLookup" | "dns" | "whois" | "ports" | "speedTest";

/**
 * Canonical, SEO-friendly slug per locale for each tool. The folder that
 * matches the locale's slug renders the tool; the other locale's folder
 * (kept for backward-compatible / old links) redirects to the canonical one.
 */
export const toolSlugs: Record<ToolKey, Record<Locale, string>> = {
  ipLookup: { tr: "ip-sorgulama", en: "ip-lookup" },
  dns: { tr: "dns-sorgulama", en: "dns-lookup" },
  whois: { tr: "whois-sorgulama", en: "whois-lookup" },
  ports: { tr: "port-kontrol", en: "port-check" },
  speedTest: { tr: "hiz-testi", en: "speed-test" },
};

export function toolPath(key: ToolKey, locale: Locale): string {
  return `/${locale}/${toolSlugs[key][locale]}`;
}
