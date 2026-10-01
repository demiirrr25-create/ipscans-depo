"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { Logo } from "./Logo";
import { toolPath } from "@/lib/tool-routes";

export function Header({
  locale,
  dict,
}: {
  locale: Locale;
  dict: Dictionary;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const toolsRef = useRef<HTMLDivElement>(null);
  const toolsButtonRef = useRef<HTMLButtonElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuLabel = { tr: "Menü", en: "Menu", de: "Menü", fr: "Menu", es: "Menú" }[locale];

  const tools = [
    { href: toolPath("ipLookup", locale), label: dict.nav.ipLookup },
    { href: toolPath("dns", locale), label: dict.nav.dns },
    { href: toolPath("whois", locale), label: dict.nav.whois },
    { href: toolPath("ports", locale), label: dict.nav.ports },
    { href: toolPath("speedTest", locale), label: dict.nav.speedTest },
    { href: `/${locale}/download`, label: dict.nav.appDownload },
  ];
  const topLinks = [
    { href: `/${locale}`, label: dict.nav.home },
    { href: `/${locale}/ipcast`, label: dict.nav.ipcast },
    { href: `/${locale}/pro`, label: dict.nav.pro },
    { href: `/${locale}/shop`, label: dict.nav.shop },
    { href: `/${locale}/scan`, label: dict.nav.scan },
    { href: `/${locale}/blog`, label: dict.nav.blog },
  ];

  function isActive(href: string) {
    if (href === `/${locale}`) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }
  const toolsActive = tools.some((t) => isActive(t.href));

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) {
        setToolsOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setToolsOpen(false);
    setOpen(false);
  }

  return (
    <header className="sticky top-0 z-50 glass" onKeyDown={(event) => {
      if (event.key !== "Escape") return;
      if (toolsOpen) { setToolsOpen(false); toolsButtonRef.current?.focus(); }
      else if (open) { setOpen(false); menuButtonRef.current?.focus(); }
    }}>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href={`/${locale}`} className="flex items-center gap-2 group">
          <Logo size={36} />
          <span className="text-lg font-semibold tracking-tight font-[family-name:var(--font-display)]">
            ipscans
          </span>
        </Link>

        <nav aria-label={menuLabel} className="hidden items-center gap-1 xl:flex">
          <Link
            href={`/${locale}`}
            aria-current={isActive(`/${locale}`) ? "page" : undefined}
            className={`rounded-lg px-3 py-2 text-sm transition ${
              isActive(`/${locale}`)
                ? "text-white bg-white/5"
                : "text-neutral-300 hover:text-white hover:bg-white/5"
            }`}
          >
            {dict.nav.home}
          </Link>

          <div className="relative" ref={toolsRef} onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setToolsOpen(false);
          }}>
            <button
              type="button"
              ref={toolsButtonRef}
              aria-expanded={toolsOpen}
              aria-controls="desktop-tools"
              onClick={() => setToolsOpen((v) => !v)}
              className={`flex items-center gap-1 rounded-lg px-3 py-2 text-sm transition ${
                toolsActive
                  ? "text-white bg-white/5"
                  : "text-neutral-300 hover:text-white hover:bg-white/5"
              }`}
            >
              {dict.nav.tools}
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={`transition ${toolsOpen ? "rotate-180" : ""}`}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {toolsOpen && (
              <div id="desktop-tools" className="absolute left-0 mt-2 w-56 overflow-hidden rounded-xl bg-neutral-950 border border-white/15 p-1 shadow-2xl">
                {tools.map((t) => (
                  <Link
                    key={t.href}
                    href={t.href}
                    aria-current={isActive(t.href) ? "page" : undefined}
                    onClick={() => setToolsOpen(false)}
                    className={`block rounded-lg px-3 py-2 text-sm transition ${
                      isActive(t.href)
                        ? "text-white bg-white/10"
                        : "text-neutral-300 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {t.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {topLinks.slice(1).map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(link.href) ? "page" : undefined}
              className={`rounded-lg px-3 py-2 text-sm transition ${
                isActive(link.href)
                  ? "text-white bg-white/5"
                  : "text-neutral-300 hover:text-white hover:bg-white/5"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1 sm:gap-3">
          <LanguageSwitcher locale={locale} />
          <button
            type="button"
            ref={menuButtonRef}
            aria-label={menuLabel}
            aria-expanded={open}
            aria-controls="mobile-navigation"
            onClick={() => setOpen((v) => !v)}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-neutral-300 hover:bg-white/5 xl:hidden"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-navigation" aria-label={menuLabel} className="max-h-[calc(100dvh-80px)] overflow-y-auto border-t border-white/10 bg-neutral-950 px-4 py-2 xl:hidden">
          {[topLinks[0], ...tools, ...topLinks.slice(1)].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(link.href) ? "page" : undefined}
              onClick={() => setOpen(false)}
              className={`flex min-h-11 items-center rounded-lg px-3 py-2 text-sm ${
                isActive(link.href)
                  ? "text-white bg-white/5"
                  : "text-neutral-300 hover:bg-white/5"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
