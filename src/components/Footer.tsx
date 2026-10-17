import { uiText } from "@/i18n/ui";
import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { Logo } from "./Logo";
import { toolPath } from "@/lib/tool-routes";
import { platformCopy } from "@/content/applications";

export function Footer({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const productLinks = [
    { href: `/${locale}/ip-scanner`, label: "IPscans+" },
    { href: `/${locale}/download`, label: dict.nav.appDownload },
    { href: `/${locale}/applications/ipcast`, label: "IPCast" },
    { href: `/${locale}/lpr-pro`, label: "LPR Pro · Beta" },
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

      <div className="footer-img-container" aria-hidden="true">
        <div className="grid-container">
          <div id="antigravity-footer-wrapper" data-antigravity-footer-wrapper>
            <svg
              className="footer-antigravity"
              width="1297"
              height="270"
              viewBox="0 0 1297 270"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <text
                x="0"
                y="224"
                fill="currentColor"
                fontSize="265"
                fontWeight="480"
                letterSpacing="-0.045em"
                style={{ fontFamily: "var(--font-family-primary)" }}
              >
                IPScans
              </text>
            </svg>
          </div>
        </div>
      </div>

      <div className="footer-google-links">
        <div className="grid-container">
          <div className="grid-row">
            <div className="grid-col col-xs-4 col-md-3">
              <Link
                className="footer-google-logo"
                href={`/${locale}`}
                aria-label="IPScans"
              >
                <Logo size={24} />
                <span>IPScans</span>
              </Link>
            </div>
            <div className="grid-col col-xs-4 col-md-6 col-md-offset-3">
              <nav className="footer-google-nav" aria-label="Footer legal">
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
    </footer>
  );
}
