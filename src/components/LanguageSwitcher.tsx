"use client";

import { uiText } from "@/i18n/ui";
import { usePathname, useRouter } from "next/navigation";
import { locales, type Locale } from "@/i18n/config";
import { findToolBySlug, toolPath } from "@/lib/tool-routes";

const names: Record<Locale, string> = {
  tr: "Türkçe",
  en: "English",
  de: "Deutsch",
  fr: "Français",
  es: "Español",
  it: "Italiano",
  pt: "Português",
  nl: "Nederlands",
  pl: "Polski",
  ru: "Русский",
  ar: "العربية",
  ja: "日本語",
  ko: "한국어",
  zh: "简体中文",
};

export function LanguageSwitcher({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const router = useRouter();

  function pathForLocale(target: Locale) {
    const segments = pathname.split("/");
    const tool = findToolBySlug(segments[2] ?? "");
    if (tool) return toolPath(tool, target);
    segments[1] = target;
    return segments.join("/") || `/${target}`;
  }

  return (
    <div
      className="language-selector header-language-selector"
      data-language-selector
    >
      <label className="sr-only" htmlFor="site-language">
        {uiText(locale, "Language", "Dil")}
      </label>
      <span className="language-selector__icon" aria-hidden="true">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
          <path d="M2 12h20" />
        </svg>
      </span>
      <span className="language-selector__code" aria-hidden="true">
        {locale.toUpperCase()}
      </span>
      <span className="language-selector__chevron" aria-hidden="true">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </span>
      <select
        id="site-language"
        value={locale}
        onChange={(event) => {
          const target = event.target.value as Locale;
          document.cookie = `ipscans-locale=${target}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`;
          router.push(pathForLocale(target));
        }}
        className="language-selector__select"
        aria-label={uiText(locale, "Language", "Dil")}
      >
        {locales.map((language) => (
          <option key={language} value={language}>
            {names[language]}
          </option>
        ))}
      </select>
    </div>
  );
}
