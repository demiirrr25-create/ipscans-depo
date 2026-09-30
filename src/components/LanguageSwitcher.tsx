"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { locales, type Locale } from "@/i18n/config";
import { findToolBySlug, toolPath } from "@/lib/tool-routes";

const names = { tr: "Türkçe", en: "English", de: "Deutsch", fr: "Français", es: "Español" };
const labels = { tr: "Dil", en: "Language", de: "Sprache", fr: "Langue", es: "Idioma" };

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
    <div className="flex items-center gap-1 text-sm">
      <label className="sr-only" htmlFor="site-language">{labels[locale]}</label>
      <select id="site-language" value={locale}
        onChange={(event) => router.push(pathForLocale(event.target.value as Locale))}
        className="min-h-11 max-w-28 rounded-lg border border-white/20 bg-neutral-950 px-2 text-white sm:hidden">
        {locales.map((language) => <option key={language} value={language}>{names[language]}</option>)}
      </select>
      {locales.map((l) => (
        <Link
          key={l}
          href={pathForLocale(l)}
          hrefLang={l}
          lang={l}
          aria-label={names[l]}
          aria-current={l === locale ? "true" : undefined}
          className={`hidden min-h-11 min-w-11 items-center justify-center rounded-md px-2 py-1 uppercase transition sm:inline-flex ${
            l === locale
              ? "bg-white text-black font-semibold"
              : "text-neutral-400 hover:text-white"
          }`}
        >
          {l}
        </Link>
      ))}
    </div>
  );
}
