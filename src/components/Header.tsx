"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { uiText } from "@/i18n/ui";
import type { Locale } from "@/i18n/config";
import type { PublicDictionary } from "@/i18n/dictionaries";
import { toolKeys, toolPath, type ToolKey } from "@/lib/tool-routes";
import { applications, platformCopy } from "@/content/applications";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { LogoLockup } from "./Logo";
import { Icon, type IconName } from "./ds/Icon";

type PanelId = "products" | "tools" | "resources";

const toolIcons: Record<ToolKey, IconName> = {
  ipLookup: "globe",
  dns: "dns",
  whois: "search",
  ports: "plug",
  speedTest: "gauge",
};

export function Header({
  locale,
  dict,
}: {
  locale: Locale;
  dict: PublicDictionary;
  articles?: { name: string; description: string; href: string }[];
}) {
  const pathname = usePathname();
  const [panel, setPanel] = useState<{ path: string; id: PanelId | null }>({ path: pathname, id: null });
  const [mobile, setMobile] = useState<{ path: string; open: boolean }>({ path: pathname, open: false });
  const [mobileSection, setMobileSection] = useState<PanelId | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Derive open state from the current path so navigation closes menus without effects.
  const activePanel = panel.path === pathname ? panel.id : null;
  const mobileOpen = mobile.path === pathname ? mobile.open : false;
  const openPanel = (id: PanelId | null) => setPanel({ path: pathname, id });
  const setMobileOpen = (open: boolean) => setMobile({ path: pathname, open });

  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        setScrolled(y > 8);
        setHidden(y > 160 && y > lastY + 2);
        if (y < lastY - 2 || y <= 160) setHidden(false);
        lastY = y;
        ticking = false;
      });
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPanel((p) => ({ ...p, id: null }));
        setMobile((m) => ({ ...m, open: false }));
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    document.documentElement.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [mobileOpen]);

  const copy = platformCopy[locale];
  const scanner = applications.find((a) => a.id === "scanner");
  const ipcast = applications.find((a) => a.id === "ipcast");

  const products = [
    {
      name: "IPscans+",
      href: `/${locale}/applications/scanner`,
      icon: "/scanner-mark.svg",
      desc: scanner?.description[locale] ?? "",
    },
    {
      name: "IPCast",
      href: `/${locale}/applications/ipcast`,
      icon: "/ipcast-mark.svg",
      desc: ipcast?.description[locale] ?? "",
    },
    {
      name: "LPR Pro",
      href: `/${locale}/lpr-pro`,
      icon: "/lpr-mark.svg",
      desc: uiText(locale, "License plate recognition for gates and parking", "Bariyer ve otoparklar için plaka tanıma"),
    },
    {
      name: "Cortex",
      href: `/${locale}/cortex`,
      icon: "/cortex-mark.svg",
      desc: uiText(locale, "Local AI rules engine for visual monitoring", "Görsel izleme için yerel yapay zekâ kural motoru"),
    },
  ];

  const tools = toolKeys.map((key) => ({
    key,
    name: dict[key].title,
    desc: dict[key].subtitle,
    href: toolPath(key, locale),
    icon: toolIcons[key],
  }));

  const resources = [
    { name: dict.nav.blog, href: `/${locale}/blog`, icon: "book" as IconName },
    { name: uiText(locale, "Help & support", "Yardım ve destek"), href: `/${locale}/support`, icon: "info" as IconName },
    { name: uiText(locale, "About", "Hakkımızda"), href: `/${locale}/about`, icon: "sparkle" as IconName },
    { name: uiText(locale, "Contact", "İletişim"), href: `/${locale}/contact`, icon: "mail" as IconName },
    { name: dict.nav.shop, href: `/${locale}/shop`, icon: "cpu" as IconName },
  ];

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const hoverOpen = (id: PanelId) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    openPanel(id);
  };
  const hoverClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => openPanel(null), 160);
  };

  const solid = scrolled || activePanel !== null || mobileOpen;

  const navTrigger = (id: PanelId, label: string) => (
    <button
      type="button"
      className={`group inline-flex h-10 items-center gap-1 rounded-full px-4 text-[0.92rem] font-medium transition-colors duration-200 ${
        activePanel === id ? "bg-surface-2 text-ink" : "text-ink-2 hover:bg-surface-2 hover:text-ink"
      }`}
      aria-expanded={activePanel === id}
      aria-controls={`nav-panel-${id}`}
      onClick={() => openPanel(activePanel === id ? null : id)}
      onMouseEnter={() => hoverOpen(id)}
      onMouseLeave={hoverClose}
    >
      {label}
      <Icon
        name="chevronDown"
        size={16}
        className={`transition-transform duration-300 ease-out-expo ${activePanel === id ? "rotate-180" : ""}`}
      />
    </button>
  );

  return (
    <>
      <header
        data-solid={solid}
        className={`fixed inset-x-0 top-0 z-50 transition-[transform,background-color,box-shadow,backdrop-filter] duration-500 ease-out-expo ${
          hidden && !activePanel && !mobileOpen ? "-translate-y-full" : "translate-y-0"
        } ${solid ? "bg-white/80 shadow-[0_1px_0_var(--color-line)] backdrop-blur-xl backdrop-saturate-150" : "bg-transparent"}`}
      >
        <div className="ds-container flex h-[var(--header-h)] items-center gap-4">
          <Link
            href={`/${locale}`}
            className="-ms-1 rounded-full px-1 text-ink transition-opacity hover:opacity-75"
            aria-label={uiText(locale, "IPScans home", "IPScans ana sayfa")}
          >
            <LogoLockup />
          </Link>

          <nav className="ms-6 hidden items-center gap-0.5 lg:flex" aria-label={uiText(locale, "Main", "Ana menü")}>
            {navTrigger("products", copy.applications)}
            {navTrigger("tools", dict.experience.networkTools)}
            <Link
              href={toolPath("speedTest", locale)}
              className={`inline-flex h-10 items-center rounded-full px-4 text-[0.92rem] font-medium transition-colors duration-200 hover:bg-surface-2 hover:text-ink ${
                isActive(toolPath("speedTest", locale)) ? "text-ink" : "text-ink-2"
              }`}
            >
              {dict.nav.speedTest}
            </Link>
            {navTrigger("resources", dict.experience.resources)}
          </nav>

          <div className="ms-auto flex items-center gap-2">
            <div className="hidden sm:block">
              <LanguageSwitcher locale={locale} />
            </div>
            <Link href={`/${locale}/download`} className="btn btn-primary btn-sm hidden sm:inline-flex">
              <Icon name="download" size={16} />
              {copy.downloadApp}
            </Link>
            <button
              type="button"
              className="btn btn-ghost btn-sm btn-icon lg:hidden"
              aria-label={mobileOpen ? uiText(locale, "Close menu", "Menüyü kapat") : uiText(locale, "Open menu", "Menüyü aç")}
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              <Icon name={mobileOpen ? "close" : "menu"} size={22} />
            </button>
          </div>
        </div>

        {/* Desktop mega panels */}
        <div
          className={`absolute inset-x-0 top-full hidden overflow-hidden lg:block ${activePanel ? "pointer-events-auto" : "pointer-events-none"}`}
          onMouseEnter={() => closeTimer.current && clearTimeout(closeTimer.current)}
          onMouseLeave={hoverClose}
        >
          <div
            className={`border-b border-line bg-white/95 backdrop-blur-xl transition-[opacity,transform] duration-500 ease-out-expo ${
              activePanel ? "translate-y-0 opacity-100" : "-translate-y-3 opacity-0"
            }`}
          >
            <div className="ds-container py-8">
              {activePanel === "products" && (
                <div id="nav-panel-products" className="grid grid-cols-[1fr_2.4fr] gap-10">
                  <div className="flex flex-col justify-between rounded-lg bg-surface-dim p-6">
                    <div>
                      <p className="ds-h4">{copy.applications}</p>
                      <p className="ds-caption mt-2 max-w-[260px]">{copy.applicationsIntro}</p>
                    </div>
                    <Link
                      href={`/${locale}/download`}
                      onClick={() => openPanel(null)}
                      className="mt-8 inline-flex items-center gap-2 text-[0.92rem] font-medium text-ink"
                    >
                      <span className="ds-link">{copy.explore}</span>
                      <Icon name="arrowRight" size={16} className="rtl-flip" />
                    </Link>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {products.map((p) => (
                      <Link
                        key={p.href}
                        href={p.href}
                        onClick={() => openPanel(null)}
                        className="group flex items-start gap-4 rounded-lg p-4 transition-colors duration-200 hover:bg-surface-dim"
                      >
                        <span className="grid size-12 shrink-0 place-items-center rounded-[14px] border border-line bg-white shadow-soft transition-transform duration-500 ease-out-expo group-hover:scale-105">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={p.icon} alt="" width={26} height={26} className="size-[26px]" />
                        </span>
                        <span className="min-w-0">
                          <span className="flex items-center gap-1.5 font-medium text-ink">
                            {p.name}
                            <Icon
                              name="arrowRight"
                              size={14}
                              className="rtl-flip -translate-x-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
                            />
                          </span>
                          <span className="ds-caption mt-1 line-clamp-2 block">{p.desc}</span>
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {activePanel === "tools" && (
                <div id="nav-panel-tools" className="grid grid-cols-[1fr_2.4fr] gap-10">
                  <div className="flex flex-col justify-between rounded-lg bg-stage p-6 text-on-stage">
                    <div>
                      <p className="ds-h4">{dict.experience.networkTools}</p>
                      <p className="mt-2 max-w-[260px] text-sm text-on-stage-2">
                        {uiText(locale, "Free, instant diagnostics that run right in your browser.", "Tarayıcınızda anında çalışan ücretsiz tanı araçları.")}
                      </p>
                    </div>
                    <Link
                      href={toolPath("speedTest", locale)}
                      onClick={() => openPanel(null)}
                      className="btn btn-inverse btn-sm mt-8 self-start"
                    >
                      <Icon name="gauge" size={16} />
                      {dict.nav.speedTest}
                    </Link>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {tools.map((t) => (
                      <Link
                        key={t.key}
                        href={t.href}
                        onClick={() => openPanel(null)}
                        className="group flex items-start gap-4 rounded-lg p-4 transition-colors duration-200 hover:bg-surface-dim"
                      >
                        <span className="grid size-11 shrink-0 place-items-center rounded-[13px] bg-signal-soft text-signal transition-transform duration-500 ease-out-expo group-hover:scale-105">
                          <Icon name={t.icon} size={20} />
                        </span>
                        <span className="min-w-0">
                          <span className="block font-medium text-ink">{t.name}</span>
                          <span className="ds-caption mt-1 line-clamp-2 block">{t.desc}</span>
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {activePanel === "resources" && (
                <div id="nav-panel-resources" className="grid grid-cols-[1fr_2.4fr] gap-10">
                  <div className="rounded-lg bg-surface-dim p-6">
                    <p className="ds-h4">{dict.experience.resources}</p>
                    <p className="ds-caption mt-2 max-w-[260px]">{dict.blog.subtitle}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {resources.map((r) => (
                      <Link
                        key={r.href}
                        href={r.href}
                        onClick={() => openPanel(null)}
                        className="group flex items-center gap-3 rounded-lg p-4 font-medium text-ink transition-colors duration-200 hover:bg-surface-dim"
                      >
                        <Icon name={r.icon} size={20} className="text-ink-3 transition-colors group-hover:text-signal" />
                        {r.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Desktop overlay */}
      <div
        aria-hidden="true"
        onClick={() => openPanel(null)}
        className={`fixed inset-0 z-40 hidden bg-ink/10 backdrop-blur-[2px] transition-opacity duration-500 lg:block ${
          activePanel ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Mobile sheet */}
      <div
        id="mobile-menu"
        className={`fixed inset-x-0 bottom-0 top-[var(--header-h)] z-40 overflow-y-auto bg-white transition-[opacity,transform] duration-500 ease-out-expo lg:hidden ${
          mobileOpen ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0"
        }`}
        aria-hidden={!mobileOpen}
      >
        <div className="ds-container flex min-h-full flex-col pb-10 pt-4">
          {(
            [
              ["products", copy.applications, products.map((p) => ({ name: p.name, href: p.href }))],
              ["tools", dict.experience.networkTools, tools.map((t) => ({ name: t.name, href: t.href }))],
              ["resources", dict.experience.resources, resources.map((r) => ({ name: r.name, href: r.href }))],
            ] as [PanelId, string, { name: string; href: string }[]][]
          ).map(([id, label, items]) => (
            <div key={id} className="border-b border-line">
              <button
                type="button"
                className="flex w-full items-center justify-between py-5 text-[1.5rem] font-medium tracking-[-0.02em] text-ink"
                aria-expanded={mobileSection === id}
                onClick={() => setMobileSection(mobileSection === id ? null : id)}
              >
                {label}
                <Icon
                  name="chevronDown"
                  size={22}
                  className={`text-ink-3 transition-transform duration-300 ${mobileSection === id ? "rotate-180" : ""}`}
                />
              </button>
              <div
                className={`grid transition-[grid-template-rows] duration-500 ease-out-expo ${
                  mobileSection === id ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                }`}
              >
                <div className="overflow-hidden">
                  <ul className="pb-5">
                    {items.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setMobileOpen(false)}
                          className="flex items-center justify-between py-2.5 text-[1.05rem] text-ink-2"
                        >
                          {item.name}
                          <Icon name="arrowRight" size={16} className="rtl-flip text-ink-4" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
          <Link
            href={toolPath("speedTest", locale)}
            onClick={() => setMobileOpen(false)}
            className="border-b border-line py-5 text-[1.5rem] font-medium tracking-[-0.02em] text-ink"
          >
            {dict.nav.speedTest}
          </Link>

          <div className="mt-auto flex flex-col gap-3 pt-10">
            <Link href={`/${locale}/download`} onClick={() => setMobileOpen(false)} className="btn btn-primary btn-lg w-full">
              <Icon name="download" size={18} />
              {copy.downloadApp}
            </Link>
            <div className="flex justify-center pt-2">
              <LanguageSwitcher locale={locale} placement="up" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
