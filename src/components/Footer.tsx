import Link from "next/link";
import { uiText } from "@/i18n/ui";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { toolPath } from "@/lib/tool-routes";
import { platformCopy } from "@/content/applications";
import { LogoLockup } from "./Logo";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function Footer({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const columns: { title: string; links: { href: string; label: string }[] }[] = [
    {
      title: platformCopy[locale].applications,
      links: [
        { href: `/${locale}/applications/scanner`, label: "IPscans+" },
        { href: `/${locale}/applications/ipcast`, label: "IPCast" },
        { href: `/${locale}/lpr-pro`, label: "LPR Pro" },
        { href: `/${locale}/cortex`, label: "Cortex" },
        { href: `/${locale}/download`, label: platformCopy[locale].explore },
      ],
    },
    {
      title: dict.experience.networkTools,
      links: [
        { href: toolPath("speedTest", locale), label: dict.nav.speedTest },
        { href: toolPath("ipLookup", locale), label: dict.nav.ipLookup },
        { href: toolPath("dns", locale), label: dict.nav.dns },
        { href: toolPath("whois", locale), label: dict.nav.whois },
        { href: toolPath("ports", locale), label: dict.nav.ports },
        { href: `/${locale}/scan`, label: dict.nav.scan },
      ],
    },
    {
      title: dict.experience.resources,
      links: [
        { href: `/${locale}/blog`, label: dict.nav.blog },
        { href: `/${locale}/support`, label: uiText(locale, "Help & support", "Yardım ve destek") },
        { href: `/${locale}/about`, label: uiText(locale, "About", "Hakkımızda") },
        { href: `/${locale}/contact`, label: uiText(locale, "Contact", "İletişim") },
        { href: `/${locale}/shop`, label: dict.nav.shop },
      ],
    },
  ];

  return (
    <footer className="relative overflow-hidden border-t border-line bg-surface" data-analytics-nav="footer">
      <div className="ds-container pt-20 sm:pt-24">
        <div className="grid gap-14 lg:grid-cols-[1.3fr_2fr]">
          <div className="max-w-sm">
            <Link href={`/${locale}`} className="inline-flex text-ink transition-opacity hover:opacity-75" aria-label="IPScans">
              <LogoLockup size={28} />
            </Link>
            <p className="ds-body mt-5">{dict.footer.tagline}</p>
          </div>
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            {columns.map((col) => (
              <div key={col.title}>
                <p className="text-sm font-medium text-ink">{col.title}</p>
                <ul className="mt-5 space-y-3">
                  {col.links.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className="ds-link text-[0.95rem] text-ink-2 hover:text-ink">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Oversized wordmark */}
      <div className="ds-container mt-20 select-none sm:mt-28" aria-hidden="true">
        <p className="bg-[linear-gradient(180deg,var(--color-ink)_0%,var(--color-ink)_45%,rgb(11_13_18/0.08)_100%)] bg-clip-text text-center text-[22vw] font-medium leading-[0.78] tracking-[-0.07em] text-transparent lg:text-[19rem]">
          IPScans
        </p>
      </div>

      <div className="border-t border-line">
        <div className="ds-container flex flex-col items-center justify-between gap-4 py-6 text-sm text-ink-3 sm:flex-row">
          <p>
            © {new Date().getFullYear()} IPScans. {dict.footer.rights}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <Link href={`/${locale}/privacy`} className="ds-link hover:text-ink">
              {dict.footer.privacy}
            </Link>
            <Link href={`/${locale}/terms`} className="ds-link hover:text-ink">
              {dict.footer.terms}
            </Link>
            <LanguageSwitcher locale={locale} placement="up" />
          </div>
        </div>
      </div>
    </footer>
  );
}
