import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { Logo } from "./Logo";
import { toolPath } from "@/lib/tool-routes";
import { platformCopy } from "@/content/applications";

export function Footer({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const columns = [
    { title: dict.nav.tools, links: [
      { href: `/${locale}/ip-scanner`, label: "IP Scanner" },
      { href: toolPath("ipLookup", locale), label: dict.nav.ipLookup },
      { href: toolPath("dns", locale), label: dict.nav.dns },
      { href: toolPath("whois", locale), label: dict.nav.whois },
      { href: toolPath("ports", locale), label: dict.nav.ports },
      { href: toolPath("speedTest", locale), label: dict.nav.speedTest },
    ] },
    { title: platformCopy[locale].applications, links: [
      { href: `/${locale}/applications/ipcast`, label: "IPCast" },
      { href: `/${locale}/applications/scanner`, label: "IP Scanner" },
      { href: `/${locale}/applications/health-pro`, label: "Network Health Pro" },
      { href: `/${locale}/download`, label: dict.nav.appDownload },
    ] },
    { title: dict.experience.resources, links: [
      { href: `/${locale}/blog`, label: dict.nav.blog },
      { href: `/${locale}/shop`, label: dict.nav.shop },
      { href: `/${locale}/privacy`, label: dict.footer.privacy },
      { href: `/${locale}/terms`, label: dict.footer.terms },
    ] },
  ];
  return (
    <footer className="border-t border-white/15 bg-[#080808]">
      <div className="mx-auto max-w-7xl px-4 pt-16">
        <p className="border-b border-white/15 pb-12 font-[family-name:var(--font-display)] text-[clamp(3.5rem,13vw,12rem)] font-semibold leading-none tracking-[-0.075em]">ipscans<span className="text-neutral-600">.</span></p>
      </div>
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 md:grid-cols-[2fr_1fr_1fr_1fr]">
        <div>
          <Link href={`/${locale}`} className="flex items-center gap-2 text-xl font-semibold"><Logo size={30} /> ipscans.</Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-neutral-400">{dict.footer.tagline}</p>
        </div>
        {columns.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <h2 className="text-sm font-semibold text-white">{column.title}</h2>
            <ul className="mt-5 space-y-3">
              {column.links.map((item) => <li key={item.href}><Link href={item.href} className="text-sm text-neutral-400 hover:text-white hover:underline">{item.label}</Link></li>)}
            </ul>
          </nav>
        ))}
      </div>
      <div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-3 border-t border-white/10 px-4 py-6 font-mono text-xs text-neutral-400">
        <span>© {new Date().getFullYear()} IPScans — {dict.footer.rights}</span>
        <Link href={`/${locale}/privacy`} className="hover:text-white">{dict.footer.privacy}</Link>
      </div>
    </footer>
  );
}
