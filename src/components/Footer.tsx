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
    { href: `/${locale}/cortex`, label: "Cortex · Alpha" },
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
    <footer className="w-full border-t border-[#1F1F1F] bg-[#000000] text-white pt-16 pb-12" data-analytics-nav="footer">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 md:grid-cols-4 lg:gap-16">
          {/* Brand Column */}
          <div className="sm:col-span-2">
            <Link
              className="inline-flex items-center gap-3 text-lg font-semibold tracking-tight text-white transition-opacity hover:opacity-80"
              href={`/${locale}`}
              aria-label="IPScans Home"
            >
              <Logo size={26} />
              <span>IPScans</span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-[#A1A1A1]">
              {uiText(
                locale,
                "Professional network intelligence, device topology discovery, and high-performance diagnostic tools built for engineers and IT teams worldwide.",
                "Mühendisler ve BT ekipleri için geliştirilmiş profesyonel ağ analizi, cihaz topoloji keşfi ve yüksek performanslı tanı araçları."
              )}
            </p>
            <div className="mt-6 flex items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#1F1F1F] bg-[#0A0A0A] px-3 py-1 font-mono text-[11px] text-[#A1A1A1]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#46D39A] animate-pulse" />
                {uiText(locale, "All Systems Operational", "Tüm Servisler Aktif")}
              </span>
            </div>
          </div>

          {/* Applications Column */}
          <div>
            <p className="font-mono text-xs font-semibold uppercase tracking-wider text-[#6E6E6E]">
              {platformCopy[locale].applications}
            </p>
            <ul className="mt-4 space-y-2.5">
              {productLinks.map((item) => (
                <li key={item.href}>
                  <Link
                    className="text-sm text-[#A1A1A1] transition-colors hover:text-white"
                    href={item.href}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources & Legal Column */}
          <div>
            <p className="font-mono text-xs font-semibold uppercase tracking-wider text-[#6E6E6E]">
              {dict.experience.resources}
            </p>
            <ul className="mt-4 space-y-2.5">
              {resourceLinks.map((item) => (
                <li key={item.href}>
                  <Link
                    className="text-sm text-[#A1A1A1] transition-colors hover:text-white"
                    href={item.href}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Legal & Copyright Bar */}
        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-[#1F1F1F] pt-8 text-xs text-[#6E6E6E] sm:flex-row">
          <p>© {new Date().getFullYear()} IPScans. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href={`/${locale}/privacy`} className="hover:text-white transition-colors">
              {dict.footer.privacy}
            </Link>
            <Link href={`/${locale}/terms`} className="hover:text-white transition-colors">
              {dict.footer.terms}
            </Link>
            <Link href={`/${locale}/contact`} className="hover:text-white transition-colors">
              {uiText(locale, "Contact", "İletişim")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
