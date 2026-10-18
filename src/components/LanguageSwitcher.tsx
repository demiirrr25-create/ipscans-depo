"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { uiText } from "@/i18n/ui";
import { locales, type Locale } from "@/i18n/config";
import { findToolBySlug, toolPath } from "@/lib/tool-routes";
import { Icon } from "./ds/Icon";

const names: Record<Locale, string> = {
  en: "English",
  tr: "Türkçe",
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
  zh: "中文",
};

function persistLocaleCookie(target: Locale) {
  if (typeof document === "undefined") return;
  document.cookie = `ipscans-locale=${target}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`;
}

export function LanguageSwitcher({
  locale,
  placement = "down",
  tone = "light",
}: {
  locale: Locale;
  placement?: "down" | "up";
  tone?: "light" | "dark";
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pathForLocale(target: Locale) {
    const segments = pathname.split("/");
    const tool = findToolBySlug(segments[2] ?? "");
    if (tool) return toolPath(tool, target);
    segments[1] = target;
    return segments.join("/") || `/${target}`;
  }

  function choose(target: Locale) {
    setOpen(false);
    if (target === locale) return;
    persistLocaleCookie(target);
    router.push(pathForLocale(target));
  }

  const label = uiText(locale, "Language", "Dil");

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className={`inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-[0.88rem] font-medium transition-colors ${
          tone === "dark"
            ? "text-on-stage-2 hover:bg-white/10 hover:text-white"
            : "text-ink-2 hover:bg-surface-2 hover:text-ink"
        }`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label}: ${names[locale]}`}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="globe" size={17} />
        <span className="uppercase">{locale}</span>
      </button>
      <div
        className={`absolute z-[60] w-56 rounded-[18px] ${
          placement === "up"
            ? "bottom-[calc(100%+8px)] start-1/2 -translate-x-1/2 origin-bottom rtl:translate-x-1/2"
            : "end-0 top-[calc(100%+8px)] origin-top-right"
        } border border-line bg-[var(--surface)] p-1.5 shadow-lift transition-[opacity,transform] duration-300 ease-out-expo ${
          open ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"
        }`}
      >
        <ul role="listbox" aria-label={label} className="max-h-[60vh] overflow-y-auto">
          {locales.map((l) => (
            <li key={l} role="option" aria-selected={l === locale}>
              <button
                type="button"
                tabIndex={open ? 0 : -1}
                onClick={() => choose(l)}
                lang={l}
                className={`flex w-full items-center justify-between rounded-[12px] px-3 py-2 text-start text-[0.92rem] transition-colors ${
                  l === locale ? "bg-surface-2 font-medium text-ink" : "text-ink-2 hover:bg-surface-dim hover:text-ink"
                }`}
              >
                {names[l]}
                {l === locale && <Icon name="check" size={16} className="text-signal" />}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
