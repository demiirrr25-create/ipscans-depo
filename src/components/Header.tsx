"use client";

import { uiText } from "@/i18n/ui";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { Locale } from "@/i18n/config";
import type { PublicDictionary } from "@/i18n/dictionaries";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { Logo } from "./Logo";
import { toolKeys, toolPath } from "@/lib/tool-routes";
import { applications, platformCopy, scannerApplication } from "@/content/applications";

type DropdownId = "product" | "use-cases" | "resources" | null;

export function Header({
  locale,
  dict,
}: {
  locale: Locale;
  dict: PublicDictionary;
  articles?: { name: string; description: string; href: string }[];
}) {
  const pathname = usePathname();
  const [dropdownState, setDropdownState] = useState<{
    path: string;
    id: DropdownId;
  }>({ path: pathname, id: null });
  const [mobileState, setMobileState] = useState<{
    path: string;
    open: boolean;
  }>({ path: pathname, open: false });
  const [mobileSection, setMobileSection] = useState<DropdownId>(null);
  const [scrolled, setScrolled] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const activeDropdown = dropdownState.path === pathname ? dropdownState.id : null;
  const mobile = mobileState.path === pathname ? mobileState.open : false;

  const setActiveDropdown = (
    next: DropdownId | ((prev: DropdownId) => DropdownId)
  ) => {
    setDropdownState((prev) => {
      const current = prev.path === pathname ? prev.id : null;
      const value = typeof next === "function" ? next(current) : next;
      return { path: pathname, id: value };
    });
  };

  const setMobile = (next: boolean | ((prev: boolean) => boolean)) => {
    setMobileState((prev) => {
      const current = prev.path === pathname ? prev.open : false;
      const value = typeof next === "function" ? next(current) : next;
      return { path: pathname, open: value };
    });
  };

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 12);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDropdownState({ path: pathname, id: null });
        setMobileState({ path: pathname, open: false });
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [pathname]);

  const toggleDropdown = (id: Exclude<DropdownId, null>) => {
    setActiveDropdown((prev) => (prev === id ? null : id));
  };

  const toggleMobileSection = (id: Exclude<DropdownId, null>) => {
    setMobileSection((prev) => (prev === id ? null : id));
  };

  const productLinks = [
    {
      name: "IPScans Cortex",
      href: `/${locale}/cortex`,
      external: false,
      iconPath: "M480-260q75 0 127.5-52.5T660-440q0-75-52.5-127.5T480-620q-75 0-127.5 52.5T300-440q0 75 52.5 127.5T480-260Zm0-80q-42 0-71-29t-29-71q0-42 29-71t71-29q42 0 71 29t29 71q0 42-29 71t-71 29Z",
    },
    {
      name: "IPscans+",
      href: `/${locale}/ip-scanner`,
      external: false,
      iconPath:
        "M140-160q-24 0-42-18t-18-42v-520q0-24 18-42t42-18h680q24 0 42 18t18 42v520q0 24-18 42t-42 18H140Zm0-60h680v-420H140v420Z",
    },
    {
      name: "IPCast",
      href: `/${locale}/applications/ipcast`,
      external: false,
      iconPath:
        "M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h640q33 0 56.5 23.5T880-720v480q0 33-23.5 56.5T800-160H160Zm0-80h640v-400H160v400Z",
    },
    {
      name: "IPScans LPR Pro",
      href: `/${locale}/lpr-pro`,
      external: false,
      iconPath:
        "M480-260q75 0 127.5-52.5T660-440q0-75-52.5-127.5T480-620q-75 0-127.5 52.5T300-440q0 75 52.5 127.5T480-260Zm0-80q-42 0-71-29t-29-71q0-42 29-71t71-29q42 0 71 29t29 71q0 42-29 71t-71 29Z",
    },
    ...applications
      .filter((a) => a.id !== "ipcast" && a.id !== "scanner")
      .map((app) => ({
        name: app.name,
        href: `/${locale}/applications/${app.id}`,
        external: false,
        iconPath:
          "M320-240 80-480l240-240 57 57-184 184 183 183-56 56Zm320 0-57-57 184-184-183-183 56-56 240 240-240 240Z",
      })),
    {
      name: dict.nav.appDownload,
      href: `/${locale}/download`,
      external: false,
      iconPath:
        "M480-320 280-520l56-58 104 104v-326h80v326l104-104 56 58-200 200ZM240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z",
    },
  ];

  const webToolLinks = toolKeys.map((key) => ({
    name: dict[key].title,
    href: toolPath(key, locale),
  }));

  const resourceLinks = [
    { name: dict.nav.blog, href: `/${locale}/blog` },
    { name: uiText(locale, "Help & support", "Yardım ve destek"), href: `/${locale}/support` },
    { name: uiText(locale, "About", "Hakkımızda"), href: `/${locale}/about` },
    { name: uiText(locale, "Shop", "Mağaza"), href: `/${locale}/shop` },
    { name: uiText(locale, "Contact", "İletişim"), href: `/${locale}/contact` },
    { name: dict.footer.privacy, href: `/${locale}/privacy` },
    { name: dict.footer.terms, href: `/${locale}/terms` },
  ];

  return (
    <>
      <header
        data-analytics-nav="header"
        data-scroll-reactive="true"
        data-opaque={scrolled || Boolean(activeDropdown) || mobile ? "true" : "false"}
        data-header
        className={`header ${scrolled ? "scrolled" : ""} ${activeDropdown ? "dropdown-open" : ""} ${mobile ? "menu-open" : ""}`}
      >
        <div className="grid-container">
          <div className="main-content">
            <div className="logo-container">
              <Link
                className="logo-link"
                href={`/${locale}`}
                aria-label={uiText(locale, "IPScans home", "IPScans ana sayfa")}
                data-logo-link
              >
                <Logo size={24} />
                <span className="logo-wordmark">IPScans</span>
              </Link>
            </div>

            <div className="header-actions">
              <nav className="call-to-action--nav nav" aria-label={dict.nav.tools}>
                <div className="nav-item">
                  <button
                    type="button"
                    className={`call-to-action--nav button button-nav button-compact nav-trigger-btn dropdown-nav ${activeDropdown === "product" ? "dropdown-open" : ""}`}
                    aria-haspopup="true"
                    aria-expanded={activeDropdown === "product"}
                    aria-controls="product"
                    onClick={() => toggleDropdown("product")}
                  >
                    <span>{platformCopy[locale].applications}</span>
                    <span className="dropdown-icon" translate="no">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                        <path d="M12 15L7.05 10.05L8.45 8.65L12 12.2L15.55 8.65L16.95 10.05L12 15Z" />
                      </svg>
                    </span>
                  </button>
                </div>

                <div className="nav-item">
                  <button
                    type="button"
                    className={`call-to-action--nav button button-nav button-compact nav-trigger-btn dropdown-nav ${activeDropdown === "use-cases" ? "dropdown-open" : ""}`}
                    aria-haspopup="true"
                    aria-expanded={activeDropdown === "use-cases"}
                    aria-controls="use-cases"
                    onClick={() => toggleDropdown("use-cases")}
                  >
                    <span>{dict.experience.networkTools}</span>
                    <span className="dropdown-icon" translate="no">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                        <path d="M12 15L7.05 10.05L8.45 8.65L12 12.2L15.55 8.65L16.95 10.05L12 15Z" />
                      </svg>
                    </span>
                  </button>
                </div>

                <div className="nav-item">
                  <Link
                    href={`/${locale}/ip-scanner`}
                    className="call-to-action--nav button button-nav button-compact nav-trigger-btn"
                  >
                    <span>IPscans+</span>
                  </Link>
                </div>

                <div className="nav-item">
                  <Link
                    href={`/${locale}/applications/ipcast`}
                    className="call-to-action--nav button button-nav button-compact nav-trigger-btn"
                  >
                    <span>IPCast</span>
                  </Link>
                </div>

                <div className="nav-item">
                  <Link
                    href={`/${locale}/lpr-pro`}
                    className="call-to-action--nav button button-nav button-compact nav-trigger-btn"
                  >
                    <span>LPR Pro</span>
                  </Link>
                </div>

                <div className="nav-item">
                  <button
                    type="button"
                    className={`call-to-action--nav button button-nav button-compact nav-trigger-btn dropdown-nav ${activeDropdown === "resources" ? "dropdown-open" : ""}`}
                    aria-haspopup="true"
                    aria-expanded={activeDropdown === "resources"}
                    aria-controls="resources"
                    onClick={() => toggleDropdown("resources")}
                  >
                    <span>{dict.experience.resources}</span>
                    <span className="dropdown-icon" translate="no">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                        <path d="M12 15L7.05 10.05L8.45 8.65L12 12.2L15.55 8.65L16.95 10.05L12 15Z" />
                      </svg>
                    </span>
                  </button>
                </div>
              </nav>

              <div className="header-cta-group">
                <Link
                  className="rocket-link"
                  href={toolPath("speedTest", locale)}
                  aria-label={dict.speedTest.title}
                >
                  🚀
                  <span className="tooltip" role="tooltip">
                    {dict.speedTest.title}
                  </span>
                </Link>
                <a
                  href={scannerApplication.downloadUrl}
                  className="call-to-action--nav button button-primary button-compact download-button dropdown-nav"
                >
                  <span>{platformCopy[locale].downloadApp}</span>
                  <span className="dropdown-icon" translate="no">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                      <path d="M12 16L7 11L8.4 9.55L11 12.15V4H13V12.15L15.6 9.55L17 11L12 16ZM6 20C5.45 20 4.979 19.804 4.588 19.413C4.196 19.021 4.00067 18.55 4 18V15H6V18H18V15H20V18C20 18.55 19.804 19.021 19.413 19.413C19.021 19.804 18.55 20 18 20H6Z" />
                    </svg>
                  </span>
                </a>
              </div>
            </div>

            <div className="header-actions-right">
              <Link
                className="rocket-link mobile-rocket-link"
                href={toolPath("speedTest", locale)}
                aria-label={dict.speedTest.title}
              >
                🚀
                <span className="tooltip" role="tooltip">
                  {dict.speedTest.title}
                </span>
              </Link>
              <button
                type="button"
                className="call-to-action--nav button button-primary button-compact menu-toggle"
                aria-label={dict.nav.tools}
                onClick={() => setMobile(!mobile)}
              >
                <svg
                  className="icon-menu"
                  viewBox="0 -960 960 960"
                  width="20"
                  height="20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M140-254.62V-300H820v45.38H140Zm0-202.69v-45.38H820v45.38H140ZM140-660v-45.38H820V-660H140Z" />
                </svg>
                <svg
                  className="icon-close"
                  viewBox="0 -960 960 960"
                  width="20"
                  height="20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M250.92-218.92l-32-32L448-480L218.92-709.08l32-32L480-512L709.08-741.08l32,32L512-480L741.08-250.92l-32,32L480-448L250.92-218.92Z" />
                </svg>
              </button>
              <LanguageSwitcher locale={locale} />
            </div>
          </div>

          {/* Dropdowns container dropdown navigation */}
          <div className={`dropdown ${activeDropdown ? "open" : ""}`} data-dropdowns-container>
            <div className="grid-container">
              <div
                className={`dropdown-panel-wrapper col-md-10 ${activeDropdown === "product" ? "open" : ""}`}
                data-dropdown-panel-id="product"
              >
                <div className="dropdown-panel" data-dropdown-id="product">
                  <div className="col-md-3">
                    <p className="heading-7 dropdown-title">{platformCopy[locale].applicationsIntro}</p>
                    <p className="caption dropdown-info" />
                    <div>
                      <Link
                        className="call-to-action--nav nav-button"
                        href={`/${locale}/download`}
                        onClick={() => setActiveDropdown(null)}
                      >
                        {platformCopy[locale].explore}
                      </Link>
                    </div>
                  </div>
                  <div className="col-md-4 subnav-column">
                    <p className="caption subnav-label">{platformCopy[locale].applications}</p>
                    <nav className="subnav" id="product" role="menu">
                      {productLinks.map((item) => (
                        <Link
                          key={item.href}
                          className="body subnav-link"
                          href={item.href}
                          role="menuitem"
                          onClick={() => setActiveDropdown(null)}
                        >
                          <span className="link-icon" translate="no">
                            <svg viewBox="0 -960 960 960" width="22" height="22" fill="currentColor" aria-hidden="true">
                              <path d={item.iconPath} />
                            </svg>
                          </span>
                          <span className="subnav-link-text">{item.name}</span>
                        </Link>
                      ))}
                    </nav>
                  </div>
                  <div className="col-md-3 subnav-content-container" />
                </div>
              </div>

              <div
                className={`dropdown-panel-wrapper col-md-12 ${activeDropdown === "use-cases" ? "open" : ""}`}
                data-dropdown-panel-id="use-cases"
              >
                <div className="dropdown-panel dropdown-panel--multi-section" data-dropdown-id="use-cases">
                  <div className="col-md-2 dropdown-intro-col">
                    <p className="heading-7 dropdown-title">{dict.experience.why}</p>
                    <p className="caption dropdown-info" />
                    <div>
                      <Link
                        className="call-to-action--nav nav-button"
                        href={toolPath("ipLookup", locale)}
                        onClick={() => setActiveDropdown(null)}
                      >
                        {platformCopy[locale].explore}
                      </Link>
                    </div>
                  </div>
                  <div className="col-md-10 subnav-sections-grid">
                    <div className="subnav-section">
                      <p className="caption subnav-label">{dict.experience.networkTools}</p>
                      <div className="subnav-section-columns" role="menu">
                        <div className="subnav-column subnav-column--section">
                          <nav className="subnav">
                            {webToolLinks.slice(0, 3).map((item) => (
                              <Link
                                key={item.href}
                                className="body subnav-link"
                                href={item.href}
                                role="menuitem"
                                onClick={() => setActiveDropdown(null)}
                              >
                                <span className="subnav-link-text">{item.name}</span>
                              </Link>
                            ))}
                          </nav>
                        </div>
                        <div className="subnav-column subnav-column--section">
                          <nav className="subnav">
                            {webToolLinks.slice(3).map((item) => (
                              <Link
                                key={item.href}
                                className="body subnav-link"
                                href={item.href}
                                role="menuitem"
                                onClick={() => setActiveDropdown(null)}
                              >
                                <span className="subnav-link-text">{item.name}</span>
                              </Link>
                            ))}
                          </nav>
                        </div>
                      </div>
                    </div>
                    <div className="subnav-section">
                      <p className="caption subnav-label">{dict.experience.categories.desktop}</p>
                      <div className="subnav-section-columns" role="menu">
                        <div className="subnav-column subnav-column--section">
                          <nav className="subnav">
                            {productLinks.slice(0, 2).map((item) => (
                              <Link
                                key={item.href}
                                className="body subnav-link"
                                href={item.href}
                                role="menuitem"
                                onClick={() => setActiveDropdown(null)}
                              >
                                <span className="subnav-link-text">{item.name}</span>
                              </Link>
                            ))}
                          </nav>
                        </div>
                        <div className="subnav-column subnav-column--section">
                          <nav className="subnav">
                            {productLinks.slice(2).map((item) => (
                              <Link
                                key={item.href}
                                className="body subnav-link"
                                href={item.href}
                                role="menuitem"
                                onClick={() => setActiveDropdown(null)}
                              >
                                <span className="subnav-link-text">{item.name}</span>
                              </Link>
                            ))}
                          </nav>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div
                className={`dropdown-panel-wrapper col-md-10 ${activeDropdown === "resources" ? "open" : ""}`}
                data-dropdown-panel-id="resources"
              >
                <div className="dropdown-panel" data-dropdown-id="resources">
                  <div className="col-md-3">
                    <p className="heading-7 dropdown-title">{dict.experience.resources}</p>
                    <p className="caption dropdown-info" />
                  </div>
                  <div className="col-md-4 subnav-column">
                    <nav className="subnav" id="resources" role="menu">
                      {resourceLinks.map((item) => (
                        <Link
                          key={item.href}
                          className="body subnav-link"
                          href={item.href}
                          role="menuitem"
                          onClick={() => setActiveDropdown(null)}
                        >
                          <span className="subnav-link-text">{item.name}</span>
                        </Link>
                      ))}
                    </nav>
                  </div>
                  <div className="col-md-3 subnav-content-container" />
                </div>
              </div>
            </div>
          </div>

          {/* Mobile menu */}
          <div className={`mobile-menu ${mobile ? "open" : ""}`} data-mobile-menu>
            <div className="mobile-menu-content">
              <div className="mobile-nav-section">
                <button
                  type="button"
                  className={`heading-4 mobile-nav-item ${mobileSection === "product" ? "open" : ""}`}
                  onClick={() => toggleMobileSection("product")}
                >
                  {platformCopy[locale].applications}
                  <span className="mobile-chevron">
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true">
                      <path d="M12 15L7.05 10.05L8.45 8.65L12 12.2L15.55 8.65L16.95 10.05L12 15Z" />
                    </svg>
                  </span>
                </button>
                <div className={`mobile-dropdown-section ${mobileSection === "product" ? "open" : ""}`}>
                  <div className="dropdown-panel">
                    <div className="col-md-4 subnav-column">
                      <nav className="subnav">
                        {productLinks.map((item) => (
                          <Link
                            key={item.href}
                            className="body subnav-link"
                            href={item.href}
                            onClick={() => setMobile(false)}
                          >
                            <span className="subnav-link-text">{item.name}</span>
                          </Link>
                        ))}
                      </nav>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mobile-nav-section">
                <button
                  type="button"
                  className={`heading-4 mobile-nav-item ${mobileSection === "use-cases" ? "open" : ""}`}
                  onClick={() => toggleMobileSection("use-cases")}
                >
                  {dict.experience.networkTools}
                  <span className="mobile-chevron">
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true">
                      <path d="M12 15L7.05 10.05L8.45 8.65L12 12.2L15.55 8.65L16.95 10.05L12 15Z" />
                    </svg>
                  </span>
                </button>
                <div className={`mobile-dropdown-section ${mobileSection === "use-cases" ? "open" : ""}`}>
                  <div className="dropdown-panel">
                    <div className="col-md-4 subnav-column">
                      <nav className="subnav">
                        {webToolLinks.map((item) => (
                          <Link
                            key={item.href}
                            className="body subnav-link"
                            href={item.href}
                            onClick={() => setMobile(false)}
                          >
                            <span className="subnav-link-text">{item.name}</span>
                          </Link>
                        ))}
                      </nav>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mobile-nav-section">
                <Link className="heading-4 mobile-nav-item" href={`/${locale}/ip-scanner`} onClick={() => setMobile(false)}>
                  IPscans+
                </Link>
              </div>
              <div className="mobile-nav-section">
                <Link
                  className="heading-4 mobile-nav-item"
                  href={`/${locale}/applications/ipcast`}
                  onClick={() => setMobile(false)}
                >
                  IPCast
                </Link>
              </div>

              <div className="mobile-nav-section">
                <button
                  type="button"
                  className={`heading-4 mobile-nav-item ${mobileSection === "resources" ? "open" : ""}`}
                  onClick={() => toggleMobileSection("resources")}
                >
                  {dict.experience.resources}
                  <span className="mobile-chevron">
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true">
                      <path d="M12 15L7.05 10.05L8.45 8.65L12 12.2L15.55 8.65L16.95 10.05L12 15Z" />
                    </svg>
                  </span>
                </button>
                <div className={`mobile-dropdown-section ${mobileSection === "resources" ? "open" : ""}`}>
                  <div className="dropdown-panel">
                    <div className="col-md-4 subnav-column">
                      <nav className="subnav">
                        {resourceLinks.map((item) => (
                          <Link
                            key={item.href}
                            className="body subnav-link"
                            href={item.href}
                            onClick={() => setMobile(false)}
                          >
                            <span className="subnav-link-text">{item.name}</span>
                          </Link>
                        ))}
                      </nav>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mobile-nav-section" data-mobile-menu-cta>
                <a
                  className="heading-4 mobile-nav-item mobile-download-button"
                  href={scannerApplication.downloadUrl}
                >
                  {platformCopy[locale].downloadApp}
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Top announcement banner slot */}
        {!bannerDismissed && (
          <div className="header-top-banner-slot" data-home-banner-slot>
            <div
              className="announcement-pill announcement-pill--surface-home announcement-pill--host-home announcement-pill--placement-top-banner announcement-pill--dark is-interactive"
              role="region"
              aria-label="IPscans+"
              data-announcement-pill
            >
              <Link href={`/${locale}/applications/scanner`} className="pill-main-link">
                <span className="pill-badge">
                  <span className="pill-icon" aria-hidden="true">
                    <svg className="pill-spark-icon" viewBox="0 0 16 16" width="12" height="12" fill="currentColor" aria-hidden="true">
                      <path d="M8 0C8.3 4.2 11.8 7.7 16 8C11.8 8.3 8.3 11.8 8 16C7.7 11.8 4.2 8.3 0 8C4.2 7.7 7.7 4.2 8 0Z" />
                    </svg>
                  </span>
                  <span className="pill-badge-label">IPscans+</span>
                </span>
                <span className="pill-text">
                  IPscans+ — {scannerApplication.description[locale]}
                </span>
                <span className="pill-cta">
                  <span className="pill-cta-label">{platformCopy[locale].details}</span>
                  <svg className="pill-arrow" viewBox="0 0 16 16" width="13" height="13" fill="none" aria-hidden="true">
                    <path
                      d="M3.5 8H12.5M12.5 8L8.5 4M12.5 8L8.5 12"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </Link>
              <button
                type="button"
                className="pill-dismiss"
                onClick={() => setBannerDismissed(true)}
                aria-label="Close"
              >
                <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
                  <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </header>
      <div
        className={`dropdown-overlay ${activeDropdown ? "open" : ""}`}
        data-dropdown-overlay
        onClick={() => setActiveDropdown(null)}
      />
    </>
  );
}
