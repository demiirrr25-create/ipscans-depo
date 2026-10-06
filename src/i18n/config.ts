export const locales = ["en", "tr", "de", "es", "fr", "it", "pt", "nl", "pl", "ru", "ar", "ja", "ko", "zh"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

/** BCP-47 language tags, used for hreflang/inLanguage and Open Graph locale. */
export const localeTags: Record<Locale, string> = {
  en: "en-US",
  tr: "tr-TR",
  de: "de-DE",
  es: "es-ES",
  fr: "fr-FR",
  it: "it-IT",
  pt: "pt-PT",
  nl: "nl-NL",
  pl: "pl-PL",
  ru: "ru-RU",
  ar: "ar-SA",
  ja: "ja-JP",
  ko: "ko-KR",
  zh: "zh-CN",
};

export const ogLocales: Record<Locale, string> = {
  en: "en_US",
  tr: "tr_TR",
  de: "de_DE",
  es: "es_ES",
  fr: "fr_FR",
  it: "it_IT",
  pt: "pt_PT",
  nl: "nl_NL",
  pl: "pl_PL",
  ru: "ru_RU",
  ar: "ar_SA",
  ja: "ja_JP",
  ko: "ko_KR",
  zh: "zh_CN",
};
