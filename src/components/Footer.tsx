import { uiText } from "@/i18n/ui";
import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { Logo } from "./Logo";
import { toolPath } from "@/lib/tool-routes";
import { platformCopy } from "@/content/applications";

export function Footer({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const productLinks = [
    { href: `/${locale}/applications/scanner`, label: "IPscans+" },
    { href: `/${locale}/download`, label: dict.nav.appDownload },
    { href: `/${locale}/applications/ipcast`, label: "IPCast" },
    { href: `/${locale}/lpr-pro`, label: "LPR Pro" },
    { href: toolPath("ipLookup", locale), label: dict.nav.ipLookup },
    { href: toolPath("speedTest", locale), label: dict.nav.speedTest },
    { href: toolPath("dns", locale), label: dict.nav.dns },
    { href: toolPath("whois", locale), label: dict.nav.whois },
    { href: toolPath("ports", locale), label: dict.nav.ports },
  ];

  const resourceLinks = [
    { href: `/${locale}/blog`, label: dict.nav.blog },
    { href: `/${locale}/shop`, label: dict.nav.shop },
    {
      href: `/${locale === "tr" ? "tr" : "en"}/about`,
      label: uiText(locale, "About", "Hakkımızda"),
    },
    {
      href: `/${locale === "tr" ? "tr" : "en"}/support`,
      label: uiText(locale, "Help & support", "Yardım ve destek"),
    },
    {
      href: `/${locale === "tr" ? "tr" : "en"}/contact`,
      label: uiText(locale, "Contact", "İletişim"),
    },
    { href: `/${locale}/privacy`, label: dict.footer.privacy },
    { href: `/${locale}/terms`, label: dict.footer.terms },
  ];

  return (
    <footer className="footer" data-analytics-nav="footer">
      <div className="footer-main-content">
        <div className="grid-container">
          <div className="grid-row footer-inner">
            <div className="grid-col col-xs-4 col-sm-8 col-md-4">
              <p className="footer-title heading-5">
                {uiText(locale, "Experience liftoff", "Ağınızı keşfedin")}
              </p>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-neutral-400">
                {uiText(
                  locale,
                  "Next-generation network intelligence, device topology discovery, and high-performance diagnostic tools.",
                  "Yeni nesil ağ zekası, cihaz topoloji keşfi ve yüksek performanslı tanı araçları."
                )}
              </p>
            </div>

            <div className="grid-col col-xs-4 col-sm-4 col-md-3 col-md-offset-2">
              <div className="footer-nav-section">
                <p className="caption">{platformCopy[locale].applications}</p>
                {productLinks.map((item) => (
                  <Link
                    key={item.href}
                    className="call-to-action call-to-action--nav"
                    href={item.href}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="grid-col col-xs-4 col-sm-4 col-md-3">
              <div className="footer-nav-section">
                <p className="caption">{dict.experience.resources}</p>
                {resourceLinks.map((item) => (
                  <Link
                    key={item.href}
                    className="call-to-action call-to-action--nav"
                    href={item.href}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ULTRA-PREMIUM GIANT IPSCANS BRAND WATERMARK WITH DYNAMIC GLOW & METALLIC GRADIENT */}
      <div className="footer-brand-stage" aria-hidden="true">
        <div className="grid-container">
          <div id="antigravity-footer-wrapper" className="footer-brand-wrapper">
            <div className="footer-brand-ambient-halo" />
            <svg
              className="footer-antigravity-brand"
              width="1297"
              height="270"
              viewBox="0 0 1297 270"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="agyFooterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
                  <stop offset="35%" stopColor="#dbeafe" stopOpacity="0.25" />
                  <stop offset="70%" stopColor="#7189ff" stopOpacity="0.10" />
                  <stop offset="100%" stopColor="#000000" stopOpacity="0.01" />
                </linearGradient>
                <linearGradient id="agyFooterStroke" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
                  <stop offset="30%" stopColor="#00f0ff" stopOpacity="0.5" />
                  <stop offset="70%" stopColor="#7189ff" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0.1" />
                </linearGradient>
                <filter id="agyFooterBlur" x="-10%" y="-10%" width="120%" height="120%">
                  <feGaussianBlur stdDeviation="12" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <text
                x="0"
                y="224"
                fill="url(#agyFooterGrad)"
                stroke="url(#agyFooterStroke)"
                strokeWidth="1.2"
                fontSize="265"
                fontWeight="500"
                letterSpacing="-0.04em"
                filter="url(#agyFooterBlur)"
                className="footer-brand-wordmark"
              >
                IPScans
              </text>
            </svg>
          </div>
        </div>
      </div>

      {/* REFINED BOTTOM LEGAL & METADATA BAR */}
      <div className="footer-meta-links">
        <div className="grid-container">
          <div className="grid-row items-center">
            <div className="grid-col col-xs-4 col-md-4">
              <Link
                className="footer-meta-logo"
                href={`/${locale}`}
                aria-label="IPScans Home"
              >
                <Logo size={22} />
                <span>IPScans</span>
              </Link>
            </div>

            <div className="grid-col col-xs-4 col-md-8">
              <div className="flex flex-wrap items-center justify-start md:justify-end gap-5">
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-mono text-[11px] text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {uiText(locale, "All Systems Operational · v4.3", "Tüm Servisler Aktif · v4.3")}
                </span>

                <nav className="footer-meta-nav" aria-label="Footer legal">
                  <Link
                    className="call-to-action call-to-action--nav"
                    href={`/${locale === "tr" ? "tr" : "en"}/about`}
                  >
                    {uiText(locale, "About", "Hakkımızda")}
                  </Link>
                  <Link
                    className="call-to-action call-to-action--nav"
                    href={`/${locale}/download`}
                  >
                    {platformCopy[locale].applications}
                  </Link>
                  <Link
                    className="call-to-action call-to-action--nav"
                    href={`/${locale}/privacy`}
                  >
                    {dict.footer.privacy}
                  </Link>
                  <Link
                    className="call-to-action call-to-action--nav"
                    href={`/${locale}/terms`}
                  >
                    {dict.footer.terms}
                  </Link>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
