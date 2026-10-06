"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { Logo } from "./Logo";
import { toolKeys, toolPath } from "@/lib/tool-routes";
import { applications, platformCopy } from "@/content/applications";

export function Header({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobile, setMobile] = useState(false);
  const [mega, setMega] = useState(false);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [active, setActive] = useState(0);
  const searchInput = useRef<HTMLInputElement>(null);
  const searchBox = useRef<HTMLDivElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const toolsButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
        searchInput.current?.focus();
      }
    }
    function outside(event: PointerEvent) {
      if (!searchBox.current?.contains(event.target as Node)) setSearchOpen(false);
    }
    window.addEventListener("keydown", shortcut);
    document.addEventListener("pointerdown", outside);
    return () => {
      window.removeEventListener("keydown", shortcut);
      document.removeEventListener("pointerdown", outside);
    };
  }, []);

  const items = [
    ...applications.map((app) => ({
      name: app.name, description: app.description[locale],
      href: `/${locale}/applications/${app.id}`, group: platformCopy[locale].applications,
      icon: app.icon,
    })),
    ...toolKeys.map((key) => ({
      name: dict[key].title, description: dict[key].subtitle,
      href: toolPath(key, locale), group: dict.experience.networkTools, icon: "",
    })),
    { name: "IPscans+", description: dict.experience.scanner.intro,
      href: `/${locale}/ip-scanner`, group: dict.experience.networkTools, icon: "" },
  ];
  const results = query.trim()
    ? items.filter((item) => `${item.name} ${item.description} ${item.group}`.toLocaleLowerCase(locale).includes(query.trim().toLocaleLowerCase(locale))).slice(0, 8)
    : items.slice(0, 6);
  const nav = [
    { href: `/${locale}`, name: dict.nav.home },
    { href: `/${locale}/download`, name: platformCopy[locale].applications },
    { href: `/${locale}/ip-scanner`, name: "IPscans+" },
    { href: `/${locale}/scan`, name: dict.experience.networkTools },
    { href: `/${locale}/blog`, name: dict.experience.resources },
  ];
  function select(href: string) {
    setSearchOpen(false);
    setQuery("");
    setMobile(false);
    router.push(href);
  }
  return (
    <header className="site-header sticky top-0 z-50 border-b border-white/10 bg-black/90 backdrop-blur-xl"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          if (searchOpen) { setSearchOpen(false); searchInput.current?.focus(); }
          else if (mega) { setMega(false); toolsButton.current?.focus(); }
          else if (mobile) { setMobile(false); menuButton.current?.focus(); }
        }
      }}>
      <div className="mx-auto flex min-h-18 max-w-7xl items-center justify-between gap-4 px-4">
        <Link href={`/${locale}`} aria-label="IPScans home" className="flex shrink-0 items-center gap-2">
          <Logo size={34} /><span className="hidden text-lg font-semibold tracking-tight min-[400px]:inline">ipscans<span className="text-neutral-500">.</span></span>
        </Link>
        <nav aria-label={dict.nav.tools} className="hidden items-center gap-1 lg:flex">
          <Link href={`/${locale}`} aria-current={pathname === `/${locale}` ? "page" : undefined} className="nav-link">{dict.nav.home}</Link>
          <div className="relative" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setMega(false); }}>
            <button ref={toolsButton} type="button" aria-expanded={mega} aria-controls="tools-mega" onClick={() => setMega(!mega)}
              className="nav-link min-h-11">{platformCopy[locale].applications} <span aria-hidden="true">⌄</span></button>
            {mega && <div id="tools-mega" className="mega-panel absolute start-0 top-full mt-3 grid w-[min(760px,calc(100vw-2rem))] max-h-[70vh] gap-5 overflow-y-auto rounded-2xl border border-white/20 bg-neutral-950 p-6 shadow-2xl sm:grid-cols-2">
              {[platformCopy[locale].applications, dict.experience.networkTools].map((group) => (
                <div key={group}>
                  <p className="mb-3 border-b border-white/10 pb-2 text-xs font-semibold uppercase tracking-widest text-neutral-400">{group}</p>
                  {items.filter((item) => item.group === group).map((item) => (
                    <Link key={item.href} href={item.href} onClick={() => setMega(false)} className="flex gap-3 rounded-xl p-3 hover:bg-white/10 focus:bg-white/10">
                      <span aria-hidden="true" className="text-neutral-400">{item.icon ? "◈" : "⌁"}</span>
                      <span><span className="block text-sm font-semibold">{item.name}</span><span className="mt-1 block line-clamp-2 text-xs text-neutral-400">{item.description}</span></span>
                    </Link>
                  ))}
                </div>
              ))}
            </div>}
          </div>
          {nav.slice(2, 5).map((item) => <Link key={item.href} href={item.href} aria-current={pathname === item.href ? "page" : undefined} className="nav-link">{item.name}</Link>)}
        </nav>
        <div className="flex items-center gap-2">
          <div ref={searchBox} className="site-search relative">
            <div className="flex min-h-11 items-center rounded-lg border border-white/20 bg-white/[0.04] px-3 focus-within:border-white/70">
              <span aria-hidden="true" className="text-neutral-400">⌕</span>
              <input id="site-search-input" ref={searchInput} type="text" inputMode="search" value={query} role="combobox"
                aria-label={dict.experience.searchPlaceholder} aria-expanded={searchOpen}
                aria-controls="site-search-results" aria-autocomplete="list"
                aria-activedescendant={searchOpen && results[active] ? `site-result-${active}` : undefined}
                onFocus={() => setSearchOpen(true)}
                onChange={(event) => { setQuery(event.target.value); setActive(0); setSearchOpen(true); }}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown") { event.preventDefault(); setSearchOpen(true); setActive((index) => Math.min(index + 1, results.length - 1)); }
                  if (event.key === "ArrowUp") { event.preventDefault(); setActive((index) => Math.max(0, index - 1)); }
                  if (event.key === "Enter" && searchOpen && results[active]) { event.preventDefault(); select(results[active].href); }
                }}
                placeholder={dict.experience.searchPlaceholder}
                className="w-28 bg-transparent px-2 text-sm text-white outline-none placeholder:text-neutral-400 sm:w-44 xl:w-52" />
              <kbd className="hidden rounded border border-white/20 px-1.5 text-xs text-neutral-400 xl:inline">⌘ K</kbd>
            </div>
            {searchOpen && <div id="site-search-results" role="listbox" aria-label={dict.experience.searchPlaceholder}
              className="search-results absolute end-0 top-full mt-2 max-h-[min(65dvh,520px)] w-[min(430px,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-white/20 bg-neutral-950 p-2 shadow-2xl">
              {results.length ? results.map((item, index) => (
                <button key={item.href} id={`site-result-${index}`} role="option" aria-selected={active === index}
                  type="button" onMouseEnter={() => setActive(index)} onClick={() => select(item.href)}
                  className="flex min-h-14 w-full items-center gap-3 rounded-lg px-3 py-2 text-start hover:bg-white/10 aria-selected:bg-white/10">
                  <span aria-hidden="true" className="text-lg text-neutral-400">{item.icon ? "◈" : "⌁"}</span>
                  <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{item.name}</span><span className="block truncate text-xs text-neutral-400">{item.description}</span></span>
                  <span className="text-[10px] text-neutral-400">{item.group}</span>
                </button>
              )) : <p className="p-4 text-sm text-neutral-300">{dict.experience.noResults}</p>}
            </div>}
          </div>
          <LanguageSwitcher locale={locale} />
          <button ref={menuButton} type="button" aria-label={dict.nav.tools} aria-controls="mobile-navigation" aria-expanded={mobile} onClick={() => setMobile(!mobile)}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-white/15 text-xl lg:hidden">{mobile ? "×" : "☰"}</button>
        </div>
      </div>
      {mobile && <nav id="mobile-navigation" aria-label={dict.nav.tools} className="max-h-[calc(100dvh-72px)] overflow-y-auto border-t border-white/10 bg-neutral-950 px-4 py-3 lg:hidden">
        {nav.map((item) => <Link key={item.href} href={item.href} onClick={() => setMobile(false)} className="flex min-h-12 items-center rounded-lg px-3 text-sm text-neutral-200 hover:bg-white/10">{item.name}</Link>)}
        <p className="mt-4 border-t border-white/10 px-3 pt-4 text-xs font-semibold uppercase tracking-widest text-neutral-400">{dict.nav.tools}</p>
        {items.map((item) => <Link key={item.href} href={item.href} onClick={() => setMobile(false)} className="flex min-h-12 items-center rounded-lg px-3 text-sm text-neutral-200 hover:bg-white/10">{item.name}</Link>)}
      </nav>}
    </header>
  );
}
