import { defaultLocale, locales, type Locale } from "@/i18n/config";

export function localizedAlternates(locale: Locale, path: string) {
  return {
    canonical: `/${locale}${path}`,
    languages: {
      ...Object.fromEntries(locales.map((language) => [language, `/${language}${path}`])),
      "x-default": `/${defaultLocale}${path}`,
    },
  };
}
