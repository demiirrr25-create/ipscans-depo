"use client";

import { usePathname, useRouter } from "next/navigation";
import { locales, type Locale } from "@/i18n/config";
import { findToolBySlug, toolPath } from "@/lib/tool-routes";

const names: Record<Locale, string> = {
  tr: "Türkçe", en: "English", de: "Deutsch", fr: "Français", es: "Español",
  it: "Italiano", pt: "Português", nl: "Nederlands", pl: "Polski",
  ru: "Русский", ar: "العربية", ja: "日本語", ko: "한국어", zh: "简体中文",
};

export function LanguageSwitcher({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const router = useRouter();

  function pathForLocale(target: Locale) {
    const segments = pathname.split("/");
    const tool = findToolBySlug(segments[2] ?? "");
    if (tool) return toolPath(tool, target);
    if (segments[2] === "blog" && segments[3] && target !== "en" && target !== "tr") {
      return `/${target}/blog`;
    }
    segments[1] = target;
    return segments.join("/") || `/${target}`;
  }

  return (
    <div className="flex items-center gap-1 text-sm">
      <label className="sr-only" htmlFor="site-language">Language / Dil</label>
      <select id="site-language" value={locale}
        onChange={(event) => {
          const target = event.target.value as Locale;
          document.cookie = `ipscans-locale=${target}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`;
          router.push(pathForLocale(target));
        }}
        className="min-h-11 max-w-24 rounded-lg border border-white/20 bg-neutral-950 px-2 text-white sm:max-w-32">
        {locales.map((language) => <option key={language} value={language}>{names[language]}</option>)}
      </select>
    </div>
  );
}
