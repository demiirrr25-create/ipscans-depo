import { uiText } from "@/i18n/ui";
import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { Logo } from "./Logo";
import { toolPath } from "@/lib/tool-routes";
import { platformCopy } from "@/content/applications";

export function Footer({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const columns = [
    {
      title: dict.nav.tools,
      links: [
        { href: `/${locale}/ip-scanner`, label: "IPscans+" },
        { href: toolPath("ipLookup", locale), label: dict.nav.ipLookup },
        { href: toolPath("dns", locale), label: dict.nav.dns },
        { href: toolPath("whois", locale), label: dict.nav.whois },
        { href: toolPath("ports", locale), label: dict.nav.ports },
        { href: toolPath("speedTest", locale), label: dict.nav.speedTest },
      ],
    },
    {
      title: platformCopy[locale].applications,
      links: [
        { href: `/${locale}/lpr-pro`, label: "LPR Pro · Beta" },
        { href: `/${locale}/applications/ipcast`, label: "IPCast" },
        { href: `/${locale}/applications/scanner`, label: "IPscans+" },
        { href: `/${locale}/download`, label: dict.nav.appDownload },
      ],
    },
    {
      title: dict.experience.resources,
      links: [
        { href: `/${locale === "tr" ? "tr" : "en"}/about`, label: uiText(locale, "About", "Hakkımızda") },
        { href: `/${locale === "tr" ? "tr" : "en"}/support`, label: uiText(locale, "Help & support", "Yardım ve destek") },
        { href: `/${locale === "tr" ? "tr" : "en"}/contact`, label: uiText(locale, "Contact", "İletişim") },
        { href: `/${locale}/blog`, label: dict.nav.blog },
        { href: `/${locale}/shop`, label: dict.nav.shop },
        { href: `/${locale}/privacy`, label: dict.footer.privacy },
        { href: `/${locale}/terms`, label: dict.footer.terms },
      ],
    },
  ];
  return (
    <footer className="site-footer border-t border-white/10 bg-black">
      <div className="mx-auto grid max-w-[1440px] gap-12 px-5 py-20 sm:px-8 md:grid-cols-[2fr_1fr_1fr_1fr]">
        <div>
          <Link href={`/${locale}`} className="flex items-center gap-2.5 text-xl font-medium tracking-tight text-white">
            <Logo size={28} /> IPScans
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-neutral-400">{dict.footer.tagline}</p>
        </div>
        {columns.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <h2 className="text-sm font-medium text-white">{column.title}</h2>
            <ul className="mt-5 space-y-3">
              {column.links.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="inline-flex min-h-8 items-center text-sm text-neutral-400 transition-colors hover:text-white"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="mx-auto max-w-[1440px] px-5 sm:px-8">
        <p
          aria-hidden="true"
          className="footer-wordmark select-none border-t border-white/10 pt-10 font-[family-name:var(--font-display)] text-[clamp(3.8rem,14vw,13.5rem)] font-medium leading-[0.9] tracking-[-0.055em]"
        >
          IPScans
        </p>
      </div>
      <div className="mx-auto flex max-w-[1440px] flex-wrap justify-between gap-3 border-t border-white/10 px-5 py-6 font-mono text-xs text-neutral-400 sm:px-8">
        <span>© {new Date().getFullYear()} IPScans — {dict.footer.rights}</span>
        <div className="flex gap-6">
          <Link href={`/${locale}/privacy`} className="hover:text-white">
            {dict.footer.privacy}
          </Link>
          <Link href={`/${locale}/terms`} className="hover:text-white">
            {dict.footer.terms}
          </Link>
        </div>
      </div>
    </footer>
  );
}
