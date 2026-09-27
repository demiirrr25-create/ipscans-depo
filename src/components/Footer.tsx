import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { Logo } from "./Logo";
import { toolPath } from "@/lib/tool-routes";

export function Footer({
  locale,
  dict,
}: {
  locale: Locale;
  dict: Dictionary;
}) {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-white/10">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Logo size={28} />
            <span className="font-semibold font-[family-name:var(--font-display)]">
              ipscans
            </span>
          </div>
          <p className="mt-2 text-sm text-neutral-400">{dict.footer.tagline}</p>
        </div>
        <nav className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-neutral-400">
          <Link href={toolPath("ipLookup", locale)} className="hover:text-white">
            {dict.nav.ipLookup}
          </Link>
          <Link href={toolPath("speedTest", locale)} className="hover:text-white">
            {dict.nav.speedTest}
          </Link>
          <Link href={`/${locale}/scan`} className="hover:text-white">
            {dict.nav.scan}
          </Link>
          <Link href={`/${locale}/blog`} className="hover:text-white">
            {dict.nav.blog}
          </Link>
          <Link href={`/${locale}/privacy`} className="hover:text-white">
            {dict.footer.privacy}
          </Link>
          <Link href={`/${locale}/terms`} className="hover:text-white">
            {dict.footer.terms}
          </Link>
        </nav>
      </div>
      <div className="border-t border-white/5 px-4 py-4 text-center text-xs text-neutral-500">
        © {year} ipscans.com — {dict.footer.rights}
      </div>
    </footer>
  );
}
